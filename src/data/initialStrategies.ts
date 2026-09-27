import { Strategy, TakeProfitOrder } from '../types';

export const INITIAL_STRATEGIES: Strategy[] = [
  {
    id: 1,
    symbol: 'BTCUSDT',
    coinName: 'Bitcoin',
    type: 'LONG',
    entryPrice: 84250.00,
    stopLoss: 82100.00,
    date: '2026-09-26',
    status: 'Active',
    category: 'Layer 1 / Infrastructure',
    notes: 'Rebote en soporte institucional diario con divergencia alcista en RSI.'
  },
  {
    id: 2,
    symbol: 'ETHUSDT',
    coinName: 'Ethereum',
    type: 'LONG',
    entryPrice: 2715.50,
    stopLoss: 2620.00,
    date: '2026-09-26',
    status: 'Active',
    category: 'Smart Contracts',
    notes: 'Rompimiento de cuña descendente en 4H, retest de EMA 50.'
  },
  {
    id: 3,
    symbol: 'SOLUSDT',
    coinName: 'Solana',
    type: 'LONG',
    entryPrice: 121.50,
    stopLoss: 116.00,
    date: '2026-09-26',
    status: 'Active',
    category: 'Layer 1 High Speed',
    notes: 'Zona de demanda clave en retroceso Fibonacci 0.618.'
  },
  {
    id: 4,
    symbol: 'NEARUSDT',
    coinName: 'NEAR Protocol',
    type: 'SHORT',
    entryPrice: 5.48,
    stopLoss: 5.75,
    date: '2026-09-25',
    status: 'Active',
    category: 'AI & Data Infrastructure',
    notes: 'Resistencia mayor en canal ascendente, agotamiento de volumen en 1H.'
  },
  {
    id: 5,
    symbol: 'SUIUSDT',
    coinName: 'Sui',
    type: 'LONG',
    entryPrice: 1.175,
    stopLoss: 1.110,
    date: '2026-09-26',
    status: 'Active',
    category: 'Layer 1 Move',
    notes: 'Consolidación previa a expansión de volumen TVL on-chain.'
  },
  {
    id: 6,
    symbol: 'AVAXUSDT',
    coinName: 'Avalanche',
    type: 'LONG',
    entryPrice: 10.95,
    stopLoss: 10.30,
    date: '2026-09-25',
    status: 'Active',
    category: 'Smart Contracts',
    notes: 'Acumulación en rango bajo semanal con absorción de ventas.'
  },
  {
    id: 7,
    symbol: 'LINKUSDT',
    coinName: 'Chainlink',
    type: 'LONG',
    entryPrice: 14.10,
    stopLoss: 13.40,
    date: '2026-09-26',
    status: 'Active',
    category: 'Oracles / Big Data',
    notes: 'Prueba de soporte CCIP institucional y volumen creciente.'
  },
  {
    id: 8,
    symbol: 'DOGEUSDT',
    coinName: 'Dogecoin',
    type: 'SHORT',
    entryPrice: 0.1025,
    stopLoss: 0.1070,
    date: '2026-09-24',
    status: 'Pending',
    category: 'Meme / Payment',
    notes: 'Doble techo en temporalidad 4H con volumen decreciente.'
  },
  {
    id: 9,
    symbol: 'TAOUSDT',
    coinName: 'Bittensor',
    type: 'LONG',
    entryPrice: 328.00,
    stopLoss: 308.00,
    date: '2026-09-26',
    status: 'Active',
    category: 'Decentralized AI',
    notes: 'Impulso alcista impulsado por subnets y aceleración de staking.'
  },
  {
    id: 10,
    symbol: 'AAVEUSDT',
    coinName: 'Aave',
    type: 'LONG',
    entryPrice: 155.80,
    stopLoss: 147.00,
    date: '2026-09-25',
    status: 'Active',
    category: 'DeFi Lending',
    notes: 'Récord de comisiones en protocolo v3 y quema de tokens.'
  },
  {
    id: 11,
    symbol: 'RENDERUSDT',
    coinName: 'Render',
    type: 'LONG',
    entryPrice: 2.05,
    stopLoss: 1.88,
    date: '2026-09-26',
    status: 'Pending',
    category: 'DePIN / Compute',
    notes: 'Pullback saludable tras rally de cómputo descentralizado.'
  },
  {
    id: 12,
    symbol: 'INJUSDT',
    coinName: 'Injective',
    type: 'LONG',
    entryPrice: 7.75,
    stopLoss: 7.20,
    date: '2026-09-26',
    status: 'Active',
    category: 'DeFi Layer 1',
    notes: 'Formación de banderín alcista en gráfico de 1D.'
  },
  {
    id: 13,
    symbol: 'XRPUSDT',
    coinName: 'XRP',
    type: 'SHORT',
    entryPrice: 1.53,
    stopLoss: 1.61,
    date: '2026-09-24',
    status: 'Pending',
    category: 'Payment Infrastructure',
    notes: 'Rechazo en resistencia de $1.55 con divergencia bajista.'
  },
  {
    id: 14,
    symbol: 'ARBUSDT',
    coinName: 'Arbitrum',
    type: 'LONG',
    entryPrice: 0.232,
    stopLoss: 0.218,
    date: '2026-09-26',
    status: 'Active',
    category: 'Ethereum Layer 2',
    notes: 'Compresión de volatilidad y aumento de transacciones diarias.'
  }
];

