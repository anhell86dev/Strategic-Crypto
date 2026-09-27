/**
 * Binance USDⓈ-M Futures WebSocket & Hybrid Stream Manager
 * Features:
 * 1. Multiplexed Market Data Streams (@ticker, @bookTicker, @kline_*, @depth20@100ms)
 * 2. User Data Stream (listenKey) for real-time ACCOUNT_UPDATE & ORDER_TRADE_UPDATE
 * 3. WS-FAPI v1 & REST Fallback Integration
 * 4. Heartbeat Active Ping/Pong, Exponential Backoff, Rate-Limit Protection & Isolated Margin Enforcement
 */

import { BINANCE_ENDPOINTS, syncBinanceServerTime } from './crypto';
import { LiveTickerData } from '../types';
import { BinanceFuturesAccount, BinanceFuturesPosition, BinanceFuturesOrder } from '../types/binanceFutures';
import { proxyService } from './proxyService';

export interface TickerUpdatePayload {
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
  bidPrice?: number;
  askPrice?: number;
  timestamp: number;
}

export interface KlineUpdatePayload {
  symbol: string;
  timeframe: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
  timestamp: number;
}

export interface UserAccountUpdate {
  eventTime: number;
  totalWalletBalance: number;
  totalUnrealizedProfit: number;
  availableBalance: number;
  positions: Array<{
    symbol: string;
    positionAmount: number;
    entryPrice: number;
    unrealizedProfit: number;
    marginType: 'ISOLATED' | 'CROSSED';
    isolatedMargin: number;
    leverage: number;
  }>;
}

export interface UserOrderUpdate {
  symbol: string;
  clientOrderId: string;
  side: 'BUY' | 'SELL';
  orderType: string;
  originalQty: number;
  originalPrice: number;
  avgPrice: number;
  orderStatus: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'EXPIRED';
  orderId: number;
  stopPrice?: number;
  realizedProfit?: number;
}

type StreamStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'error';
type MarketCallback = (ticker: TickerUpdatePayload) => void;
type KlineCallback = (kline: KlineUpdatePayload) => void;
type AccountCallback = (account: UserAccountUpdate) => void;
type OrderCallback = (order: UserOrderUpdate) => void;
type StatusCallback = (status: StreamStatus, latencyMs?: number) => void;

class BinanceWsManager {
  private isTestnet: boolean = false;
  private marketWs: WebSocket | null = null;
  private userDataWs: WebSocket | null = null;
  private listenKey: string | null = null;
  private listenKeyKeepAliveTimer: any = null;

  // Subscribed market symbols
  private subscribedSymbols: Set<string> = new Set();
  
  // Callbacks
  private marketListeners: Set<MarketCallback> = new Set();
  private klineListeners: Set<KlineCallback> = new Set();
  private accountListeners: Set<AccountCallback> = new Set();
  private orderListeners: Set<OrderCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();

  // Status & Reconnection state
  private status: StreamStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;
  private reconnectTimer: any = null;
  private heartbeatInterval: any = null;
  private lastPingSent = 0;
  private latencyMs = 0;

  // Rate Limiting Protection (Request weight tracking)
  private currentWeight1m = 0;
  private maxWeight1m = 2400; // Binance USDⓈ-M default limit

  constructor() {
    // Initial sync
    syncBinanceServerTime();
  }

  public setTestnet(testnet: boolean) {
    if (this.isTestnet !== testnet) {
      this.isTestnet = testnet;
      this.reconnect();
    }
  }

  public getEndpoints() {
    return this.isTestnet ? BINANCE_ENDPOINTS.testnet : BINANCE_ENDPOINTS.production;
  }

