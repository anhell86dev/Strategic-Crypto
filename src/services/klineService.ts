export interface SparklinePoint {
  time: string;
  timestamp: number;
  price: number;
}

class KlineCacheService {
  private cache: Map<string, SparklinePoint[]> = new Map();
  private fetching: Set<string> = new Set();
  private listeners: Map<string, Set<(points: SparklinePoint[]) => void>> = new Map();

  public getCached(symbol: string): SparklinePoint[] | undefined {
    return this.cache.get(symbol.toUpperCase());
  }

  public subscribe(symbol: string, callback: (points: SparklinePoint[]) => void): () => void {
    const sym = symbol.toUpperCase();
    if (!this.listeners.has(sym)) {
      this.listeners.set(sym, new Set());
    }
    this.listeners.get(sym)!.add(callback);

    // If already in cache, notify immediately
    const existing = this.cache.get(sym);
    if (existing && existing.length > 0) {
      callback(existing);
    } else {
      this.fetch15mKlines(sym);
    }

    return () => {
      const subs = this.listeners.get(sym);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.listeners.delete(sym);
        }
      }
    };
  }

  public async fetch15mKlines(symbol: string): Promise<SparklinePoint[]> {
    const sym = symbol.toUpperCase();
    if (this.fetching.has(sym)) {
      return this.cache.get(sym) || [];
    }

    this.fetching.add(sym);
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${sym}&interval=1m&limit=15`
      );

      if (!response.ok) {
        throw new Error(`Kline HTTP status ${response.status}`);
      }

      const raw = await response.json();
      if (Array.isArray(raw) && raw.length > 0) {
        const points: SparklinePoint[] = raw.map((candle: any) => {
          const timestamp = typeof candle[0] === 'number' ? candle[0] : parseInt(candle[0]);
          const closePrice = parseFloat(candle[4]);
          const date = new Date(timestamp);
          const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return {
            time,
            timestamp,
            price: closePrice
          };
        });

        this.cache.set(sym, points);
        this.notify(sym, points);
        return points;
      }
    } catch (err) {
      console.warn(`Kline fetch failed for ${sym}, using fallback curve:`, err);
    } finally {
      this.fetching.delete(sym);
    }

    return this.cache.get(sym) || [];
  }

  public updateLatestTick(symbol: string, price: number) {
    const sym = symbol.toUpperCase();
    let points = this.cache.get(sym);
    const now = Date.now();
    const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (!points || points.length === 0) {
      // Generate synthetic 15-minute warmup curve anchored to current price
      points = this.generateSynthetic15m(price, now);
      this.cache.set(sym, points);
      this.notify(sym, points);
      return;
    }

    const lastPoint = points[points.length - 1];
    // If within same 1-minute window, update current minute price
    if (now - lastPoint.timestamp < 60000) {
      const updated = [...points];
      updated[updated.length - 1] = {
        ...lastPoint,
        price
      };
      this.cache.set(sym, updated);
      this.notify(sym, updated);
    } else {
      // Add new minute point and keep max 15 points
      const updated = [
        ...points.slice(points.length >= 15 ? 1 : 0),
        { time: timeStr, timestamp: now, price }
      ];
      this.cache.set(sym, updated);
      this.notify(sym, updated);
    }
  }

  private generateSynthetic15m(currentPrice: number, now: number): SparklinePoint[] {
    const points: SparklinePoint[] = [];
    const volatility = 0.0015; // 0.15% per step
    let price = currentPrice * (1 - (Math.random() * 0.008 - 0.004));

    for (let i = 14; i >= 0; i--) {
      const timestamp = now - i * 60000;
      const date = new Date(timestamp);
      const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (i === 0) {
        price = currentPrice;
      } else {
        const delta = (Math.random() - 0.49) * volatility * price;
        price = Math.max(0.000001, price + delta);
      }

      points.push({
        time,
        timestamp,
        price
      });
    }

    return points;
  }

  private notify(symbol: string, points: SparklinePoint[]) {
    const subs = this.listeners.get(symbol);
    if (subs) {
      subs.forEach(cb => cb(points));
    }
  }
}

export const klineCache = new KlineCacheService();
