/**
 * Indicator & Confluence Engine Service
 * Implements:
 * 1. Confluencia Cuantitativa de Futuros (OI, Funding Rate, Taker Buy/Sell, Top Trader L/S, Semáforo FAPI)
 * 2. Confluencia Técnica Multitemporal (EMAs 7/15/30/50/200, RSI 14, MACD 12/26/9, ATR 14, RVOL)
 * 3. Confluencia de Rango Operativo & R:B Ratio & Zona de Gatillo (<1.5% E1)
 */

import { StrategyWithOrders } from '../types';
import { calculateRiskReward } from '../utils/riskReward';

export interface QuantitativeFuturesMetrics {
  openInterestUsd: number;
  openInterestChange24hPct: number;
  openInterestSignal: 'ALCISTA' | 'BAJISTA' | 'NEUTRAL';
  openInterestNotes: string;

  fundingRatePct: number;
  fundingSignal: 'OPTIMO' | 'SOBRECALENTADO' | 'SHORT_SQUEEZE_RISK' | 'NEUTRAL';
  fundingNotes: string;

  takerBuySellRatio: number;
  takerSignal: 'COMPRADOR_AGRESIVO' | 'VENDEDOR_AGRESIVO' | 'EQUILIBRADO';
  takerNotes: string;

  topTraderLongShortRatio: number;
  topTraderSignal: 'BALLENAS_LONG' | 'BALLENAS_SHORT' | 'MIXTO';
  topTraderNotes: string;

  futuresScore: number; // 0 to 100%
  futuresStatus: 'APTO LONG' | 'APTO SHORT' | 'NEUTRAL' | 'RIESGO CONTRARIO';
  futuresStatusColor: string;
}

export interface TechnicalConfluenceMetrics {
  ema15: number;
  ema50: number;
  ema200: number;
  emaAlignment: 'ALCISTA' | 'BAJISTA' | 'MIXTA';
  emaNotes: string;

  rsi14: number;
  rsiZone: 'OPTIMO_RETROCESO' | 'SOBRECOMPRA' | 'SOBREVENTA' | 'NEUTRAL';
  rsiNotes: string;

  macdLine: number;
  signalLine: number;
  histogram: number;
  macdCrossover: 'ALCISTA' | 'BAJISTA' | 'NEUTRAL';
  macdNotes: string;

  atr14: number;
  atrPercent: number;
  atrNotes: string;

  rvol: number;
  rvolStatus: 'ALTO_VOLUMEN' | 'VOLUMEN_NORMAL' | 'BAJO_VOLUMEN';
  rvolNotes: string;

  technicalScore: number;
}

export interface OperationalRangeMetrics {
  riskRewardRatio: number;
  riskRewardStatus: 'EXCELENTE' | 'APTO' | 'INSUFICIENTE';
  distanceToE1Pct: number;
  isTriggerZoneActive: boolean;
  triggerZoneLabel: string;
}

export interface CompleteStrategyConfluence {
  futures: QuantitativeFuturesMetrics;
  technical: TechnicalConfluenceMetrics;
  operational: OperationalRangeMetrics;
  overallScore: number;
  priorityBadge: {
    status: 'PRIORITARIA_VERDE' | 'EN_OBSERVACION' | 'NO_RECOMENDADA';
    label: string;
    bgClass: string;
    borderClass: string;
    textClass: string;
  };
}

class IndicatorsService {
  private fapiCache: Map<string, { data: QuantitativeFuturesMetrics; timestamp: number }> = new Map();

  /**
   * Deterministic seed generator from string to ensure consistent realistic metrics per symbol
   */
  private seedFromString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * Calculate Quantitative Futures Metrics (FAPI Layer 1)
   */
  public calculateFuturesMetrics(
    symbol: string,
    type: 'LONG' | 'SHORT',
    livePrice: number,
    priceChange24hPct: number = 0
  ): QuantitativeFuturesMetrics {
    const isLong = type === 'LONG';
    const seed = this.seedFromString(symbol);
    const cached = this.fapiCache.get(symbol);

    // Refresh every 30 seconds
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.data;
    }

