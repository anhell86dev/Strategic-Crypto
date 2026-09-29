export interface DcaLevel {
  level: string; // e.g. "E1", "E2", "E3"
  price: number;
  allocationPercent: number; // e.g. 50, 30, 20 (%)
  units?: number; // Cantidad de unidades calculadas
  averagePriceAfter?: number; // Precio promedio ponderado tras esta capa
  label: string; // e.g. "Entrada Principal", "Refuerzo E2", "Piso Extremo E3"
}

export interface TimeframeCandle {
  timeframe: string; // "5m", "15m", "1h", "2h", "3h", "4h", "1d"
  label: string; // e.g. "5M", "15M", "1H", "2H", "3H", "4H", "DIARIO"
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
  coinName: string; // e.g. "BTC"
  strategyName: string; // Col A: Código único (e.g. "AAVE_PULLBACK_26-09-26_06:39")
  date: string; // Col B: Fecha / Hora
  
  // Gestión de Posición (Columnas D a H)
  capitalAssigned?: number; // Col D: Capital asignado en USD (e.g. 5.00)
  market?: string; // Col E: Entorno / Exchange (e.g. "Binance Futuros")
  marginType?: string; // Col F: Modalidad de margen (e.g. "Aislado (Isolated)")
  leverage: number; // Col G: Apalancamiento (e.g. 5)
  nominalValue?: number; // Col H: Valor Nominal en USD = Capital * Apalancamiento (e.g. 25.00)

  // Direccionalidad y Tesis (Columnas I a K)
  type: 'LONG' | 'SHORT'; // Col I: Long o Short
  category?: string; // Col J: Estrategia (e.g. "Rebote en soporte", "Rango")
  scenarioNotes?: string; // Col K: Escenario Principal / Tesis técnica detallada
  notes?: string;

  // Entradas Escalonadas / DCA (Columnas L a W)
  entryPrice: number; // Col L: E1 (Precio primera entrada)
  e1AllocationPercent?: number; // Col M: % E1 (e.g. 50%)
  e1Units?: number; // Col N: Unidades E1
  e2Price?: number; // Col O: E2
  e2AllocationPercent?: number; // Col P: % E2
  e2Units?: number; // Col Q: Unidades E2
  e3Price?: number; // Col R: E3
  e3AllocationPercent?: number; // Col S: % E3
  e3Units?: number; // Col T: Unidades E3
  avgPriceE1?: number; // Col U: Precio Promedio E1
  avgPriceE2?: number; // Col V: Precio Promedio E2
  avgPriceE3?: number; // Col W: Precio Promedio E3 (Break-even global)
  dcaLevels?: DcaLevel[];

  // Control Estricto de Riesgo (Columnas X a AB)
  stopLoss: number; // Col X: Stop-Loss
  stopLossPercent?: number; // Col Y: Stop-Loss %
  lossCapa1?: number; // Col Z: Pérdida proyectada en USD si salta SL en Capa 1
  lossCapa2?: number; // Col AA: Pérdida proyectada en USD si salta SL en Capa 2
  lossCapa3?: number; // Col AB: Pérdida máxima en USD (Riesgo total de la posición)

  // Gobernanza y Reglas (Columnas AL a AN y Hoja Estrategia)
  tacticalRules?: string; // Col AL: Reglas de Ejecución Táctica (e.g. "Mover SL a Breakeven al tocar TP1...")
  tradeDiscipline?: string; // Col AM: Disciplina del Trade (e.g. "No promediar por debajo de E3...")
  status: 'Active' | 'Pending' | 'Completed' | 'Invalidado' | 'ACTIVA' | 'INVALIDADO TARDE' | string; // Col AN: Estado en Ordenes
  statusSheetEstrategia?: string; // Col M en Hoja Estrategia (e.g. "Activa", "invalidada: razon")
  rowIndex?: number; // Fila exacta en Ordenes (e.g. 2, 3, 4...)
  estrategiaRowIndex?: number; // Fila exacta en Hoja Estrategia (e.g. 2, 3, 4...)
  estrategiaCellM?: string; // Celda exacta en Hoja Estrategia (e.g. "M2", "M3"...)

