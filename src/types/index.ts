export interface DcaLevel {
  level: string; // e.g. "E2 DCA", "E3 Carga"
  price: number;
  allocationPercent: number; // e.g. 30 (means 30%)
  label: string; // e.g. "Soporte 1", "Piso Extremo"
}

export interface TimeframeCandle {
  timeframe: string; // "5m", "15m", "1h", "2h", "3h", "4h", "1d"
  label: string; // e.g. "5M", "15M", "1H / ACTUAL", "2H", "3H", "4H", "DIARIO"
  timeStr: string; // e.g. "00:25", "Hoy"
  open: number;
  high: number;
  low: number;
  close: number;
  changePercent: number;
}

export interface Strategy {
  id: number;
  symbol: string; // e.g. "BTCUSDT"
  coinName: string; // e.g. "Bitcoin"
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  date: string;
  status: 'Active' | 'Pending' | 'Completed';
  category?: string;
  notes?: string;
  customAlertThreshold?: number; // e.g. 1.0 (means 1.0% threshold instead of default 1.5%)
  leverage?: number; // e.g. 5 (5x)
  initialAllocation?: number; // e.g. 50 (%)
  dcaLevels?: DcaLevel[];
}

export interface TakeProfitOrder {
  strategyId: number;
  type: string; // e.g. "TP1", "TP2", "TP3", "TP4"
  targetPrice: number;
  closePercentage: number; // e.g. 40 (means 40%)
  label?: string; // e.g. "Gatillo de BE", "Trailing", "Target Max"
}

export interface StrategyWithOrders extends Strategy {
  orders: TakeProfitOrder[];
  currentPrice?: number;
  priceChange24h?: number;
  priceChangePercent24h?: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  lastTickTime?: number;
  priceDirection?: 'up' | 'down' | 'neutral';
  distancePercent?: number;
  isAlertZone?: boolean;
  effectiveThreshold?: number;
  riskRewardRatio?: number;
  timeframeCandles?: Record<string, TimeframeCandle>;
  atr14?: number;
  atrPercent?: number;
}

export interface LiveTickerData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  high: number;
  low: number;
  volume: number;
  direction?: 'up' | 'down' | 'neutral';
  timestamp: number;
}

export type ConnectionStatus = 'connected' | 'connecting' | 'error' | 'idle';

export interface SheetsConfig {
  spreadsheetId: string;
  apiKey: string;
  autoSync: boolean;
  syncIntervalSeconds: number;
  usePresetFallback: boolean;
}

export interface TradeLogEntry {
  id: string;
  strategyId: number;
  symbol: string;
  coinName: string;
  type: 'LONG' | 'SHORT';
  plannedEntry: number;
  executionPrice: number;
  distanceAtFill: number;
  timestamp: string; // ISO string
  status: 'ENTRY_FILLED' | 'ZONE_TRIGGERED' | 'TP_HIT' | 'SL_HIT';
  notes?: string;
  takeProfitsCount?: number;
}