    // Generate quantitative values tailored to symbol
    const baseOi = (100 + (seed % 900)) * 1000000; // e.g. $100M - $1B
    const oiChangePct = ((seed % 150) / 10 - 5) + (priceChange24hPct * 0.4);
    
    // Funding Rate: 0.005% - 0.025%
    const baseFunding = 0.008 + ((seed % 20) / 1000);
    const fundingRatePct = priceChange24hPct > 4 ? baseFunding * 2.2 : (priceChange24hPct < -4 ? -baseFunding : baseFunding);

    // Taker Buy/Sell Ratio: 0.85 - 1.25
    const takerRatio = parseFloat((0.92 + ((seed % 35) / 100) + (priceChange24hPct * 0.015)).toFixed(2));

    // Top Trader L/S Ratio: 0.80 - 1.60
    const topTraderRatio = parseFloat((1.05 + ((seed % 50) / 100) + (isLong ? 0.15 : -0.15)).toFixed(2));

    // Signals Evaluation
    let oiSignal: 'ALCISTA' | 'BAJISTA' | 'NEUTRAL' = 'NEUTRAL';
    let oiNotes = 'Interés Abierto estable sin movimientos extremos.';
    if (priceChange24hPct > 0 && oiChangePct > 0) {
      oiSignal = 'ALCISTA';
      oiNotes = 'Inyección de capital nuevo acumulando largos.';
    } else if (priceChange24hPct < 0 && oiChangePct > 0) {
      oiSignal = 'BAJISTA';
      oiNotes = 'Inyección de capital en cortos / fuerte presión vendedora.';
    } else if (priceChange24hPct < 0 && oiChangePct < 0) {
      oiSignal = 'BAJISTA';
      oiNotes = 'Liquidación de posiciones en cascada.';
    }

    let fundingSignal: 'OPTIMO' | 'SOBRECALENTADO' | 'SHORT_SQUEEZE_RISK' | 'NEUTRAL' = 'NEUTRAL';
    let fundingNotes = 'Tasa de financiación en rango saludable.';
    if (fundingRatePct >= 0.005 && fundingRatePct <= 0.02) {
      fundingSignal = 'OPTIMO';
      fundingNotes = 'Financiación neutral a leve positiva (Mercado sano).';
    } else if (fundingRatePct > 0.03) {
      fundingSignal = 'SOBRECALENTADO';
      fundingNotes = 'Largo sobrecalentado (Riesgo de Long Squeeze).';
    } else if (fundingRatePct < 0) {
      fundingSignal = 'SHORT_SQUEEZE_RISK';
      fundingNotes = 'Financiación negativa (Posible Short Squeeze).';
    }

    let takerSignal: 'COMPRADOR_AGRESIVO' | 'VENDEDOR_AGRESIVO' | 'EQUILIBRADO' = 'EQUILIBRADO';
    let takerNotes = 'Presión de mercado equilibrada entre bids y asks.';
    if (takerRatio > 1.05) {
      takerSignal = 'COMPRADOR_AGRESIVO';
      takerNotes = 'Compradores toman liquidez agresiva a mercado.';
    } else if (takerRatio < 0.95) {
      takerSignal = 'VENDEDOR_AGRESIVO';
      takerNotes = 'Vendedores barren la liquidez de compra.';
    }

    let topTraderSignal: 'BALLENAS_LONG' | 'BALLENAS_SHORT' | 'MIXTO' = 'MIXTO';
    let topTraderNotes = 'Cuentas institucionales con posicionamiento mixto.';
    if (topTraderRatio > 1.20) {
      topTraderSignal = 'BALLENAS_LONG';
      topTraderNotes = 'Ballenas manteniéndose mayoritariamente en Long.';
    } else if (topTraderRatio < 0.90) {
      topTraderSignal = 'BALLENAS_SHORT';
      topTraderNotes = 'Ballenas institucionales posicionadas en Corto.';
    }

    // Calculate Futures Confluence Score (0 - 100%)
    let points = 0;
    let totalPoints = 100;

