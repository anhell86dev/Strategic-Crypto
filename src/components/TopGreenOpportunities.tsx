import React from 'react';
import { StrategyWithOrders } from '../types';
import { indicatorsService } from '../services/indicatorsService';
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
  Award,
  Clock,
  ShieldAlert,
  Crosshair
} from 'lucide-react';
import { formatStrategyPublicationDate, getStrategyTimeDifference } from './StrategyRow';

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
        label: '#1',
        title: 'Top 1 Mejor Oportunidad',
        badgeClass: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 ring-1 ring-amber-300',
        icon: Trophy
      };
    }
    if (idx === 1) {
      return {
        label: '#2',
        title: 'Top 2 Mejor Oportunidad',
        badgeClass: 'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-950 font-black shadow-md shadow-slate-300/20 ring-1 ring-slate-100',
        icon: Award
      };
    }
    if (idx === 2) {
      return {
        label: '#3',
        title: 'Top 3 Mejor Oportunidad',
        badgeClass: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black shadow-md shadow-amber-700/20 ring-1 ring-amber-500',
        icon: Flame
      };
    }
    return {
      label: `#${idx + 1}`,
      title: `Top ${idx + 1}`,
      badgeClass: 'bg-slate-800 text-slate-300 font-bold border border-slate-700',
      icon: Sparkles
    };
  };

  return (
    <div className="bg-gradient-to-b from-emerald-950/40 via-slate-900/90 to-slate-950/95 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md mb-6 relative overflow-hidden">
      
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-emerald-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30 shrink-0">
            <Trophy className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2 font-mono">
                TOP 5 OPORTUNIDADES · SEMÁFORO VERDE 🟢
              </h3>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                VÁLIDAS EN ZONA & MEJOR R:B
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tabla priorizada de estrategias verificadas desde su publicación: <strong>Sin tocar SL</strong>, <strong>sin TP prematuro</strong>, en zona de entrada y con mayor retorno proyectado.
            </p>
          </div>
        </div>

        {onFilterGreen && (
          <button
            onClick={onFilterGreen}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md self-start md:self-auto font-mono ${
              isGreenFilterActive
                ? 'bg-emerald-400 text-slate-950 shadow-emerald-500/20 ring-2 ring-emerald-300 font-extrabold'
                : 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isGreenFilterActive ? 'Filtro Verde Activo' : 'Filtrar Todas las Verdes'}</span>
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="relative z-10 pt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse font-mono">
          
          {/* Table Header */}
          <thead>
            <tr className="border-b border-emerald-500/20 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/60">
              <th className="py-2.5 px-3 text-center w-14">Rank</th>
              <th className="py-2.5 px-3 w-28">Semáforo</th>
              <th className="py-2.5 px-3">Par / Dirección</th>
              <th className="py-2.5 px-3 text-center">Ratio R:B</th>
              <th className="py-2.5 px-3 text-center">Dist. Entrada</th>
              <th className="py-2.5 px-3 text-right">Precio LIVE</th>
              <th className="py-2.5 px-3 text-right">Entrada (E1)</th>
              <th className="py-2.5 px-3 text-right">Stop Loss</th>
              <th className="py-2.5 px-3 text-right">TP1 Target</th>
              <th className="py-2.5 px-3 text-center">Acción</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {topStrategies.map((strat, idx) => {
              const isLong = strat.type === 'LONG';
              const currentPrice = strat.currentPrice || strat.entryPrice;
              const distPct = strat.trafficLight?.distanceToEntryPct ?? strat.distancePercent ?? 0;
              const rb = strat.trafficLight?.riskRewardRatio || 2.0;
              const rankInfo = getRankBadge(idx);
              const RankIcon = rankInfo.icon;
              const tp1 = strat.orders?.[0]?.targetPrice;
              const symbolClean = strat.symbol.replace('USDT', '');
              const displayStrategyName = strat.strategyName || strat.coinName || symbolClean;

              const confluence = indicatorsService.getCompleteConfluence(strat);
              const { futures, operational } = confluence;

              return (
                <tr
                  key={strat.id}
                  onClick={() => onSelectStrategy && onSelectStrategy(strat)}
                  className={`group transition-colors duration-200 cursor-pointer ${
                    operational.isTriggerZoneActive
                      ? 'bg-cyan-950/40 hover:bg-cyan-950/60 shadow-lg shadow-cyan-500/20'
                      : idx === 0 
                      ? 'bg-amber-950/15 hover:bg-emerald-950/40' 
                      : 'hover:bg-slate-900/80 bg-slate-950/30'
                  }`}
                >
                  {/* Rank Column */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center">
                      <span 
                        title={rankInfo.title}
                        className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs font-black tracking-wider ${rankInfo.badgeClass}`}
                      >
                        <RankIcon className="w-3 h-3" />
                        <span>{rankInfo.label}</span>
                      </span>
                    </div>
                  </td>

                  {/* Semáforo Verde & Badges FAPI */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div 
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 shadow-sm"
                        title={strat.trafficLight?.reason || 'Semáforo Verde: Sin SL, sin TP previo, en zona'}
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                          {strat.trafficLight?.label || 'VERDE'}
                        </span>
                      </div>

                      <div className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-extrabold uppercase ${futures.futuresStatusColor}`}>
                        <span>🚦 {futures.futuresStatus}</span>
                      </div>
                    </div>
                  </td>

                  {/* Par / Dirección */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm group-hover:text-emerald-300 transition-colors">
                        {symbolClean}/USDT
                      </span>
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${
                        isLong
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/80'
                          : 'bg-rose-950 text-rose-300 border border-rose-700/80'
                      }`}>
                        {isLong ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {strat.type}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                        {strat.leverage}x
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5">
                      {displayStrategyName}
                    </div>
                  </td>

                  {/* Ratio R:B */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <span 
                      title={`Ratio Riesgo Beneficio: 1:${rb.toFixed(2)}`}
                      className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-lg bg-purple-950/80 text-purple-300 border border-purple-500/60 shadow-xs"
                    >
                      <Scale className="w-3 h-3 text-purple-400" />
                      <span>1:{rb.toFixed(2)}</span>
                    </span>
                  </td>

                  {/* Distancia a Entrada */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg border ${
                      distPct <= 0.2
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                        : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50'
                    }`}>
                      <Target className="w-3 h-3 text-cyan-400" />
                      <span>{distPct <= 0.1 ? 'En Zona DCA' : `${distPct.toFixed(2)}%`}</span>
                    </span>
                  </td>

                  {/* Precio LIVE */}
                  <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-white text-xs">
                    {formatPrice(currentPrice)}
                  </td>

                  {/* Entrada E1 */}
                  <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-cyan-300 text-xs">
                    {formatPrice(strat.entryPrice)}
                  </td>

                  {/* Stop Loss */}
                  <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-amber-400 text-xs">
                    {formatPrice(strat.stopLoss)}
                  </td>

                  {/* TP1 */}
                  <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-emerald-400 text-xs">
                    {tp1 ? formatPrice(tp1) : '--'}
                  </td>

                  {/* Acción */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStrategy && onSelectStrategy(strat);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-300 hover:text-slate-950 bg-emerald-950/80 hover:bg-emerald-400 border border-emerald-500/50 transition-all cursor-pointer shadow-xs"
                    >
                      <span>Ver</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
