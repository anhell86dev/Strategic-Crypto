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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mb-5">
      {/* 1. Total Estrategias */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
          Estrategias
        </span>
        <div className="flex items-baseline justify-between mt-1">
          <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-white">
            {total}
          </span>
          <div className="p-1.5 bg-slate-800 rounded-lg text-slate-400">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <span className="text-[10px] text-slate-500 font-mono mt-0.5">órdenes en radar</span>
      </div>

      {/* 2. En Zona de Alerta */}
      <div className={`border rounded-xl p-3 flex flex-col justify-between transition-colors ${
        alertCount > 0 
          ? 'bg-gradient-to-br from-blue-950/70 to-slate-900 border-cyan-500/40 shadow-lg shadow-cyan-500/5' 
          : 'bg-slate-900/70 border-slate-800'
      }`}>
        <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider block flex items-center gap-1">
          <Target className="w-3 h-3 text-cyan-400 animate-pulse" />
          Zona Alerta
        </span>
        <div className="flex items-baseline justify-between mt-1">
          <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-cyan-300">
            {alertCount}
          </span>
          <div className="p-1.5 bg-cyan-950/80 border border-cyan-800/40 rounded-lg text-cyan-400">
            <Crosshair className="w-4 h-4" />
          </div>
        </div>
        <span className="text-[10px] text-cyan-400/80 font-mono mt-0.5">disparos inminentes</span>
      </div>

      {/* 3. Bias de Mercado */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
          Sesgo (L / S)
        </span>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-emerald-400 font-mono text-xs font-bold flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" /> {longs}L
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-rose-400 font-mono text-xs font-bold flex items-center gap-0.5">
            <TrendingDown className="w-3 h-3" /> {shorts}S
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono mt-0.5">
          {total > 0 ? Math.round((longs / total) * 100) : 50}% sesgo Long
        </span>
      </div>

      {/* 4. Líder del Radar (#1) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
          Líder Radar (#1)
        </span>
        {closestStrategy ? (
          <div className="mt-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold font-mono text-white truncate">
                {closestStrategy.symbol.replace('USDT', '')}
              </span>
              <span className={`text-[11px] font-mono font-bold ${
                closestStrategy.isAlertZone ? 'text-cyan-300' : 'text-slate-300'
              }`}>
                a {closestStrategy.distancePercent?.toFixed(2)}%
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
              {formatPrice(closestStrategy.currentPrice)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-500 mt-1 block">---</span>
        )}
      </div>

      {/* 5. Best Performing (Top Gainer 24h) */}
      <div className="bg-slate-900/70 border border-emerald-950/80 hover:border-emerald-500/30 rounded-xl p-3 flex flex-col justify-between transition-colors">
        <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-emerald-400" />
            Top Gainer (24h)
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
        </span>
        {bestAsset ? (
          <div className="mt-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold font-mono text-white truncate">
                {bestAsset.symbol.replace('USDT', '')}
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                +{(bestAsset.priceChangePercent24h || 0).toFixed(2)}%
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
              {formatPrice(bestAsset.currentPrice)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-500 mt-1 block">---</span>
        )}
      </div>

      {/* 6. Worst Performing (Top Loser 24h) */}
      <div className="bg-slate-900/70 border border-rose-950/80 hover:border-rose-500/30 rounded-xl p-3 flex flex-col justify-between transition-colors">
        <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider block flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Snowflake className="w-3 h-3 text-rose-400" />
            Top Loser (24h)
          </span>
          <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
        </span>
        {worstAsset ? (
          <div className="mt-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold font-mono text-white truncate">
                {worstAsset.symbol.replace('USDT', '')}
              </span>
              <span className="text-xs font-mono font-bold text-rose-400">
                {(worstAsset.priceChangePercent24h || 0).toFixed(2)}%
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
              {formatPrice(worstAsset.currentPrice)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-500 mt-1 block">---</span>
        )}
      </div>
    </div>
  );
};
