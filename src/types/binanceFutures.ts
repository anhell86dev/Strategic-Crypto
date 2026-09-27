export interface BinanceFuturesPosition {
  symbol: string;
  positionAmt: number;
  entryPrice: number;
  markPrice: number;
  unRealizedProfit: number;
  liquidationPrice: number;
  leverage: number;
  marginType: 'cross' | 'isolated' | string;
  isolatedMargin: number;
  positionSide: 'BOTH' | 'LONG' | 'SHORT';
  notional: number;
  roe: number; // Return on Equity %
  side: 'LONG' | 'SHORT';
  breakEvenPrice?: number;
  updateTime?: number;
}

export interface BinanceFuturesAsset {
  asset: string;
  walletBalance: number;
  unrealizedProfit: number;
  marginBalance: number;
  availableBalance: number;
  crossWalletBalance: number;
}

export interface BinanceFuturesAccount {
  totalWalletBalance: number;
  totalUnrealizedProfit: number;
  totalMarginBalance: number;
  availableBalance: number;
  totalInitialMargin: number;
  totalMaintMargin: number;
  marginRatio?: number; // maintenance margin / margin balance * 100
  assets: BinanceFuturesAsset[];
  positions: BinanceFuturesPosition[];
  openPositionsCount: number;
  canTrade: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  feeTier: number;
  updateTime: number;
}

export interface BinanceFuturesOrder {
  orderId: number;
  symbol: string;
  status: string;
  clientOrderId: string;
  price: number;
  avgPrice: number;
  origQty: number;
  executedQty: number;
  cumQuote: number;
  timeInForce: string;
  type: string;
  reduceOnly: boolean;
  closePosition: boolean;
  side: 'BUY' | 'SELL';
  positionSide: 'BOTH' | 'LONG' | 'SHORT';
  stopPrice: number;
  workingType: string;
  priceProtect: boolean;
  origType: string;
  time: number;
  updateTime: number;
}

export interface BinanceFuturesConnectionStatus {
  configured: boolean;
  hasKey: boolean;
  hasSecret: boolean;
  testnet: boolean;
  connected: boolean;
  source: 'environment' | 'proxy' | 'none';
  error?: string;
  latencyMs?: number;
  serverTime?: number;
}
