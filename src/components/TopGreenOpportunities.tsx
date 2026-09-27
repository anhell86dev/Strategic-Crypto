import React from 'react';
import { StrategyWithOrders } from '../types';
import { 
  Trophy, 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Sparkles, 
  Target, 
  Scale, 
  CheckCircle2, 
  ExternalLink,
  Zap,
  Activity,
  Award
} from 'lucide-react';

interface TopGreenOpportunitiesProps {
  topStrategies: StrategyWithOrders[];
  onSelectStrategy?: (strategy: StrategyWithOrders) => void;
  onFilterGreen?: () => void;
  isGreenFilterActive?: boolean;
}

export const TopGreenOpportunities: React.FC<TopGreenOpportunitiesProps> = ({
  topStrategies,
  onSelectStrategy,
  onFilterGreen,
  isGreenFilterActive = false
}) => {
  if (!topStrategies || topStrategies.length === 0) {
    return null;
  }

  const formatPrice = (p?: number) => {
    if (p === undefined || p === null) return '--';
    if (p >= 1000) return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (p >= 1) return `$${p.toFixed(4)}`;
    return `$${p.toFixed(6)}`;
  };

  const getRankBadge = (idx: number) => {
    if (idx === 0) {
      return {
        label: '#1 TOP',
        badgeClass: 'bg-amber-400 text-slate-950 font-black shadow-amber-500/30',
        ringClass: 'ring-amber-400/40 border-amber-500/60',
        icon: Trophy
      };
    }
    if (idx === 1) {
      return {
        label: '#2 TOP',
        badgeClass: 'bg-slate-200 text-slate-950 font-black shadow-slate-300/30',
        ringClass: 'ring-slate-300/40 border-slate-400/60',
        icon: Award
      };
    }
    if (idx === 2) {
      return {
        label: '#3 TOP',
        badgeClass: 'bg-amber-600 text-white font-black shadow-amber-700/30',
        ringClass: 'ring-amber-600/40 border-amber-600/60',
        icon: Flame
      };
    }
    return {
      label: `#${idx + 1}`,
      badgeClass: 'bg-slate-800 text-slate-300 font-bold',
      ringClass: 'ring-slate-700/40 border-slate-700/60',
      icon: Sparkles
    };
  };

  return (
    <div className="bg-gradient-to-b from-emerald-950/40 via-slate-900/80 to-slate-950/90 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md mb-6 relative overflow-hidden">
      
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-emerald-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30">
            <Trophy className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                TOP 5 OPORTUNIDADES · SEMÁFORO VERDE 🟢
              </h3>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                VÁLIDAS EN ZONA & MEJOR R:B
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Estrategias verificadas desde su publicación: <strong>Sin tocar SL</strong>, <strong>sin TP previo</strong>, situadas en zona de entrada y con mayor retorno.
            </p>
          </div>
        </div>

        {onFilterGreen && (
          <button
            onClick={onFilterGreen}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md self-start md:self-auto ${
              isGreenFilterActive
                ? 'bg-emerald-400 text-slate-950 shadow-emerald-500/20 ring-2 ring-emerald-300'
                : 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isGreenFilterActive ? 'Filtro Verde Activo' : 'Ver Solo Semáforo Verde'}</span>
          </button>
        )}
      </div>

      {/* Grid of Top 5 Cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 pt-4">
        {topStrategies.map((strat, idx) => {
          const isLong = strat.type === 'LONG';
          const currentPrice = strat.currentPrice || strat.entryPrice;
          const distPct = strat.trafficLight?.distanceToEntryPct ?? strat.distancePercent ?? 0;
          const rb = strat.trafficLight?.riskRewardRatio || 2.0;
          const rankInfo = getRankBadge(idx);
          const RankIcon = rankInfo.icon;
          const tp1 = strat.orders?.[0]?.targetPrice;

          return (
            <div
              key={strat.id}
              onClick={() => onSelectStrategy && onSelectStrategy(strat)}
              className={`group relative bg-slate-950/80 hover:bg-slate-900/90 border rounded-xl p-3.5 transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5 ${
                idx === 0 
                  ? 'border-amber-500/40 ring-1 ring-amber-500/20' 
                  : 'border-slate-800 hover:border-emerald-500/40'
              }`}
            >
              {/* Top Row: Rank Badge & Direction */}
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] tracking-wider flex items-center gap-1 shadow-xs ${rankInfo.badgeClass}`}>
                      <RankIcon className="w-2.5 h-2.5" />
                      {rankInfo.label}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                      isLong 
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                    }`}>
                      {strat.type}
                    </span>
                  </div>

                  {/* Semáforo Verde Indicator */}
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    VERDE
                  </span>
                </div>

                {/* Symbol & Coin Name */}
                <div className="mb-2">
                  <div className="flex items-baseline justify-between">
                    <span className="font-extrabold text-white text-sm group-hover:text-emerald-300 transition-colors">
                      {strat.symbol}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {strat.category || 'Spot / Fut'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    {strat.coinName} · {strat.leverage}x
                  </p>
                </div>

                {/* Key Metrics: R:B & Distance */}
                <div className="grid grid-cols-2 gap-1.5 bg-slate-900/90 rounded-lg p-2 border border-slate-800/80 mb-2.5">
                  <div>
                    <div className="text-[9px] font-mono text-slate-400 flex items-center gap-0.5">
                      <Scale className="w-2.5 h-2.5 text-emerald-400" />
                      R:B Ratio
                    </div>
                    <div className="text-xs font-mono font-black text-emerald-400">
                      1:{rb.toFixed(2)}
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] font-mono text-slate-400 flex items-center gap-0.5">
                      <Target className="w-2.5 h-2.5 text-cyan-400" />
                      Dist. Entrada
                    </div>
                    <div className="text-xs font-mono font-bold text-cyan-300">
                      {distPct <= 0.1 ? 'En Zona DCA' : `${distPct.toFixed(2)}%`}
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-1 text-[10px] font-mono border-t border-slate-800/60 pt-2 mb-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Entrada (E1):</span>
                    <span className="font-bold text-cyan-300">{formatPrice(strat.entryPrice)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Precio LIVE:</span>
                    <span className="font-bold text-white">{formatPrice(currentPrice)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Stop Loss:</span>
                    <span className="text-amber-400">{formatPrice(strat.stopLoss)}</span>
                  </div>
                  {tp1 && (
                    <div className="flex justify-between text-slate-400">
                      <span>TP1:</span>
                      <span className="text-emerald-400">{formatPrice(tp1)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Card Action */}
              <div className="pt-1 text-center">
                <span className="text-[10px] font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center justify-center gap-1 transition-colors">
                  <span>Inspeccionar Estrategia</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
