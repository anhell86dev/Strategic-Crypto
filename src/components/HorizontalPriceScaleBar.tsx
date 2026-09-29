import React, { useState, useEffect, useMemo } from 'react';
import { StrategyWithOrders, TimeframeCandle } from '../types';
import { multiTimeframeService } from '../services/multiTimeframeService';
import { 
  Target, 
  Activity, 
  AlertTriangle, 
  Clock, 
  GitBranch,
  Layers,
  Zap
} from 'lucide-react';

interface HorizontalPriceScaleBarProps {
  strategy: StrategyWithOrders;
  compact?: boolean;
  defaultExpanded?: boolean;
  hideHeader?: boolean;
}

/**
 * Helper to calculate elapsed hours since the strategy was published
 */
export const getStrategyElapsedHoursInfo = (rawDate?: string, stratName?: string) => {
  if (!rawDate && !stratName) return { hours: 24, label: '24H', timeStr: 'hace 24h', fullLabel: '24H (PUB)' };
  const str = rawDate || '';

  const monthMap: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };

  let targetDate: Date | null = null;
  const dateMatch = str.match(/([A-Z]{3})\s+(\d{1,2})\s+(\d{4})/i);
  const timeMatches = [...str.matchAll(/(\d{2}):(\d{2})(?::\d{2})?/g)];

  let formattedTime = '';
  if (timeMatches.length >= 2) {
    formattedTime = `${timeMatches[1][1]}:${timeMatches[1][2]}`;
  } else if (timeMatches.length === 1) {
    formattedTime = `${timeMatches[0][1]}:${timeMatches[0][2]}`;
  }

  if (dateMatch && formattedTime) {
    const month = monthMap[dateMatch[1]] || dateMatch[1];
    const day = dateMatch[2].padStart(2, '0');
    const year = dateMatch[3];
    const d = new Date(`${year}-${month}-${day}T${formattedTime}:00-06:00`);
    if (!isNaN(d.getTime())) targetDate = d;
  }

  if (!targetDate || isNaN(targetDate.getTime())) {
    const nameMatch = (stratName || '').match(/_(\d{2})[-/.](\d{2})[-/.](\d{2,4})_(\d{2}:\d{2})/);
    if (nameMatch) {
      const [, d, m, y, t] = nameMatch;
      const fullYear = y.length === 2 ? `20${y}` : y;
      const dObj = new Date(`${fullYear}-${m}-${d}T${t}:00-06:00`);
      if (!isNaN(dObj.getTime())) targetDate = dObj;
    }
  }

  if (!targetDate || isNaN(targetDate.getTime())) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) targetDate = parsed;
  }

  if (!targetDate || isNaN(targetDate.getTime())) {
    return { hours: 24, label: '24H', timeStr: 'hace 24h', fullLabel: '24H (PUB)' };
  }

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - targetDate.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  const totalHours = Math.max(1, Math.floor(totalMinutes / 60));

  return {
    hours: totalHours,
    label: `${totalHours}H`,
    timeStr: `hace ${totalHours}h`,
    fullLabel: `${totalHours}H (PUB)`
  };
};

