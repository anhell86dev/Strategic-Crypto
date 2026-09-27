import React, { useState, useEffect, useMemo } from 'react';
import { StrategyWithOrders, TimeframeCandle } from '../types';
import { multiTimeframeService } from '../services/multiTimeframeService';
import { 
  Target, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Layers, 
  ShieldAlert,
  Flame,
  Info,
  Maximize2,
  Crosshair,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface HorizontalPriceScaleBarProps {
  strategy: StrategyWithOrders;
}

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
    leverage = 5
  } = strategy;

  const isLong = type === 'LONG';
  const livePrice = currentPrice || entryPrice;

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

  // Timeframe Rows (1H clean without "ACTUAL")
  const timeframesList = useMemo(() => {
    const candles = tfData?.candles || {};
    return [
      candles['5m'] || { timeframe: '5m', label: '5M', timeStr: '00:25', open: livePrice * 0.9985, close: livePrice, changePercent: 0.15 },
      candles['15m'] || { timeframe: '15m', label: '15M', timeStr: '00:15', open: livePrice * 0.9997, close: livePrice, changePercent: 0.03 },
      candles['1h'] || { timeframe: '1h', label: '1H', timeStr: '00:00', open: livePrice * 0.9984, close: livePrice, changePercent: 0.16 },
      candles['2h'] || { timeframe: '2h', label: '2H', timeStr: '23:00', open: livePrice * 0.9731, close: livePrice, changePercent: 2.69 },
      candles['3h'] || { timeframe: '3h', label: '3H', timeStr: '22:00', open: livePrice * 1.0296, close: livePrice, changePercent: -2.96 },
      candles['4h'] || { timeframe: '4h', label: '4H', timeStr: '21:00', open: livePrice * 1.0095, close: livePrice, changePercent: -0.95 },
      candles['1d'] || { timeframe: '1d', label: 'DIARIO', timeStr: 'Hoy', open: livePrice * 1.0440, close: livePrice, changePercent: -4.40 }
    ];
  }, [tfData, livePrice]);

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
        </div>

        {/* Semáforo de Estado y Leyenda */}
        <div className="flex items-center flex-wrap gap-3 font-mono text-xs">
          <div className="flex items-center gap-3 text-[11px] text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Apertura (O)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Cierre (C)
            </span>
          </div>

          {/* Warning badge */}
          {isSlHit ? (
            <span className="px-2.5 py-1 rounded-lg bg-rose-950/90 text-rose-300 border border-rose-600 font-bold flex items-center gap-1">
              <span>💀</span> TOCÓ STOP LOSS
            </span>
          ) : isDangerZone ? (
            <span className="px-2.5 py-1 rounded-lg bg-rose-950/70 text-rose-300 border border-rose-800 font-bold flex items-center gap-1">
              <span>⚠️</span> ZONA DE PELIGRO (SL · E2)
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
        <div className="relative pt-2 border-t border-slate-800/80 space-y-1.5">
          
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

          {/* Renderizado de cada barra temporal integrada (5M, 15M, 1H, 2H, 3H, 4H, DIARIO) */}
          {timeframesList.map((tf) => {
            const isUp = tf.changePercent >= 0;
            const openPos = getPercentPos(tf.open);
            const closePos = getPercentPos(tf.close);
            const barLeft = Math.min(openPos, closePos);
            const barWidth = Math.max(2.5, Math.abs(closePos - openPos));

            return (
              <div 
                key={tf.timeframe}
                className="flex items-center gap-3 p-1 rounded-lg bg-slate-950/60 border border-slate-800/40 hover:border-slate-700/80 transition-colors font-mono text-xs"
              >
                {/* Etiqueta Temporal Limpia (ej. 1H sin 'Actual') */}
                <div className="flex items-center justify-between w-28 shrink-0 text-[11px] px-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-white text-xs">{tf.label}</span>
                    <span className="text-slate-500 text-[10px]">({tf.timeStr})</span>
                  </div>
                  <span className={`font-bold text-[10px] ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isUp ? '+' : ''}{tf.changePercent.toFixed(2)}%
                  </span>
                </div>

                {/* Barra en la misma escala horizontal continua (0% - 100%) */}
                <div className="flex-1 h-5 relative bg-slate-900/90 rounded-md border border-slate-800/60 overflow-hidden flex items-center">
                  
                  {/* Cuerpo de la vela / rango */}
                  <div 
                    className={`h-2.5 rounded-full absolute transition-all duration-300 ${
                      isUp 
                        ? 'bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-300 shadow-sm shadow-emerald-500/20' 
                        : 'bg-gradient-to-r from-amber-400 via-rose-500 to-rose-400 shadow-sm shadow-rose-500/20'
                    }`}
                    style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
                  />

                  {/* Punto Apertura (O) */}
                  <div 
                    className="absolute w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-950 z-10 shadow-xs"
                    style={{ left: `${openPos}%`, transform: 'translateX(-50%)' }}
                    title={`${tf.label} Open: ${formatPrice(tf.open)}`}
                  />

                  {/* Punto Cierre (C) */}
                  <div 
                    className={`absolute w-3.5 h-3.5 rounded-full border border-slate-950 z-10 flex items-center justify-center text-[7px] font-black text-slate-950 ${
                      isUp ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                    style={{ left: `${closePos}%`, transform: 'translateX(-50%)' }}
                    title={`${tf.label} Close: ${formatPrice(tf.close)}`}
                  >
                    {isUp ? '▶' : '◀'}
                  </div>

                </div>
              </div>
            );
          })}

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
