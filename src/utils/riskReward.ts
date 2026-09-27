import { StrategyWithOrders } from '../types';

export interface RiskRewardAnalysis {
  slDistancePct: number;
  maxRewardPct: number;
  tp1RewardPct: number;
  maxRiskReward: number; // e.g. 3.5 means 1:3.5
  tp1RiskReward: number; // e.g. 1.8 means 1:1.8
  weightedRiskReward: number;
  formattedRatio: string; // "1:3.50"
  formattedTp1Ratio: string; // "1:1.80"
  quality: 'excellent' | 'good' | 'moderate' | 'low';
}

export function calculateRiskReward(strategy: {
  entryPrice: number;
  stopLoss: number;
  type: 'LONG' | 'SHORT';
  orders?: { targetPrice: number; closePercentage?: number }[];
}): RiskRewardAnalysis {
  const { entryPrice, stopLoss, type, orders = [] } = strategy;

  if (!entryPrice || entryPrice <= 0 || !stopLoss || stopLoss <= 0) {
    return {
      slDistancePct: 0,
      maxRewardPct: 0,
      tp1RewardPct: 0,
      maxRiskReward: 0,
      tp1RiskReward: 0,
      weightedRiskReward: 0,
      formattedRatio: '1:0.0',
      formattedTp1Ratio: '1:0.0',
      quality: 'low'
    };
  }

  // Risk calculation (distance to Stop Loss)
  const isLong = type === 'LONG';
  const slDelta = Math.abs(entryPrice - stopLoss);
  const slDistancePct = (slDelta / entryPrice) * 100;

  if (slDelta <= 0 || slDistancePct <= 0) {
    return {
      slDistancePct: 0,
      maxRewardPct: 0,
      tp1RewardPct: 0,
      maxRiskReward: 0,
      tp1RiskReward: 0,
      weightedRiskReward: 0,
      formattedRatio: '1:0.0',
      formattedTp1Ratio: '1:0.0',
      quality: 'low'
    };
  }

  // Find TP targets
  const validOrders = orders.filter(o => o.targetPrice && o.targetPrice > 0);

  if (validOrders.length === 0) {
    // Default fallback reward estimate (e.g. 2x SL risk)
    const defaultRewardPct = slDistancePct * 2;
    return {
      slDistancePct,
      maxRewardPct: defaultRewardPct,
      tp1RewardPct: defaultRewardPct,
      maxRiskReward: 2.0,
      tp1RiskReward: 2.0,
      weightedRiskReward: 2.0,
      formattedRatio: '1:2.00',
      formattedTp1Ratio: '1:2.00',
      quality: 'good'
    };
  }

  // TP1
  const tp1 = validOrders[0];
  const tp1Delta = Math.abs(tp1.targetPrice - entryPrice);
  const tp1RewardPct = (tp1Delta / entryPrice) * 100;
  const tp1RiskReward = tp1Delta / slDelta;

  // Max TP (Final TP)
  const maxTpPrice = isLong
    ? Math.max(...validOrders.map(o => o.targetPrice))
    : Math.min(...validOrders.map(o => o.targetPrice));

  const maxDelta = Math.abs(maxTpPrice - entryPrice);
  const maxRewardPct = (maxDelta / entryPrice) * 100;
  const maxRiskReward = maxDelta / slDelta;

  // Weighted Average R:B
  let totalAlloc = 0;
  let weightedRewardSum = 0;

  validOrders.forEach(o => {
    const alloc = o.closePercentage || (100 / validOrders.length);
    const orderDelta = Math.abs(o.targetPrice - entryPrice);
    const orderRr = orderDelta / slDelta;
    weightedRewardSum += (alloc / 100) * orderRr;
    totalAlloc += alloc;
  });

  const weightedRiskReward = totalAlloc > 0 ? (weightedRewardSum / (totalAlloc / 100)) : maxRiskReward;

  let quality: 'excellent' | 'good' | 'moderate' | 'low' = 'low';
  if (maxRiskReward >= 3.0) quality = 'excellent';
  else if (maxRiskReward >= 2.0) quality = 'good';
  else if (maxRiskReward >= 1.5) quality = 'moderate';

  return {
    slDistancePct,
    maxRewardPct,
    tp1RewardPct,
    maxRiskReward,
    tp1RiskReward,
    weightedRiskReward,
    formattedRatio: `1:${maxRiskReward.toFixed(2)}`,
    formattedTp1Ratio: `1:${tp1RiskReward.toFixed(2)}`,
    quality
  };
}