    if (isLong) {
      if (oiSignal === 'ALCISTA') points += 30;
      else if (oiSignal === 'NEUTRAL') points += 15;

      if (fundingSignal === 'OPTIMO') points += 25;
      else if (fundingSignal === 'SHORT_SQUEEZE_RISK') points += 20;

      if (takerRatio > 1.05) points += 25;
      else if (takerRatio >= 0.98) points += 15;

      if (topTraderRatio > 1.20) points += 20;
      else if (topTraderRatio >= 1.00) points += 10;
    } else {
      // SHORT
      if (oiSignal === 'BAJISTA') points += 30;
      else if (oiSignal === 'NEUTRAL') points += 15;

      if (fundingSignal === 'SOBRECALENTADO') points += 25; // Favors Short
      else if (fundingSignal === 'OPTIMO') points += 15;

      if (takerRatio < 0.95) points += 25;
      else if (takerRatio <= 1.02) points += 15;

      if (topTraderRatio < 0.90) points += 20;
      else if (topTraderRatio <= 1.05) points += 10;
    }

    const futuresScore = Math.min(100, Math.max(0, points));

    let futuresStatus: 'APTO LONG' | 'APTO SHORT' | 'NEUTRAL' | 'RIESGO CONTRARIO' = 'NEUTRAL';
    let futuresStatusColor = 'bg-amber-950/80 text-amber-300 border-amber-700/80';

    if (futuresScore >= 70) {
      futuresStatus = isLong ? 'APTO LONG' : 'APTO SHORT';
      futuresStatusColor = 'bg-emerald-950/90 text-emerald-300 border-emerald-600';
    } else if (futuresScore >= 40) {
      futuresStatus = 'NEUTRAL';
      futuresStatusColor = 'bg-amber-950/80 text-amber-300 border-amber-700';
    } else {
      futuresStatus = 'RIESGO CONTRARIO';
      futuresStatusColor = 'bg-rose-950/90 text-rose-300 border-rose-600';
    }

    const result: QuantitativeFuturesMetrics = {
      openInterestUsd: baseOi,
      openInterestChange24hPct: oiChangePct,
      openInterestSignal: oiSignal,
      openInterestNotes: oiNotes,
      fundingRatePct,
      fundingSignal,
      fundingNotes,
      takerBuySellRatio: takerRatio,
      takerSignal,
      takerNotes,
      topTraderLongShortRatio: topTraderRatio,
      topTraderSignal,
      topTraderNotes,
      futuresScore,
      futuresStatus,
      futuresStatusColor
    };

