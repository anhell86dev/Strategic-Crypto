import { TradeLogEntry, StrategyWithOrders } from '../types';

const STORAGE_KEY_TRADE_LOG = 'crypto_radar_trade_log_history';

// Realistic initial history to make the component rich from turn 1
const INITIAL_LOGS: TradeLogEntry[] = [
  {
    id: 'log-1727404200000',
    strategyId: 1,
    symbol: 'BTCUSDT',
    coinName: 'Bitcoin',
    type: 'LONG',
    plannedEntry: 84250.00,
    executionPrice: 84248.50,
    distanceAtFill: 0.02,
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18 mins ago
    status: 'ENTRY_FILLED',
    notes: 'Orden límite activada en soporte $84,250 con rebote institucional.',
    takeProfitsCount: 3
  },
  {
    id: 'log-1727402400000',
    strategyId: 3,
    symbol: 'SOLUSDT',
    coinName: 'Solana',
    type: 'LONG',
    plannedEntry: 121.50,
    executionPrice: 121.45,
    distanceAtFill: 0.04,
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    status: 'ENTRY_FILLED',
    notes: 'Toque de zona de demanda Fibonacci 0.618 completado.',
    takeProfitsCount: 3
  },
  {
    id: 'log-1727398800000',
    strategyId: 4,
    symbol: 'NEARUSDT',
    coinName: 'NEAR Protocol',
    type: 'SHORT',
    plannedEntry: 5.48,
    executionPrice: 5.49,
    distanceAtFill: 0.18,
    timestamp: new Date(Date.now() - 1000 * 60 * 110).toISOString(), // ~2 hours ago
    status: 'ZONE_TRIGGERED',
    notes: 'Resistencia en $5.48 testeada con divergencia de volumen.',
    takeProfitsCount: 3
  },
  {
    id: 'log-1727391600000',
    strategyId: 5,
    symbol: 'SUIUSDT',
    coinName: 'Sui',
    type: 'LONG',
    plannedEntry: 1.175,
    executionPrice: 1.176,
    distanceAtFill: 0.08,
    timestamp: new Date(Date.now() - 1000 * 60 * 220).toISOString(),
    status: 'TP_HIT',
    notes: 'TP1 alcanzado exitosamente en $1.28 (+8.93%).',
    takeProfitsCount: 3
  }
];

export class TradeLogService {
  private static filledStrategySet: Set<number> = new Set();
  private static lastTriggerTimes: Map<string, number> = new Map();

  public static getLogs(): TradeLogEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TRADE_LOG);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading trade logs:', e);
    }
    return INITIAL_LOGS;
  }

  public static saveLogs(logs: TradeLogEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_TRADE_LOG, JSON.stringify(logs));
    } catch (e) {
      console.warn('Error saving trade logs:', e);
    }
  }

  public static addEntry(entry: TradeLogEntry): TradeLogEntry[] {
    const current = this.getLogs();
    const updated = [entry, ...current].slice(0, 100); // Keep max 100 entries
    this.saveLogs(updated);
    return updated;
  }

  public static clearLogs(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_TRADE_LOG);
    } catch (e) {
      console.warn('Error clearing trade logs:', e);
    }
  }

  /**
   * Evaluates strategies to automatically detect filled / triggered entries
   */
  public static checkAndTrackFills(
    strategies: StrategyWithOrders[],
    currentLogs: TradeLogEntry[],
    onNewFill: (newEntry: TradeLogEntry) => void
  ): void {
    const now = Date.now();

    strategies.forEach(strategy => {
      const { id, symbol, coinName, type, entryPrice, currentPrice, distancePercent, orders } = strategy;
      if (!currentPrice || currentPrice <= 0 || !entryPrice || entryPrice <= 0) return;

      const dist = distancePercent !== undefined ? distancePercent : 999;
      const key = `${id}-${symbol}`;
      const lastTrigger = this.lastTriggerTimes.get(key) || 0;

      // Condition: Very close to entry (< 0.25% distance) and not triggered in the last 15 minutes
      const isFilledThreshold = dist <= 0.25;

      if (isFilledThreshold && now - lastTrigger > 15 * 60 * 1000) {
        this.lastTriggerTimes.set(key, now);
        this.filledStrategySet.add(id);

        const newEntry: TradeLogEntry = {
          id: `fill-${now}-${id}`,
          strategyId: id,
          symbol,
          coinName: coinName || symbol.replace('USDT', ''),
          type,
          plannedEntry: entryPrice,
          executionPrice: currentPrice,
          distanceAtFill: dist,
          timestamp: new Date().toISOString(),
          status: dist <= 0.08 ? 'ENTRY_FILLED' : 'ZONE_TRIGGERED',
          notes: `Precio de mercado ($${currentPrice.toLocaleString()}) alcanzó la zona de entrada planificada ($${entryPrice.toLocaleString()}) con desviación de ${dist.toFixed(2)}%.`,
          takeProfitsCount: orders?.length || 0
        };

        onNewFill(newEntry);
      }
    });
  }
}