export const INITIAL_ORDERS: TakeProfitOrder[] = [
  // BTC
  { strategyId: 1, type: 'TP1', targetPrice: 86500.00, closePercentage: 35 },
  { strategyId: 1, type: 'TP2', targetPrice: 88900.00, closePercentage: 35 },
  { strategyId: 1, type: 'TP3', targetPrice: 92000.00, closePercentage: 30 },
  // ETH
  { strategyId: 2, type: 'TP1', targetPrice: 2820.00, closePercentage: 40 },
  { strategyId: 2, type: 'TP2', targetPrice: 2950.00, closePercentage: 35 },
  { strategyId: 2, type: 'TP3', targetPrice: 3100.00, closePercentage: 25 },
  // SOL
  { strategyId: 3, type: 'TP1', targetPrice: 128.00, closePercentage: 40 },
  { strategyId: 3, type: 'TP2', targetPrice: 136.50, closePercentage: 35 },
  { strategyId: 3, type: 'TP3', targetPrice: 145.00, closePercentage: 25 },
  // NEAR (SHORT)
  { strategyId: 4, type: 'TP1', targetPrice: 5.10, closePercentage: 50 },
  { strategyId: 4, type: 'TP2', targetPrice: 4.75, closePercentage: 30 },
  { strategyId: 4, type: 'TP3', targetPrice: 4.40, closePercentage: 20 },
  // SUI
  { strategyId: 5, type: 'TP1', targetPrice: 1.28, closePercentage: 40 },
  { strategyId: 5, type: 'TP2', targetPrice: 1.39, closePercentage: 35 },
  { strategyId: 5, type: 'TP3', targetPrice: 1.52, closePercentage: 25 },
  // AVAX
  { strategyId: 6, type: 'TP1', targetPrice: 11.80, closePercentage: 40 },
  { strategyId: 6, type: 'TP2', targetPrice: 12.75, closePercentage: 35 },
  { strategyId: 6, type: 'TP3', targetPrice: 13.90, closePercentage: 25 },
  // LINK
  { strategyId: 7, type: 'TP1', targetPrice: 15.20, closePercentage: 40 },
  { strategyId: 7, type: 'TP2', targetPrice: 16.40, closePercentage: 35 },
  { strategyId: 7, type: 'TP3', targetPrice: 17.80, closePercentage: 25 },
  // DOGE (SHORT)
  { strategyId: 8, type: 'TP1', targetPrice: 0.0960, closePercentage: 50 },
  { strategyId: 8, type: 'TP2', targetPrice: 0.0910, closePercentage: 30 },
  { strategyId: 8, type: 'TP3', targetPrice: 0.0860, closePercentage: 20 },
  // TAO
  { strategyId: 9, type: 'TP1', targetPrice: 355.00, closePercentage: 40 },
  { strategyId: 9, type: 'TP2', targetPrice: 385.00, closePercentage: 35 },
  { strategyId: 9, type: 'TP3', targetPrice: 420.00, closePercentage: 25 },
  // AAVE
  { strategyId: 10, type: 'TP1', targetPrice: 168.00, closePercentage: 40 },
  { strategyId: 10, type: 'TP2', targetPrice: 182.00, closePercentage: 35 },
  { strategyId: 10, type: 'TP3', targetPrice: 198.00, closePercentage: 25 },
  // RENDER
  { strategyId: 11, type: 'TP1', targetPrice: 2.25, closePercentage: 40 },
  { strategyId: 11, type: 'TP2', targetPrice: 2.48, closePercentage: 35 },
  { strategyId: 11, type: 'TP3', targetPrice: 2.75, closePercentage: 25 },
  // INJ
  { strategyId: 12, type: 'TP1', targetPrice: 8.50, closePercentage: 40 },
  { strategyId: 12, type: 'TP2', targetPrice: 9.30, closePercentage: 35 },
  { strategyId: 12, type: 'TP3', targetPrice: 10.20, closePercentage: 25 },
  // XRP (SHORT)
  { strategyId: 13, type: 'TP1', targetPrice: 1.44, closePercentage: 50 },
  { strategyId: 13, type: 'TP2', targetPrice: 1.36, closePercentage: 30 },
  { strategyId: 13, type: 'TP3', targetPrice: 1.28, closePercentage: 20 },
  // ARB
  { strategyId: 14, type: 'TP1', targetPrice: 0.255, closePercentage: 40 },
  { strategyId: 14, type: 'TP2', targetPrice: 0.280, closePercentage: 35 },
  { strategyId: 14, type: 'TP3', targetPrice: 0.310, closePercentage: 25 }
];
