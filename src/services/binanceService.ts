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
    
    let tickerData: any[] = [];
    
    // 1. Try local server proxy endpoint first (bypasses CORS & geoblocks)
    try {
      const res = await fetch('/api/binance/ticker/24hr');
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          tickerData = json.data;
        }
      }
    } catch {
      // ignore
    }

    // 2. Direct fallback if proxy returned empty
    if (!tickerData || tickerData.length === 0) {
      try {
        const apiKey = proxyService.getBinanceApiKey();
        const headers: Record<string, string> = {};
        if (apiKey) {
          headers['X-MBX-APIKEY'] = apiKey;
        }

        const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr', { headers });
        if (response.ok) {
          tickerData = await response.json();
        }
      } catch (e) {
        console.warn('REST USD-M Futures snapshot fallback warning:', e);
      }
    }

    if (Array.isArray(tickerData) && tickerData.length > 0) {
      tickerData.forEach((item: any) => {
        const sym = (item.symbol || '').toUpperCase();
        if (this.symbols.has(sym)) {
          this.handleTickerPayload({
            s: sym,
            c: item.lastPrice || item.price,
            p: item.priceChange,
            P: item.priceChangePercent,
            h: item.highPrice || item.high,
            l: item.lowPrice || item.low,
            v: item.volume
          });
        }
      });
    }
  }

  private startRestPolling() {
    if (this.restPollTimer) return;
    // Initial fetch immediately
    this.fetchRestSnapshot();
    // Continuous polling every 3.5 seconds as guaranteed backup stream
    this.restPollTimer = setInterval(() => {
      this.fetchRestSnapshot();
    }, 3500);
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
