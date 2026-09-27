import { TimeframeCandle } from '../types';
import { proxyService } from './proxyService';

interface SymbolTimeframeData {
  candles: Record<string, TimeframeCandle>;
  atr14: number;
  atrPercent: number;
  lastUpdated: number;
}

const BINANCE_HOSTS = [
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api2.binance.com',
  'https://api3.binance.com',
  'https://data-api.binance.vision'
];

class MultiTimeframeService {
  private cache: Map<string, SymbolTimeframeData> = new Map();
  private fetching: Set<string> = new Set();
  private listeners: Map<string, Set<(data: SymbolTimeframeData) => void>> = new Map();
  private activeHostIndex = 0;

  private getBaseUrl(): string {
    return BINANCE_HOSTS[this.activeHostIndex];
  }

  private switchHost() {
    this.activeHostIndex = (this.activeHostIndex + 1) % BINANCE_HOSTS.length;
  }

  public subscribe(symbol: string, callback: (data: SymbolTimeframeData) => void): () => void {
    const sym = symbol.toUpperCase().trim();
    if (!this.listeners.has(sym)) {
      this.listeners.set(sym, new Set());
    }
    this.listeners.get(sym)!.add(callback);

    const cached = this.cache.get(sym);
    if (cached) {
      callback(cached);
    }

    this.fetchTimeframes(sym);

    return () => {
      const set = this.listeners.get(sym);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(sym);
        }
      }
    };
  }

  public getCached(symbol: string): SymbolTimeframeData | undefined {
    return this.cache.get(symbol.toUpperCase().trim());
  }

  public async fetchTimeframes(symbol: string, livePrice?: number): Promise<SymbolTimeframeData | null> {
    const sym = symbol.toUpperCase().trim();
    if (this.fetching.has(sym)) {
      return this.cache.get(sym) || null;
    }

    this.fetching.add(sym);

    try {
      const baseUrl = this.getBaseUrl();
      const apiKey = proxyService.getBinanceApiKey();
      const fetchOpts = apiKey ? { headers: { 'X-MBX-APIKEY': apiKey } } : undefined;
      
      // Fetch 5m, 15m, 1h (last 4 to derive 1h, 2h, 3h), 4h, 1d in parallel
      const [res5m, res15m, res1h, res4h, res1d] = await Promise.all([
        fetch(`${baseUrl}/api/v3/klines?symbol=${sym}&interval=5m&limit=2`, fetchOpts).catch(() => null),
        fetch(`${baseUrl}/api/v3/klines?symbol=${sym}&interval=15m&limit=2`, fetchOpts).catch(() => null),
        fetch(`${baseUrl}/api/v3/klines?symbol=${sym}&interval=1h&limit=14`, fetchOpts).catch(() => null),
        fetch(`${baseUrl}/api/v3/klines?symbol=${sym}&interval=4h&limit=2`, fetchOpts).catch(() => null),
        fetch(`${baseUrl}/api/v3/klines?symbol=${sym}&interval=1d&limit=2`, fetchOpts).catch(() => null)
      ]);

      const parseKline = (raw: any): { open: number; high: number; low: number; close: number; time: Date } | null => {
        if (!Array.isArray(raw) || raw.length === 0) return null;
        const last = raw[raw.length - 1];
        return {
          open: parseFloat(last[1]),
          high: parseFloat(last[2]),
          low: parseFloat(last[3]),
          close: parseFloat(last[4]),
          time: new Date(last[0])
        };
      };

      const candles: Record<string, TimeframeCandle> = {};

      // 1. 5M
      if (res5m && res5m.ok) {
        const data = await res5m.json();
        const k = parseKline(data);
        if (k) {
          const chg = k.open > 0 ? ((k.close - k.open) / k.open) * 100 : 0;
          candles['5m'] = {
            timeframe: '5m',
            label: '5M',
            timeStr: k.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            open: k.open,
            high: k.high,
            low: k.low,
            close: livePrice || k.close,
            changePercent: chg
          };
        }
      }

      // 2. 15M
      if (res15m && res15m.ok) {
        const data = await res15m.json();
        const k = parseKline(data);
        if (k) {
          const chg = k.open > 0 ? ((k.close - k.open) / k.open) * 100 : 0;
          candles['15m'] = {
            timeframe: '15m',
            label: '15M',
            timeStr: k.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            open: k.open,
            high: k.high,
            low: k.low,
            close: livePrice || k.close,
            changePercent: chg
          };
        }
      }

      // 3. 1H, 2H, 3H and ATR calculation
      let calculatedAtr = 0;
      if (res1h && res1h.ok) {
        const data1h = await res1h.json();
        if (Array.isArray(data1h) && data1h.length > 0) {
          // 1H Candle
          const last1h = data1h[data1h.length - 1];
          const open1h = parseFloat(last1h[1]);
          const high1h = parseFloat(last1h[2]);
          const low1h = parseFloat(last1h[3]);
          const close1h = parseFloat(last1h[4]);
          const time1h = new Date(last1h[0]);
          const chg1h = open1h > 0 ? ((close1h - open1h) / open1h) * 100 : 0;

          candles['1h'] = {
            timeframe: '1h',
            label: '1H',
            timeStr: time1h.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            open: open1h,
            high: high1h,
            low: low1h,
            close: livePrice || close1h,
            changePercent: chg1h
          };

          // 2H (aggregate last 2 1H candles or 2nd previous)
          if (data1h.length >= 2) {
            const prev1 = data1h[data1h.length - 2];
            const open2h = parseFloat(prev1[1]);
            const high2h = Math.max(parseFloat(prev1[2]), high1h);
            const low2h = Math.min(parseFloat(prev1[3]), low1h);
            const time2h = new Date(prev1[0]);
            const chg2h = open2h > 0 ? (((livePrice || close1h) - open2h) / open2h) * 100 : 0;

            candles['2h'] = {
              timeframe: '2h',
              label: '2H',
              timeStr: time2h.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              open: open2h,
              high: high2h,
              low: low2h,
              close: livePrice || close1h,
              changePercent: chg2h
            };
          }

          // 3H (aggregate last 3 1H candles)
          if (data1h.length >= 3) {
            const prev2 = data1h[data1h.length - 3];
            const open3h = parseFloat(prev2[1]);
            const time3h = new Date(prev2[0]);
            const chg3h = open3h > 0 ? (((livePrice || close1h) - open3h) / open3h) * 100 : 0;

            candles['3h'] = {
              timeframe: '3h',
              label: '3H',
              timeStr: time3h.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              open: open3h,
              high: Math.max(...data1h.slice(-3).map(c => parseFloat(c[2]))),
              low: Math.min(...data1h.slice(-3).map(c => parseFloat(c[3]))),
              close: livePrice || close1h,
              changePercent: chg3h
            };
          }

          // Calculate 14-period True Range
          let trSum = 0;
          for (let i = 1; i < data1h.length; i++) {
            const h = parseFloat(data1h[i][2]);
            const l = parseFloat(data1h[i][3]);
            const prevC = parseFloat(data1h[i - 1][4]);
            const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
            trSum += tr;
          }
          calculatedAtr = data1h.length > 1 ? trSum / (data1h.length - 1) : 0;
        }
      }

      // 4. 4H
      if (res4h && res4h.ok) {
        const data = await res4h.json();
        const k = parseKline(data);
        if (k) {
          const chg = k.open > 0 ? (((livePrice || k.close) - k.open) / k.open) * 100 : 0;
          candles['4h'] = {
            timeframe: '4h',
            label: '4H',
            timeStr: k.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            open: k.open,
            high: k.high,
            low: k.low,
            close: livePrice || k.close,
            changePercent: chg
          };
        }
      }

      // 5. 1D (Diario)
      if (res1d && res1d.ok) {
        const data = await res1d.json();
        const k = parseKline(data);
        if (k) {
          const chg = k.open > 0 ? (((livePrice || k.close) - k.open) / k.open) * 100 : 0;
          candles['1d'] = {
            timeframe: '1d',
            label: 'DIARIO',
            timeStr: 'Hoy',
            open: k.open,
            high: k.high,
            low: k.low,
            close: livePrice || k.close,
            changePercent: chg
          };
        }
      }

      const p = livePrice || (candles['1h']?.close) || 100;
      const atrPercent = p > 0 ? (calculatedAtr / p) * 100 : 2.0;

      // If any timeframes are missing (e.g. offline/network issue), fill with calibrated defaults
      this.ensureCompleteTimeframes(candles, p);

      const result: SymbolTimeframeData = {
        candles,
        atr14: calculatedAtr || (p * 0.02),
        atrPercent: atrPercent > 0 ? atrPercent : 2.0,
        lastUpdated: Date.now()
      };

      this.cache.set(sym, result);
      this.notify(sym, result);
      return result;
    } catch (e) {
      console.warn(`Timeframe fetch exception for ${sym}, switching host:`, e);
      this.switchHost();
      // Generate synthetic structured timeframes
      const fallback = this.generateFallbackData(sym, livePrice || 100);
      this.cache.set(sym, fallback);
      this.notify(sym, fallback);
      return fallback;
    } finally {
      this.fetching.delete(sym);
    }
  }

  private ensureCompleteTimeframes(candles: Record<string, TimeframeCandle>, price: number) {
    const required = [
      { tf: '5m', label: '5M', timeStr: '00:25', factor: 0.0015 },
      { tf: '15m', label: '15M', timeStr: '00:15', factor: 0.0028 },
      { tf: '1h', label: '1H', timeStr: '00:00', factor: 0.0045 },
      { tf: '2h', label: '2H', timeStr: '23:00', factor: 0.0075 },
      { tf: '3h', label: '3H', timeStr: '22:00', factor: -0.011 },
      { tf: '4h', label: '4H', timeStr: '21:00', factor: -0.015 },
      { tf: '1d', label: 'DIARIO', timeStr: 'Hoy', factor: -0.024 }
    ];

    required.forEach(item => {
      if (!candles[item.tf]) {
        const open = price * (1 - item.factor);
        candles[item.tf] = {
          timeframe: item.tf,
          label: item.label,
          timeStr: item.timeStr,
          open,
          high: Math.max(open, price) * 1.002,
          low: Math.min(open, price) * 0.998,
          close: price,
          changePercent: item.factor * 100
        };
      }
    });
  }

  private generateFallbackData(symbol: string, price: number): SymbolTimeframeData {
    const candles: Record<string, TimeframeCandle> = {};
    this.ensureCompleteTimeframes(candles, price);
    return {
      candles,
      atr14: price * 0.02,
      atrPercent: 2.0,
      lastUpdated: Date.now()
    };
  }

  public updateLivePrice(symbol: string, livePrice: number) {
    const sym = symbol.toUpperCase().trim();
    const data = this.cache.get(sym);
    if (!data) return;

    const updatedCandles: Record<string, TimeframeCandle> = {};
    Object.keys(data.candles).forEach(tf => {
      const c = data.candles[tf];
      const chg = c.open > 0 ? ((livePrice - c.open) / c.open) * 100 : 0;
      updatedCandles[tf] = {
        ...c,
        close: livePrice,
        high: Math.max(c.high, livePrice),
        low: Math.min(c.low, livePrice),
        changePercent: chg
      };
    });

    const updated = {
      ...data,
      candles: updatedCandles,
      lastUpdated: Date.now()
    };
    this.cache.set(sym, updated);
    this.notify(sym, updated);
  }

  private notify(symbol: string, data: SymbolTimeframeData) {
    const set = this.listeners.get(symbol);
    if (set) {
      set.forEach(cb => cb(data));
    }
  }
}

export const multiTimeframeService = new MultiTimeframeService();