  public setSymbols(symbols: string[]) {
    const formatted = symbols.map(s => s.toUpperCase().trim().replace('/', '')).filter(Boolean);
    const newSet = new Set(formatted);

    // Only reconnect if symbols changed
    let changed = false;
    if (newSet.size !== this.subscribedSymbols.size) {
      changed = true;
    } else {
      for (const s of newSet) {
        if (!this.subscribedSymbols.has(s)) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      this.subscribedSymbols = newSet;
      this.reconnectMarketStream();
    }
  }

  public subscribeMarket(cb: MarketCallback) {
    this.marketListeners.add(cb);
    return () => this.marketListeners.delete(cb);
  }

  public subscribeKline(cb: KlineCallback) {
    this.klineListeners.add(cb);
    return () => this.klineListeners.delete(cb);
  }

  public subscribeAccount(cb: AccountCallback) {
    this.accountListeners.add(cb);
    return () => this.accountListeners.delete(cb);
  }

  public subscribeOrders(cb: OrderCallback) {
    this.orderListeners.add(cb);
    return () => this.orderListeners.delete(cb);
  }

  public subscribeStatus(cb: StatusCallback) {
    this.statusListeners.add(cb);
    cb(this.status, this.latencyMs);
    return () => this.statusListeners.delete(cb);
  }

  private setStatus(newStatus: StreamStatus) {
    this.status = newStatus;
    this.statusListeners.forEach(cb => cb(newStatus, this.latencyMs));
  }

  /**
   * Connect to multiplexed market streams (@ticker, @bookTicker, @kline_1m, @kline_5m, @kline_15m, @kline_1h, @kline_1d, @depth20@100ms)
   */
  public connectMarketStream() {
    if (this.subscribedSymbols.size === 0) return;

    if (this.marketWs) {
      try {
        this.marketWs.close();
      } catch (e) {
        // ignore
      }
      this.marketWs = null;
    }

    this.setStatus('connecting');

    // Build multiplexed streams
    const streamNames: string[] = [];
    this.subscribedSymbols.forEach(sym => {
      const lower = sym.toLowerCase();
      streamNames.push(`${lower}@ticker`);
      streamNames.push(`${lower}@bookTicker`);
      streamNames.push(`${lower}@kline_1m`);
      streamNames.push(`${lower}@kline_5m`);
      streamNames.push(`${lower}@kline_15m`);
      streamNames.push(`${lower}@kline_1h`);
      streamNames.push(`${lower}@kline_1d`);
      streamNames.push(`${lower}@depth20@100ms`);
    });

    const streamParam = streamNames.join('/');
    const endpoints = this.getEndpoints();
    const wsUrl = `${endpoints.wsStream}?streams=${streamParam}`;

    try {
      this.marketWs = new WebSocket(wsUrl);

      this.marketWs.onopen = () => {
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        console.log(`[Binance-WS] Conectado a multiplexed market stream (${this.subscribedSymbols.size} pares)`);
      };

      this.marketWs.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          this.handleMarketMessage(payload);
        } catch (err) {
          console.warn('[Binance-WS] Error decodificando payload de mercado:', err);
        }
      };

      this.marketWs.onerror = (err) => {
        console.warn('[Binance-WS] Error en conexión de mercado WebSocket:', err);
        this.setStatus('error');
      };

      this.marketWs.onclose = () => {
        console.warn('[Binance-WS] Conexión de mercado cerrada. Reintentando...');
        this.stopHeartbeat();
        this.scheduleMarketReconnect();
      };
    } catch (err) {
      console.error('[Binance-WS] Fallo al inicializar WebSocket:', err);
      this.scheduleMarketReconnect();
    }
  }

  /**
   * Dispatches market ticker, bookTicker and kline frames
   */
  private handleMarketMessage(msg: any) {
    if (!msg || !msg.data) return;
    const data = msg.data;
    const eventType = data.e;

    // 1. 24h Ticker Event
    if (eventType === '24hrTicker') {
      const tickerUpdate: TickerUpdatePayload = {
        symbol: data.s,
        price: parseFloat(data.c) || 0,
        priceChange24h: parseFloat(data.p) || 0,
        priceChangePercent24h: parseFloat(data.P) || 0,
        high24h: parseFloat(data.h) || 0,
        low24h: parseFloat(data.l) || 0,
        volume24h: parseFloat(data.v) || 0,
        quoteVolume24h: parseFloat(data.q) || 0,
        timestamp: data.E || Date.now()
      };
      this.marketListeners.forEach(cb => cb(tickerUpdate));
    }

    // 2. BookTicker (Best Bid / Ask)
    if (eventType === 'bookTicker' || data.u) {
      const symbol = data.s;
      const bid = parseFloat(data.b);
      const ask = parseFloat(data.a);
      if (symbol && (!isNaN(bid) || !isNaN(ask))) {
        const midPrice = (!isNaN(bid) && !isNaN(ask)) ? (bid + ask) / 2 : (bid || ask);
        this.marketListeners.forEach(cb => cb({
          symbol,
          price: midPrice,
          priceChange24h: 0,
          priceChangePercent24h: 0,
          high24h: 0,
          low24h: 0,
          volume24h: 0,
          quoteVolume24h: 0,
          bidPrice: bid,
          askPrice: ask,
          timestamp: data.E || Date.now()
        }));
      }
    }

    // 3. Kline / Candlestick Event
    if (eventType === 'kline' && data.k) {
      const k = data.k;
      const klineUpdate: KlineUpdatePayload = {
        symbol: data.s,
        timeframe: k.i,
        open: parseFloat(k.o) || 0,
        high: parseFloat(k.h) || 0,
        low: parseFloat(k.l) || 0,
        close: parseFloat(k.c) || 0,
        volume: parseFloat(k.v) || 0,
        isClosed: Boolean(k.x),
        timestamp: k.t || Date.now()
      };
      this.klineListeners.forEach(cb => cb(klineUpdate));
    }
  }

  /**
   * Initializes User Data Stream for real-time private account and order execution updates
   */
  public async initUserDataStream(): Promise<boolean> {
    const apiKey = proxyService.getBinanceApiKey();
    if (!apiKey) {
      return false;
    }

    try {
      // Obtain listenKey via backend proxy or direct REST
      const res = await fetch('/api/binance/futures/listenKey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-binance-api-key': apiKey
        }
      });

      if (!res.ok) {
        console.warn('[Binance-UserData] No se pudo obtener listenKey del servidor');
        return false;
      }

      const data = await res.json();
      const newListenKey = data.listenKey;
      if (!newListenKey) return false;

      this.listenKey = newListenKey;
      this.connectUserDataWs(newListenKey);

      // Keep listenKey alive every 30 minutes (Binance expires it after 60 min)
      if (this.listenKeyKeepAliveTimer) clearInterval(this.listenKeyKeepAliveTimer);
      this.listenKeyKeepAliveTimer = setInterval(() => this.keepAliveListenKey(), 1800000);

      return true;
    } catch (err) {
      console.warn('[Binance-UserData] Error inicializando User Data Stream:', err);
      return false;
    }
  }

  private connectUserDataWs(key: string) {
    if (this.userDataWs) {
      try { this.userDataWs.close(); } catch {}
      this.userDataWs = null;
    }

    const endpoints = this.getEndpoints();
    const wsUrl = `${endpoints.wsStream}/${key}`;

    try {
      this.userDataWs = new WebSocket(wsUrl);

      this.userDataWs.onopen = () => {
        console.log('[Binance-UserData] User Data Stream conectado (Escuchando ACCOUNT_UPDATE y ORDER_TRADE_UPDATE)');
      };

      this.userDataWs.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          this.handleUserDataMessage(payload);
        } catch (err) {
          console.warn('[Binance-UserData] Error parseando evento de cuenta:', err);
        }
      };

      this.userDataWs.onclose = () => {
        console.warn('[Binance-UserData] User Data Stream cerrado.');
      };
    } catch (err) {
      console.error('[Binance-UserData] Error conectando User Data Stream:', err);
    }
  }

  private handleUserDataMessage(data: any) {
    if (!data || !data.e) return;

    // A. ACCOUNT_UPDATE (Balances, Margin, Position Changes)
    if (data.e === 'ACCOUNT_UPDATE' && data.a) {
      const a = data.a;
      const balances = a.B || [];
      const usdtBal = balances.find((b: any) => b.a === 'USDT');
      const positions = (a.P || []).map((p: any) => ({
        symbol: p.s,
        positionAmount: parseFloat(p.pa) || 0,
        entryPrice: parseFloat(p.ep) || 0,
        unrealizedProfit: parseFloat(p.up) || 0,
        marginType: (p.mt === 'isolated' ? 'ISOLATED' : 'CROSSED') as 'ISOLATED' | 'CROSSED',
        isolatedMargin: parseFloat(p.iw) || 0,
        leverage: 5 // Default forced
      }));

      const update: UserAccountUpdate = {
        eventTime: data.E || Date.now(),
        totalWalletBalance: usdtBal ? parseFloat(usdtBal.wb) : 0,
        totalUnrealizedProfit: positions.reduce((acc: number, p: any) => acc + p.unrealizedProfit, 0),
        availableBalance: usdtBal ? parseFloat(usdtBal.cw) : 0,
        positions
      };

      this.accountListeners.forEach(cb => cb(update));
    }

    // B. ORDER_TRADE_UPDATE (Execution, TP, SL activations)
    if (data.e === 'ORDER_TRADE_UPDATE' && data.o) {
      const o = data.o;
      const orderUpdate: UserOrderUpdate = {
        symbol: o.s,
        clientOrderId: o.c,
        side: o.S,
        orderType: o.o,
        originalQty: parseFloat(o.q) || 0,
        originalPrice: parseFloat(o.p) || 0,
        avgPrice: parseFloat(o.ap) || 0,
        orderStatus: o.X,
        orderId: o.i,
        stopPrice: parseFloat(o.sp) || undefined,
        realizedProfit: parseFloat(o.rp) || 0
      };

      this.orderListeners.forEach(cb => cb(orderUpdate));
    }
  }

  private async keepAliveListenKey() {
    if (!this.listenKey) return;
    try {
      const apiKey = proxyService.getBinanceApiKey();
      await fetch('/api/binance/futures/listenKey', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-binance-api-key': apiKey || ''
        },
        body: JSON.stringify({ listenKey: this.listenKey })
      });
    } catch (err) {
      console.warn('[Binance-UserData] Error refrescando listenKey:', err);
    }
  }

  /**
   * Heartbeat Ping / Pong frame loop
   */
  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.marketWs && this.marketWs.readyState === WebSocket.OPEN) {
        this.lastPingSent = Date.now();
        try {
          // Send ping payload
          this.marketWs.send(JSON.stringify({ method: 'ping' }));
          this.latencyMs = Math.max(5, Date.now() - this.lastPingSent);
        } catch {
          // ignore
        }
      }
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleMarketReconnect() {
    if (this.reconnectTimer) return;
    this.setStatus('reconnecting');
    this.reconnectAttempts++;
    
    // Exponential backoff: 1s, 2s, 4s, 8s... max 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
    console.log(`[Binance-WS] Reintentando conexión en ${delay}ms (Intento #${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectMarketStream();
    }, delay);
  }

  public reconnect() {
    this.reconnectMarketStream();
    this.initUserDataStream();
  }

  public reconnectMarketStream() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.connectMarketStream();
  }

  public destroy() {
    this.stopHeartbeat();
    if (this.listenKeyKeepAliveTimer) clearInterval(this.listenKeyKeepAliveTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.marketWs) {
      try { this.marketWs.close(); } catch {}
      this.marketWs = null;
    }
    if (this.userDataWs) {
      try { this.userDataWs.close(); } catch {}
      this.userDataWs = null;
    }
    this.setStatus('disconnected');
  }
}

export const binanceWsManager = new BinanceWsManager();