export const HorizontalPriceScaleBar: React.FC<HorizontalPriceScaleBarProps> = ({
  strategy,
  compact = false,
  defaultExpanded = false,
  hideHeader = false
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const {
    symbol,
    coinName,
    type,
    entryPrice,
    e2Price,
    e3Price,
    stopLoss,
    currentPrice,
    orders = [],
    leverage = 5,
    date: pubDate,
    strategyName
  } = strategy;

  const isLong = type === 'LONG';
  const livePrice = currentPrice || entryPrice;
  const hasE2 = e2Price !== undefined && e2Price > 0;
  const hasE3 = e3Price !== undefined && e3Price > 0;

  // Helper to calculate signed % distance from LIVE price to a target price
  const getDeltaPct = (targetPrice?: number) => {
    if (!targetPrice || targetPrice <= 0 || !livePrice || livePrice <= 0) return null;
    const delta = ((targetPrice - livePrice) / livePrice) * 100;
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(2)}%`;
  };

  // Toggle for MTF connectors
  const [showConnectors, setShowConnectors] = useState<boolean>(true);

  // Real-time multi-timeframe candle data state
  const [tfData, setTfData] = useState(() => {
    return multiTimeframeService.getCached(symbol) || null;
  });

  useEffect(() => {
    const unsub = multiTimeframeService.subscribe(symbol, (data) => {
      setTfData(data);
    });
    return unsub;
  }, [symbol]);

  // Derived Key Targets
  const tp1 = orders[0]?.targetPrice || (isLong ? entryPrice * 1.03 : entryPrice * 0.97);
  const tp2 = orders[1]?.targetPrice || (isLong ? entryPrice * 1.06 : entryPrice * 0.94);
  const tp3 = orders[2]?.targetPrice || (isLong ? entryPrice * 1.10 : entryPrice * 0.90);

  // ROI from Entry
  const pnlPercent = entryPrice > 0 ? ((livePrice - entryPrice) / entryPrice) * 100 * (isLong ? 1 : -1) : 0;
  const roiPercent = pnlPercent * leverage;

  // Format currency
  const formatPrice = (val?: number) => {
    if (val === undefined || isNaN(val) || val <= 0) return '$0.00';
    if (val >= 1000) return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (val >= 1) return `$${val.toFixed(4)}`;
    if (val >= 0.01) return `$${val.toFixed(5)}`;
    return `$${val.toFixed(7)}`;
  };

  // Calculate elapsed hours since publication
  const pubInfo = useMemo(() => {
    return getStrategyElapsedHoursInfo(pubDate, strategyName);
  }, [pubDate, strategyName]);

  // Dynamic Timeframe Candle representing elapsed hours since publication (ÚNICA DINÁMICA)
  const pubCandle = useMemo(() => {
    const change = entryPrice > 0 ? ((livePrice - entryPrice) / entryPrice) * 100 : 0;
    return {
      timeframe: 'pub',
      label: `${pubInfo.hours}H (PUB)`,
      timeStr: pubInfo.timeStr,
      open: entryPrice,
      close: livePrice,
      high: Math.max(entryPrice, livePrice),
      low: Math.min(entryPrice, livePrice),
      changePercent: change,
      isPublicationTimeframe: true,
      isDynamic: true,
      durationMinutes: pubInfo.hours * 60
    };
  }, [pubInfo, entryPrice, livePrice]);

  // Daily Candle parameters (Mínimo y Máximo diario estricto como marco rector)
  const dailyCandle = tfData?.candles?.['1d'];
  const dHigh = dailyCandle?.high || strategy.high24h || Math.max(entryPrice * 1.035, livePrice * 1.025);
  const dLow = dailyCandle?.low || strategy.low24h || Math.min(entryPrice * 0.965, livePrice * 0.975);
  const dOpen = dailyCandle?.open || (dLow + (dHigh - dLow) * 0.48);
  const dClose = dailyCandle?.close || livePrice;
  const dChange = dOpen > 0 ? ((dClose - dOpen) / dOpen) * 100 : 0;

  // 1. ESCALA INDEPENDIENTE PARA LA BARRA SUPERIOR DE TRADING (SL, E3, E2, E1, Live, TP1, TP2, TP3)
  const { minTradeScale, tradeScaleSpan } = useMemo(() => {
    const all = [
      stopLoss, 
      entryPrice, 
      ...(hasE2 && e2Price ? [e2Price] : []),
      ...(hasE3 && e3Price ? [e3Price] : []),
      livePrice, 
      tp1, 
      tp2, 
      tp3
    ].filter(p => p > 0);
    const min = Math.min(...all);
    const max = Math.max(...all);
    const padding = (max - min) * 0.05 || min * 0.02;
    const minP = Math.max(0, min - padding);
    const maxP = max + padding;
    return {
      minTradeScale: minP,
      tradeScaleSpan: Math.max(0.000001, maxP - minP)
    };
  }, [stopLoss, entryPrice, e2Price, e3Price, hasE2, hasE3, livePrice, tp1, tp2, tp3]);

  // Posiciones porcentuales para la barra superior independiente
  const getTradePercentPos = (price: number) => {
    const pos = ((price - minTradeScale) / tradeScaleSpan) * 100;
    return Math.max(2, Math.min(98, pos));
  };

  const tradeLivePos = getTradePercentPos(livePrice);
  const tradeEntryPos = getTradePercentPos(entryPrice);
  const tradeE2Pos = hasE2 && e2Price ? getTradePercentPos(e2Price) : null;
  const tradeE3Pos = hasE3 && e3Price ? getTradePercentPos(e3Price) : null;
  const tradeSlPos = getTradePercentPos(stopLoss);
  const tradeTp1Pos = getTradePercentPos(tp1);
  const tradeTp2Pos = getTradePercentPos(tp2);
  const tradeTp3Pos = getTradePercentPos(tp3);

  // 2. ESCALA DE REFERENCIA DIARIA EXCLUSIVA PARA LAS TEMPORALIDADES (PUB, 5M, 15M, 1H, 4H, DIARIO)
  const minDailyScale = dLow;
  const maxDailyScale = dHigh;
  const dailyScaleSpan = Math.max(0.000001, maxDailyScale - minDailyScale);

  // Convert price to percentage position (0% -> 100%) on the daily scale [dLow, dHigh]
  const getDailyPercentPos = (price: number) => {
    const pos = ((price - minDailyScale) / dailyScaleSpan) * 100;
    return Math.max(0, Math.min(100, pos));
  };

  const dailyLivePos = getDailyPercentPos(livePrice);
  const dailyEntryPos = getDailyPercentPos(entryPrice);
  const dailySlPos = getDailyPercentPos(stopLoss);

  // Timeframe Rows strictly ordered from top to bottom:
  // 1. Horas transcurridas (PUB - Dinámica con Círculo LIVE)
  // 2. 5M (Cerrada)
  // 3. 15M (Cerrada)
  // 4. 1H (Cerrada)
  // 5. 4H (Cerrada)
  // 6. DIARIO (Escala rectora con Círculo LIVE)
  const timeframesList = useMemo(() => {
    const candles = tfData?.candles || {};
    const baseRef = entryPrice || livePrice || 100;
    return [
      pubCandle,
      { ...(candles['5m'] || { timeframe: '5m', label: '5M', timeStr: '00:25', open: baseRef * 0.9940, close: baseRef * 0.9975, changePercent: 0.35 }), durationMinutes: 5, isClosed: true },
      { ...(candles['15m'] || { timeframe: '15m', label: '15M', timeStr: '00:15', open: baseRef * 0.9910, close: baseRef * 0.9940, changePercent: 0.30 }), durationMinutes: 15, isClosed: true },
      { ...(candles['1h'] || { timeframe: '1h', label: '1H', timeStr: '00:00', open: baseRef * 0.9850, close: baseRef * 0.9910, changePercent: 0.61 }), durationMinutes: 60, isClosed: true },
      { ...(candles['4h'] || { timeframe: '4h', label: '4H', timeStr: '21:00', open: baseRef * 0.9750, close: baseRef * 0.9850, changePercent: 1.03 }), durationMinutes: 240, isClosed: true },
      { 
        timeframe: '1d', 
        label: 'DIARIO', 
        timeStr: 'Hoy', 
        open: dOpen, 
        close: dClose, 
        high: dHigh, 
        low: dLow, 
        changePercent: dChange, 
        durationMinutes: 1440, 
        isMasterScale: true,
        isDynamic: true
      }
    ];
  }, [tfData, entryPrice, pubCandle, dOpen, dClose, dHigh, dLow, dChange]);

  // UNIONES ESPECÍFICAS SEGÚN ORDEN FRACTAL TEMPORAL:
  // 1. 4H (Cierre) ➔ 1H (Apertura)
  // 2. 1H (Cierre) ➔ 15M (Apertura)
  // 3. 15M (Cierre) ➔ 5M (Apertura)
  // 4. 5M (Cierre) ➔ PUB (Apertura)
  // El DIARIO NO SE DEBE CONECTAR.
  const connections = useMemo(() => {
    if (!showConnectors || timeframesList.length < 2) return [];

    const candlePub = timeframesList.find(tf => tf.timeframe === 'pub' || (tf as any).isPublicationTimeframe);
    const candle5m = timeframesList.find(tf => tf.timeframe === '5m');
    const candle15m = timeframesList.find(tf => tf.timeframe === '15m');
    const candle1h = timeframesList.find(tf => tf.timeframe === '1h');
    const candle4h = timeframesList.find(tf => tf.timeframe === '4h');

    const pairs = [
      { from: candle4h, to: candle1h, label: '4H (C) ➔ 1H (O)' },
      { from: candle1h, to: candle15m, label: '1H (C) ➔ 15M (O)' },
      { from: candle15m, to: candle5m, label: '15M (C) ➔ 5M (O)' },
      { from: candle5m, to: candlePub, label: '5M (C) ➔ PUB (O)' }
    ];

    const conns: {
      fromIndex: number;
      toIndex: number;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      label: string;
      higherLabel: string;
      lowerLabel: string;
    }[] = [];

    const totalRows = timeframesList.length;
    // Cálculo preciso de centros en base a altura de fila y espaciado
    const rowHeight = compact ? 28 : 32;
    const rowGap = 8;
    const totalHeight = totalRows * rowHeight + (totalRows - 1) * rowGap;

    for (const pair of pairs) {
      if (!pair.from || !pair.to) continue;

      const fromIndex = timeframesList.indexOf(pair.from);
      const toIndex = timeframesList.indexOf(pair.to);

      if (fromIndex === -1 || toIndex === -1) continue;

      // Cierre del origen (pair.from.close) ➔ Apertura del destino (pair.to.open)
      const x1 = getDailyPercentPos(pair.from.close);
      const y1 = ((fromIndex * (rowHeight + rowGap) + rowHeight / 2) / totalHeight) * 100;

      const x2 = getDailyPercentPos(pair.to.open);
      const y2 = ((toIndex * (rowHeight + rowGap) + rowHeight / 2) / totalHeight) * 100;

      conns.push({
        fromIndex,
        toIndex,
        x1,
        y1,
        x2,
        y2,
        label: pair.label,
        higherLabel: pair.from.label,
        lowerLabel: pair.to.label
      });
    }

    return conns;
  }, [timeframesList, showConnectors, minDailyScale, dailyScaleSpan, compact]);

  // ATR metrics
  const atrVal = tfData?.atr14 || (livePrice * 0.02);
  const atrPct = tfData?.atrPercent || 2.0;

  // Status checks
  const isSlHit = isLong ? livePrice <= stopLoss : livePrice >= stopLoss;
  const isDangerZone = isLong ? livePrice < entryPrice && livePrice > stopLoss : livePrice > entryPrice && livePrice < stopLoss;

  if (compact) {
    return (
      <div className="w-full font-mono select-none" onClick={(e) => e.stopPropagation()}>
        {/* Header Compacto con Botón de Expansión de Temporalidades */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Rango Táctico (SL ➔ DCA ➔ TPs)
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer border ${
              isExpanded
                ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-black shadow-sm'
                : 'bg-slate-900 text-cyan-300 border-slate-700 hover:border-cyan-400'
            }`}
          >
            <span>⏱️ Temporalidades (5M, 15M, 1H, 4H, 1D)</span>
            <span>{isExpanded ? '▲' : '▼'}</span>
          </button>
        </div>

        {/* 1. Línea Principal de Precio: Pista Master de Trading con marcadores */}
        <div className="relative pt-6 pb-7 w-full">
          {/* Pista Gradiente de Fondo */}
          <div className="h-3 rounded-full bg-gradient-to-r from-rose-950 via-slate-800 to-emerald-950 border border-slate-700/80 relative shadow-inner overflow-hidden">
            {/* Zona Activa entre Entrada y Live */}
            <div 
              className={`absolute top-0 bottom-0 rounded-full overflow-hidden ${
                pnlPercent >= 0 
                  ? 'bg-gradient-to-r from-cyan-500/50 via-emerald-500/60 to-emerald-400/80 shadow-md shadow-emerald-500/20' 
                  : 'bg-gradient-to-r from-rose-500/70 via-rose-500/60 to-amber-500/50 shadow-md shadow-rose-500/20'
              }`}
              style={{ 
                left: `${Math.min(tradeLivePos, tradeEntryPos)}%`, 
                width: `${Math.abs(tradeLivePos - tradeEntryPos)}%` 
              }}
            >
              <div 
                className={`absolute inset-0 pointer-events-none opacity-40 ${
                  tradeLivePos >= tradeEntryPos ? 'animate-flow-stripes-right' : 'animate-flow-stripes-left'
                }`} 
              />
              <div 
                className={`absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/40 to-transparent ${
                  tradeLivePos >= tradeEntryPos ? 'animate-laser-right' : 'animate-laser-left'
                }`} 
              />
            </div>
          </div>

          {/* Marcador SL */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
            style={{ left: `${tradeSlPos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-4 h-4 rounded-full bg-rose-500 border-2 border-slate-950 shadow-md flex items-center justify-center text-[7px] font-black text-white">
              SL
            </div>
            <div className="absolute top-4 text-center whitespace-nowrap font-mono text-[10px]">
              <span className="text-rose-300 font-bold block bg-slate-950/90 px-1 rounded border border-rose-900/60">
                SL: {formatPrice(stopLoss)}
                <span className="text-[9px] font-extrabold text-rose-400 block -mt-0.5">
                  {getDeltaPct(stopLoss)}
                </span>
              </span>
            </div>
          </div>

          {/* Marcador E3 */}
          {hasE3 && e3Price && tradeE3Pos !== null && (
            <div 
              className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
              style={{ left: `${tradeE3Pos}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-950 shadow-md flex items-center justify-center text-[7px] font-black text-slate-950">
                E3
              </div>
              <div className="absolute bottom-4 text-center whitespace-nowrap font-mono text-[10px]">
                <span className="text-amber-300 font-bold block bg-slate-950/90 px-1 rounded border border-amber-800/60">
                  E3: {formatPrice(e3Price)}
                  <span className="text-[9px] font-extrabold text-amber-400 block -mt-0.5">
                    {getDeltaPct(e3Price)}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Marcador E2 */}
          {hasE2 && e2Price && tradeE2Pos !== null && (
            <div 
              className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
              style={{ left: `${tradeE2Pos}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-sky-400 border-2 border-slate-950 shadow-md flex items-center justify-center text-[7px] font-black text-slate-950">
                E2
              </div>
              <div className="absolute top-4 text-center whitespace-nowrap font-mono text-[10px]">
                <span className="text-sky-300 font-bold block bg-slate-950/90 px-1 rounded border border-sky-800/60">
                  E2: {formatPrice(e2Price)}
                  <span className="text-[9px] font-extrabold text-sky-400 block -mt-0.5">
                    {getDeltaPct(e2Price)}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Marcador E1 */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
            style={{ left: `${tradeEntryPos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-4 h-4 rounded-full bg-cyan-400 ring-4 ring-cyan-500/20 border-2 border-slate-950 shadow-md flex items-center justify-center text-[7px] font-black text-slate-950">
              E1
            </div>
            <div className="absolute bottom-4 text-center whitespace-nowrap font-mono text-[10px]">
              <span className="text-cyan-300 font-bold block bg-slate-950/90 px-1 rounded border border-cyan-700/80">
                E1: {formatPrice(entryPrice)}
                <span className="text-[9px] font-extrabold text-cyan-400 block -mt-0.5">
                  {getDeltaPct(entryPrice)}
                </span>
              </span>
            </div>
          </div>

          {/* Marcador LIVE */}
          <div 
            className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none z-30 transition-all duration-300"
            style={{ left: `${tradeLivePos}%`, transform: 'translateX(-50%)' }}
          >
            <span className="bg-cyan-400 text-slate-950 font-mono text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg shadow-cyan-500/40 -translate-y-2">
              {formatPrice(livePrice)}
            </span>
            <div className="w-0.5 flex-1 bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
            <span className="bg-cyan-950 text-cyan-300 border border-cyan-400/80 font-mono text-[9px] font-bold px-1 rounded translate-y-1">
              LIVE
            </span>
          </div>

          {/* Marcadores TP1, TP2, TP3 */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
            style={{ left: `${tradeTp1Pos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-md" />
            <div className="absolute top-4 text-center whitespace-nowrap font-mono text-[10px]">
              <span className="text-emerald-300 font-bold block bg-slate-950/90 px-1 rounded border border-emerald-900/60">
                TP1: {formatPrice(tp1)}
                <span className="text-[9px] font-extrabold text-emerald-400 block -mt-0.5">
                  {getDeltaPct(tp1)}
                </span>
              </span>
            </div>
          </div>

          <div 
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
            style={{ left: `${tradeTp2Pos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-md" />
            <div className="absolute bottom-4 text-center whitespace-nowrap font-mono text-[10px]">
              <span className="text-emerald-300 font-bold block bg-slate-950/90 px-1 rounded border border-emerald-900/60">
                TP2: {formatPrice(tp2)}
                <span className="text-[9px] font-extrabold text-emerald-400 block -mt-0.5">
                  {getDeltaPct(tp2)}
                </span>
              </span>
            </div>
          </div>

          <div 
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
            style={{ left: `${tradeTp3Pos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-md" />
            <div className="absolute top-4 text-center whitespace-nowrap font-mono text-[10px]">
              <span className="text-emerald-300 font-bold block bg-slate-950/90 px-1 rounded border border-emerald-900/60">
                TP3: {formatPrice(tp3)}
                <span className="text-[9px] font-extrabold text-emerald-400 block -mt-0.5">
                  {getDeltaPct(tp3)}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* 2. Sección Expandible: Multitemporalidades */}
        {isExpanded && (
          <div className="relative pt-3 border-t border-slate-800/80 bg-slate-950/90 rounded-xl p-3 mt-2 space-y-3">
            {/* Leyenda interactiva */}
            <div className="flex items-center justify-between flex-wrap gap-2 text-[10px] font-mono text-slate-400 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> O</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> C (Alcista)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" /> C (Bajista)</span>
                <span className="flex items-center gap-1 text-cyan-300 font-bold">● LIVE</span>
              </div>
              <span className="text-[9px] text-amber-300 font-mono">
                Escala: {formatPrice(minDailyScale)} — {formatPrice(maxDailyScale)}
              </span>
            </div>

            {/* Pistas Multitemporales con Conectores Fractal SVG */}
            <div className="flex gap-2 sm:gap-3">
              {/* Columna Izquierda: Etiquetas con Precios O y C */}
              <div className="w-32 sm:w-40 shrink-0 flex flex-col justify-between py-0.5 space-y-2">
                {timeframesList.map((tf) => {
                  const isUp = tf.changePercent >= 0;
                  const isPub = (tf as any).isPublicationTimeframe;
                  const isDiario = tf.timeframe === '1d';
                  return (
                    <div 
                      key={tf.timeframe}
                      className={`h-7 flex flex-col justify-center px-2 rounded font-mono text-[10px] border ${
                        isDiario
                          ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                          : isPub 
                          ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-200' 
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between leading-none">
                        <span className="font-extrabold truncate">{tf.label}</span>
                        <span className={`font-bold text-[9px] ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isUp ? '+' : ''}{tf.changePercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[8px] text-slate-400 leading-tight mt-0.5 font-mono">
                        <span className="text-amber-300/90 font-bold">O:{formatPrice(tf.open)}</span>
                        <span className={isUp ? 'text-emerald-300/90 font-bold' : 'text-rose-300/90 font-bold'}>C:{formatPrice(tf.close)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Columna Derecha: Pistas */}
              <div className="flex-1 relative flex flex-col justify-between py-0.5 space-y-2">
                {/* Guías Verticales */}
                <div className="absolute top-0 bottom-0 z-20 pointer-events-none border-r border-dashed border-cyan-500/70" style={{ left: `${dailyEntryPos}%` }} />
                <div className="absolute top-0 bottom-0 z-20 pointer-events-none border-r border-cyan-400/80 shadow-[0_0_6px_#38bdf8]" style={{ left: `${dailyLivePos}%` }} />
                <div className="absolute top-0 bottom-0 z-10 pointer-events-none border-r border-dashed border-amber-500/40" style={{ left: `${dailySlPos}%` }} />

                {/* SVG Connectors de Alta Fidelidad sin distorsión de aspecto */}
                {showConnectors && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-15 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="compactConnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
                        <stop offset="50%" stopColor="#818cf8" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.95" />
                      </linearGradient>
                    </defs>
                    {connections.map((c, i) => {
                      const midY = (c.y1 + c.y2) / 2;
                      const pathD = `M ${c.x1} ${c.y1} C ${c.x1} ${midY}, ${c.x2} ${midY}, ${c.x2} ${c.y2}`;
                      return (
                        <g key={`compact-conn-${i}`}>
                          {/* Sombra de Resplandor Neón */}
                          <path 
                            d={pathD} 
                            fill="none" 
                            stroke="rgba(56, 189, 248, 0.25)" 
                            strokeWidth="3.5" 
                            vectorEffect="non-scaling-stroke" 
                          />
                          {/* Línea discontinua nítida y estilizada */}
                          <path 
                            d={pathD} 
                            fill="none" 
                            stroke="url(#compactConnGrad)" 
                            strokeWidth="1.8" 
                            strokeDasharray="6,4" 
                            vectorEffect="non-scaling-stroke" 
                            className="opacity-95" 
                          />
                        </g>
                      );
                    })}
                  </svg>
                )}

                {/* Velas */}
                {timeframesList.map((tf) => {
                  const isUp = tf.changePercent >= 0;
                  const isPub = (tf as any).isPublicationTimeframe;
                  const isDiario = tf.timeframe === '1d';
                  const openPos = getDailyPercentPos(tf.open);
                  const closePos = getDailyPercentPos(tf.close);
                  const leftPos = Math.min(openPos, closePos);
                  const widthPos = Math.max(1, Math.abs(closePos - openPos));

                  return (
                    <div key={tf.timeframe} className="h-7 relative flex items-center">
                      <div className="absolute left-0 right-0 h-1.5 bg-slate-900 rounded-full border border-slate-800" />
                      {/* Barra de Vela */}
                      <div 
                        className={`absolute h-4 rounded-full ${
                          isDiario 
                            ? (isUp ? 'bg-gradient-to-r from-amber-500 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-rose-400')
                            : isPub 
                            ? 'bg-gradient-to-r from-cyan-400 to-rose-400' 
                            : isUp ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ left: `${leftPos}%`, width: `${widthPos}%` }}
                      />
                      {/* Marcador Apertura O con Tooltip y Micro-etiqueta */}
                      <div 
                        className="group/marker absolute z-20"
                        style={{ left: `${openPos}%`, transform: 'translateX(-50%)' }}
                        title={`${tf.label} Apertura (O): ${formatPrice(tf.open)}`}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-950 hover:scale-125 transition-transform cursor-pointer" />
                        <div className="hidden group-hover/marker:flex absolute -top-5 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-amber-500/60 text-amber-300 font-mono text-[8px] font-bold px-1 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none z-30">
                          O: {formatPrice(tf.open)}
                        </div>
                      </div>

                      {/* Marcador Cierre C con Tooltip y Micro-etiqueta */}
                      <div 
                        className="group/marker absolute z-20"
                        style={{ left: `${closePos}%`, transform: 'translateX(-50%)' }}
                        title={`${tf.label} Cierre (C): ${formatPrice(tf.close)}`}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full ${isUp ? 'bg-emerald-400' : 'bg-rose-400'} border border-slate-950 hover:scale-125 transition-transform cursor-pointer`} />
                        <div className={`hidden group-hover/marker:flex absolute -bottom-5 left-1/2 -translate-x-1/2 bg-slate-950/95 border ${isUp ? 'border-emerald-500/60 text-emerald-300' : 'border-rose-500/60 text-rose-300'} font-mono text-[8px] font-bold px-1 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none z-30`}>
                          C: {formatPrice(tf.close)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 sm:p-5 text-slate-100 shadow-2xl overflow-hidden font-sans select-none my-3 space-y-5">
      
      {/* 1. Header con métricas principales y semáforo de estado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        
        {/* Título & Badge LIVE */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold font-mono">⚡</span>
            <h3 className="font-extrabold text-sm sm:text-base tracking-wider uppercase text-white font-mono">
              BARRA HORIZONTAL DE PRECIOS MULTI-TEMPORAL
            </h3>
          </div>

          {/* LIVE Price Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-mono text-xs font-bold shadow-md shadow-cyan-500/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span>LIVE: {formatPrice(livePrice)}</span>
          </div>

          {/* Entry & ROI */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">ENTRADA:</span>
            <span className="text-white font-bold">{formatPrice(entryPrice)}</span>
            <span className={`font-bold ml-1 ${pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}% · ROI: {roiPercent >= 0 ? '+' : ''}{roiPercent.toFixed(2)}%)
            </span>
          </div>

          {/* Horas Transcurridas desde Publicación (Dinámica) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-xs font-mono text-cyan-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-400 font-bold">PUB:</span>
            <span className="text-white font-bold">{pubInfo.hours}h</span>
            <span className="text-cyan-400/70 text-[10px]">({pubInfo.timeStr})</span>
          </div>
        </div>

        {/* Controles de Unión MTF */}
        <div className="flex items-center flex-wrap gap-2.5 font-mono text-xs">
          
          {/* Toggle Unir Recorridos */}
          <button
            onClick={() => setShowConnectors(!showConnectors)}
            title="Conectar el Cierre de la mayor con la Apertura de la menor (PUB, 4H, 1H, 15M, 5M)"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer text-xs font-bold ${
              showConnectors 
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-sm shadow-cyan-500/20' 
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Uniones MTF: {showConnectors ? 'ON' : 'OFF'}</span>
          </button>

          {/* Warning badge */}
          {isSlHit ? (
            <span className="px-2.5 py-1 rounded-lg bg-rose-950/90 text-rose-300 border border-rose-600 font-bold flex items-center gap-1">
              <span>💀</span> STOP LOSS
            </span>
          ) : isDangerZone ? (
            <span className="px-2.5 py-1 rounded-lg bg-rose-950/70 text-rose-300 border border-rose-800 font-bold flex items-center gap-1">
              <span>⚠️</span> PELIGRO (SL · E2)
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/70 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-1">
              <span>🎯</span> EN TRAYECTORIA TP
            </span>
          )}
        </div>

      </div>

      {/* 2. BARRA PRINCIPAL INTEGRADA CON TODAS LAS TEMPORALIDADES */}
      <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 relative shadow-inner space-y-4">
        
        {/* Leyenda interactiva de puntos y uniones */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] font-mono text-slate-400 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-3.5 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm" /> Apertura (O)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-sm" /> Cierre Alcista (C)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block shadow-sm" /> Cierre Bajista (C)
            </span>
            <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400 border border-slate-950" />
              </span>
              Precio LIVE (Solo PUB y Diario)
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-2 rounded bg-slate-700/80 inline-block border border-slate-600" /> Rango Diario (Gris)
            </span>
            {showConnectors && (
              <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-cyan-400 animate-dash-flow" /> 
                Unión Fractal: 4H(C) ➔ 1H(O) ➔ 15M(O) ➔ 5M(O) ➔ PUB(O)
              </span>
            )}
          </div>

          <span className="text-[10px] text-amber-300 font-mono font-bold flex items-center gap-1 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/30">
            <Layers className="w-3 h-3 text-amber-400" />
            Escala Rectora: DIARIO ({formatPrice(minDailyScale)} — {formatPrice(maxDailyScale)})
          </span>
        </div>

        {/* SECCIÓN SUPERIOR DE LA BARRA: Pista Master Independiente de Trading (SL, E1, Live, TP1-3) */}
        <div className="relative pt-6 pb-7">
          
          {/* Pista Gradiente de Fondo */}
          <div className="h-3 rounded-full bg-gradient-to-r from-rose-950 via-slate-800 to-emerald-950 border border-slate-700/80 relative shadow-inner overflow-hidden">
            {/* Zona Activa entre Entrada y Live con animación direccional */}
            <div 
              className={`absolute top-0 bottom-0 rounded-full overflow-hidden ${
                pnlPercent >= 0 
                  ? 'bg-gradient-to-r from-cyan-500/50 via-emerald-500/60 to-emerald-400/80 shadow-md shadow-emerald-500/20' 
                  : 'bg-gradient-to-r from-rose-500/70 via-rose-500/60 to-amber-500/50 shadow-md shadow-rose-500/20'
              }`}
              style={{ 
                left: `${Math.min(tradeLivePos, tradeEntryPos)}%`, 
                width: `${Math.abs(tradeLivePos - tradeEntryPos)}%` 
              }}
            >
              <div 
                className={`absolute inset-0 pointer-events-none opacity-40 ${
                  tradeLivePos >= tradeEntryPos ? 'animate-flow-stripes-right' : 'animate-flow-stripes-left'
                }`} 
              />
              <div 
                className={`absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/40 to-transparent ${
                  tradeLivePos >= tradeEntryPos ? 'animate-laser-right' : 'animate-laser-left'
                }`} 
              />
            </div>
          </div>

          {/* Marcador 1: Stop Loss */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
            style={{ left: `${tradeSlPos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-4 h-4 rounded-full bg-rose-500 border-2 border-slate-950 shadow-md flex items-center justify-center text-[7px] font-black text-white">
              SL
            </div>
            <div className="absolute top-4 text-center whitespace-nowrap font-mono text-[10px]">
              <span className="text-rose-300 font-bold block bg-slate-950/90 px-1 rounded border border-rose-900/60">
                SL: {formatPrice(stopLoss)}
                <span className="text-[9px] font-extrabold text-rose-400 block -mt-0.5">
                  {getDeltaPct(stopLoss)}
                </span>
              </span>
            </div>
          </div>

          {/* Marcador E3: Piso Extremo (si existe) */}
          {hasE3 && e3Price && tradeE3Pos !== null && (
            <div 
              className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
              style={{ left: `${tradeE3Pos}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-950 shadow-md flex items-center justify-center text-[7px] font-black text-slate-950">
                E3
              </div>
              <div className="absolute bottom-4 text-center whitespace-nowrap font-mono text-[10px]">
                <span className="text-amber-300 font-bold block bg-slate-950/90 px-1 rounded border border-amber-800/60">
                  E3: {formatPrice(e3Price)}
                  <span className="text-[9px] font-extrabold text-amber-400 block -mt-0.5">
                    {getDeltaPct(e3Price)}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Marcador E2: Refuerzo DCA (si existe) */}
          {hasE2 && e2Price && tradeE2Pos !== null && (
            <div 
              className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
              style={{ left: `${tradeE2Pos}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-sky-400 border-2 border-slate-950 shadow-md flex items-center justify-center text-[7px] font-black text-slate-950">
                E2
              </div>
              <div className="absolute top-4 text-center whitespace-nowrap font-mono text-[10px]">
                <span className="text-sky-300 font-bold block bg-slate-950/90 px-1 rounded border border-sky-800/60">
                  E2: {formatPrice(e2Price)}
                  <span className="text-[9px] font-extrabold text-sky-400 block -mt-0.5">
                    {getDeltaPct(e2Price)}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Marcador 2: Entrada (E1) */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
            style={{ left: `${tradeEntryPos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-4 h-4 rounded-full bg-cyan-400 ring-4 ring-cyan-500/20 border-2 border-slate-950 shadow-md flex items-center justify-center text-[7px] font-black text-slate-950">
              E1
            </div>
            <div className="absolute bottom-4 text-center whitespace-nowrap font-mono text-[10px]">
              <span className="text-cyan-300 font-bold block bg-slate-950/90 px-1 rounded border border-cyan-700/80">
                E1: {formatPrice(entryPrice)}
                <span className="text-[9px] font-extrabold text-cyan-400 block -mt-0.5">
                  {getDeltaPct(entryPrice)}
                </span>
              </span>
            </div>
          </div>

          {/* Marcador 3: LIVE Price Glowing Tag */}
          <div 
            className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none z-30 transition-all duration-300"
            style={{ left: `${tradeLivePos}%`, transform: 'translateX(-50%)' }}
          >
            <span className="bg-cyan-400 text-slate-950 font-mono text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg shadow-cyan-500/40 -translate-y-2">
              {formatPrice(livePrice)}
            </span>
            <div className="w-0.5 flex-1 bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
            <span className="bg-cyan-950 text-cyan-300 border border-cyan-400/80 font-mono text-[9px] font-bold px-1 rounded translate-y-1">
              LIVE
            </span>
          </div>

          {/* Marcadores TP1, TP2, TP3 */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
            style={{ left: `${tradeTp1Pos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-md" />
            <div className="absolute top-4 text-center whitespace-nowrap font-mono text-[10px]">
              <span className="text-emerald-300 font-bold block bg-slate-950/90 px-1 rounded border border-emerald-900/60">
                TP1: {formatPrice(tp1)}
                <span className="text-[9px] font-extrabold text-emerald-400 block -mt-0.5">
                  {getDeltaPct(tp1)}
                </span>
              </span>
            </div>
          </div>

          <div 
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
            style={{ left: `${tradeTp2Pos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-md" />
            <div className="absolute bottom-4 text-center whitespace-nowrap font-mono text-[10px]">
              <span className="text-emerald-300 font-bold block bg-slate-950/90 px-1 rounded border border-emerald-900/60">
                TP2: {formatPrice(tp2)}
                <span className="text-[9px] font-extrabold text-emerald-400 block -mt-0.5">
                  {getDeltaPct(tp2)}
                </span>
              </span>
            </div>
          </div>

          <div 
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
            style={{ left: `${tradeTp3Pos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-md" />
            <div className="absolute top-4 text-center whitespace-nowrap font-mono text-[10px]">
              <span className="text-emerald-300 font-bold block bg-slate-950/90 px-1 rounded border border-emerald-900/60">
                TP3: {formatPrice(tp3)}
                <span className="text-[9px] font-extrabold text-emerald-400 block -mt-0.5">
                  {getDeltaPct(tp3)}
                </span>
              </span>
            </div>
          </div>

        </div>

        {/* LÍNEAS TEMPORALES INTEGRADAS DIRECTAMENTE A LA BARRA PRINCIPAL */}
        <div className="relative pt-2 border-t border-slate-800/80">
          
          {/* Contenedor que agrupa etiquetas y pistas */}
          <div className="flex gap-2 sm:gap-3">
            
            {/* Columna Izquierda: Etiquetas de Temporalidad en el orden exacto */}
            <div className="w-32 sm:w-36 shrink-0 flex flex-col justify-between py-0.5 space-y-2">
              {timeframesList.map((tf) => {
                const isUp = tf.changePercent >= 0;
                const isPub = (tf as any).isPublicationTimeframe;
                const isDiario = tf.timeframe === '1d';

                return (
                  <div 
                    key={tf.timeframe}
                    className={`h-8 flex items-center justify-between px-2 rounded-lg font-mono text-xs border ${
                      isDiario
                        ? 'bg-amber-950/40 border-amber-500/50 text-amber-200 shadow-sm shadow-amber-500/10'
                        : isPub 
                        ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-200 shadow-sm shadow-cyan-500/10' 
                        : 'bg-slate-950/80 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {isDiario ? (
                        <span className="font-black text-amber-300 text-xs flex items-center gap-1">
                          <Layers className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{tf.label}</span>
                        </span>
                      ) : isPub ? (
                        <span className="font-black text-cyan-300 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="truncate">{tf.label}</span>
                        </span>
                      ) : (
                        <span className="font-extrabold text-white text-xs">{tf.label}</span>
                      )}
                    </div>
                    <span className={`font-bold text-[10px] shrink-0 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isUp ? '+' : ''}{tf.changePercent.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Columna Derecha: Pistas Horizontales con Capa SVG Limpia de Uniones */}
            <div className="flex-1 relative flex flex-col justify-between py-0.5 space-y-2">
              
              {/* Guía Vertical Continua: ENTRADA (E1) */}
              <div 
                className="absolute top-0 bottom-0 z-20 pointer-events-none border-r border-dashed border-cyan-500/70"
                style={{ left: `${dailyEntryPos}%` }}
              />

              {/* Guía Vertical Continua: PRECIO LIVE */}
              <div 
                className="absolute top-0 bottom-0 z-20 pointer-events-none border-r border-cyan-400/80 shadow-[0_0_6px_#38bdf8]"
                style={{ left: `${dailyLivePos}%` }}
              />

              {/* Guía Vertical Continua: STOP LOSS */}
              <div 
                className="absolute top-0 bottom-0 z-10 pointer-events-none border-r border-dashed border-amber-500/40"
                style={{ left: `${dailySlPos}%` }}
              />

              {/* CAPA SVG: UNE EL CIERRE DE LA TEMPORALIDAD MAYOR CON LA APERTURA DE LA MENOR (SIN EL DIARIO) */}
              {showConnectors && (
                <svg 
                  className="absolute inset-0 w-full h-full pointer-events-none z-15 overflow-visible"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="connectorGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#818cf8" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.8" />
                    </linearGradient>
                  </defs>

                  {connections.map((conn, idx) => {
                    // Smooth S-curve from Cierre(Mayor) to Apertura(Menor)
                    const midY = (conn.y1 + conn.y2) / 2;
                    const pathD = `M ${conn.x1} ${conn.y1} C ${conn.x1} ${midY}, ${conn.x2} ${midY}, ${conn.x2} ${conn.y2}`;

                    return (
                      <g key={`conn-${idx}`}>
                        {/* Subtle glow backdrop */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke="rgba(56, 189, 248, 0.2)"
                          strokeWidth="3"
                          vectorEffect="non-scaling-stroke"
                        />

                        {/* Animated flowing dashed connector line */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke="url(#connectorGlow)"
                          strokeWidth="1.8"
                          strokeDasharray="4 3"
                          className="animate-dash-flow"
                          vectorEffect="non-scaling-stroke"
                        />
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Renderizado de cada pista horizontal */}
              {timeframesList.map((tf) => {
                const isUp = tf.changePercent >= 0;
                const openPos = getDailyPercentPos(tf.open);
                const closePos = getDailyPercentPos(tf.close);
                const barLeft = Math.min(openPos, closePos);
                const barWidth = Math.max(2.5, Math.abs(closePos - openPos));
                const isPub = (tf as any).isPublicationTimeframe;
                const isDiario = tf.timeframe === '1d';

                // Posiciones para el DIARIO (llena toda la barra y deja en gris el recorrido restante al max/min)
                const dLowPos = isDiario ? getDailyPercentPos(dLow) : 0;
                const dHighPos = isDiario ? getDailyPercentPos(dHigh) : 100;
                const dailyBarLeft = Math.min(dLowPos, dHighPos);
                const dailyBarWidth = Math.max(2.5, Math.abs(dHighPos - dLowPos));

                return (
                  <div 
                    key={tf.timeframe}
                    className={`h-8 relative rounded-md overflow-hidden flex items-center border transition-all ${
                      isDiario 
                        ? 'bg-slate-950 border-amber-500/50 ring-1 ring-amber-500/20' 
                        : isPub
                        ? 'bg-slate-950/90 border-cyan-500/30'
                        : 'bg-slate-950/80 border-slate-800/70'
                    }`}
                  >
                    {/* CASO A: DIARIO - Llena toda la barra con su trayectoria en GRIS y colorea la dirección activa */}
                    {isDiario ? (
                      <>
                        {/* 1. Recorrido Total del Diario en GRIS (Low a High) */}
                        <div 
                          className="h-3 rounded-full absolute bg-slate-700/70 border border-slate-600/80 shadow-inner"
                          style={{ left: `${dailyBarLeft}%`, width: `${dailyBarWidth}%` }}
                          title={`Rango Diario Completo: Min ${formatPrice(dLow)} — Max ${formatPrice(dHigh)}`}
                        />

                        {/* 2. Trayectoria Activa Coloreada según su dirección (Apertura -> Cierre/Live) */}
                        <div 
                          className={`h-3 rounded-full absolute overflow-hidden transition-all duration-300 z-10 ${
                            isUp 
                              ? 'bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-300 shadow-md shadow-emerald-500/40' 
                              : 'bg-gradient-to-r from-amber-400 via-rose-500 to-rose-400 shadow-md shadow-rose-500/40'
                          }`}
                          style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
                        >
                          {/* Animación de rayas direccionales */}
                          <div 
                            className={`absolute inset-0 pointer-events-none opacity-40 ${
                              isUp ? 'animate-flow-stripes-right' : 'animate-flow-stripes-left'
                            }`} 
                          />
                          {/* Haz de luz dinámico */}
                          <div 
                            className={`absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/50 to-transparent ${
                              isUp ? 'animate-laser-right' : 'animate-laser-left'
                            }`} 
                          />
                        </div>

                        {/* Extremos del Diario: MIN y MAX */}
                        <div className="absolute left-2 z-15 pointer-events-none flex items-center gap-1 text-[9px] font-mono font-bold text-amber-300/80 bg-slate-950/80 px-1 py-0.5 rounded border border-amber-500/20">
                          <span>MIN: {formatPrice(dLow)}</span>
                        </div>

                        <div className="absolute right-2 z-15 pointer-events-none flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-300/80 bg-slate-950/80 px-1 py-0.5 rounded border border-emerald-500/20">
                          <span>MAX: {formatPrice(dHigh)}</span>
                        </div>
                      </>
                    ) : (
                      /* CASO B: TEMPORALIDADES CERRADAS (5M, 15M, 1H, 4H) Y PUB (DINÁMICA) */
                      <>
                        {/* Trayectoria de inicio a fin cerrada */}
                        <div 
                          className={`h-3 rounded-full absolute overflow-hidden transition-all duration-300 z-10 ${
                            isPub
                              ? (isUp 
                                  ? 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-emerald-300 shadow-md shadow-cyan-500/30' 
                                  : 'bg-gradient-to-r from-cyan-400 via-rose-500 to-rose-400 shadow-md shadow-rose-500/30')
                              : (isUp 
                                  ? 'bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-300 shadow-sm shadow-emerald-500/20' 
                                  : 'bg-gradient-to-r from-amber-400 via-rose-500 to-rose-400 shadow-sm shadow-rose-500/20')
                          }`}
                          style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
                        >
                          {/* Capa de rayas animadas en dirección del precio */}
                          <div 
                            className={`absolute inset-0 pointer-events-none opacity-40 ${
                              isUp ? 'animate-flow-stripes-right' : 'animate-flow-stripes-left'
                            }`} 
                          />

                          {/* Haz de luz recorriendo de Apertura a Cierre */}
                          <div 
                            className={`absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/50 to-transparent ${
                              isUp ? 'animate-laser-right' : 'animate-laser-left'
                            }`} 
                          />
                        </div>
                      </>
                    )}

                    {/* Punto Apertura: Círculo limpio redondo */}
                    <div 
                      className={`absolute w-3 h-3 rounded-full border border-slate-950 z-20 shadow-xs ${
                        isDiario 
                          ? 'bg-amber-300 ring-2 ring-amber-400/50' 
                          : isPub 
                          ? 'bg-cyan-300 ring-2 ring-cyan-500/50' 
                          : 'bg-amber-400'
                      }`}
                      style={{ left: `${openPos}%`, transform: 'translateX(-50%)' }}
                      title={`${tf.label} Apertura: ${formatPrice(tf.open)}`}
                    />

                    {/* DATO DE APERTURA (O: $...): POSICIONADO A LA PAR DEL CÍRCULO DE APERTURA */}
                    <div 
                      className="absolute top-1/2 z-25 pointer-events-none whitespace-nowrap font-mono text-[9px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-950/95 text-amber-300 border border-amber-500/40 shadow-md"
                      style={{ 
                        left: `${openPos}%`, 
                        transform: (openPos <= closePos && openPos > 12) || openPos > 85
                          ? 'translate(calc(-100% - 6px), -50%)' 
                          : 'translate(6px, -50%)' 
                      }}
                    >
                      <span className="text-amber-400">O:</span>
                      <span>{formatPrice(tf.open)}</span>
                      {isPub && <span className="text-cyan-400 text-[8px] ml-0.5 font-extrabold">(E1)</span>}
                    </div>

                    {/* Punto Cierre:
                        - EL DIARIO TIENE EL CÍRCULO DE PRECIO LIVE CON PULSO
                        - PUB (HORAS TRANSCURRIDAS) NO TIENE CIERRE (SOLO APERTURA Y TRAYECTORIA A LIVE)
                        - 5M, 15M, 1H, 4H TIENEN CÍRCULO ESTÁTICO DE CIERRE PASADO */}
                    {isDiario ? (
                      <div 
                        className="absolute w-3.5 h-3.5 z-20 flex items-center justify-center pointer-events-auto"
                        style={{ left: `${closePos}%`, transform: 'translateX(-50%)' }}
                        title={`${tf.label} Precio LIVE: ${formatPrice(tf.close)} (${isUp ? 'Alcista ➔' : 'Bajista ⬅'})`}
                      >
                        {/* Pulse animado direccional LIVE */}
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          isUp ? 'bg-emerald-400' : 'bg-rose-400'
                        }`} />
                        
                        {/* Círculo sólido principal LIVE */}
                        <span className={`relative inline-flex rounded-full w-3.5 h-3.5 border-2 border-slate-950 shadow-md ${
                          isUp ? 'bg-emerald-400' : 'bg-rose-400'
                        }`} />
                      </div>
                    ) : isPub ? (
                      /* PUB NO TIENE CÍRCULO DE CIERRE (SOLO APERTURA) */
                      null
                    ) : (
                      <div 
                        className={`absolute w-3 h-3 rounded-full border border-slate-950 z-20 shadow-xs ${
                          isUp ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}
                        style={{ left: `${closePos}%`, transform: 'translateX(-50%)' }}
                        title={`${tf.label} Cierre Pasado (Cerrado): ${formatPrice(tf.close)}`}
                      />
                    )}

                    {/* DATO DE CIERRE (C: $...): POSICIONADO A LA PAR DEL CÍRCULO DE CIERRE (EXCEPTO PUB) */}
                    {!isPub && (
                      <div 
                        className={`absolute top-1/2 z-25 pointer-events-none whitespace-nowrap font-mono text-[9px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-950/95 shadow-md ${
                          isDiario
                            ? (isUp ? 'text-emerald-300 border border-emerald-500/60' : 'text-rose-300 border border-rose-500/60')
                            : (isUp ? 'text-emerald-300 border border-emerald-500/40' : 'text-rose-300 border border-rose-500/40')
                        }`}
                        style={{ 
                          left: `${closePos}%`, 
                          transform: (closePos >= openPos && closePos < 88) || closePos < 15
                            ? 'translate(6px, -50%)' 
                            : 'translate(calc(-100% - 6px), -50%)' 
                        }}
                      >
                        <span className={isUp ? 'text-emerald-400' : 'text-rose-400'}>C:</span>
                        <span>{formatPrice(tf.close)}</span>
                        {isDiario && (
                          <span className="text-[8px] bg-cyan-950 text-cyan-300 px-1 py-0.2 rounded border border-cyan-400/50 font-extrabold ml-0.5">
                            LIVE
                          </span>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}

            </div>

          </div>

        </div>

      </div>

      {/* 3. Panel Inferior: Alerta ATR & Resumen de Riesgo/Beneficio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Alerta ATR de Volatilidad */}
        <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/50 rounded-xl p-3.5 shadow-xl text-xs font-mono">
          <div className="flex items-center gap-2 text-amber-400 font-bold mb-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs sm:text-sm">ALERTA ATR: {symbol}</span>
          </div>

          <div className="text-amber-200 font-bold text-xs mb-1">
            Volatilidad calculada: ({atrPct.toFixed(2)}% de rango medio)
          </div>

          <p className="text-slate-300 text-[11px] leading-relaxed mb-2">
            El rango de volatilidad ATR (14) en 4H es <strong className="text-white">{formatPrice(atrVal)}</strong> ({atrPct.toFixed(2)}%). Revisa el dimensionamiento de posición y el nivel de Stop Loss para evitar falsos barridos de liquidez.
          </p>

          <div className="pt-2 border-t border-amber-900/40 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Apalancamiento Recomendado:</span>
            <strong className="text-cyan-300">{leverage}x Aislado</strong>
          </div>
        </div>

        {/* Resumen de Ratio Riesgo / Beneficio */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-xs font-mono flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">Riesgo a Stop Loss:</span>
            <span className="text-rose-400 font-bold">
              -{Math.abs(((entryPrice - stopLoss) / entryPrice) * 100).toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">Beneficio a TP1:</span>
            <span className="text-emerald-400 font-bold">
              +{Math.abs(((tp1 - entryPrice) / entryPrice) * 100).toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300 pt-2 border-t border-slate-800">
            <span className="text-slate-400">Ratio R:B (Objetivo Max TP3):</span>
            <span className="text-cyan-300 font-bold text-sm">
              1:{(Math.abs(tp3 - entryPrice) / Math.max(0.0001, Math.abs(entryPrice - stopLoss))).toFixed(2)}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
