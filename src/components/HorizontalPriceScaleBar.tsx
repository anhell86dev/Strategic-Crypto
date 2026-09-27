import React, { useState, useEffect, useMemo } from 'react';
import { StrategyWithOrders, TimeframeCandle } from '../types';
import { multiTimeframeService } from '../services/multiTimeframeService';
import { 
  Target, 
  Activity, 
  AlertTriangle, 
  Clock, 
  GitBranch
} from 'lucide-react';

interface HorizontalPriceScaleBarProps {
  strategy: StrategyWithOrders;
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
  strategy
}) => {
  const {
    symbol,
    coinName,
    type,
    entryPrice,
    stopLoss,
    currentPrice,
    orders = [],
    leverage = 5,
    date: pubDate,
    strategyName
  } = strategy;

  const isLong = type === 'LONG';
  const livePrice = currentPrice || entryPrice;

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

  // Timeframe Candle representing elapsed hours since publication
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
      durationMinutes: pubInfo.hours * 60
    };
  }, [pubInfo, entryPrice, livePrice]);

  // Compute unified price range bounds for the continuous scale
  const { minScale, maxScale, scaleSpan } = useMemo(() => {
    const allPrices = [livePrice, entryPrice, stopLoss, tp1, tp2, tp3];
    if (tfData?.candles) {
      Object.values(tfData.candles).forEach(c => {
        allPrices.push(c.open, c.close, c.high, c.low);
      });
    }

    const min = Math.min(...allPrices.filter(p => p > 0));
    const max = Math.max(...allPrices.filter(p => p > 0));
    const padding = (max - min) * 0.08 || min * 0.02;

    return {
      minScale: Math.max(0, min - padding),
      maxScale: max + padding,
      scaleSpan: Math.max(0.000001, (max + padding) - (min - padding))
    };
  }, [livePrice, entryPrice, stopLoss, tp1, tp2, tp3, tfData]);

  // Convert price to percentage position (0% -> 100%) on the horizontal bar
  const getPercentPos = (price: number) => {
    const pos = ((price - minScale) / scaleSpan) * 100;
    return Math.max(3, Math.min(97, pos));
  };

  const livePos = getPercentPos(livePrice);
  const entryPos = getPercentPos(entryPrice);
  const slPos = getPercentPos(stopLoss);
  const tp1Pos = getPercentPos(tp1);
  const tp2Pos = getPercentPos(tp2);
  const tp3Pos = getPercentPos(tp3);

  // Timeframe Rows strictly ordered from top to bottom as requested:
  // 1. Horas transcurridas (PUB)
  // 2. 5M
  // 3. 15M
  // 4. 1H
  // 5. 4H
  // 6. DIARIO
  // (2H and 3H removed)
  const timeframesList = useMemo(() => {
    const candles = tfData?.candles || {};
    return [
      pubCandle,
      { ...(candles['5m'] || { timeframe: '5m', label: '5M', timeStr: '00:25', open: livePrice * 0.9985, close: livePrice, changePercent: 0.15 }), durationMinutes: 5 },
      { ...(candles['15m'] || { timeframe: '15m', label: '15M', timeStr: '00:15', open: livePrice * 0.9997, close: livePrice, changePercent: 0.03 }), durationMinutes: 15 },
      { ...(candles['1h'] || { timeframe: '1h', label: '1H', timeStr: '00:00', open: livePrice * 0.9984, close: livePrice, changePercent: 0.16 }), durationMinutes: 60 },
      { ...(candles['4h'] || { timeframe: '4h', label: '4H', timeStr: '21:00', open: livePrice * 1.0095, close: livePrice, changePercent: -0.95 }), durationMinutes: 240 },
      { ...(candles['1d'] || { timeframe: '1d', label: 'DIARIO', timeStr: 'Hoy', open: livePrice * 1.0440, close: livePrice, changePercent: -4.40 }), durationMinutes: 1440 }
    ];
  }, [tfData, livePrice, pubCandle]);

  // Compute connections: The close of the higher timeframe connects to the open of the next lower timeframe
  const connections = useMemo(() => {
    if (!showConnectors || timeframesList.length < 2) return [];

    const conns: {
      fromIndex: number;
      toIndex: number;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      higherLabel: string;
      lowerLabel: string;
    }[] = [];

    const totalRows = timeframesList.length;

    for (let i = 0; i < totalRows - 1; i++) {
      const current = timeframesList[i];
      const next = timeframesList[i + 1];

      const durCurrent = (current as any).durationMinutes || (current.timeframe === 'pub' ? pubInfo.hours * 60 : 0);
      const durNext = (next as any).durationMinutes || (next.timeframe === 'pub' ? pubInfo.hours * 60 : 0);

      // Determine which one is higher in duration
      const isCurrentHigher = durCurrent >= durNext;
      const higherTF = isCurrentHigher ? current : next;
      const lowerTF = isCurrentHigher ? next : current;
      const higherIndex = isCurrentHigher ? i : i + 1;
      const lowerIndex = isCurrentHigher ? i + 1 : i;

      // Close of higher -> Open of lower
      const x1 = getPercentPos(higherTF.close);
      const y1 = ((higherIndex + 0.5) / totalRows) * 100;

      const x2 = getPercentPos(lowerTF.open);
      const y2 = ((lowerIndex + 0.5) / totalRows) * 100;

      conns.push({
        fromIndex: higherIndex,
        toIndex: lowerIndex,
        x1,
        y1,
        x2,
        y2,
        higherLabel: higherTF.label,
        lowerLabel: lowerTF.label
      });
    }

    return conns;
  }, [timeframesList, showConnectors, minScale, scaleSpan, pubInfo.hours]);

  // ATR metrics
  const atrVal = tfData?.atr14 || (livePrice * 0.02);
  const atrPct = tfData?.atrPercent || 2.0;

  // Status checks
  const isSlHit = isLong ? livePrice <= stopLoss : livePrice >= stopLoss;
  const isDangerZone = isLong ? livePrice < entryPrice && livePrice > stopLoss : livePrice > entryPrice && livePrice < stopLoss;

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

          {/* Horas Transcurridas desde Publicación */}
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
            title="Conectar el Cierre de la temporalidad mayor con la Apertura de la menor"
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

      {/* 2. BARRA PRINCIPAL INTEGRADA CON TODAS LAS TEMPORALIDADES Y UNIONES */}
      <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 relative shadow-inner space-y-4">
        
        {/* Leyenda interactiva de puntos y uniones */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] font-mono text-slate-400 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm" /> Apertura (O)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-sm" /> Cierre Alcista (C)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block shadow-sm" /> Cierre Bajista (C)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-sm" /> Publicación (PUB)
            </span>
            {showConnectors && (
              <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-cyan-400" /> 
                Unión: Cierre (Mayor) ➔ Apertura (Menor)
              </span>
            )}
          </div>

          <span className="text-[10px] text-slate-500">
            Escala Unificada: {formatPrice(minScale)} — {formatPrice(maxScale)}
          </span>
        </div>

        {/* SECCIÓN SUPERIOR DE LA BARRA: Pista Master con Marcadores de Precio (SL, E1, Live, TP1-3) */}
        <div className="relative pt-6 pb-7">
          
          {/* Pista Gradiente de Fondo */}
          <div className="h-3 rounded-full bg-gradient-to-r from-rose-950 via-slate-800 to-emerald-950 border border-slate-700/80 relative shadow-inner">
            {/* Zona Activa entre Entrada y Live */}
            <div 
              className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-cyan-500/40 to-emerald-500/40"
              style={{ 
                left: `${Math.min(livePos, entryPos)}%`, 
                width: `${Math.abs(livePos - entryPos)}%` 
              }}
            />
          </div>

          {/* Marcador 1: Stop Loss */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
            style={{ left: `${slPos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-slate-950 shadow-md flex items-center justify-center text-[8px] font-bold text-slate-950">
              SL
            </div>
            <div className="absolute top-4 text-center whitespace-nowrap font-mono text-[10px]">
              <span className="text-amber-300 font-bold block">{formatPrice(stopLoss)}</span>
              <span className="text-amber-400/80 text-[9px] block">
                {formatPrice(stopLoss)}
              </span>
            </div>
          </div>

          {/* Marcador 2: Entrada (E1) */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
            style={{ left: `${entryPos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-4 h-4 rounded-full bg-cyan-400 ring-4 ring-cyan-500/20 border-2 border-slate-950 shadow-md flex items-center justify-center text-[8px] font-bold text-slate-950">
              E1
            </div>
            <div className="absolute top-4 text-center whitespace-nowrap font-mono text-[10px]">
              <span className="text-cyan-300 font-bold block">ENTRADA ({formatPrice(entryPrice)})</span>
            </div>
          </div>

          {/* Marcador 3: LIVE Price Glowing Tag */}
          <div 
            className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none z-30 transition-all duration-300"
            style={{ left: `${livePos}%`, transform: 'translateX(-50%)' }}
          >
            <span className="bg-cyan-500 text-slate-950 font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-lg shadow-cyan-500/40 -translate-y-2">
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
            style={{ left: `${tp1Pos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-md" />
            <div className="absolute top-4 text-center whitespace-nowrap font-mono text-[10px]">
              <span className="text-emerald-300 font-bold block">TP1 {formatPrice(tp1)}</span>
            </div>
          </div>

          <div 
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
            style={{ left: `${tp2Pos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-md" />
            <div className="absolute top-4 text-center whitespace-nowrap font-mono text-[10px]">
              <span className="text-emerald-300 font-bold block">TP2 {formatPrice(tp2)}</span>
            </div>
          </div>

          <div 
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
            style={{ left: `${tp3Pos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-md" />
            <div className="absolute top-4 text-center whitespace-nowrap font-mono text-[10px]">
              <span className="text-emerald-300 font-bold block">TP3 {formatPrice(tp3)}</span>
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

                return (
                  <div 
                    key={tf.timeframe}
                    className={`h-7 flex items-center justify-between px-2 rounded-lg font-mono text-xs border ${
                      isPub 
                        ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-200 shadow-sm shadow-cyan-500/10' 
                        : 'bg-slate-950/80 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {isPub ? (
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
                style={{ left: `${entryPos}%` }}
              />

              {/* Guía Vertical Continua: PRECIO LIVE */}
              <div 
                className="absolute top-0 bottom-0 z-20 pointer-events-none border-r border-cyan-400/80 shadow-[0_0_6px_#38bdf8]"
                style={{ left: `${livePos}%` }}
              />

              {/* Guía Vertical Continua: STOP LOSS */}
              <div 
                className="absolute top-0 bottom-0 z-10 pointer-events-none border-r border-dashed border-amber-500/40"
                style={{ left: `${slPos}%` }}
              />

              {/* CAPA SVG: UNE EL CIERRE DE LA TEMPORALIDAD MAYOR CON LA APERTURA DE LA MENOR */}
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

                        {/* Clean dashed connector line */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke="url(#connectorGlow)"
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                          vectorEffect="non-scaling-stroke"
                        />
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Renderizado de cada pista horizontal con círculos nativos perfectamente redondos */}
              {timeframesList.map((tf) => {
                const isUp = tf.changePercent >= 0;
                const openPos = getPercentPos(tf.open);
                const closePos = getPercentPos(tf.close);
                const barLeft = Math.min(openPos, closePos);
                const barWidth = Math.max(2.5, Math.abs(closePos - openPos));
                const isPub = (tf as any).isPublicationTimeframe;

                return (
                  <div 
                    key={tf.timeframe}
                    className="h-7 relative bg-slate-900/90 rounded-md border border-slate-800/70 overflow-hidden flex items-center"
                  >
                    {/* Cuerpo de la vela / rango */}
                    <div 
                      className={`h-2.5 rounded-full absolute transition-all duration-300 ${
                        isPub
                          ? (isUp 
                              ? 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-emerald-300 shadow-md shadow-cyan-500/30' 
                              : 'bg-gradient-to-r from-cyan-400 via-rose-500 to-rose-400 shadow-md shadow-rose-500/30')
                          : (isUp 
                              ? 'bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-300 shadow-sm shadow-emerald-500/20' 
                              : 'bg-gradient-to-r from-amber-400 via-rose-500 to-rose-400 shadow-sm shadow-rose-500/20')
                      }`}
                      style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
                    />

                    {/* Punto Apertura: Círculo limpio redondo */}
                    <div 
                      className={`absolute w-3 h-3 rounded-full border border-slate-950 z-20 shadow-xs ${
                        isPub ? 'bg-cyan-300 ring-2 ring-cyan-500/50' : 'bg-amber-400'
                      }`}
                      style={{ left: `${openPos}%`, transform: 'translateX(-50%)' }}
                      title={`${tf.label} Apertura: ${formatPrice(tf.open)}`}
                    />

                    {/* Punto Cierre: Círculo limpio redondo */}
                    <div 
                      className={`absolute w-3 h-3 rounded-full border border-slate-950 z-20 shadow-sm ${
                        isUp ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                      style={{ left: `${closePos}%`, transform: 'translateX(-50%)' }}
                      title={`${tf.label} Cierre: ${formatPrice(tf.close)}`}
                    />

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
