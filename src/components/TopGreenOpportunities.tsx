import React, { useState } from 'react';
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
  Zap, 
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
  // Local state for interactive investment and leverage inputs per strategy
  const [investments, setInvestments] = useState<Record<string, number>>({});
  const [leverages, setLeverages] = useState<Record<string, number>>({});

  if (!topStrategies || topStrategies.length === 0) {
    return null;
  }

  const formatPrice = (p?: number) => {
    if (p === undefined || p === null) return '--';
    if (p >= 1000) return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (p >= 1) return `$${p.toFixed(4)}`;
    return `$${p.toFixed(6)}`;
  };

  const getInvestment = (stratId: string | number) => investments[String(stratId)] ?? 100;
  const getLeverage = (strat: StrategyWithOrders) => leverages[String(strat.id)] ?? (strat.leverage || 10);

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
              Calculadora interactiva de dimensión de posición, gestión de riesgo en USD por nivel DCA y objetivos Take Profit.
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
              <th className="py-2.5 px-3 text-center w-12">Rank</th>
              <th className="py-2.5 px-3 w-24">Semáforo</th>
              <th className="py-2.5 px-3">Par / Dirección / R:B</th>
              <th className="py-2.5 px-3 text-center">Precio LIVE / Dist.</th>
              <th className="py-2.5 px-2 text-center w-24">Inversión ($)</th>
              <th className="py-2.5 px-2 text-center w-20">Apal. (x)</th>
              <th className="py-2.5 px-3 text-center">Nominal ($)</th>
              <th className="py-2.5 px-3 text-right">Cant. Activos</th>
              <th className="py-2.5 px-3 text-right">Entradas DCA (E1, E2, E3)</th>
              <th className="py-2.5 px-3 text-right">Stop Loss ($ Pérdida)</th>
              <th className="py-2.5 px-3 text-right">Take Profit ($ Ganancia)</th>
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
              const symbolClean = strat.symbol.replace('USDT', '');
              const displayStrategyName = strat.strategyName || strat.coinName || symbolClean;

              const confluence = indicatorsService.getCompleteConfluence(strat);
              const { futures, operational } = confluence;

              // Investment, Leverage & Nominal calculations
              const inv = getInvestment(strat.id);
              const lev = getLeverage(strat);
              const nominalTotal = inv * lev;

              // Entry Allocations DCA
              const hasE2 = Boolean(strat.e2Price && strat.e2Price > 0);
              const hasE3 = Boolean(strat.e3Price && strat.e3Price > 0);

              const e1Pct = hasE2 || hasE3 ? (strat.e1AllocationPercent || 50) : 100;
              const e2Pct = hasE2 ? (strat.e2AllocationPercent || 30) : 0;
              const e3Pct = hasE3 ? (strat.e3AllocationPercent || 20) : 0;

              const nominalE1 = nominalTotal * (e1Pct / 100);
              const nominalE2 = nominalTotal * (e2Pct / 100);
              const nominalE3 = nominalTotal * (e3Pct / 100);

              const pE1 = strat.entryPrice || currentPrice;
              const pE2 = strat.e2Price || pE1;
              const pE3 = strat.e3Price || pE1;

              const assetsE1 = pE1 > 0 ? nominalE1 / pE1 : 0;
              const assetsE2 = (hasE2 && pE2 > 0) ? nominalE2 / pE2 : 0;
              const assetsE3 = (hasE3 && pE3 > 0) ? nominalE3 / pE3 : 0;

              const totalAssets = assetsE1 + assetsE2 + assetsE3;
              const avgEntryPrice = totalAssets > 0 ? nominalTotal / totalAssets : pE1;

              // Loss calculations for Stop Loss
              const slPrice = strat.stopLoss || 0;
              const lossE1 = isLong ? assetsE1 * (pE1 - slPrice) : assetsE1 * (slPrice - pE1);
              
              const lossE12 = isLong
                ? (assetsE1 * (pE1 - slPrice)) + (assetsE2 * (pE2 - slPrice))
                : (assetsE1 * (slPrice - pE1)) + (assetsE2 * (slPrice - pE2));

              const lossFull = isLong
                ? (assetsE1 * (pE1 - slPrice)) + (assetsE2 * (pE2 - slPrice)) + (assetsE3 * (pE3 - slPrice))
                : (assetsE1 * (slPrice - pE1)) + (assetsE2 * (slPrice - pE2)) + (assetsE3 * (slPrice - pE3));

              // Build list of all DCA Entries (E1, E2, E3)
              const entryLevels = [
                { label: 'E1', price: pE1, pct: e1Pct, assets: assetsE1 }
              ];
              if (hasE2) entryLevels.push({ label: 'E2', price: pE2, pct: e2Pct, assets: assetsE2 });
              if (hasE3) entryLevels.push({ label: 'E3', price: pE3, pct: e3Pct, assets: assetsE3 });

              // All TP Orders with USD Profit calculation
              const allTpOrders = [...(strat.orders || [])].sort((a, b) => {
                if (isLong) return a.targetPrice - b.targetPrice;
                return b.targetPrice - a.targetPrice;
              });

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
                    <div className="flex flex-col gap-1">
                      <div 
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 shadow-sm w-fit"
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

                      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-[9px] font-extrabold uppercase w-fit ${futures.futuresStatusColor}`}>
                        <span>🚦 {futures.futuresStatus}</span>
                      </div>
                    </div>
                  </td>

                  {/* Par / Dirección / Ratio R:B (Integrado) */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2 flex-wrap">
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
                      
                      {/* Ratio R:B Badge Integrado */}
                      <span 
                        title={`Ratio Riesgo/Beneficio: 1:${rb.toFixed(2)}`}
                        className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded bg-purple-950/90 text-purple-300 border border-purple-500/60"
                      >
                        <Scale className="w-2.5 h-2.5 text-purple-400" />
                        <span>1:{rb.toFixed(2)}</span>
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">
                      {displayStrategyName}
                    </div>
                  </td>

                  {/* Precio LIVE / Distancia a Entrada (Debajo) */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <div className="flex flex-col items-center">
                      <span className="font-extrabold text-white text-xs font-mono">
                        {formatPrice(currentPrice)}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 border ${
                        distPct <= 0.2
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                          : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50'
                      }`}>
                        <Target className="w-2.5 h-2.5 text-cyan-400" />
                        <span>{distPct <= 0.1 ? 'En Zona DCA' : `${distPct.toFixed(2)}% E1`}</span>
                      </span>
                    </div>
                  </td>

                  {/* NUEVA COLUMNA 1: Inversión (Caja de Texto) */}
                  <td className="py-3 px-2 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center">
                      <input
                        type="number"
                        min="1"
                        max="100000"
                        value={getInvestment(strat.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          const val = Math.max(1, parseFloat(e.target.value) || 0);
                          setInvestments(prev => ({ ...prev, [String(strat.id)]: val }));
                        }}
                        className="w-16 px-1.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-center font-mono font-black text-emerald-400 text-xs focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none shadow-inner"
                      />
                    </div>
                  </td>

                  {/* NUEVA COLUMNA 2: Apalancamiento (Caja de Texto) */}
                  <td className="py-3 px-2 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center">
                      <input
                        type="number"
                        min="1"
                        max="125"
                        value={getLeverage(strat)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          const val = Math.max(1, Math.min(125, parseInt(e.target.value) || 1));
                          setLeverages(prev => ({ ...prev, [String(strat.id)]: val }));
                        }}
                        className="w-12 px-1 py-1 bg-slate-900 border border-slate-700 rounded-lg text-center font-mono font-black text-amber-300 text-xs focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none shadow-inner"
                      />
                    </div>
                  </td>

                  {/* NUEVA COLUMNA 3: Nominal (Inversión * Apalancamiento) */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <span className="font-black text-cyan-300 text-xs font-mono bg-cyan-950/60 px-2 py-1 rounded-lg border border-cyan-800/80 shadow-xs inline-block">
                      ${nominalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>

                  {/* NUEVA COLUMNA 4: Cantidad de Activos */}
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="flex flex-col items-end">
                      <span className="font-extrabold text-white text-xs font-mono">
                        {totalAssets < 1 ? totalAssets.toFixed(6) : totalAssets.toFixed(4)} {symbolClean}
                      </span>
                      {hasE2 && (
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                          E1: {assetsE1 < 1 ? assetsE1.toFixed(4) : assetsE1.toFixed(2)} | E2: {assetsE2 < 1 ? assetsE2.toFixed(4) : assetsE2.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Entradas Escalonadas DCA (E1, E2, E3 + Break-even) */}
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="flex flex-col items-end gap-1">
                      {entryLevels.map((lvl, lIdx) => (
                        <div key={lIdx} className="flex items-center gap-1.5 text-xs">
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-800/80 font-mono">
                            {lvl.label} ({lvl.pct}%)
                          </span>
                          <span className="font-bold text-cyan-200 font-mono">
                            {formatPrice(lvl.price)}
                          </span>
                        </div>
                      ))}
                      {hasE2 && (
                        <div className="text-[9px] font-bold text-amber-300 bg-amber-950/70 px-1.5 py-0.2 rounded border border-amber-800/80 mt-0.5 font-mono">
                          BE: {formatPrice(avgEntryPrice)}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Stop Loss (Precio + Pérdida $ por Nivel) */}
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-bold text-amber-300 text-xs font-mono">{formatPrice(slPrice)}</span>
                      
                      {/* Pérdida $ Nivel E1 */}
                      <span className="text-[10px] font-extrabold text-rose-400 bg-rose-950/80 px-1.5 py-0.2 rounded border border-rose-800/80 font-mono">
                        E1: -${lossE1.toFixed(2)}
                      </span>

                      {/* Pérdida $ Acumulada E1+E2 */}
                      {hasE2 && (
                        <span className="text-[10px] font-extrabold text-rose-400/90 bg-rose-950/60 px-1.5 py-0.2 rounded font-mono">
                          E1+E2: -${lossE12.toFixed(2)}
                        </span>
                      )}

                      {/* Pérdida $ Acumulada Completa E1+E2+E3 */}
                      {hasE3 && (
                        <span className="text-[10px] font-extrabold text-rose-500 bg-rose-950 px-1.5 py-0.2 rounded border border-rose-600 font-mono">
                          Full: -${lossFull.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Objetivos Take Profit ($ Ganancia por Nivel) */}
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="flex flex-col items-end gap-1">
                      {allTpOrders.length > 0 ? (
                        allTpOrders.map((tp, tpIdx) => {
                          const closePct = tp.closePercentage || 100;
                          const assetsClosed = totalAssets * (closePct / 100);
                          const profitUsd = isLong
                            ? assetsClosed * (tp.targetPrice - avgEntryPrice)
                            : assetsClosed * (avgEntryPrice - tp.targetPrice);

                          return (
                            <div key={tpIdx} className="flex items-center gap-1.5 text-xs">
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 font-mono">
                                {tp.type || `TP${tpIdx + 1}`} ({closePct}%)
                              </span>
                              <span className="font-bold text-emerald-300 font-mono">
                                {formatPrice(tp.targetPrice)}
                              </span>
                              <span className="text-[10px] font-black text-emerald-300 bg-emerald-950/90 border border-emerald-500/60 px-1.5 py-0.2 rounded font-mono shadow-xs">
                                +${profitUsd.toFixed(2)}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-slate-500 text-xs font-mono">--</span>
                      )}
                    </div>
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
