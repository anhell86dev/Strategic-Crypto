import React, { useState } from 'react';
import { StrategyWithOrders } from '../types';
import { indicatorsService } from '../services/indicatorsService';
import { 
  Trophy, 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Target, 
  Scale, 
  CheckCircle2, 
  Award,
  Copy
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
  // Local state for interactive investment, leverage, checked entry levels, and editable entry prices per strategy
  const [investments, setInvestments] = useState<Record<string, number>>({});
  const [leverages, setLeverages] = useState<Record<string, number>>({});
  const [checkedEntries, setCheckedEntries] = useState<Record<string, { e1: boolean; e2: boolean; e3: boolean }>>({});
  const [customPrices, setCustomPrices] = useState<Record<string, { e1?: number; e2?: number; e3?: number }>>({});

  if (!topStrategies || topStrategies.length === 0) {
    return null;
  }

  const handleCustomPriceChange = (stratId: string | number, level: 'e1' | 'e2' | 'e3', valueStr: string) => {
    const key = String(stratId);
    const val = parseFloat(valueStr);
    setCustomPrices(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [level]: isNaN(val) || val <= 0 ? undefined : val
      }
    }));
  };

  const getChecked = (stratId: string | number) => {
    const current = checkedEntries[String(stratId)];
    if (!current) {
      return { e1: true, e2: false, e3: false };
    }
    return current;
  };

  const toggleChecked = (stratId: string | number, level: 'e1' | 'e2' | 'e3') => {
    const key = String(stratId);
    const current = getChecked(key);
    setCheckedEntries(prev => ({
      ...prev,
      [key]: {
        ...current,
        [level]: !current[level]
      }
    }));
  };

  const formatPrice = (p?: number) => {
    if (p === undefined || p === null) return '--';
    if (p >= 1000) return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (p >= 1) return `$${p.toFixed(4)}`;
    return `$${p.toFixed(6)}`;
  };

  const getInvestment = (stratId: string | number) => investments[String(stratId)] ?? 100;
  const getLeverage = (strat: StrategyWithOrders) => leverages[String(strat.id)] ?? (strat.leverage || 10);

  // Apply First Row's Investment & Leverage to all rows
  const handleApplyFirstRowToAll = () => {
    if (!topStrategies || topStrategies.length === 0) return;
    const firstStrat = topStrategies[0];
    const firstInv = getInvestment(firstStrat.id);
    const firstLev = getLeverage(firstStrat);

    const newInvestments: Record<string, number> = {};
    const newLeverages: Record<string, number> = {};

    topStrategies.forEach(strat => {
      const idStr = String(strat.id);
      newInvestments[idStr] = firstInv;
      newLeverages[idStr] = firstLev;
    });

    setInvestments(newInvestments);
    setLeverages(newLeverages);
  };

  const getRankBadge = (idx: number) => {
    if (idx === 0) {
      return {
        label: '#1',
        title: 'Top 1 Mejor Oportunidad',
        badgeClass: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/30 ring-2 ring-amber-300 text-sm px-2.5 py-1',
        icon: Trophy
      };
    }
    if (idx === 1) {
      return {
        label: '#2',
        title: 'Top 2 Mejor Oportunidad',
        badgeClass: 'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-950 font-black shadow-md shadow-slate-300/20 ring-1 ring-slate-100 text-sm px-2.5 py-1',
        icon: Award
      };
    }
    if (idx === 2) {
      return {
        label: '#3',
        title: 'Top 3 Mejor Oportunidad',
        badgeClass: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black shadow-md shadow-amber-700/20 ring-1 ring-amber-500 text-sm px-2.5 py-1',
        icon: Flame
      };
    }
    return {
      label: `#${idx + 1}`,
      title: `Top ${idx + 1}`,
      badgeClass: 'bg-slate-800 text-slate-200 font-bold border border-slate-700 text-sm px-2.5 py-1',
      icon: Sparkles
    };
  };

  return (
    <div className="bg-gradient-to-b from-emerald-950/60 via-slate-900/95 to-slate-950 border-2 border-emerald-500/50 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-md mb-6 relative overflow-hidden">
      
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-500/30">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30 shrink-0">
            <Trophy className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2 font-mono">
                TOP 5 OPORTUNIDADES · SEMÁFORO VERDE 🟢
              </h3>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-400 text-xs font-black text-emerald-300 uppercase tracking-wider font-mono shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                VÁLIDAS EN ZONA & MEJOR R:B
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Calculadora interactiva de dimensión de posición, gestión de riesgo en USD por nivel DCA y objetivos Take Profit.
            </p>
          </div>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          {/* Button: Sync / Copy Row #1 Values to All */}
          <button
            onClick={handleApplyFirstRowToAll}
            title="Toma la Inversión y Apalancamiento de la Fila #1 y los aplica a las demás filas"
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/60 hover:border-amber-400 font-mono"
          >
            <Copy className="w-4 h-4 text-amber-400" />
            <span>Copiar Inversión / Apal. de #1 a Todos</span>
          </button>

          {onFilterGreen && (
            <button
              onClick={onFilterGreen}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md font-mono ${
                isGreenFilterActive
                  ? 'bg-emerald-400 text-slate-950 shadow-emerald-500/30 ring-2 ring-emerald-300 font-extrabold'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-500/50'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isGreenFilterActive ? 'Filtro Verde Activo' : 'Filtrar Todas las Verdes'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="relative z-10 pt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse font-mono">
          
          {/* Table Header */}
          <thead>
            <tr className="border-b border-emerald-500/30 text-xs font-black text-slate-200 uppercase tracking-wider bg-slate-950/90">
              <th rowSpan={2} className="py-3 px-3 text-center w-12 border-r border-slate-800">Rank</th>
              <th rowSpan={2} className="py-3 px-3 w-24 border-r border-slate-800">Semáforo</th>
              <th rowSpan={2} className="py-3 px-3 border-r border-slate-800">Par / Dirección / R:B</th>
              <th rowSpan={2} className="py-3 px-3 text-center border-r border-slate-800">Precio LIVE / Dist.</th>
              <th rowSpan={2} className="py-3 px-2 text-center w-28 border-r border-slate-800">
                <div className="flex flex-col items-center gap-0.5">
                  <span>Inversión ($)</span>
                  <button 
                    onClick={handleApplyFirstRowToAll}
                    title="Aplicar #1 a todos"
                    className="text-[10px] text-amber-300 hover:text-amber-200 underline cursor-pointer normal-case font-normal"
                  >
                    (Copiar #1)
                  </button>
                </div>
              </th>
              <th rowSpan={2} className="py-3 px-2 text-center w-24 border-r border-slate-800">
                <div className="flex flex-col items-center gap-0.5">
                  <span>Apal. (x)</span>
                  <button 
                    onClick={handleApplyFirstRowToAll}
                    title="Aplicar #1 a todos"
                    className="text-[10px] text-amber-300 hover:text-amber-200 underline cursor-pointer normal-case font-normal"
                  >
                    (Copiar #1)
                  </button>
                </div>
              </th>
              <th rowSpan={2} className="py-3 px-3 text-center border-r border-slate-800">Nominal ($)</th>
              
              {/* Single Stop Loss Column */}
              <th rowSpan={2} className="py-3 px-3 text-center text-rose-300 bg-rose-950/90 border-r border-slate-800">
                Stop Loss ($)
              </th>

              {/* Group 2: Entradas DCA */}
              <th colSpan={3} className="py-2 px-3 text-center text-cyan-300 bg-cyan-950/80 border-r border-b border-cyan-700/60">
                Entradas DCA (E3, E2, E1) & Activos
              </th>

              {/* Group 3: Take Profit */}
              <th colSpan={3} className="py-2 px-3 text-center text-emerald-300 bg-emerald-950/80 border-b border-emerald-700/60">
                Take Profit ($Ganancias)
              </th>
            </tr>

            {/* Sub-Headers Row 2 */}
            <tr className="border-b-2 border-emerald-500/40 text-[11px] font-black uppercase tracking-wider bg-slate-950">
              {/* DCA Sub-headers (inverted: E3, E2, E1) */}
              <th className="py-2 px-2 text-center text-cyan-300 bg-cyan-950/40 border-r border-cyan-800/40">E3</th>
              <th className="py-2 px-2 text-center text-cyan-300 bg-cyan-950/40 border-r border-cyan-800/40">E2</th>
              <th className="py-2 px-2 text-center text-cyan-300 bg-cyan-950/40 border-r border-slate-800">E1</th>

              {/* Take Profit Sub-headers */}
              <th className="py-2 px-2 text-center text-emerald-300 bg-emerald-950/40 border-r border-emerald-800/40">TP1</th>
              <th className="py-2 px-2 text-center text-emerald-300 bg-emerald-950/40 border-r border-emerald-800/40">TP2</th>
              <th className="py-2 px-2 text-center text-emerald-300 bg-emerald-950/40">TP3</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/80 text-xs sm:text-sm">
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
              const stratCustoms = customPrices[String(strat.id)] || {};

              const pE1 = stratCustoms.e1 ?? (strat.entryPrice || currentPrice);
              const pE2 = stratCustoms.e2 ?? (strat.e2Price || (pE1 > 0 ? (isLong ? pE1 * 0.98 : pE1 * 1.02) : 0));
              const pE3 = stratCustoms.e3 ?? (strat.e3Price || (pE2 > 0 ? (isLong ? pE2 * 0.98 : pE2 * 1.02) : 0));

              const hasE2 = Boolean(strat.e2Price || stratCustoms.e2 || pE2 > 0);
              const hasE3 = Boolean(strat.e3Price || stratCustoms.e3 || pE3 > 0);

              const e1Pct = hasE2 || hasE3 ? (strat.e1AllocationPercent || 50) : 100;
              const e2Pct = hasE2 ? (strat.e2AllocationPercent || 30) : 0;
              const e3Pct = hasE3 ? (strat.e3AllocationPercent || 20) : 0;

              const nominalE1 = nominalTotal * (e1Pct / 100);
              const nominalE2 = nominalTotal * (e2Pct / 100);
              const nominalE3 = nominalTotal * (e3Pct / 100);

              const assetsE1 = pE1 > 0 ? nominalE1 / pE1 : 0;
              const assetsE2 = (hasE2 && pE2 > 0) ? nominalE2 / pE2 : 0;
              const assetsE3 = (hasE3 && pE3 > 0) ? nominalE3 / pE3 : 0;

              const assetsE12 = assetsE1 + assetsE2;
              const nominalE12 = nominalE1 + nominalE2;

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

              // Checkbox state for active executed entries
              const checked = getChecked(strat.id);

              // Calculate active accumulated position based on CHECKED entries
              let activeNominal = 0;
              let activeAssets = 0;

              if (checked.e1) {
                activeNominal += nominalE1;
                activeAssets += assetsE1;
              }
              if (checked.e2 && hasE2) {
                activeNominal += nominalE2;
                activeAssets += assetsE2;
              }
              if (checked.e3 && hasE3) {
                activeNominal += nominalE3;
                activeAssets += assetsE3;
              }

              const activeAvgEntryPrice = activeAssets > 0 ? activeNominal / activeAssets : pE1;

              // Active loss for checked position
              const activeLoss = isLong
                ? activeAssets * (activeAvgEntryPrice - slPrice)
                : activeAssets * (slPrice - activeAvgEntryPrice);

              // Build list of all DCA Entries (E1, E2, E3)
              const entryLevels = [
                { label: 'E1', price: pE1, pct: e1Pct, assets: assetsE1 }
              ];
              if (hasE2) entryLevels.push({ label: 'E2', price: pE2, pct: e2Pct, assets: assetsE2 });
              if (hasE3) entryLevels.push({ label: 'E3', price: pE3, pct: e3Pct, assets: assetsE3 });

              // All TP Orders with USD Profit calculation based on ACTIVE checked position
              const allTpOrders = [...(strat.orders || [])].sort((a, b) => {
                if (isLong) return a.targetPrice - b.targetPrice;
                return b.targetPrice - a.targetPrice;
              });

              const tp1 = allTpOrders[0];
              const tp2 = allTpOrders[1];
              const tp3 = allTpOrders[2];

              const calcTpProfitActive = (tp?: { targetPrice: number; closePercentage?: number }) => {
                if (!tp || !tp.targetPrice) return null;
                const closePct = tp.closePercentage || 100;
                const assetsClosed = activeAssets * (closePct / 100);
                const profitUsd = activeAssets > 0
                  ? (isLong
                      ? assetsClosed * (tp.targetPrice - activeAvgEntryPrice)
                      : assetsClosed * (activeAvgEntryPrice - tp.targetPrice))
                  : 0;
                return {
                  price: tp.targetPrice,
                  profit: profitUsd,
                  pct: closePct
                };
              };

              const tp1Data = calcTpProfitActive(tp1);
              const tp2Data = calcTpProfitActive(tp2);
              const tp3Data = calcTpProfitActive(tp3);

              // Helper to compute % distance from LIVE price to target price
              const getDistPctStr = (targetP?: number) => {
                if (!currentPrice || !targetP || targetP <= 0) return null;
                const pct = ((targetP - currentPrice) / currentPrice) * 100;
                const sign = pct > 0 ? '+' : '';
                return `${sign}${pct.toFixed(2)}%`;
              };

              return (
                <React.Fragment key={strat.id}>
                  <tr
                    onClick={() => onSelectStrategy && onSelectStrategy(strat)}
                    className={`group transition-colors duration-200 cursor-pointer ${
                      operational.isTriggerZoneActive
                        ? 'bg-cyan-950/50 hover:bg-cyan-950/70 shadow-lg shadow-cyan-500/20'
                        : idx === 0 
                        ? 'bg-amber-950/20 hover:bg-emerald-950/50' 
                        : 'hover:bg-slate-900/90 bg-slate-950/40'
                    }`}
                  >
                    {/* Rank Column */}
                    <td className="py-3 px-3 text-center border-r border-slate-800">
                      <div className="flex items-center justify-center">
                        <span 
                          title={rankInfo.title}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-lg tracking-wider ${rankInfo.badgeClass}`}
                        >
                          <RankIcon className="w-4 h-4" />
                          <span>{rankInfo.label}</span>
                        </span>
                      </div>
                    </td>

                    {/* Semáforo Verde & Badges FAPI */}
                    <td className="py-3 px-3 whitespace-nowrap border-r border-slate-800">
                      <div className="flex flex-col gap-1.5">
                        <div 
                          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-emerald-950 border border-emerald-400 text-emerald-300 shadow-sm w-fit"
                          title={strat.trafficLight?.reason || 'Semáforo Verde: Sin SL, sin TP previo, en zona'}
                        >
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                          </span>
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                            {strat.trafficLight?.label || 'VERDE'}
                          </span>
                        </div>

                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-extrabold uppercase w-fit ${futures.futuresStatusColor}`}>
                          <span>🚦 {futures.futuresStatus}</span>
                        </div>
                      </div>
                    </td>

                    {/* Par / Dirección / Ratio R:B */}
                    <td className="py-3 px-3 border-r border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-white text-base group-hover:text-emerald-300 transition-colors">
                          {symbolClean}/USDT
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded uppercase ${
                          isLong
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                            : 'bg-rose-950 text-rose-300 border border-rose-600'
                        }`}>
                          {isLong ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {strat.type}
                        </span>
                        
                        {/* Ratio R:B Badge Integrado */}
                        <span 
                          title={`Ratio Riesgo/Beneficio: 1:${rb.toFixed(2)}`}
                          className="inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded bg-purple-950 text-purple-200 border border-purple-500"
                        >
                          <Scale className="w-3 h-3 text-purple-300" />
                          <span>1:{rb.toFixed(2)}</span>
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-300 truncate max-w-[200px] mt-1">
                        {displayStrategyName}
                      </div>
                    </td>

                    {/* Precio LIVE / Distancia a Entrada */}
                    <td className="py-3 px-3 text-center whitespace-nowrap border-r border-slate-800">
                      <div className="flex flex-col items-center">
                        <span className="font-black text-white text-sm sm:text-base font-mono">
                          {formatPrice(currentPrice)}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs font-extrabold px-2 py-0.5 rounded mt-1 border ${
                          distPct <= 0.2
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-400'
                            : 'bg-cyan-950 text-cyan-300 border border-cyan-400'
                        }`}>
                          <Target className="w-3 h-3 text-cyan-400" />
                          <span>{distPct <= 0.1 ? 'En Zona DCA' : `${distPct.toFixed(2)}% E1`}</span>
                        </span>
                      </div>
                    </td>

                    {/* Inversión ($) */}
                    <td className="py-3 px-2 text-center whitespace-nowrap border-r border-slate-800">
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
                          className="w-20 px-2 py-1.5 bg-slate-900 border-2 border-emerald-500/70 focus:border-emerald-400 rounded-xl text-center font-mono font-black text-emerald-300 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none shadow-lg"
                        />
                      </div>
                    </td>

                    {/* Apalancamiento (x) */}
                    <td className="py-3 px-2 text-center whitespace-nowrap border-r border-slate-800">
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
                          className="w-14 px-1.5 py-1.5 bg-slate-900 border-2 border-amber-500/70 focus:border-amber-400 rounded-xl text-center font-mono font-black text-amber-300 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none shadow-lg"
                        />
                      </div>
                    </td>

                    {/* Nominal ($) */}
                    <td className="py-3 px-3 text-center whitespace-nowrap border-r border-slate-800">
                      <span className="font-black text-cyan-200 text-sm font-mono bg-cyan-950 border border-cyan-500/70 px-2.5 py-1.5 rounded-xl shadow-sm inline-block">
                        ${nominalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Stop Loss (1 Single Cell) */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap bg-rose-950/30 border-r border-slate-800 font-mono">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className="font-black text-rose-200 text-xs sm:text-sm bg-rose-900 border border-rose-500 px-2.5 py-0.5 rounded-lg shadow-sm">
                          -${activeLoss.toFixed(2)}
                        </span>
                        <span className="font-bold text-rose-300/90 text-xs">{formatPrice(slPrice)}</span>
                        <span className="text-[10px] font-black text-rose-300 bg-rose-950/90 border border-rose-700/80 px-1.5 py-0.2 rounded mt-0.5">
                          {getDistPctStr(slPrice)}
                        </span>
                      </div>
                    </td>

                    {/* DCA E3 */}
                    <td className={`py-2.5 px-3 text-center whitespace-nowrap border-r border-cyan-800/40 transition-all ${
                      checked.e3 ? 'bg-cyan-950/40' : 'bg-slate-950/30 opacity-60'
                    }`}>
                      <div className="flex flex-col items-center justify-center gap-0.5 text-xs font-mono">
                        <label
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 cursor-pointer bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/70 px-1.5 py-0.5 rounded text-[10px] font-bold text-cyan-300 shadow-xs mb-0.5"
                        >
                          <input
                            type="checkbox"
                            checked={checked.e3}
                            onChange={() => toggleChecked(strat.id, 'e3')}
                            className="w-3.5 h-3.5 accent-cyan-400 rounded cursor-pointer"
                          />
                          <span>E3</span>
                        </label>
                        <div className="flex items-center justify-center my-0.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            step="any"
                            placeholder="E3 ($)"
                            value={pE3 || ''}
                            onChange={(e) => handleCustomPriceChange(strat.id, 'e3', e.target.value)}
                            className={`w-20 px-1 py-0.5 text-xs text-center font-bold font-mono rounded border transition-all ${
                              checked.e3
                                ? 'bg-slate-900 text-cyan-200 border-cyan-500/80 focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300'
                                : 'bg-slate-950 text-slate-500 border-slate-700/60'
                            }`}
                          />
                        </div>
                        {hasE3 && (
                          <>
                            <div className={`font-medium ${checked.e3 ? 'text-slate-200' : 'text-slate-500'}`}>
                              {totalAssets < 1 ? totalAssets.toFixed(4) : totalAssets.toFixed(2)}{' '}
                              <span className="text-[10px] text-cyan-400 font-bold">
                                (+{assetsE3 < 1 ? assetsE3.toFixed(4) : assetsE3.toFixed(2)})
                              </span>
                            </div>
                            <div className={`font-black ${checked.e3 ? 'text-cyan-300' : 'text-slate-500'}`}>
                              ${nominalTotal.toFixed(2)}{' '}
                              <span className="text-[10px] text-emerald-400 font-bold">
                                (+${nominalE3.toFixed(2)})
                              </span>
                            </div>
                          </>
                        )}
                        <span className="text-[10px] font-black text-cyan-300 bg-cyan-950/90 border border-cyan-700/80 px-1.5 py-0.2 rounded mt-0.5">
                          {getDistPctStr(pE3)}
                        </span>
                      </div>
                    </td>

                    {/* DCA E2 */}
                    <td className={`py-2.5 px-3 text-center whitespace-nowrap border-r border-cyan-800/40 transition-all ${
                      checked.e2 ? 'bg-cyan-950/40' : 'bg-slate-950/30 opacity-60'
                    }`}>
                      <div className="flex flex-col items-center justify-center gap-0.5 text-xs font-mono">
                        <label
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 cursor-pointer bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/70 px-1.5 py-0.5 rounded text-[10px] font-bold text-cyan-300 shadow-xs mb-0.5"
                        >
                          <input
                            type="checkbox"
                            checked={checked.e2}
                            onChange={() => toggleChecked(strat.id, 'e2')}
                            className="w-3.5 h-3.5 accent-cyan-400 rounded cursor-pointer"
                          />
                          <span>E2</span>
                        </label>
                        <div className="flex items-center justify-center my-0.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            step="any"
                            placeholder="E2 ($)"
                            value={pE2 || ''}
                            onChange={(e) => handleCustomPriceChange(strat.id, 'e2', e.target.value)}
                            className={`w-20 px-1 py-0.5 text-xs text-center font-bold font-mono rounded border transition-all ${
                              checked.e2
                                ? 'bg-slate-900 text-cyan-200 border-cyan-500/80 focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300'
                                : 'bg-slate-950 text-slate-500 border-slate-700/60'
                            }`}
                          />
                        </div>
                        {hasE2 && (
                          <>
                            <div className={`font-medium ${checked.e2 ? 'text-slate-200' : 'text-slate-500'}`}>
                              {assetsE12 < 1 ? assetsE12.toFixed(4) : assetsE12.toFixed(2)}{' '}
                              <span className="text-[10px] text-cyan-400 font-bold">
                                (+{assetsE2 < 1 ? assetsE2.toFixed(4) : assetsE2.toFixed(2)})
                              </span>
                            </div>
                            <div className={`font-black ${checked.e2 ? 'text-cyan-300' : 'text-slate-500'}`}>
                              ${nominalE12.toFixed(2)}{' '}
                              <span className="text-[10px] text-emerald-400 font-bold">
                                (+${nominalE2.toFixed(2)})
                              </span>
                            </div>
                          </>
                        )}
                        <span className="text-[10px] font-black text-cyan-300 bg-cyan-950/90 border border-cyan-700/80 px-1.5 py-0.2 rounded mt-0.5">
                          {getDistPctStr(pE2)}
                        </span>
                      </div>
                    </td>

                    {/* DCA E1 */}
                    <td className={`py-2.5 px-3 text-center whitespace-nowrap border-r border-slate-800 transition-all ${
                      checked.e1 ? 'bg-cyan-950/40' : 'bg-slate-950/30 opacity-60'
                    }`}>
                      <div className="flex flex-col items-center justify-center gap-0.5 text-xs font-mono">
                        <label
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 cursor-pointer bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/70 px-1.5 py-0.5 rounded text-[10px] font-bold text-cyan-300 shadow-xs mb-0.5"
                        >
                          <input
                            type="checkbox"
                            checked={checked.e1}
                            onChange={() => toggleChecked(strat.id, 'e1')}
                            className="w-3.5 h-3.5 accent-cyan-400 rounded cursor-pointer"
                          />
                          <span>E1</span>
                        </label>
                        <div className="flex items-center justify-center my-0.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            step="any"
                            placeholder="E1 ($)"
                            value={pE1 || ''}
                            onChange={(e) => handleCustomPriceChange(strat.id, 'e1', e.target.value)}
                            className={`w-20 px-1 py-0.5 text-xs text-center font-bold font-mono rounded border transition-all ${
                              checked.e1
                                ? 'bg-slate-900 text-cyan-200 border-cyan-500/80 focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300'
                                : 'bg-slate-950 text-slate-500 border-slate-700/60'
                            }`}
                          />
                        </div>
                        <div className={`font-medium ${checked.e1 ? 'text-slate-200' : 'text-slate-500'}`}>{assetsE1 < 1 ? assetsE1.toFixed(4) : assetsE1.toFixed(2)}</div>
                        <div className={`font-black ${checked.e1 ? 'text-cyan-300' : 'text-slate-500'}`}>${nominalE1.toFixed(2)}</div>
                        <span className="text-[10px] font-black text-cyan-300 bg-cyan-950/90 border border-cyan-700/80 px-1.5 py-0.2 rounded mt-0.5">
                          {getDistPctStr(pE1)}
                        </span>
                      </div>
                    </td>

                    {/* TP1 */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap bg-emerald-950/20 border-r border-emerald-800/40">
                      {tp1Data ? (
                        <div className="flex flex-col items-center justify-center gap-0.5 text-xs font-mono">
                          <div className="font-black text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-600 shadow-xs">
                            +${tp1Data.profit.toFixed(2)}
                          </div>
                          <div className="font-medium text-emerald-200/80 text-[11px]">{formatPrice(tp1Data.price)}</div>
                          <span className="text-[10px] font-black text-emerald-300 bg-emerald-950/90 border border-emerald-700/80 px-1.5 py-0.2 rounded mt-0.5">
                            {getDistPctStr(tp1Data.price)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-xs text-center block">--</span>
                      )}
                    </td>

                    {/* TP2 */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap bg-emerald-950/20 border-r border-emerald-800/40">
                      {tp2Data ? (
                        <div className="flex flex-col items-center justify-center gap-0.5 text-xs font-mono">
                          <div className="font-black text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-600 shadow-xs">
                            +${tp2Data.profit.toFixed(2)}
                          </div>
                          <div className="font-medium text-emerald-200/80 text-[11px]">{formatPrice(tp2Data.price)}</div>
                          <span className="text-[10px] font-black text-emerald-300 bg-emerald-950/90 border border-emerald-700/80 px-1.5 py-0.2 rounded mt-0.5">
                            {getDistPctStr(tp2Data.price)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-xs text-center block">--</span>
                      )}
                    </td>

                    {/* TP3 */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap bg-emerald-950/20">
                      {tp3Data ? (
                        <div className="flex flex-col items-center justify-center gap-0.5 text-xs font-mono">
                          <div className="font-black text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-600 shadow-xs">
                            +${tp3Data.profit.toFixed(2)}
                          </div>
                          <div className="font-medium text-emerald-200/80 text-[11px]">{formatPrice(tp3Data.price)}</div>
                          <span className="text-[10px] font-black text-emerald-300 bg-emerald-950/90 border border-emerald-700/80 px-1.5 py-0.2 rounded mt-0.5">
                            {getDistPctStr(tp3Data.price)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-xs text-center block">--</span>
                      )}
                    </td>
                  </tr>

                  {/* Sub-row Footer Banner: Continuous SL -> BE -> DCA -> TP Track with Moving White Circle & Trend Animation */}
                  {(() => {
                    const liveVsBePct = activeAvgEntryPrice > 0
                      ? ((currentPrice - activeAvgEntryPrice) / activeAvgEntryPrice) * 100 * (isLong ? 1 : -1)
                      : 0;
                    const isAdvancing = liveVsBePct >= 0;

                    const tpMaxP = tp3Data?.price || tp2Data?.price || tp1Data?.price || (isLong ? pE1 * 1.05 : pE1 * 0.95);
                    const slP = slPrice || (isLong ? pE1 * 0.95 : pE1 * 1.05);

                    let posPct = 50;
                    if (tpMaxP !== slP) {
                      if (isLong) {
                        posPct = ((currentPrice - slP) / (tpMaxP - slP)) * 100;
                      } else {
                        posPct = ((slP - currentPrice) / (slP - tpMaxP)) * 100;
                      }
                    }
                    posPct = Math.max(3, Math.min(97, posPct));

                    return (
                      <tr className="bg-slate-950 border-b border-slate-800">
                        {/* Cols 1 to 7: Rank, Semáforo, Par, LIVE, Inversión, Apalancamiento, Nominal */}
                        <td colSpan={7} className="py-1 px-2 border-r border-slate-800"></td>

                        {/* Cols 8 to 14: Stop Loss (1), DCA Entries (3), Take Profits (3) = 7 Cols */}
                        <td colSpan={7} className="py-2 px-3 border-r border-b border-slate-800 bg-slate-950/90">
                          <div className="relative w-full flex flex-col gap-1.5 font-mono">
                            {/* Visual Shaded Track Bar: Red (SL) -> Amber (BE) -> Cyan (DCA) -> Green (TP) */}
                            <div className="relative w-full h-5 rounded-full overflow-hidden flex border-2 border-slate-700/80 bg-slate-900 shadow-inner">
                              {/* Red Segment (Stop Loss) - 15% */}
                              <div className="w-[15%] h-full bg-gradient-to-r from-rose-950 via-rose-900 to-rose-800/80 border-r border-rose-500/50 flex items-center justify-center text-[9px] font-black text-rose-200 uppercase tracking-tight">
                                🛑 SL
                              </div>

                              {/* Amber Segment (BE Marcado) - 15% */}
                              <div className="w-[15%] h-full bg-gradient-to-r from-amber-950 via-amber-900 to-amber-800/80 border-r border-amber-500/50 flex items-center justify-center text-[9px] font-black text-amber-200 uppercase tracking-tight">
                                ⚖️ BE
                              </div>

                              {/* Blue/Cyan Segment (Entradas DCA) - 35% */}
                              <div className="w-[35%] h-full bg-gradient-to-r from-cyan-950 via-sky-900 to-blue-900/80 border-r border-cyan-500/50 flex items-center justify-center text-[9px] font-black text-cyan-200 uppercase tracking-tight">
                                🎯 DCA
                              </div>

                              {/* Green Segment (Take Profit) - 35% */}
                              <div className="w-[35%] h-full bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-700/80 flex items-center justify-center text-[9px] font-black text-emerald-200 uppercase tracking-tight">
                                💰 Take Profit
                              </div>

                              {/* Moving White Circle (LIVE Price Marker with pulse halo) */}
                              <div 
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-300 z-20 flex items-center justify-center"
                                style={{ left: `${posPct}%` }}
                              >
                                <div className="relative flex items-center justify-center">
                                  <span className={`absolute w-6 h-6 rounded-full animate-ping opacity-75 ${
                                    isAdvancing ? 'bg-emerald-400' : 'bg-rose-400'
                                  }`} />
                                  <span 
                                    title={`LIVE: ${formatPrice(currentPrice)}`}
                                    className="w-4 h-4 rounded-full bg-white border-2 border-slate-950 shadow-[0_0_12px_#ffffff] z-10 inline-block cursor-pointer ring-2 ring-cyan-400"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Price Labels & Trend Direction below Track */}
                            <div className="flex items-center justify-between text-[10px] font-bold flex-wrap gap-1">
                              <span className="text-rose-400 font-mono">SL: {formatPrice(slP)}</span>

                              <span className="text-amber-300 font-mono">BE: {formatPrice(activeAvgEntryPrice)}</span>
                              
                              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm font-mono transition-colors ${
                                isAdvancing
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500 shadow-emerald-500/20'
                                  : 'bg-rose-950 text-rose-300 border border-rose-500 shadow-rose-500/20'
                              }`}>
                                <span className={`w-2 h-2 rounded-full ${isAdvancing ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`} />
                                <span>LIVE: {formatPrice(currentPrice)}</span>
                                <span className="font-extrabold font-mono">
                                  {isAdvancing ? '►► AVANZANDO ' : '◄◄ RETROCEDIENDO '}
                                  ({isAdvancing ? '+' : ''}{liveVsBePct.toFixed(2)}%)
                                </span>
                              </span>

                              <span className="text-emerald-400 font-mono">TP Max: {formatPrice(tpMaxP)}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })()}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};

