import React from 'react';
import { StrategyWithOrders } from '../types';
import { indicatorsService, CompleteStrategyConfluence } from '../services/indicatorsService';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Layers, 
  Scale, 
  Gauge, 
  BarChart3, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Radio, 
  Crosshair, 
  PieChart
} from 'lucide-react';

interface StrategyConfluencePanelProps {
  strategy: StrategyWithOrders;
  compact?: boolean;
}

export const StrategyConfluencePanel: React.FC<StrategyConfluencePanelProps> = ({ 
  strategy, 
  compact = false 
}) => {
  const confluence: CompleteStrategyConfluence = indicatorsService.getCompleteConfluence(strategy);
  const { futures, technical, operational, overallScore, priorityBadge } = confluence;

  const formatUsdMillion = (val: number) => {
    return `$${(val / 1000000).toFixed(1)}M`;
  };

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 font-mono select-none">
      
      {/* Header / Hero Confluence Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-black shadow-lg shadow-cyan-500/10">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-sm sm:text-base text-white tracking-wide uppercase">
                Panel de Confluencia Multicapa & Futuros FAPI
              </h4>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Evaluación cuantitativa en tiempo real (Puntuación Global: <strong className="text-cyan-400">{overallScore}%</strong>)
            </p>
          </div>
        </div>

        {/* Priority & Futures Semaphore Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zona de Gatillo Badge */}
          {operational.isTriggerZoneActive && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-950 border border-cyan-400 text-cyan-300 text-xs font-bold animate-pulse shadow-lg shadow-cyan-500/30">
              <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
              <span>GATILLO ACTIVO (&lt;1.5%)</span>
            </div>
          )}

          {/* Semáforo FAPI Badge */}
          <div className={`px-3 py-1 rounded-xl border text-xs font-black uppercase tracking-wider shadow-md ${futures.futuresStatusColor}`}>
            <span>🚦 {futures.futuresStatus} ({futures.futuresScore}%)</span>
          </div>

          {/* Priority Confluence Badge */}
          <div className={`px-3 py-1 rounded-xl border text-xs font-black uppercase tracking-wider shadow-md ${priorityBadge.bgClass} ${priorityBadge.borderClass} ${priorityBadge.textClass}`}>
            <span>{priorityBadge.label}</span>
          </div>
        </div>
      </div>

      {/* Grid of 3 Layers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* LAYER 1: Confluencia Cuantitativa de Futuros (Métricas FAPI) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              1. Futuros FAPI (Cuantitativo)
            </span>
            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
              Score: {futures.futuresScore}%
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Open Interest (OI) */}
            <div className="flex items-center justify-between bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400">Interés Abierto (OI)</span>
                <span className="font-bold text-slate-200">{formatUsdMillion(futures.openInterestUsd)}</span>
              </div>
              <div className="text-right">
                <span className={`text-[11px] font-bold ${futures.openInterestChange24hPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {futures.openInterestChange24hPct >= 0 ? '+' : ''}{futures.openInterestChange24hPct.toFixed(1)}% 24h
                </span>
                <span className="block text-[9px] text-slate-400 font-bold">{futures.openInterestSignal}</span>
              </div>
            </div>

            {/* Funding Rate */}
            <div className="flex items-center justify-between bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400">Funding Rate</span>
                <span className="font-bold text-amber-300">{(futures.fundingRatePct).toFixed(4)}%</span>
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                  futures.fundingSignal === 'OPTIMO' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                  futures.fundingSignal === 'SOBRECALENTADO' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                  'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {futures.fundingSignal}
                </span>
              </div>
            </div>

            {/* Taker Buy/Sell & Top Trader Ratio */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                <span className="text-[9px] text-slate-400 block">Taker Buy/Sell</span>
                <span className={`text-xs font-bold ${futures.takerBuySellRatio >= 1.05 ? 'text-emerald-400' : futures.takerBuySellRatio <= 0.95 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {futures.takerBuySellRatio.toFixed(2)}x
                </span>
              </div>

              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                <span className="text-[9px] text-slate-400 block">Top Trader L/S</span>
                <span className={`text-xs font-bold ${futures.topTraderLongShortRatio >= 1.20 ? 'text-emerald-400' : futures.topTraderLongShortRatio <= 0.90 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {futures.topTraderLongShortRatio.toFixed(2)}x
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* LAYER 2: Confluencia Técnica Multitemporal */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
              2. Confluencia Técnica
            </span>
            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
              Score: {technical.technicalScore}%
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* EMAs Alignment */}
            <div className="flex items-center justify-between bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
              <div>
                <span className="text-[10px] text-slate-400 block">Alineación EMAs</span>
                <span className="text-[10px] text-slate-300 font-bold">15/50/200</span>
              </div>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                technical.emaAlignment === 'ALCISTA' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                technical.emaAlignment === 'BAJISTA' ? 'bg-rose-950 text-rose-300 border-rose-800' :
                'bg-amber-950 text-amber-300 border-amber-800'
              }`}>
                {technical.emaAlignment}
              </span>
            </div>

            {/* RSI & MACD */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                <span className="text-[9px] text-slate-400 block">RSI (14)</span>
                <span className={`text-xs font-bold ${
                  technical.rsiZone === 'OPTIMO_RETROCESO' ? 'text-emerald-400' : 'text-amber-300'
                }`}>
                  {technical.rsi14} ({technical.rsiZone === 'OPTIMO_RETROCESO' ? 'Óptimo' : 'Neutral'})
                </span>
              </div>

              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                <span className="text-[9px] text-slate-400 block">RVOL (Volumen)</span>
                <span className={`text-xs font-bold ${technical.rvol >= 1.2 ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {technical.rvol}x
                </span>
              </div>
            </div>

            {/* ATR Volatilidad */}
            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">ATR 14 (Volatilidad)</span>
              <span className="text-xs font-bold text-cyan-300">
                ${technical.atr14.toFixed(4)} ({technical.atrPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* LAYER 3: Rango Operativo, R:B & Gatillo */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              3. Rango Operativo & R:B
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              operational.riskRewardStatus !== 'INSUFICIENTE' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-rose-950 text-rose-300 border-rose-800'
            }`}>
              R:B {operational.riskRewardRatio.toFixed(2)}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Ratio Riesgo Beneficio Requirement */}
            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Ratio R:B Mínimo (&gt;1:2.0)</span>
                <span className="text-xs font-extrabold text-white">1:{operational.riskRewardRatio.toFixed(2)}</span>
              </div>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                operational.riskRewardStatus === 'EXCELENTE' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                operational.riskRewardStatus === 'APTO' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                'bg-rose-950 text-rose-300 border-rose-800'
              }`}>
                {operational.riskRewardStatus}
              </span>
            </div>

            {/* Zona de Gatillo (<1.5% E1) */}
            <div className={`p-2.5 rounded-lg border transition-all ${
              operational.isTriggerZoneActive
                ? 'bg-cyan-950/80 border-cyan-400 shadow-md shadow-cyan-500/20'
                : 'bg-slate-950/70 border-slate-800/80'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Distancia a Entrada 1 (E1)</span>
                <span className={`text-xs font-black ${operational.isTriggerZoneActive ? 'text-cyan-300 animate-pulse' : 'text-slate-300'}`}>
                  {operational.distanceToE1Pct.toFixed(2)}%
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans mt-1">
                {operational.isTriggerZoneActive
                  ? '⚡ Zona de Gatillo Activa (&lt;1.5% a E1). Alta prioridad para orden ejecutada.'
                  : 'Fuera de zona de gatillo inmediato (>1.5% a E1).'}
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
