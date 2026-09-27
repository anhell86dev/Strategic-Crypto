import React from 'react';
import { Target, TrendingUp, TrendingDown, Layers, Crosshair } from 'lucide-react';
import { StrategyWithOrders } from '../types';

interface RadarStatsBarProps {
  strategies: StrategyWithOrders[];
}

export const RadarStatsBar: React.FC<RadarStatsBarProps> = ({ strategies }) => {
  const total = strategies.length;
  const alertCount = strategies.filter(s => s.isAlertZone).length;
  const longs = strategies.filter(s => s.type === 'LONG').length;
  const shorts = strategies.filter(s => s.type === 'SHORT').length;
  
  const closestStrategy = strategies.length > 0 && strategies[0].distancePercent !== undefined
    ? strategies[0]
    : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {/* 1. Total Estrategias */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Estrategias Monitoreadas
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono tabular-nums text-white">
              {total}
            </span>
            <span className="text-xs text-slate-500 font-mono">órdenes activas</span>
          </div>
        </div>
        <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
          <Layers className="w-5 h-5" />
        </div>
      </div>

      {/* 2. En Zona de Alerta (<1.5%) */}
      <div className={`border rounded-xl p-3.5 flex items-center justify-between transition-colors ${
        alertCount > 0 
          ? 'bg-gradient-to-br from-blue-950/60 to-slate-900 border-cyan-500/40 shadow-lg shadow-cyan-500/5' 
          : 'bg-slate-900/70 border-slate-800'
      }`}>
        <div>
          <span className="text-[11px] font-medium text-cyan-400 uppercase tracking-wider block flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            Zona de Alerta (&lt; 1.5%)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono tabular-nums text-cyan-300">
              {alertCount}
            </span>
            <span className="text-xs text-cyan-400/80 font-mono">disparos inminentes</span>
          </div>
        </div>
        <div className="p-2 bg-cyan-950/80 border border-cyan-800/40 rounded-lg text-cyan-400">
          <Crosshair className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Bias de Mercado (Long vs Short) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Sesgo de Dirección
          </span>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex items-center gap-1 text-emerald-400 font-mono text-sm font-semibold">
              <TrendingUp className="w-4 h-4" />
              <span>{longs} Long</span>
            </div>
            <span className="text-slate-600">/</span>
            <div className="flex items-center gap-1 text-rose-400 font-mono text-sm font-semibold">
              <TrendingDown className="w-4 h-4" />
              <span>{shorts} Short</span>
            </div>
          </div>
        </div>
        <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
          <span className="text-xs font-mono font-bold text-slate-300">
            {total > 0 ? Math.round((longs / total) * 100) : 50}% L
          </span>
        </div>
      </div>

      {/* 4. Operación Más Próxima */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Líder del Radar (Top #1)
          </span>
          {closestStrategy ? (
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-base font-bold font-mono text-white">
                {closestStrategy.symbol.replace('USDT', '')}
              </span>
              <span className={`text-xs font-mono font-bold ${
                closestStrategy.isAlertZone ? 'text-cyan-300' : 'text-slate-300'
              }`}>
                a {closestStrategy.distancePercent?.toFixed(2)}%
              </span>
            </div>
          ) : (
            <span className="text-sm text-slate-500 mt-1 block">Esperando datos...</span>
          )}
        </div>
        <div className="p-2 bg-slate-800 rounded-lg text-cyan-400 font-mono text-xs font-bold">
          #1
        </div>
      </div>
    </div>
  );
};