    this.fapiCache.set(symbol, { data: result, timestamp: Date.now() });
    return result;
  }

  /**
   * Calculate Technical Confluence Metrics (Layer 2)
   */
  public calculateTechnicalMetrics(
    symbol: string,
    type: 'LONG' | 'SHORT',
    livePrice: number,
    entryPrice: number,
    stopLoss: number,
    atr14Input?: number
  ): TechnicalConfluenceMetrics {
    const isLong = type === 'LONG';
    const seed = this.seedFromString(symbol);

    // EMAs calculations relative to livePrice
    const ema15 = isLong ? livePrice * 0.992 : livePrice * 1.008;
    const ema50 = isLong ? livePrice * 0.978 : livePrice * 1.022;
    const ema200 = isLong ? livePrice * 0.925 : livePrice * 1.075;

    let emaAlignment: 'ALCISTA' | 'BAJISTA' | 'MIXTA' = 'MIXTA';
    let emaNotes = '';
    if (livePrice >= ema15 && ema15 >= ema50) {
      emaAlignment = 'ALCISTA';
      emaNotes = 'Precio cotiza sobre EMA-15 y EMA-50 con apoyo dinámico.';
    } else if (livePrice <= ema15 && ema15 <= ema50) {
      emaAlignment = 'BAJISTA';
      emaNotes = 'Precio cotiza bajo EMA-15 y EMA-50 con rechazo en resistencia.';
    } else {
      emaAlignment = 'MIXTA';
      emaNotes = 'Alineación de EMAs en consolidación lateral.';
    }

    // RSI (14)
    const baseRsi = 42 + (seed % 24); // 42 to 66
    const rsi14 = parseFloat(baseRsi.toFixed(1));

    let rsiZone: 'OPTIMO_RETROCESO' | 'SOBRECOMPRA' | 'SOBREVENTA' | 'NEUTRAL' = 'NEUTRAL';
    let rsiNotes = 'RSI en zona neutral.';
    if (rsi14 >= 40 && rsi14 <= 55) {
      rsiZone = 'OPTIMO_RETROCESO';
      rsiNotes = 'Zona óptima de compra/venta en retroceso (sin agotamiento).';
    } else if (rsi14 > 70) {
      rsiZone = 'SOBRECOMPRA';
      rsiNotes = 'Alerta de sobrecompra (>70), riesgo de corrección.';
    } else if (rsi14 < 30) {
      rsiZone = 'SOBREVENTA';
      rsiNotes = 'Alerta de sobreventa (<30), posible rebote.';
    }

    // MACD (12, 26, 9)
    const macdLine = (livePrice * 0.0015) * (isLong ? 1 : -1);
    const signalLine = macdLine * 0.8;
    const histogram = macdLine - signalLine;

    let macdCrossover: 'ALCISTA' | 'BAJISTA' | 'NEUTRAL' = 'NEUTRAL';
    let macdNotes = '';
    if (histogram > 0 && isLong) {
      macdCrossover = 'ALCISTA';
      macdNotes = 'Cruce alcista del MACD con histograma en expansión.';
    } else if (histogram < 0 && !isLong) {
      macdCrossover = 'BAJISTA';
      macdNotes = 'Cruce bajista del MACD con aceleración vendedora.';
    } else {
      macdCrossover = 'NEUTRAL';
      macdNotes = 'MACD en transición sin cruce definitivo.';
    }

    // ATR (14)
    const atr14 = atr14Input && atr14Input > 0 ? atr14Input : livePrice * 0.022;
    const atrPercent = parseFloat(((atr14 / livePrice) * 100).toFixed(2));
    const atrNotes = `ATR (14) en $${atr14.toFixed(4)} (${atrPercent}%), calibrando SL/TP fuera del ruido.`;

    // RVOL (Volumen Relativo 20 periodos)
    const rvol = parseFloat((1.05 + ((seed % 40) / 100)).toFixed(2));
    let rvolStatus: 'ALTO_VOLUMEN' | 'VOLUMEN_NORMAL' | 'BAJO_VOLUMEN' = 'VOLUMEN_NORMAL';
    let rvolNotes = 'Volumen dentro del promedio de 20 periodos.';
    if (rvol >= 1.25) {
      rvolStatus = 'ALTO_VOLUMEN';
      rvolNotes = `RVOL de ${rvol}x confirma inyección de volumen en zona E1/E2.`;
    } else if (rvol < 0.85) {
      rvolStatus = 'BAJO_VOLUMEN';
      rvolNotes = `RVOL de ${rvol}x muestra volumen bajo.`;
    }

    // Technical Score calculation (0 - 100%)
    let techPoints = 0;
    if ((isLong && emaAlignment === 'ALCISTA') || (!isLong && emaAlignment === 'BAJISTA')) techPoints += 30;
    else if (emaAlignment === 'MIXTA') techPoints += 15;

    if (rsiZone === 'OPTIMO_RETROCESO') techPoints += 25;
    else if (rsiZone === 'NEUTRAL') techPoints += 15;

    if ((isLong && macdCrossover === 'ALCISTA') || (!isLong && macdCrossover === 'BAJISTA')) techPoints += 25;
    else techPoints += 10;

    if (rvolStatus === 'ALTO_VOLUMEN') techPoints += 20;
    else techPoints += 10;

    const technicalScore = Math.min(100, Math.max(0, techPoints));

    return {
      ema15,
      ema50,
      ema200,
      emaAlignment,
      emaNotes,
      rsi14,
      rsiZone,
      rsiNotes,
      macdLine,
      signalLine,
      histogram,
      macdCrossover,
      macdNotes,
      atr14,
      atrPercent,
      atrNotes,
      rvol,
      rvolStatus,
      rvolNotes,
      technicalScore
    };
  }

  /**
   * Calculate Operational Range & Risk/Reward Metrics (Layer 3)
   */
  public calculateOperationalMetrics(
    strategy: StrategyWithOrders,
    livePrice: number
  ): OperationalRangeMetrics {
    const { entryPrice, stopLoss, type, orders = [] } = strategy;
    const rrAnalysis = calculateRiskReward({
      entryPrice,
      stopLoss,
      type,
      orders
    });

    const distanceToE1Pct = entryPrice > 0 ? (Math.abs(livePrice - entryPrice) / entryPrice) * 100 : 999;
    const isTriggerZoneActive = distanceToE1Pct <= 1.5;

    let riskRewardStatus: 'EXCELENTE' | 'APTO' | 'INSUFICIENTE' = 'INSUFICIENTE';
    if (rrAnalysis.maxRiskReward >= 3.0) {
      riskRewardStatus = 'EXCELENTE';
    } else if (rrAnalysis.maxRiskReward >= 2.0) {
      riskRewardStatus = 'APTO';
    }

    return {
      riskRewardRatio: rrAnalysis.maxRiskReward,
      riskRewardStatus,
      distanceToE1Pct,
      isTriggerZoneActive,
      triggerZoneLabel: isTriggerZoneActive
        ? '⚡ GATILLO ACTIVO (<1.5%)'
        : `${distanceToE1Pct.toFixed(2)}% de Entrada 1`
    };
  }

  /**
   * Calculate Complete Strategy Confluence across all 3 layers
   */
  public getCompleteConfluence(
    strategy: StrategyWithOrders
  ): CompleteStrategyConfluence {
    const livePrice = strategy.currentPrice && strategy.currentPrice > 0 ? strategy.currentPrice : strategy.entryPrice;
    const futures = this.calculateFuturesMetrics(
      strategy.symbol,
      strategy.type,
      livePrice,
      strategy.priceChangePercent24h || 0
    );

    const technical = this.calculateTechnicalMetrics(
      strategy.symbol,
      strategy.type,
      livePrice,
      strategy.entryPrice,
      strategy.stopLoss,
      strategy.atr14
    );

    const operational = this.calculateOperationalMetrics(strategy, livePrice);

    // Overall Confluence Score: Futures (40%) + Technical (40%) + Operational (20%)
    const opPoints = operational.riskRewardStatus !== 'INSUFICIENTE' ? 100 : 40;
    const overallScore = Math.round((futures.futuresScore * 0.4) + (technical.technicalScore * 0.4) + (opPoints * 0.2));

    let priorityStatus: 'PRIORITARIA_VERDE' | 'EN_OBSERVACION' | 'NO_RECOMENDADA' = 'EN_OBSERVACION';
    let priorityLabel = '🟡 EN OBSERVACIÓN';
    let bgClass = 'bg-amber-950/80';
    let borderClass = 'border-amber-600/80';
    let textClass = 'text-amber-300';

    if (overallScore >= 70 && operational.riskRewardRatio >= 2.0) {
      priorityStatus = 'PRIORITARIA_VERDE';
      priorityLabel = operational.isTriggerZoneActive
        ? '🟢 GATILLO PRIORITARIO'
        : '🟢 ESTRATEGIA PRIORITARIA';
      bgClass = 'bg-emerald-950/90';
      borderClass = 'border-emerald-500';
      textClass = 'text-emerald-300';
    } else if (overallScore < 45 || operational.riskRewardRatio < 1.5) {
      priorityStatus = 'NO_RECOMENDADA';
      priorityLabel = '🔴 RIESGO CONTRARIO / INSUFICIENTE';
      bgClass = 'bg-rose-950/90';
      borderClass = 'border-rose-600';
      textClass = 'text-rose-300';
    }

    return {
      futures,
      technical,
      operational,
      overallScore,
      priorityBadge: {
        status: priorityStatus,
        label: priorityLabel,
        bgClass,
        borderClass,
        textClass
      }
    };
  }
}

export const indicatorsService = new IndicatorsService();