  // Metadatos Enriquecidos (Hoja Estrategia & Registro)
  timeframe?: string; // Col F en Estrategia: Temporalidad (e.g. "1D", "4h")
  orderType?: string; // Col G en Estrategia: Tipo de Orden (e.g. "Limit", "Market")
  keyIndicators?: string; // Col H en Estrategia: Indicadores Clave (e.g. "SMA-5, Estocástico...")
  entryRules?: string; // Col I en Estrategia: Reglas de Entrada
  exitRules?: string; // Col J en Estrategia: Reglas de Salida / TP
  riskManagement?: string; // Col K en Estrategia: Gestión de Riesgo & Stop Loss
  commentsBacktesting?: string; // Col L en Estrategia: Comentarios / Backtesting
  displayName?: string; // Col D en Estrategia: Nombre de Estrategia descriptivo
  registrationTimestamp?: string; // Col AO en Ordenes / Col N en Estrategia: Fecha y Hora Registro

  customAlertThreshold?: number; // e.g. 1.0%
  initialAllocation?: number; // e.g. 50 (%)
}

export interface TakeProfitOrder {
  strategyId: number;
  type: string; // e.g. "TP1", "TP2", "TP3"
  targetPrice: number;
  closePercentage: number; // e.g. 50, 30, 20 (%)
  profitUsd?: number; // Col AE, AH, AK: Ganancia estimada proyectada en USD
  label?: string; // e.g. "Gatillo de BE", "Objetivo Intermedio", "Target Max"
}

export type TrafficLightStatus = 'VERDE' | 'NARANJA' | 'ROJO';

export interface TrafficLightInfo {
  status: TrafficLightStatus;
  label: string; // "VÁLIDA / EN ZONA", "TP ANTES DE ENTRADA", "SL TOCADO"
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  reason: string;
  distanceToEntryPct: number;
  riskRewardRatio: number;
  rankScore?: number;
  e1Hit?: boolean;
  slHit?: boolean;
  tpHitBeforeEntry?: boolean;
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
  trafficLight?: TrafficLightInfo;
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
  proxyUrl?: string;
}

export interface ProxyProperties {
  BINANCE_API?: string;
  GEMINI_API_KEY?: string;
  SHEETS_API_KEY?: string;
  BINANCE_API_SECRET?: string;
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

export interface MassiveAnalysisItem {
  strategyId: number;
  code: string;
  symbol: string;
  coinName: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  tp1Price: number;
  tp2Price?: number;
  tp3Price?: number;
  currentPrice: number;
  
  // Fechas Clave
  pubDate: Date;
  pubDateFormatted: string;
  pubTimeframe: string; // Temporalidad PUB (e.g. "4H / 1D", "1D")
  analysisDate: Date;
  analysisDateFormatted: string;
  
  // Resultado de Análisis
  isDiscarded: boolean;
  discardReason: 'SL_HIT' | 'TP_HIT' | 'NONE';
  reasonText: string; // e.g. "Toco SL a las 14:30 (+4h 12m)" o "Toco TP1 a las 11:20"
  statusLabelM: string; // e.g. "invalidada: Toco SL a las 14:30" o "Activa"
  
  // Coordenadas Hoja de Cálculo
  sheetName: string; // 'Estrategia'
  sheetCellM: string; // e.g. 'M2', 'M3'
  sheetRowIndex: number;
  
  // Detalles del evento
  eventTimeStr?: string;
  diffFromPubStr?: string;
  timeAgoStr?: string;
  eventPrice?: number;
  candlesAnalyzed: number;
  e1Hit?: boolean;
}

export interface MassiveAnalysisSummary {
  analysisTimestamp: Date;
  analysisDateFormatted: string;
  totalStrategies: number;
  discardedCount: number;
  discardedBySlCount: number;
  discardedByTpCount: number;
  activeCount: number;
  pendingCount: number;
  results: MassiveAnalysisItem[];
}
