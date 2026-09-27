import { LiveTickerData } from '../types';
import { klineCache } from './klineService';
import { multiTimeframeService } from './multiTimeframeService';

type TickerCallback = (ticker: LiveTickerData) => void;
type StatusCallback = (status: 'connected' | 'connecting' | 'error' | 'idle') => void;

class BinanceStreamManager {
  private ws: WebSocket | null = null;
  private symbols: Set<string> = new Set();
  private tickerCallbacks: Set<TickerCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  private status: 'connected' | 'connecting' | 'error' | 'idle' = 'idle';
  private reconnectTimer: any = null;
  private restPollTimer: any = null;
  private lastPrices: Map<string, number> = new Map();
  private isDestroyed = false;

  public setSymbols(symbolsList: string[]) {
    const formatted = symbolsList.map(s => s.toUpperCase().trim()).filter(Boolean);
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
      this.reconnect();
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

    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        console.error('Error closing existing ws:', e);
      }
      this.ws = null;
    }

    this.setStatus('connecting');

    // Create stream query: btcusdt@ticker/ethusdt@ticker/...
    const streamNames = Array.from(this.symbols)
      .map(s => `${s.toLowerCase()}@ticker`)
      .join('/');

    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streamNames}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('connected');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message && message.data) {
            this.handleTickerPayload(message.data);
          }
        } catch (err) {
          console.warn('Error parsing Binance ws message:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('Binance WebSocket error, falling back to REST poll:', err);
        this.setStatus('error');
      };

      this.ws.onclose = () => {
        if (!this.isDestroyed) {
          this.setStatus('connecting');
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      console.warn('WebSocket init exception, starting REST poll fallback:', err);
      this.setStatus('error');
      this.scheduleReconnect();
    }

    // Start background REST poll as safety net
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
      // Binance 24hr ticker endpoint
      const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
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
      console.warn('REST snapshot fallback error:', e);
    }
  }

  private startRestPolling() {
    if (this.restPollTimer) return;
    this.restPollTimer = setInterval(() => {
      // If WebSocket is not connected, use REST polling every 3 seconds
      if (this.status !== 'connected') {
        this.fetchRestSnapshot();
      }
    }, 3000);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 4000);
  }

  public reconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.connect();
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.restPollTimer) clearInterval(this.restPollTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }
    this.tickerCallbacks.clear();
    this.statusCallbacks.clear();
  }
}

export const binanceStream = new BinanceStreamManager();
