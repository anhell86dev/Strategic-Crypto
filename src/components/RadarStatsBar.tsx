import React, { useMemo } from 'react';
import { Target, TrendingUp, TrendingDown, Layers, Crosshair, ArrowUpRight, ArrowDownRight, Flame, Snowflake } from 'lucide-react';
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

  // Compute Best and Worst performing assets based on 24h change % from live Binance tickers
  const { bestAsset, worstAsset } = useMemo(() => {
    const valid = strategies.filter(s => s.priceChangePercent24h !== undefined && !isNaN(s.priceChangePercent24h));
    if (valid.length === 0) return { bestAsset: null, worstAsset: null };

    const sortedBy24h = [...valid].sort((a, b) => (b.priceChangePercent24h || 0) - (a.priceChangePercent24h || 0));

    const best = sortedBy24h[0];
    const worst = sortedBy24h[sortedBy24h.length - 1];

    return {
      bestAsset: best,
      worstAsset: worst
    };
  }, [strategies]);

  const formatPrice = (val?: number) => {
    if (val === undefined || isNaN(val)) return '---';
    if (val >= 1000) return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (val >= 1) return `$${val.toFixed(2)}`;
    if (val >= 0.01) return `$${val.toFixed(4)}`;
    return `$${val.toFixed(6)}`;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4 mb-6">
      {/* 1. Total Estrategias */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-mono">
          Estrategias
        </span>
        <div className="flex items-baseline justify-between mt-2">
          <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-white">
            {total}
          </span>
          <div className="p-2 bg-slate-800 rounded-xl text-slate-300">
            <Layers className="w-5 h-5" />
          </div>
        </div>
        <span className="text-xs text-slate-400 font-mono mt-1">en radar activo</span>
      </div>

      {/* 2. En Zona de Alerta */}
      <div className={`border rounded-2xl p-4 flex flex-col justify-between shadow-lg transition-colors ${
        alertCount > 0 
          ? 'bg-gradient-to-br from-blue-950/80 to-slate-900 border-cyan-500/60 shadow-cyan-500/10' 
          : 'bg-slate-900/80 border-slate-800'
      }`}>
        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block flex items-center gap-1.5 font-mono">
          <Target className="w-4 h-4 text-cyan-400 animate-pulse" />
          Zona Alerta
        </span>
        <div className="flex items-baseline justify-between mt-2">
          <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-cyan-300">
            {alertCount}
          </span>
          <div className="p-2 bg-cyan-950 border border-cyan-700/50 rounded-xl text-cyan-400">
            <Crosshair className="w-5 h-5" />
          </div>
        </div>
        <span className="text-xs text-cyan-300/90 font-mono mt-1 font-semibold">
          {alertCount === 1 ? '1 disparo inminente' : `${alertCount} disparos inminentes`}
        </span>
      </div>

      {/* 3. Bias de Mercado */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-mono">
          Sesgo (L / S)
        </span>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-emerald-400 font-mono text-base font-black flex items-center gap-0.5">
            <TrendingUp className="w-4 h-4" /> {longs}L
          </span>
          <span className="text-slate-600 font-bold">/</span>
          <span className="text-rose-400 font-mono text-base font-black flex items-center gap-0.5">
            <TrendingDown className="w-4 h-4" /> {shorts}S
          </span>
        </div>
        <span className="text-xs text-slate-400 font-mono mt-1">
          {total > 0 ? Math.round((longs / total) * 100) : 50}% sesgo Long
        </span>
      </div>

      {/* 4. Líder del Radar (#1) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-mono">
          Líder Radar (#1)
        </span>
        {closestStrategy ? (
          <div className="mt-1.5">
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-base font-black font-mono text-white truncate">
                {closestStrategy.symbol.replace('USDT', '')}
              </span>
              <span className={`text-xs font-mono font-bold ${
                closestStrategy.isAlertZone ? 'text-cyan-300' : 'text-slate-300'
              }`}>
                a {closestStrategy.distancePercent?.toFixed(2)}%
              </span>
            </div>
            <span className="text-xs font-mono text-slate-400 block mt-1 font-semibold">
              {formatPrice(closestStrategy.currentPrice)}
            </span>
          </div>
        ) : (
          <span className="text-sm text-slate-500 mt-2 block">---</span>
        )}
      </div>

      {/* 5. Best Performing (Top Gainer 24h) */}
      <div className="bg-slate-900/80 border border-emerald-950/90 hover:border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between shadow-lg transition-colors">
        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block flex items-center justify-between font-mono">
          <span className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-emerald-400" />
            Top Gainer (24h)
          </span>
          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
        </span>
        {bestAsset ? (
          <div className="mt-1.5">
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-base font-black font-mono text-white truncate">
                {bestAsset.symbol.replace('USDT', '')}
              </span>
              <span className="text-xs font-mono font-black text-emerald-400">
                +{(bestAsset.priceChangePercent24h || 0).toFixed(2)}%
              </span>
            </div>
            <span className="text-xs font-mono text-slate-400 block mt-1 font-semibold">
              {formatPrice(bestAsset.currentPrice)}
            </span>
          </div>
        ) : (
          <span className="text-sm text-slate-500 mt-2 block">---</span>
        )}
      </div>

      {/* 6. Worst Performing (Top Loser 24h) */}
      <div className="bg-slate-900/80 border border-rose-950/90 hover:border-rose-500/40 rounded-2xl p-4 flex flex-col justify-between shadow-lg transition-colors">
        <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block flex items-center justify-between font-mono">
          <span className="flex items-center gap-1.5">
            <Snowflake className="w-4 h-4 text-rose-400" />
            Top Loser (24h)
          </span>
          <ArrowDownRight className="w-4 h-4 text-rose-400" />
        </span>
        {worstAsset ? (
          <div className="mt-1.5">
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-base font-black font-mono text-white truncate">
                {worstAsset.symbol.replace('USDT', '')}
              </span>
              <span className="text-xs font-mono font-black text-rose-400">
                {(worstAsset.priceChangePercent24h || 0).toFixed(2)}%
              </span>
            </div>
            <span className="text-xs font-mono text-slate-400 block mt-1 font-semibold">
              {formatPrice(worstAsset.currentPrice)}
            </span>
          </div>
        ) : (
          <span className="text-sm text-slate-500 mt-2 block">---</span>
        )}
      </div>
    </div>
  );
};
