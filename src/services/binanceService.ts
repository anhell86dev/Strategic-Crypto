import { LiveTickerData } from '../types';
import { klineCache } from './klineService';
import { multiTimeframeService } from './multiTimeframeService';
import { proxyService } from './proxyService';
import { binanceWsManager } from './binanceWs';

type TickerCallback = (ticker: LiveTickerData) => void;
type StatusCallback = (status: 'connected' | 'connecting' | 'error' | 'idle') => void;

class BinanceStreamManager {
  private symbols: Set<string> = new Set();
  private tickerCallbacks: Set<TickerCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  private status: 'connected' | 'connecting' | 'error' | 'idle' = 'idle';
  private restPollTimer: any = null;
  private lastPrices: Map<string, number> = new Map();
  private isDestroyed = false;

  constructor() {
    // Connect to binanceWsManager market stream events
    binanceWsManager.subscribeMarket((t) => {
      this.handleTickerPayload({
        s: t.symbol,
        c: t.price,
        p: t.priceChange24h,
        P: t.priceChangePercent24h,
        h: t.high24h,
        l: t.low24h,
        v: t.volume24h
      });
    });

    binanceWsManager.subscribeStatus((st) => {
      const mappedStatus = (st === 'connected' || st === 'connecting' || st === 'error') ? st : 'idle';
      this.setStatus(mappedStatus);
    });
  }

  public setSymbols(symbolsList: string[]) {
    const formatted = symbolsList.map(s => s.toUpperCase().trim().replace('/', '')).filter(Boolean);
    const newSet = new Set(formatted);
    
    // Check if symbol set changed
    let changed = false;
    if (newSet.size !== this.symbols.size) {
      changed = true;
    } else {
      for (const s of newSet) {
        if (!this.symbols.has(s)) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      this.symbols = newSet;
      binanceWsManager.setSymbols(Array.from(newSet));
      this.connect();
      // Fetch initial snapshot via REST
      this.fetchRestSnapshot();
    }
  }

  public subscribeTicker(cb: TickerCallback) {
    this.tickerCallbacks.add(cb);
    return () => this.tickerCallbacks.delete(cb);
  }

  public subscribeStatus(cb: StatusCallback) {
    this.statusCallbacks.add(cb);
    cb(this.status);
    return () => this.statusCallbacks.delete(cb);
  }

  private setStatus(newStatus: 'connected' | 'connecting' | 'error' | 'idle') {
    this.status = newStatus;
    this.statusCallbacks.forEach(cb => cb(newStatus));
  }

  public connect() {
    if (this.isDestroyed || this.symbols.size === 0) return;
    binanceWsManager.connectMarketStream();
    this.startRestPolling();
  }

  private handleTickerPayload(data: any) {
    const symbol = (data.s || '').toUpperCase();
    const price = parseFloat(data.c || '0');
    if (!symbol || isNaN(price) || price <= 0) return;

    const prevPrice = this.lastPrices.get(symbol);
    let direction: 'up' | 'down' | 'neutral' = 'neutral';
    if (prevPrice !== undefined) {
      if (price > prevPrice) direction = 'up';
      else if (price < prevPrice) direction = 'down';
    }
    this.lastPrices.set(symbol, price);

    const ticker: LiveTickerData = {
      symbol,
      price,
      priceChange: parseFloat(data.p || '0'),
      priceChangePercent: parseFloat(data.P || '0'),
      high: parseFloat(data.h || '0'),
      low: parseFloat(data.l || '0'),
      volume: parseFloat(data.v || '0'),
      direction,
      timestamp: Date.now()
    };

    klineCache.updateLatestTick(symbol, price);
    multiTimeframeService.updateLivePrice(symbol, price);

    this.tickerCallbacks.forEach(cb => cb(ticker));
  }

  public async fetchRestSnapshot() {
    if (this.symbols.size === 0) return;
    try {
      const apiKey = proxyService.getBinanceApiKey();
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['X-MBX-APIKEY'] = apiKey;
      }

      // Binance USDⓈ-M Futures 24hr ticker endpoint
      const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr', { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          const sym = (item.symbol || '').toUpperCase();
          if (this.symbols.has(sym)) {
            this.handleTickerPayload({
              s: sym,
              c: item.lastPrice,
              p: item.priceChange,
              P: item.priceChangePercent,
              h: item.highPrice,
              l: item.lowPrice,
              v: item.volume
            });
          }
        });
      }
    } catch (e) {
      console.warn('REST USD-M Futures snapshot fallback warning:', e);
    }
  }

  private startRestPolling() {
    if (this.restPollTimer) return;
    this.restPollTimer = setInterval(() => {
      // If WebSocket is not connected, use REST polling every 4 seconds as safety net
      if (this.status !== 'connected') {
        this.fetchRestSnapshot();
      }
    }, 4000);
  }

  public reconnect() {
    binanceWsManager.reconnect();
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.restPollTimer) clearInterval(this.restPollTimer);
    binanceWsManager.destroy();
    this.tickerCallbacks.clear();
    this.statusCallbacks.clear();
  }
}

export const binanceStream = new BinanceStreamManager();
