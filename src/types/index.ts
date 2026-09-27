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
}

export interface TakeProfitOrder {
  strategyId: number;
  type: string; // e.g. "TP1", "TP2", "TP3", "TP4"
  targetPrice: number;
  closePercentage: number; // e.g. 40 (means 40%)
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
  riskRewardRatio?: number;
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
