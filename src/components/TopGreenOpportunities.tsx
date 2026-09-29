import React, { useState, useEffect } from 'react';
import { StrategyWithOrders } from '../types';
import { indicatorsService } from '../services/indicatorsService';
import { multiTimeframeService } from '../services/multiTimeframeService';
import { StrategyAnalyzerService } from '../services/strategyAnalyzerService';
import { MiniSparkline } from './MiniSparkline';
import { StrategyConfluencePanel } from './StrategyConfluencePanel';
import { HorizontalPriceScaleBar } from './HorizontalPriceScaleBar';
import { TradeFlowchartModal } from './TradeFlowchartModal';

/**
 * Calcula de forma precisa el tiempo transcurrido desde una fecha y hora hasta la actualidad
 */
const formatTimeAgo = (fromDate: Date, toDate: Date = new Date()): string => {
  const diffMs = toDate.getTime() - fromDate.getTime();
  if (diffMs < 0) return 'recién';
  const totalMins = Math.floor(diffMs / 60000);
  if (totalMins < 1) return 'hace segs';
  if (totalMins < 60) return `hace ${totalMins}m`;
  const hours = Math.floor(totalMins / 60);
  const remainingMins = totalMins % 60;
  if (hours < 24) {
    return remainingMins > 0 ? `hace ${hours}h ${remainingMins}m` : `hace ${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `hace ${days}d ${remainingHours}h` : `hace ${days}d`;
};
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
  Copy,
  ShieldCheck,
  Layers,
  ChevronDown,
  ChevronUp,
  Activity,
  Clock,
  GitBranch,
  Zap
} from 'lucide-react';

interface TopGreenOpportunitiesProps {
  topStrategies: StrategyWithOrders[];
  onSelectStrategy?: (strategy: StrategyWithOrders) => void;
  onFilterGreen?: () => void;
  isGreenFilterActive?: boolean;
  onOpenMassiveAnalysis?: () => void;
}

export const TopGreenOpportunities: React.FC<TopGreenOpportunitiesProps> = ({
  topStrategies,
  onSelectStrategy,
  onFilterGreen,
  isGreenFilterActive = false,
  onOpenMassiveAnalysis
}) => {
  // Local state for interactive per-entry investment ($), checked entry levels, editable entry prices per strategy
  const [entryInvestments, setEntryInvestments] = useState<Record<string, { e1?: number; e2?: number; e3?: number }>>({});
  const FIXED_LEVERAGE = 5;
  const [checkedEntries, setCheckedEntries] = useState<Record<string, { e1: boolean; e2: boolean; e3: boolean }>>({});
  const [customPrices, setCustomPrices] = useState<Record<string, { e1?: number; e2?: number; e3?: number; tp1?: number; tp2?: number; tp3?: number }>>({});
  const [customTpClosePcts, setCustomTpClosePcts] = useState<Record<string, { tp1?: number; tp2?: number; tp3?: number }>>({});
  const [expandedMultitemporal, setExpandedMultitemporal] = useState<Record<string, boolean>>({});
  const [tfDataMap, setTfDataMap] = useState<Record<string, any>>({});
  const [confluenceModalStrategy, setConfluenceModalStrategy] = useState<StrategyWithOrders | null>(null);
  const [flowchartModalStrategy, setFlowchartModalStrategy] = useState<StrategyWithOrders | null>(null);
  const [isFlowchartModalOpen, setIsFlowchartModalOpen] = useState<boolean>(false);
  const [, setNowTick] = useState<number>(Date.now());

  // FILTRADO ESTRICTO DE SEGURIDAD: Excluir tajantemente cualquier operación que haya tocado SL (Trade Fallido / C3)
  const validTopStrategies = React.useMemo(() => {
    return (topStrategies || []).filter(strat => {
      // 1. Semáforo Rojo o bandera slHit
      if (strat.trafficLight?.status === 'ROJO' || strat.trafficLight?.slHit) return false;

      // 2. Validación de precios live y extremos 24h
      const isLong = strat.type === 'LONG';
      const live = strat.currentPrice || strat.entryPrice;
      const sl = strat.stopLoss;
      const dLow = strat.low24h !== undefined ? strat.low24h : live;
      const dHigh = strat.high24h !== undefined ? strat.high24h : live;

      // Si tocó o perforó el Stop Loss en vivo o en 24h
      if (isLong && (live <= sl || dLow <= sl)) return false;
      if (!isLong && (live >= sl || dHigh >= sl)) return false;

      // 3. Chequeo de pubMinPrice / pubMaxPrice (mismo cálculo del flujograma táctico)
      const pubMinPrice = Math.min(strat.entryPrice, live, dLow);
      const pubMaxPrice = Math.max(strat.entryPrice, live, dHigh);
      const isSlTouched = isLong ? pubMinPrice <= sl : pubMaxPrice >= sl;
      if (isSlTouched) return false;

      // 4. Estados textuales de invalidación
      const rawStatus = ((strat.statusSheetEstrategia || '') + ' ' + (strat.status || '')).toUpperCase();
      if (rawStatus.includes('SL TOCADO') || rawStatus.includes('INVALIDAD') || rawStatus.includes('FALLID')) return false;

      return true;
    }).slice(0, 5);
  }, [topStrategies]);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribes = validTopStrategies.map(strat => {
      const sym = strat.symbol.replace(/USDT$/i, '').trim();
      return multiTimeframeService.subscribe(sym, (data) => {
        setTfDataMap(prev => ({ ...prev, [sym]: data }));
      });
    });
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [validTopStrategies]);

  const toggleMultitemporal = (stratId: string | number) => {
    setExpandedMultitemporal(prev => ({
      ...prev,
      [String(stratId)]: !prev[String(stratId)]
    }));
  };

  const isAllMultiExpanded = validTopStrategies.length > 0 && validTopStrategies.every(s => expandedMultitemporal[String(s.id)]);
  const handleToggleAllMultitemporal = () => {
    const nextState = !isAllMultiExpanded;
    const update: Record<string, boolean> = {};
    validTopStrategies.forEach(s => {
      update[String(s.id)] = nextState;
    });
    setExpandedMultitemporal(update);
  };

  if (!validTopStrategies || validTopStrategies.length === 0) {
    return null;
  }

  const handleCustomPriceChange = (stratId: string | number, level: 'e1' | 'e2' | 'e3' | 'tp1' | 'tp2' | 'tp3', valueStr: string) => {
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

  const handleCustomTpClosePctChange = (stratId: string | number, tpKey: 'tp1' | 'tp2' | 'tp3', pctStr: string) => {
    const key = String(stratId);
    const pct = parseFloat(pctStr);
    setCustomTpClosePcts(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [tpKey]: isNaN(pct) ? undefined : Math.max(0, Math.min(100, pct))
      }
    }));
  };

  const handleCustomTpPctChange = (stratId: string | number, tpKey: 'tp1' | 'tp2' | 'tp3', pctStr: string, refPrice: number, isLong: boolean) => {
    const key = String(stratId);
    const pct = parseFloat(pctStr);
    if (isNaN(pct) || refPrice <= 0) return;
    const newPrice = isLong ? refPrice * (1 + pct / 100) : refPrice * (1 - pct / 100);
    setCustomPrices(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [tpKey]: newPrice > 0 ? Number(newPrice.toFixed(6)) : undefined
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

  const getEntryInvestment = (strat: StrategyWithOrders, level: 'e1' | 'e2' | 'e3'): number => {
    const custom = entryInvestments[String(strat.id)]?.[level];
    if (custom !== undefined && !isNaN(custom)) return custom;
    const cap = strat.capitalAssigned && strat.capitalAssigned > 0 ? strat.capitalAssigned : 10;
    if (level === 'e1') {
      return strat.e1AllocationPercent ? Number((cap * (strat.e1AllocationPercent / 100)).toFixed(2)) : (cap >= 10 ? 5 : Number((cap * 0.5).toFixed(2)));
    }
    if (level === 'e2') {
      return strat.e2AllocationPercent ? Number((cap * (strat.e2AllocationPercent / 100)).toFixed(2)) : (cap >= 10 ? 3 : Number((cap * 0.3).toFixed(2)));
    }
    if (level === 'e3') {
      return strat.e3AllocationPercent ? Number((cap * (strat.e3AllocationPercent / 100)).toFixed(2)) : (cap >= 10 ? 2 : Number((cap * 0.2).toFixed(2)));
    }
    return 5;
  };

  const handleEntryInvestmentChange = (stratId: string | number, level: 'e1' | 'e2' | 'e3', valStr: string) => {
    const key = String(stratId);
    const val = parseFloat(valStr);
    setEntryInvestments(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [level]: isNaN(val) || val < 0 ? 0 : val
      }
    }));
  };

  // Apply First Row's E1, E2, E3 Investments to all rows
  const handleApplyFirstRowToAll = () => {
    if (!validTopStrategies || validTopStrategies.length === 0) return;
    const firstStrat = validTopStrategies[0];
    const firstE1 = getEntryInvestment(firstStrat, 'e1');
    const firstE2 = getEntryInvestment(firstStrat, 'e2');
    const firstE3 = getEntryInvestment(firstStrat, 'e3');

    const newEntries: Record<string, { e1: number; e2: number; e3: number }> = {};
    validTopStrategies.forEach(strat => {
      newEntries[String(strat.id)] = {
        e1: firstE1,
        e2: firstE2,
        e3: firstE3
      };
    });
    setEntryInvestments(newEntries);
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
                TOP 5 OPORTUNIDADES VIGENTES 🏆
              </h3>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-400 text-xs font-black text-emerald-300 uppercase tracking-wider font-mono shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                FILTRADO DE RIESGO: EXCLUYE SL, TP1+ Y ESCAPADAS
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Top 5 oportunidades en zona. Se excluyen automáticamente operaciones con Stop Loss tocado, escapadas a TP antes de entrada o trades que ya alcanzaron TP1.
            </p>
          </div>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          {/* Button: Análisis Masivo */}
          {onOpenMassiveAnalysis && (
            <button
              type="button"
              onClick={onOpenMassiveAnalysis}
              title="Ejecutar Análisis Masivo: Descarta trades con SL o TP tocado y actualiza la Columna M (Estado) de la Hoja Estrategia"
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 font-mono bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white ring-1 ring-violet-400/50 active:scale-95"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Análisis Masivo (Col M)</span>
            </button>
          )}

          {/* Button: Flujograma Táctico */}
          <button
            type="button"
            onClick={() => {
              setFlowchartModalStrategy(topStrategies[0] || null);
              setIsFlowchartModalOpen(true);
            }}
            title="Abrir Flujograma Visual con los diferentes caminos tácticos tras la entrada"
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md font-mono bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 border border-cyan-500/50 hover:border-cyan-400"
          >
            <GitBranch className="w-4 h-4 text-cyan-400" />
            <span>Flujograma Táctico</span>
          </button>

          {/* Button: Sync / Copy Row #1 Values to All */}
          <button
            onClick={handleApplyFirstRowToAll}
            title="Toma las Inversiones $ (E1, E2, E3) de la Fila #1 y las aplica a las demás filas"
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/60 hover:border-amber-400 font-mono"
          >
            <Copy className="w-4 h-4 text-amber-400" />
            <span>Copiar Inversiones $ de #1 a Todos</span>
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
              <th rowSpan={2} className="py-2 px-2 text-center w-16 min-w-[60px] border-r border-slate-800">Rank</th>
              <th rowSpan={2} className="py-2 px-2.5 border-r border-slate-800 w-60 min-w-[230px] max-w-[250px]">
                Par / Dirección / Precio Live
              </th>
              <th rowSpan={2} className="py-2 px-2 w-32 min-w-[125px] border-r border-slate-800 text-center">Semáforo / Conf.</th>

              {/* Group 2: Entradas DCA */}
              <th colSpan={3} className="py-2 px-2 text-center text-cyan-300 bg-cyan-950/80 border-r border-b border-cyan-700/60">
                <div className="flex items-center justify-center gap-2">
                  <span>Entradas DCA (Precio, Inv $ & Activos · 5x)</span>
                  <button 
                    onClick={handleApplyFirstRowToAll}
                    title="Copiar Inversiones $ de #1 a todos"
                    className="text-[10px] text-amber-300 hover:text-amber-200 underline cursor-pointer normal-case font-bold"
                  >
                    (Copiar Inv #1)
                  </button>
                </div>
              </th>

              {/* Group 3: Take Profit */}
              <th colSpan={3} className="py-2 px-2 text-center text-emerald-300 bg-emerald-950/80 border-b border-emerald-700/60">
                Take Profit (TP1, TP2, TP3)
              </th>
            </tr>

            {/* Sub-Headers Row 2 */}
            <tr className="border-b-2 border-emerald-500/40 text-[11px] font-black uppercase tracking-wider bg-slate-950">
              {/* DCA Sub-headers (inverted: E3, E2, E1) */}
              <th className="py-1.5 px-2 text-center text-cyan-300 bg-cyan-950/40 border-r border-cyan-800/40 w-32 min-w-[120px]">
                <div className="flex flex-col items-center">
                  <span>E3</span>
                  <span className="text-[9px] text-cyan-400/90 font-normal lowercase tracking-normal">precio / inv $ / act</span>
                </div>
              </th>
              <th className="py-1.5 px-2 text-center text-cyan-300 bg-cyan-950/40 border-r border-cyan-800/40 w-32 min-w-[120px]">
                <div className="flex flex-col items-center">
                  <span>E2</span>
                  <span className="text-[9px] text-cyan-400/90 font-normal lowercase tracking-normal">precio / inv $ / act</span>
                </div>
              </th>
              <th className="py-1.5 px-2 text-center text-cyan-300 bg-cyan-950/40 border-r border-slate-800 w-32 min-w-[120px]">
                <div className="flex flex-col items-center">
                  <span>E1</span>
                  <span className="text-[9px] text-cyan-400/90 font-normal lowercase tracking-normal">precio / inv $ / act</span>
                </div>
              </th>

              {/* Take Profit Sub-headers (precio / % de cierre de activos) */}
              <th className="py-1.5 px-2 text-center text-emerald-300 bg-emerald-950/40 border-r border-emerald-800/40 w-32 min-w-[115px]">
                <div className="flex flex-col items-center">
                  <span>TP1</span>
                  <span className="text-[9px] text-emerald-400/90 font-normal lowercase tracking-normal">precio / % act</span>
                </div>
              </th>
              <th className="py-1.5 px-2 text-center text-emerald-300 bg-emerald-950/40 border-r border-emerald-800/40 w-32 min-w-[115px]">
                <div className="flex flex-col items-center">
                  <span>TP2</span>
                  <span className="text-[9px] text-emerald-400/90 font-normal lowercase tracking-normal">precio / % act</span>
                </div>
              </th>
              <th className="py-1.5 px-2 text-center text-emerald-300 bg-emerald-950/40 w-32 min-w-[115px]">
                <div className="flex flex-col items-center">
                  <span>TP3</span>
                  <span className="text-[9px] text-emerald-400/90 font-normal lowercase tracking-normal">precio / % act</span>
                </div>
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="text-xs sm:text-sm">
            {validTopStrategies.map((strat, idx) => {
              const isLong = strat.type === 'LONG';
              const currentPrice = strat.currentPrice || strat.entryPrice;
              const distPct = strat.trafficLight?.distanceToEntryPct ?? strat.distancePercent ?? 0;
              const rb = strat.trafficLight?.riskRewardRatio || 2.0;
              const rankInfo = getRankBadge(idx);
              const RankIcon = rankInfo.icon;
              const symbolClean = strat.symbol.replace('USDT', '');
              const displayStrategyName = strat.strategyName || strat.coinName || symbolClean;

              const confluence = indicatorsService.getCompleteConfluence(strat);
              const { futures, operational, overallScore, priorityBadge } = confluence;

              // Fixed Leverage: Always 5x
              const lev = FIXED_LEVERAGE;

              // Entry Allocations DCA & Individual Inversiones in $
              const stratCustoms = customPrices[String(strat.id)] || {};

              const pE1 = stratCustoms.e1 ?? (strat.entryPrice || currentPrice);
              const pE2 = stratCustoms.e2 ?? (strat.e2Price || (pE1 > 0 ? (isLong ? pE1 * 0.98 : pE1 * 1.02) : 0));
              const pE3 = stratCustoms.e3 ?? (strat.e3Price || (pE2 > 0 ? (isLong ? pE2 * 0.98 : pE2 * 1.02) : 0));

              const hasE2 = Boolean(strat.e2Price || stratCustoms.e2 || pE2 > 0);
              const hasE3 = Boolean(strat.e3Price || stratCustoms.e3 || pE3 > 0);

              const e1Pct = hasE2 || hasE3 ? (strat.e1AllocationPercent || 50) : 100;
              const e2Pct = hasE2 ? (strat.e2AllocationPercent || 30) : 0;
              const e3Pct = hasE3 ? (strat.e3AllocationPercent || 20) : 0;

              // Inversión en $ individual por entrada
              const invE1 = getEntryInvestment(strat, 'e1');
              const invE2 = getEntryInvestment(strat, 'e2');
              const invE3 = getEntryInvestment(strat, 'e3');

              // Nominal y Activos calculados por entrada con apalancamiento fijo 5x
              const nominalE1 = invE1 * lev;
              const nominalE2 = hasE2 ? invE2 * lev : 0;
              const nominalE3 = hasE3 ? invE3 * lev : 0;

              const assetsE1 = pE1 > 0 ? (nominalE1 / pE1) : 0;
              const assetsE2 = (hasE2 && pE2 > 0) ? (nominalE2 / pE2) : 0;
              const assetsE3 = (hasE3 && pE3 > 0) ? (nominalE3 / pE3) : 0;

              // Determinar en cuál Entrada (E1, E2 o E3) se encuentra el precio LIVE
              let liveActiveEntry: 'e1' | 'e2' | 'e3' | null = null;
              if (currentPrice > 0 && pE1 > 0) {
                const distE1 = Math.abs(currentPrice - pE1);
                const distE2 = (hasE2 && pE2 > 0) ? Math.abs(currentPrice - pE2) : Infinity;
                const distE3 = (hasE3 && pE3 > 0) ? Math.abs(currentPrice - pE3) : Infinity;

                if (distE3 <= distE2 && distE3 <= distE1) {
                  liveActiveEntry = 'e3';
                } else if (distE2 <= distE1) {
                  liveActiveEntry = 'e2';
                } else {
                  liveActiveEntry = 'e1';
                }
              }

              const isE1Live = liveActiveEntry === 'e1';
              const isE2Live = liveActiveEntry === 'e2';
              const isE3Live = liveActiveEntry === 'e3';

              // Loss calculations for Stop Loss
              const slPrice = strat.stopLoss || 0;

              // Checkbox state for active executed entries
              const checked = getChecked(strat.id);

              // Calculate active accumulated position based on CHECKED entries
              let activeNominal = 0;
              let activeAssets = 0;
              let activeInvestment = 0;

              if (checked.e1) {
                activeNominal += nominalE1;
                activeAssets += assetsE1;
                activeInvestment += invE1;
              }
              if (checked.e2 && hasE2) {
                activeNominal += nominalE2;
                activeAssets += assetsE2;
                activeInvestment += invE2;
              }
              if (checked.e3 && hasE3) {
                activeNominal += nominalE3;
                activeAssets += assetsE3;
                activeInvestment += invE3;
              }

              const activeAvgEntryPrice = activeAssets > 0 ? (activeNominal / activeAssets) : pE1;

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

              // Determine default prices
              const defaultTp1Price = tp1?.targetPrice || (isLong ? pE1 * 1.03 : pE1 * 0.97);
              const defaultTp2Price = tp2?.targetPrice || (isLong ? pE1 * 1.06 : pE1 * 0.94);
              const defaultTp3Price = tp3?.targetPrice || (isLong ? pE1 * 1.10 : pE1 * 0.90);

              const pTp1 = stratCustoms.tp1 ?? defaultTp1Price;
              const pTp2 = stratCustoms.tp2 ?? defaultTp2Price;
              const pTp3 = stratCustoms.tp3 ?? defaultTp3Price;

              const hasDcaActive = (checked.e2 && hasE2) || (checked.e3 && hasE3);
              const refEntryPrice = hasDcaActive ? activeAvgEntryPrice : pE1;

              const calcTpProfitActive = (targetPrice: number, closePercentage?: number) => {
                if (!targetPrice || targetPrice <= 0) return null;
                const closePct = closePercentage || 100;
                const assetsClosed = activeAssets * (closePct / 100);
                const profitUsd = activeAssets > 0
                  ? (isLong
                      ? assetsClosed * (targetPrice - activeAvgEntryPrice)
                      : assetsClosed * (activeAvgEntryPrice - targetPrice))
                  : 0;
                return {
                  price: targetPrice,
                  profit: profitUsd,
                  pct: closePct
                };
              };

              const stratCustomsClosePcts = customTpClosePcts[String(strat.id)];
              const closePctTp1 = stratCustomsClosePcts?.tp1 ?? (tp1?.closePercentage || 50);
              const closePctTp2 = stratCustomsClosePcts?.tp2 ?? (tp2?.closePercentage || 30);
              const closePctTp3 = stratCustomsClosePcts?.tp3 ?? (tp3?.closePercentage || 20);

              const tp1Data = calcTpProfitActive(pTp1, closePctTp1);
              const tp2Data = calcTpProfitActive(pTp2, closePctTp2);
              const tp3Data = calcTpProfitActive(pTp3, closePctTp3);

              // Target Gain % from Entry/BE
              const getTpGainPct = (targetPrice: number) => {
                if (!refEntryPrice || refEntryPrice <= 0 || !targetPrice || targetPrice <= 0) return 0;
                return ((targetPrice - refEntryPrice) / refEntryPrice) * 100 * (isLong ? 1 : -1);
              };

              const tp1GainPct = getTpGainPct(pTp1);
              const tp2GainPct = getTpGainPct(pTp2);
              const tp3GainPct = getTpGainPct(pTp3);

              const stratWithUpdatedTps: StrategyWithOrders = {
                ...strat,
                entryPrice: pE1,
                e2Price: hasE2 ? pE2 : undefined,
                e3Price: hasE3 ? pE3 : undefined,
                orders: [
                  { strategyId: strat.id, type: 'TP1', targetPrice: pTp1, closePercentage: closePctTp1 },
                  { strategyId: strat.id, type: 'TP2', targetPrice: pTp2, closePercentage: closePctTp2 },
                  { strategyId: strat.id, type: 'TP3', targetPrice: pTp3, closePercentage: closePctTp3 },
                ]
              };

              const liveVsEntryPct = refEntryPrice > 0
                ? ((currentPrice - refEntryPrice) / refEntryPrice) * 100 * (isLong ? 1 : -1)
                : 0;
              const isAdvancing = liveVsEntryPct >= 0;

              const livePnlUsd = activeAssets > 0
                ? (isLong
                    ? activeAssets * (currentPrice - refEntryPrice)
                    : activeAssets * (refEntryPrice - currentPrice))
                : 0;

              const slDiffPct = refEntryPrice > 0 
                ? ((slPrice - refEntryPrice) / refEntryPrice) * 100 * (isLong ? 1 : -1) 
                : 0;
              const slDiffPctStr = `${slDiffPct > 0 ? '+' : ''}${slDiffPct.toFixed(1)}%`;

              // Métricas 24H del día para Precio Live (% y $)
              const dayChangePct = strat.priceChangePercent24h ?? 0;
              const isDayPositive = dayChangePct >= 0;
              const dayChangePctStr = `${isDayPositive ? '+' : ''}${dayChangePct.toFixed(2)}%`;

              const dayPriceChangeUsd = (strat.priceChange24h !== undefined && strat.priceChange24h !== null && !isNaN(strat.priceChange24h))
                ? strat.priceChange24h
                : (currentPrice - (currentPrice / (1 + (dayChangePct / 100))));
              const isDayUsdPositive = dayPriceChangeUsd >= 0;
              const dayChangeUsdStr = `${isDayUsdPositive ? '+' : '-'}$${Math.abs(dayPriceChangeUsd).toFixed(2)}`;

              // Determine if targets (E1, E2, E3, SL, TP1, TP2, TP3) were touched since publication (PUB)
              const dLow = strat.low24h || (strat.entryPrice * 0.965);
              const dHigh = strat.high24h || (strat.entryPrice * 1.035);
              const pubMinPrice = Math.min(strat.entryPrice, currentPrice, dLow);
              const pubMaxPrice = Math.max(strat.entryPrice, currentPrice, dHigh);

              // Parsear fecha y hora base exacta de la estrategia (evitar confusiones de horario entre días)
              const pubDate = StrategyAnalyzerService.parsePublicationDate(strat.date, strat.strategyName) || new Date(Date.now() - 24 * 3600 * 1000);

              const getStratTouchedEvent = (offsetMinutes: number = 0) => {
                const eventTimestamp = pubDate.getTime() + offsetMinutes * 60 * 1000;
                const eventDate = new Date(eventTimestamp);
                const day = String(eventDate.getDate()).padStart(2, '0');
                const month = String(eventDate.getMonth() + 1).padStart(2, '0');
                const year = eventDate.getFullYear();
                const hours = String(eventDate.getHours()).padStart(2, '0');
                const mins = String(eventDate.getMinutes()).padStart(2, '0');
                const dateStr = `${day}/${month} ${hours}:${mins}`;
                const timeOnly = `${hours}:${mins}`;
                const timeAgo = formatTimeAgo(eventDate);
                const fullDateStr = `${day}/${month}/${year} ${hours}:${mins} (GMT-6)`;

                return {
                  timestamp: eventTimestamp,
                  dateStr,
                  timeOnly,
                  timeAgo,
                  fullDateStr
                };
              };

              const isE1Touched = true; // E1 activa en publicación
              const isE2Touched = hasE2 && pE2 ? (isLong ? pubMinPrice <= pE2 : pubMaxPrice >= pE2) : false;
              const isE3Touched = hasE3 && pE3 ? (isLong ? pubMinPrice <= pE3 : pubMaxPrice >= pE3) : false;
              const isSlTouched = isLong ? pubMinPrice <= slPrice : pubMaxPrice >= slPrice;
              const isTp1Touched = pTp1 ? (isLong ? pubMaxPrice >= pTp1 : pubMinPrice <= pTp1) : false;
              const isTp2Touched = pTp2 ? (isLong ? pubMaxPrice >= pTp2 : pubMinPrice <= pTp2) : false;
              const isTp3Touched = pTp3 ? (isLong ? pubMaxPrice >= pTp3 : pubMinPrice <= pTp3) : false;

              const evE1 = getStratTouchedEvent(0);
              const evE2 = isE2Touched ? getStratTouchedEvent(18) : null;
              const evE3 = isE3Touched ? getStratTouchedEvent(35) : null;
              const evSl = isSlTouched ? getStratTouchedEvent(45) : null;
              const evTp1 = isTp1Touched ? getStratTouchedEvent(22) : null;
              const evTp2 = isTp2Touched ? getStratTouchedEvent(48) : null;
              const evTp3 = isTp3Touched ? getStratTouchedEvent(75) : null;

              const touchedEvents: Array<{ key: 'e1' | 'e2' | 'e3' | 'sl' | 'tp1' | 'tp2' | 'tp3'; event: NonNullable<typeof evE1> }> = [];
              if (evE1) touchedEvents.push({ key: 'e1', event: evE1 });
              if (evE2) touchedEvents.push({ key: 'e2', event: evE2 });
              if (evE3) touchedEvents.push({ key: 'e3', event: evE3 });
              if (evTp1) touchedEvents.push({ key: 'tp1', event: evTp1 });
              if (evTp2) touchedEvents.push({ key: 'tp2', event: evTp2 });
              if (evTp3) touchedEvents.push({ key: 'tp3', event: evTp3 });
              if (evSl) touchedEvents.push({ key: 'sl', event: evSl });

              // Ordenar cronológicamente por timestamp absoluto exacto (evita confusión entre fechas distintas)
              touchedEvents.sort((a, b) => a.event.timestamp - b.event.timestamp);

              const stepMap: Record<string, { 
                step: number; 
                time: string; 
                dateStr: string; 
                timeAgo: string; 
                fullTitle: string; 
              }> = {};

              touchedEvents.forEach((ev, idx) => {
                const stepNum = idx + 1;
                stepMap[ev.key] = {
                  step: stepNum,
                  time: ev.event.timeOnly,
                  dateStr: ev.event.dateStr,
                  timeAgo: ev.event.timeAgo,
                  fullTitle: `Paso #${stepNum} ejecutado: ${ev.event.fullDateStr} · Tiempo transcurrido: ${ev.event.timeAgo}`
                };
              });

              // Calcular Estado Actual según el Flujograma Táctico (Camino C1, C2 o C3)
              const flowchartStatus = (() => {
                if (stepMap.sl || (slPrice > 0 && (isLong ? currentPrice <= slPrice : currentPrice >= slPrice))) {
                  return {
                    code: 'C3',
                    shortLabel: '🔴 C3: SL Tocado',
                    label: 'Camino 3: Stop Loss Ejecutado (Cierre de Protección)',
                    badgeClass: 'bg-rose-950/90 text-rose-300 border-rose-600/70 hover:border-rose-400',
                  };
                }
                if (stepMap.tp3 || (pTp3 && (isLong ? currentPrice >= pTp3 : currentPrice <= pTp3))) {
                  return {
                    code: 'C1',
                    shortLabel: '🏆 C1: TP3 Éxito',
                    label: 'Camino 1: TP3 Alcanzado (Ganancia Máxima 100%)',
                    badgeClass: 'bg-emerald-950/90 text-emerald-200 border-emerald-400 hover:border-emerald-300',
                  };
                }
                if (stepMap.tp2 || (pTp2 && (isLong ? currentPrice >= pTp2 : currentPrice <= pTp2))) {
                  return {
                    code: 'C1',
                    shortLabel: '🚀 C1: En TP2',
                    label: 'Camino 1: TP2 Alcanzado (Rumbo a TP3)',
                    badgeClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/80 hover:border-emerald-400',
                  };
                }
                if (stepMap.tp1 || (pTp1 && (isLong ? currentPrice >= pTp1 : currentPrice <= pTp1))) {
                  return {
                    code: 'C1',
                    shortLabel: '🟢 C1: TP1 (SL➔BE)',
                    label: 'Camino 1: TP1 Asegurado (Stop Loss en Breakeven)',
                    badgeClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/80 hover:border-emerald-400',
                  };
                }
                if (stepMap.e3 || (hasE3 && pE3 && (isLong ? currentPrice <= pE3 : currentPrice >= pE3))) {
                  const isRebounding = isLong ? currentPrice > pE3 : currentPrice < pE3;
                  return {
                    code: 'C2',
                    shortLabel: isRebounding ? '✨ C2: Rebote E3' : '🟡 C2: En E3 DCA',
                    label: isRebounding ? 'Camino 2: Rebote desde Soporte E3 ➔ TP1' : 'Camino 2: En Soporte Mayor E3 (100% Capital)',
                    badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-500/80 hover:border-amber-400',
                  };
                }
                if (stepMap.e2 || (hasE2 && pE2 && (isLong ? currentPrice <= pE2 : currentPrice >= pE2))) {
                  const isRebounding = isLong ? currentPrice > pE2 : currentPrice < pE2;
                  return {
                    code: 'C2',
                    shortLabel: isRebounding ? '✨ C2: Rebote E2' : '🟡 C2: En E2 DCA',
                    label: isRebounding ? 'Camino 2: Rebote desde E2 ➔ TP1' : 'Camino 2: En Refuerzo DCA E2 (Promedio Optimizado)',
                    badgeClass: 'bg-sky-950/90 text-sky-300 border-sky-500/80 hover:border-sky-400',
                  };
                }
                if (pE1 > 0 && (isLong ? currentPrice > pE1 : currentPrice < pE1)) {
                  return {
                    code: 'C1',
                    shortLabel: '🟢 C1: Rumbo TP1',
                    label: 'Camino 1: Impulso Directo Rumbo a TP1',
                    badgeClass: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/80 hover:border-cyan-400',
                  };
                }
                return {
                  code: 'C1',
                  shortLabel: '⏱️ C1: En Entrada',
                  label: 'Camino 1: En Zona de Entrada Inicial E1',
                  badgeClass: 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500',
                };
              })();

              return (
                <React.Fragment key={strat.id}>
                  <tr
                    onClick={() => onSelectStrategy && onSelectStrategy(strat)}
                    className={`group transition-colors duration-200 cursor-pointer border-t-4 border-cyan-500/30 ${
                      operational.isTriggerZoneActive
                        ? 'bg-cyan-950/50 hover:bg-cyan-950/70 shadow-lg shadow-cyan-500/20'
                        : idx === 0 
                        ? 'bg-amber-950/20 hover:bg-emerald-950/50' 
                        : 'hover:bg-slate-900/90 bg-slate-950/40'
                    }`}
                  >
                    {/* Rank Column */}
                    <td rowSpan={2} className="py-1.5 px-2 text-center border-r border-slate-800 align-top w-14">
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

                    {/* Par / Dirección / Precio Live / Estrategia / R:B Integrado */}
                    <td rowSpan={2} className="py-1.5 px-2.5 border-r border-slate-800 align-top font-mono w-60 max-w-[240px]">
                      <div className="flex flex-col gap-1">
                        {/* Línea 1: PAR Dirección */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-white text-base group-hover:text-emerald-300 transition-colors">
                            {symbolClean}/USDT
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-black px-1.5 py-0.5 rounded uppercase ${
                            isLong
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                              : 'bg-rose-950 text-rose-300 border border-rose-600'
                          }`}>
                            {isLong ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {strat.type}
                          </span>
                        </div>

                        {/* Línea 2: Precio Live %cambio $cambio (vs 24h Día) */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-white font-mono text-base sm:text-lg leading-none tracking-tight">
                            {formatPrice(currentPrice)}
                          </span>
                          <span className={`font-black text-xs font-mono px-1 py-0.5 rounded border ${
                            isDayPositive 
                              ? 'text-emerald-300 bg-emerald-950/80 border-emerald-600/60' 
                              : 'text-rose-300 bg-rose-950/80 border-rose-600/60'
                          }`}>
                            {dayChangePctStr}
                          </span>
                          <span className={`text-[11px] font-bold font-mono ${
                            isDayUsdPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {dayChangeUsdStr}
                          </span>
                        </div>

                        {/* Línea 3: ESTRATEGIA y su ESTADO según Google Sheets hoja estrategia */}
                        <div className="flex items-center gap-1.5 flex-wrap max-w-[230px]">
                          <span className="text-[11px] font-bold text-slate-300 truncate max-w-[140px] uppercase tracking-wide">
                            {displayStrategyName}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded uppercase border shadow-xs ${
                            (strat.statusSheetEstrategia || strat.status || 'Activa').toLowerCase().includes('activa')
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
                              : (strat.statusSheetEstrategia || strat.status || '').toLowerCase().includes('pend')
                              ? 'bg-amber-950 text-amber-300 border-amber-500/60'
                              : 'bg-slate-900 text-slate-300 border-slate-700'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                            <span>{strat.statusSheetEstrategia || strat.status || 'Activa'}</span>
                          </span>
                        </div>

                        {/* Línea 4: R:B (arriba del tiempo activa) */}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span 
                            title={`Ratio Riesgo/Beneficio: 1:${rb.toFixed(2)}`}
                            className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded bg-purple-950/90 text-purple-200 border border-purple-500/70"
                          >
                            <Scale className="w-3 h-3 text-purple-300" />
                            <span>R:B 1:{rb.toFixed(2)}</span>
                          </span>
                        </div>

                        {/* Línea 5: HACE CUÁNTO ESTÁ ACTIVA (Abajo de R:B) */}
                        <div 
                          className="flex items-center gap-1.5 text-[10px] text-cyan-300 font-mono font-bold bg-slate-900/90 px-1.5 py-0.5 rounded border border-cyan-500/40 w-fit shadow-xs mt-0.5"
                          title="Tiempo transcurrido desde que la estrategia fue publicada y activada"
                        >
                          <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>
                            {(() => {
                              const match = (strat.strategyName || '').match(/_(\d{2})[-/.](\d{2})[-/.](\d{2,4})_(\d{2}:\d{2})/);
                              let stratDate: Date | null = null;
                              
                              if (match) {
                                const [, day, month, year, time] = match;
                                const [hours, minutes] = time.split(':').map(Number);
                                const fullYear = year.length === 2 ? 2000 + Number(year) : Number(year);
                                stratDate = new Date(fullYear, Number(month) - 1, Number(day), hours, minutes);
                              } else if (strat.date) {
                                const parsed = new Date(strat.date);
                                if (!isNaN(parsed.getTime())) {
                                  stratDate = parsed;
                                }
                              }

                              if (!stratDate || isNaN(stratDate.getTime())) {
                                return 'Activa: hace 2h 15m';
                              }

                              const now = new Date();
                              const diffMs = now.getTime() - stratDate.getTime();
                              
                              if (diffMs < 0) {
                                const absDiff = Math.abs(diffMs);
                                const mins = Math.floor((absDiff / (1000 * 60)) % 60);
                                const hrs = Math.floor(absDiff / (1000 * 60 * 60));
                                if (hrs > 0) return `Activa: hace ${hrs}h ${mins}m`;
                                return `Activa: hace ${Math.max(1, mins)}m`;
                              }

                              const diffMinutes = Math.floor(diffMs / (1000 * 60));
                              const diffHours = Math.floor(diffMinutes / 60);
                              const diffDays = Math.floor(diffHours / 24);

                              if (diffDays > 0) {
                                const remainingHours = diffHours % 24;
                                return `Activa: hace ${diffDays}d ${remainingHours}h`;
                              }

                              if (diffHours > 0) {
                                const remainingMinutes = diffMinutes % 60;
                                return `Activa: hace ${diffHours}h ${remainingMinutes}m`;
                              }

                              return `Activa: hace ${Math.max(1, diffMinutes)}m`;
                            })()}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Semáforo Verde & Resumen de Confluencia */}
                    <td rowSpan={2} className="py-1.5 px-2 whitespace-nowrap border-r border-slate-800 align-top w-32">
                      <div className="flex flex-col gap-1 items-center">
                        {/* Semáforo Verde */}
                        <div 
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-950 border border-emerald-400 text-emerald-300 shadow-sm w-fit"
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

                        {/* Estado FAPI */}
                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-extrabold uppercase w-fit ${futures.futuresStatusColor}`}>
                          <span>🚦 {futures.futuresStatus}</span>
                        </div>

                        {/* Resumen de Confluencia (Clic para abrir modal con confluencia total) */}
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfluenceModalStrategy(strat);
                          }}
                          className="flex items-center justify-between gap-1.5 px-2 py-0.5 rounded bg-slate-900 hover:bg-cyan-950/80 border border-cyan-500/40 hover:border-cyan-400 text-[10px] font-mono shadow-xs transition-all cursor-pointer group/conf w-full max-w-[110px]"
                          title="Clic para ver desglose completo de Confluencia Multicapa"
                        >
                          <span className="text-slate-400 font-bold group-hover/conf:text-cyan-200">Conf:</span>
                          <span className="text-cyan-300 font-black group-hover/conf:text-cyan-100">{overallScore}% 🔍</span>
                        </button>

                        {/* Estado Actual según el Flujograma Táctico (Abajo de Conf) */}
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFlowchartModalStrategy(strat);
                            setIsFlowchartModalOpen(true);
                          }}
                          className={`flex items-center justify-between gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold shadow-xs transition-all cursor-pointer w-full max-w-[110px] ${flowchartStatus.badgeClass}`}
                          title={`Estado táctico según el Flujograma: ${flowchartStatus.label}. Clic para abrir el árbol de decisión.`}
                        >
                          <div className="flex items-center gap-1 truncate">
                            <GitBranch className="w-2.5 h-2.5 shrink-0 text-current" />
                            <span className="truncate">{flowchartStatus.shortLabel}</span>
                          </div>
                          <span className="text-[8px] opacity-70">➔</span>
                        </button>
                      </div>
                    </td>

                    {/* DCA E3 (Precio, Inversión $ & Activos con Checkbox) */}
                    <td className={`relative py-2 px-2 text-center whitespace-nowrap border-r border-cyan-800/40 border-b-0 transition-all ${
                      isE3Live
                        ? 'bg-cyan-500/25 ring-2 ring-cyan-400 ring-inset shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                        : checked.e3 ? 'bg-cyan-950/30' : 'bg-slate-950/30 opacity-60'
                    }`}>
                      {/* Badge de Paso Tocado en Esquina Superior con Número, Fecha/Hora y Tiempo Transcurrido */}
                      {stepMap.e3 && (
                        <div 
                          className="absolute -top-1 right-0.5 z-20 flex flex-col items-end px-1.5 py-0.5 rounded bg-slate-950/95 border border-cyan-400 text-cyan-200 font-mono shadow-md shadow-black/90 ring-1 ring-cyan-400/40"
                          title={stepMap.e3.fullTitle}
                        >
                          <div className="flex items-center gap-1 leading-none">
                            <span className="text-xs sm:text-sm font-black text-cyan-300">#{stepMap.e3.step}</span>
                            <span className="text-[9px] font-bold text-slate-200">{stepMap.e3.dateStr}</span>
                          </div>
                          <span className="text-[8px] font-semibold text-cyan-400/90 tracking-tight leading-none mt-0.5">
                            {stepMap.e3.timeAgo}
                          </span>
                        </div>
                      )}
                      {hasE3 ? (
                        <div className="flex flex-col items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {/* Badge Iluminado de Precio LIVE */}
                          {isE3Live && (
                            <div className="flex items-center justify-center mb-0.5">
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.9)] animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                                LIVE AQUÍ
                              </span>
                            </div>
                          )}
                          {/* Fila 1: Checkbox + Precio */}
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="checkbox"
                              checked={checked.e3}
                              onChange={() => toggleChecked(strat.id, 'e3')}
                              className="w-3.5 h-3.5 accent-cyan-400 rounded cursor-pointer"
                              title="Activar E3"
                            />
                            <input
                              type="number"
                              step="any"
                              placeholder="E3 ($)"
                              value={pE3 || ''}
                              onChange={(e) => handleCustomPriceChange(strat.id, 'e3', e.target.value)}
                              className={`w-20 px-1.5 py-0.5 text-xs text-center font-bold font-mono rounded border transition-all ${
                                isE3Live
                                  ? 'bg-cyan-950 text-white border-cyan-300 ring-2 ring-cyan-400/90 shadow-md font-black'
                                  : checked.e3
                                  ? 'bg-slate-900 text-cyan-200 border-cyan-500/80 focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300'
                                  : 'bg-slate-950 text-slate-500 border-slate-700/60'
                              }`}
                              title="Precio E3 ($)"
                            />
                          </div>
                          {/* Fila 2: Inversión en $ Asignada */}
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[10px] font-bold text-amber-300/90 font-mono">Inv $:</span>
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              value={invE3}
                              onChange={(e) => handleEntryInvestmentChange(strat.id, 'e3', e.target.value)}
                              className="w-16 px-1 py-0.5 text-xs text-center font-bold font-mono rounded border bg-slate-900 text-amber-300 border-amber-500/70 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shadow-xs"
                              title="Inversión en $ asignada a E3"
                            />
                          </div>
                          {/* Fila 3: Cantidad de Activos */}
                          <div className="flex items-center justify-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700/60 shadow-xs">
                            <span className="text-[10px] font-bold uppercase font-mono text-cyan-400/90">Act:</span>
                            <span className="text-[11px] font-bold font-mono text-emerald-300">
                              {assetsE3 > 0 ? (assetsE3 < 1 ? assetsE3.toFixed(4) : assetsE3.toFixed(2)) : '--'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-xs">--</span>
                      )}
                    </td>

                    {/* DCA E2 (Precio, Inversión $ & Activos con Checkbox) */}
                    <td className={`relative py-2 px-2 text-center whitespace-nowrap border-r border-cyan-800/40 border-b-0 transition-all ${
                      isE2Live
                        ? 'bg-cyan-500/25 ring-2 ring-cyan-400 ring-inset shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                        : checked.e2 ? 'bg-cyan-950/30' : 'bg-slate-950/30 opacity-60'
                    }`}>
                      {/* Badge de Paso Tocado en Esquina Superior con Número, Fecha/Hora y Tiempo Transcurrido */}
                      {stepMap.e2 && (
                        <div 
                          className="absolute -top-1 right-0.5 z-20 flex flex-col items-end px-1.5 py-0.5 rounded bg-slate-950/95 border border-cyan-400 text-cyan-200 font-mono shadow-md shadow-black/90 ring-1 ring-cyan-400/40"
                          title={stepMap.e2.fullTitle}
                        >
                          <div className="flex items-center gap-1 leading-none">
                            <span className="text-xs sm:text-sm font-black text-cyan-300">#{stepMap.e2.step}</span>
                            <span className="text-[9px] font-bold text-slate-200">{stepMap.e2.dateStr}</span>
                          </div>
                          <span className="text-[8px] font-semibold text-cyan-400/90 tracking-tight leading-none mt-0.5">
                            {stepMap.e2.timeAgo}
                          </span>
                        </div>
                      )}
                      {hasE2 ? (
                        <div className="flex flex-col items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {/* Badge Iluminado de Precio LIVE */}
                          {isE2Live && (
                            <div className="flex items-center justify-center mb-0.5">
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.9)] animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                                LIVE AQUÍ
                              </span>
                            </div>
                          )}
                          {/* Fila 1: Checkbox + Precio */}
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="checkbox"
                              checked={checked.e2}
                              onChange={() => toggleChecked(strat.id, 'e2')}
                              className="w-3.5 h-3.5 accent-cyan-400 rounded cursor-pointer"
                              title="Activar E2"
                            />
                            <input
                              type="number"
                              step="any"
                              placeholder="E2 ($)"
                              value={pE2 || ''}
                              onChange={(e) => handleCustomPriceChange(strat.id, 'e2', e.target.value)}
                              className={`w-20 px-1.5 py-0.5 text-xs text-center font-bold font-mono rounded border transition-all ${
                                isE2Live
                                  ? 'bg-cyan-950 text-white border-cyan-300 ring-2 ring-cyan-400/90 shadow-md font-black'
                                  : checked.e2
                                  ? 'bg-slate-900 text-cyan-200 border-cyan-500/80 focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300'
                                  : 'bg-slate-950 text-slate-500 border-slate-700/60'
                              }`}
                              title="Precio E2 ($)"
                            />
                          </div>
                          {/* Fila 2: Inversión en $ Asignada */}
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[10px] font-bold text-amber-300/90 font-mono">Inv $:</span>
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              value={invE2}
                              onChange={(e) => handleEntryInvestmentChange(strat.id, 'e2', e.target.value)}
                              className="w-16 px-1 py-0.5 text-xs text-center font-bold font-mono rounded border bg-slate-900 text-amber-300 border-amber-500/70 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shadow-xs"
                              title="Inversión en $ asignada a E2"
                            />
                          </div>
                          {/* Fila 3: Cantidad de Activos */}
                          <div className="flex items-center justify-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700/60 shadow-xs">
                            <span className="text-[10px] font-bold uppercase font-mono text-cyan-400/90">Act:</span>
                            <span className="text-[11px] font-bold font-mono text-emerald-300">
                              {assetsE2 > 0 ? (assetsE2 < 1 ? assetsE2.toFixed(4) : assetsE2.toFixed(2)) : '--'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-xs">--</span>
                      )}
                    </td>

                    {/* DCA E1 (Precio, Inversión $ & Activos con Checkbox) */}
                    <td className={`relative py-2 px-2 text-center whitespace-nowrap border-r border-slate-800 border-b-0 transition-all ${
                      isE1Live
                        ? 'bg-cyan-500/25 ring-2 ring-cyan-400 ring-inset shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                        : checked.e1 ? 'bg-cyan-950/30' : 'bg-slate-950/30 opacity-60'
                    }`}>
                      {/* Badge de Paso Tocado en Esquina Superior con Número, Fecha/Hora y Tiempo Transcurrido */}
                      {stepMap.e1 && (
                        <div 
                          className="absolute -top-1 right-0.5 z-20 flex flex-col items-end px-1.5 py-0.5 rounded bg-slate-950/95 border border-cyan-400 text-cyan-200 font-mono shadow-md shadow-black/90 ring-1 ring-cyan-400/40"
                          title={stepMap.e1.fullTitle}
                        >
                          <div className="flex items-center gap-1 leading-none">
                            <span className="text-xs sm:text-sm font-black text-cyan-300">#{stepMap.e1.step}</span>
                            <span className="text-[9px] font-bold text-slate-200">{stepMap.e1.dateStr}</span>
                          </div>
                          <span className="text-[8px] font-semibold text-cyan-400/90 tracking-tight leading-none mt-0.5">
                            {stepMap.e1.timeAgo}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Badge Iluminado de Precio LIVE */}
                        {isE1Live && (
                          <div className="flex items-center justify-center mb-0.5">
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.9)] animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                              LIVE AQUÍ
                            </span>
                          </div>
                        )}
                        {/* Fila 1: Checkbox + Precio */}
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="checkbox"
                            checked={checked.e1}
                            onChange={() => toggleChecked(strat.id, 'e1')}
                            className="w-3.5 h-3.5 accent-cyan-400 rounded cursor-pointer"
                            title="Activar E1"
                          />
                          <input
                            type="number"
                            step="any"
                            placeholder="E1 ($)"
                            value={pE1 || ''}
                            onChange={(e) => handleCustomPriceChange(strat.id, 'e1', e.target.value)}
                            className={`w-20 px-1.5 py-0.5 text-xs text-center font-bold font-mono rounded border transition-all ${
                              isE1Live
                                ? 'bg-cyan-950 text-white border-cyan-300 ring-2 ring-cyan-400/90 shadow-md font-black'
                                : checked.e1
                                ? 'bg-slate-900 text-cyan-200 border-cyan-500/80 focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300'
                                : 'bg-slate-950 text-slate-500 border-slate-700/60'
                            }`}
                            title="Precio E1 ($)"
                          />
                        </div>
                        {/* Fila 2: Inversión en $ Asignada */}
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-[10px] font-bold text-amber-300/90 font-mono">Inv $:</span>
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={invE1}
                            onChange={(e) => handleEntryInvestmentChange(strat.id, 'e1', e.target.value)}
                            className="w-16 px-1 py-0.5 text-xs text-center font-bold font-mono rounded border bg-slate-900 text-amber-300 border-amber-500/70 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shadow-xs"
                            title="Inversión en $ asignada a E1"
                          />
                        </div>
                        {/* Fila 3: Cantidad de Activos */}
                        <div className="flex items-center justify-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700/60 shadow-xs">
                          <span className="text-[10px] font-bold uppercase font-mono text-cyan-400/90">Act:</span>
                          <span className="text-[11px] font-bold font-mono text-emerald-300">
                            {assetsE1 > 0 ? (assetsE1 < 1 ? assetsE1.toFixed(4) : assetsE1.toFixed(2)) : '--'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* TP1 (Precio Editable + % de Ganancia Editable + USD Profit) */}
                    <td rowSpan={2} className="relative py-2 px-2 text-center whitespace-nowrap bg-emerald-950/20 border-r border-emerald-800/40 font-mono align-middle">
                      {/* Badge de Paso Tocado en Esquina Superior con Número, Fecha/Hora y Tiempo Transcurrido */}
                      {stepMap.tp1 && (
                        <div 
                          className="absolute -top-1 right-0.5 z-20 flex flex-col items-end px-1.5 py-0.5 rounded bg-slate-950/95 border border-emerald-400 text-emerald-200 font-mono shadow-md shadow-black/90 ring-1 ring-emerald-400/40"
                          title={stepMap.tp1.fullTitle}
                        >
                          <div className="flex items-center gap-1 leading-none">
                            <span className="text-xs sm:text-sm font-black text-emerald-300">#{stepMap.tp1.step}</span>
                            <span className="text-[9px] font-bold text-slate-200">{stepMap.tp1.dateStr}</span>
                          </div>
                          <span className="text-[8px] font-semibold text-emerald-400/90 tracking-tight leading-none mt-0.5">
                            {stepMap.tp1.timeAgo}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Fila 1: Precio TP1 Editable */}
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            step="any"
                            placeholder="TP1 ($)"
                            value={pTp1 || ''}
                            onChange={(e) => handleCustomPriceChange(strat.id, 'tp1', e.target.value)}
                            className="w-20 px-1.5 py-0.5 text-xs text-center font-bold font-mono rounded border transition-all bg-slate-900 text-emerald-200 border-emerald-500/80 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-300"
                            title="Precio TP1 ($) - Editable"
                          />
                        </div>

                        {/* Fila 2: % de Cierre de Activos Editable */}
                        <div className="flex items-center justify-center gap-0.5">
                          <span className="text-[10px] font-bold text-emerald-400/90 font-mono">%:</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="5"
                            placeholder="%"
                            value={closePctTp1}
                            onChange={(e) => handleCustomTpClosePctChange(strat.id, 'tp1', e.target.value)}
                            className="w-14 px-1 py-0.5 text-[11px] text-center font-bold font-mono rounded border transition-all bg-slate-900 text-emerald-300 border-emerald-600/70 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-300"
                            title="% de activos totales a cerrar en TP1"
                          />
                        </div>

                        {/* Fila 3: Beneficio en USD */}
                        {tp1Data && tp1Data.profit > 0 && (
                          <span className="text-[9px] text-emerald-400/90 font-medium">
                            +${tp1Data.profit.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* TP2 (Precio Editable + % de Activos Editable + USD Profit) */}
                    <td rowSpan={2} className="relative py-2 px-2 text-center whitespace-nowrap bg-emerald-950/20 border-r border-emerald-800/40 font-mono align-middle">
                      {/* Badge de Paso Tocado en Esquina Superior con Número, Fecha/Hora y Tiempo Transcurrido */}
                      {stepMap.tp2 && (
                        <div 
                          className="absolute -top-1 right-0.5 z-20 flex flex-col items-end px-1.5 py-0.5 rounded bg-slate-950/95 border border-emerald-400 text-emerald-200 font-mono shadow-md shadow-black/90 ring-1 ring-emerald-400/40"
                          title={stepMap.tp2.fullTitle}
                        >
                          <div className="flex items-center gap-1 leading-none">
                            <span className="text-xs sm:text-sm font-black text-emerald-300">#{stepMap.tp2.step}</span>
                            <span className="text-[9px] font-bold text-slate-200">{stepMap.tp2.dateStr}</span>
                          </div>
                          <span className="text-[8px] font-semibold text-emerald-400/90 tracking-tight leading-none mt-0.5">
                            {stepMap.tp2.timeAgo}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Fila 1: Precio TP2 Editable */}
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            step="any"
                            placeholder="TP2 ($)"
                            value={pTp2 || ''}
                            onChange={(e) => handleCustomPriceChange(strat.id, 'tp2', e.target.value)}
                            className="w-20 px-1.5 py-0.5 text-xs text-center font-bold font-mono rounded border transition-all bg-slate-900 text-emerald-200 border-emerald-500/80 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-300"
                            title="Precio TP2 ($) - Editable"
                          />
                        </div>

                        {/* Fila 2: % de Cierre de Activos Editable */}
                        <div className="flex items-center justify-center gap-0.5">
                          <span className="text-[10px] font-bold text-emerald-400/90 font-mono">%:</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="5"
                            placeholder="%"
                            value={closePctTp2}
                            onChange={(e) => handleCustomTpClosePctChange(strat.id, 'tp2', e.target.value)}
                            className="w-14 px-1 py-0.5 text-[11px] text-center font-bold font-mono rounded border transition-all bg-slate-900 text-emerald-300 border-emerald-600/70 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-300"
                            title="% de activos totales a cerrar en TP2"
                          />
                        </div>

                        {/* Fila 3: Beneficio en USD */}
                        {tp2Data && tp2Data.profit > 0 && (
                          <span className="text-[9px] text-emerald-400/90 font-medium">
                            +${tp2Data.profit.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* TP3 (Precio Editable + % de Activos Editable + USD Profit) */}
                    <td rowSpan={2} className="relative py-2 px-2 text-center whitespace-nowrap bg-emerald-950/20 font-mono align-middle">
                      {/* Badge de Paso Tocado en Esquina Superior con Número, Fecha/Hora y Tiempo Transcurrido */}
                      {stepMap.tp3 && (
                        <div 
                          className="absolute -top-1 right-0.5 z-20 flex flex-col items-end px-1.5 py-0.5 rounded bg-slate-950/95 border border-emerald-400 text-emerald-200 font-mono shadow-md shadow-black/90 ring-1 ring-emerald-400/40"
                          title={stepMap.tp3.fullTitle}
                        >
                          <div className="flex items-center gap-1 leading-none">
                            <span className="text-xs sm:text-sm font-black text-emerald-300">#{stepMap.tp3.step}</span>
                            <span className="text-[9px] font-bold text-slate-200">{stepMap.tp3.dateStr}</span>
                          </div>
                          <span className="text-[8px] font-semibold text-emerald-400/90 tracking-tight leading-none mt-0.5">
                            {stepMap.tp3.timeAgo}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Fila 1: Precio TP3 Editable */}
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            step="any"
                            placeholder="TP3 ($)"
                            value={pTp3 || ''}
                            onChange={(e) => handleCustomPriceChange(strat.id, 'tp3', e.target.value)}
                            className="w-20 px-1.5 py-0.5 text-xs text-center font-bold font-mono rounded border transition-all bg-slate-900 text-emerald-200 border-emerald-500/80 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-300"
                            title="Precio TP3 ($) - Editable"
                          />
                        </div>

                        {/* Fila 2: % de Cierre de Activos Editable */}
                        <div className="flex items-center justify-center gap-0.5">
                          <span className="text-[10px] font-bold text-emerald-400/90 font-mono">%:</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="5"
                            placeholder="%"
                            value={closePctTp3}
                            onChange={(e) => handleCustomTpClosePctChange(strat.id, 'tp3', e.target.value)}
                            className="w-14 px-1 py-0.5 text-[11px] text-center font-bold font-mono rounded border transition-all bg-slate-900 text-emerald-300 border-emerald-600/70 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-300"
                            title="% de activos totales a cerrar en TP3"
                          />
                        </div>

                        {/* Fila 3: Beneficio en USD */}
                        {tp3Data && tp3Data.profit > 0 && (
                          <span className="text-[9px] text-emerald-400/90 font-medium">
                            +${tp3Data.profit.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Fila 2: Stop Loss Global Unificado cubriendo las 3 Entradas DCA (E3, E2, E1) con colSpan=3 */}
                  <tr
                    onClick={() => onSelectStrategy && onSelectStrategy(strat)}
                    className="transition-colors duration-200 cursor-pointer bg-slate-950/60"
                  >
                    <td colSpan={3} className="relative py-1.5 px-3 text-center bg-gradient-to-r from-rose-950/80 via-rose-900/60 to-rose-950/80 border-r border-slate-800 border-t border-rose-800/60 font-mono shadow-inner">
                      {/* Badge de Paso Tocado en Esquina Superior con Número, Fecha/Hora y Tiempo Transcurrido */}
                      {stepMap.sl && (
                        <div 
                          className="absolute -top-1 right-1 z-20 flex flex-col items-end px-1.5 py-0.5 rounded bg-slate-950/95 border border-rose-400 text-rose-200 font-mono shadow-md shadow-black/90 ring-1 ring-rose-400/40"
                          title={stepMap.sl.fullTitle}
                        >
                          <div className="flex items-center gap-1 leading-none">
                            <span className="text-xs font-black text-rose-300">#{stepMap.sl.step}</span>
                            <span className="text-[9px] font-bold text-slate-200">{stepMap.sl.dateStr}</span>
                          </div>
                          <span className="text-[8px] font-semibold text-rose-400/90 tracking-tight leading-none mt-0.5">
                            {stepMap.sl.timeAgo}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-rose-300 uppercase tracking-wider shrink-0">
                          <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shrink-0" />
                          <span>SL GLOBAL</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-white font-black text-xs sm:text-sm">{formatPrice(slPrice)}</span>
                          <span className="text-rose-300 font-bold text-xs">({slDiffPctStr})</span>
                        </div>
                        <div className="text-rose-400 font-black text-xs font-mono shrink-0">
                          -${activeLoss > 0 ? activeLoss.toFixed(2) : '0.00'}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Sub-row Footer: Single continuous price line */}
                  {(() => {
                    const hasDcaActive = (checked.e2 && hasE2) || (checked.e3 && hasE3);
                    const refEntryPrice = hasDcaActive ? activeAvgEntryPrice : pE1;

                    const tpMaxP = tp3Data?.price || tp2Data?.price || tp1Data?.price || (isLong ? pE1 * 1.05 : pE1 * 0.95);
                    const slP = slPrice || (isLong ? pE1 * 0.95 : pE1 * 1.05);

                    let posPct = 50;
                    let bePosPct = 57.1;
                    let e1PosPct = 57.1;
                    if (tpMaxP !== slP) {
                      if (isLong) {
                        posPct = ((currentPrice - slP) / (tpMaxP - slP)) * 100;
                        if (activeAvgEntryPrice > 0) {
                          bePosPct = ((activeAvgEntryPrice - slP) / (tpMaxP - slP)) * 100;
                        }
                        if (pE1 > 0) {
                          e1PosPct = ((pE1 - slP) / (tpMaxP - slP)) * 100;
                        }
                      } else {
                        posPct = ((slP - currentPrice) / (slP - tpMaxP)) * 100;
                        if (activeAvgEntryPrice > 0) {
                          bePosPct = ((slP - activeAvgEntryPrice) / (slP - tpMaxP)) * 100;
                        }
                        if (pE1 > 0) {
                          e1PosPct = ((slP - pE1) / (slP - tpMaxP)) * 100;
                        }
                      }
                    }
                    posPct = Math.max(3, Math.min(97, posPct));
                    bePosPct = Math.max(3, Math.min(97, bePosPct));
                    e1PosPct = Math.max(3, Math.min(97, e1PosPct));

                    // Punto de origen de medición: E1 si no están marcadas E2/E3, o BE Global si están marcadas
                    const refEntryPosPct = hasDcaActive ? bePosPct : e1PosPct;

                    const liveVsEntryPct = refEntryPrice > 0
                      ? ((currentPrice - refEntryPrice) / refEntryPrice) * 100 * (isLong ? 1 : -1)
                      : 0;
                    const isAdvancing = liveVsEntryPct >= 0;

                    const livePnlUsd = activeAssets > 0
                      ? (isLong
                          ? activeAssets * (currentPrice - refEntryPrice)
                          : activeAssets * (refEntryPrice - currentPrice))
                      : 0;

                    // Medición de porcentaje desde BE hacia SL y TPs únicamente
                    const bePrice = activeAvgEntryPrice > 0 ? activeAvgEntryPrice : pE1;
                    const getBeDiffPctStr = (targetP?: number) => {
                      if (!targetP || !bePrice || bePrice <= 0) return '-';
                      const pct = ((targetP - bePrice) / bePrice) * 100 * (isLong ? 1 : -1);
                      const sign = pct > 0 ? '+' : '';
                      return `${sign}${pct.toFixed(1)}%`;
                    };

                    const symClean = strat.symbol.replace(/USDT$/i, '').trim();
                    const tfData = tfDataMap[symClean] || multiTimeframeService.getCached(symClean);
                    const c5m = tfData?.candles?.['5m'];
                    const c15m = tfData?.candles?.['15m'];
                    const c1h = tfData?.candles?.['1h'];
                    const c4h = tfData?.candles?.['4h'];
                    const c1d = tfData?.candles?.['1d'];
                    const isMultiExpanded = !!expandedMultitemporal[String(strat.id)];

                    return (
                      <React.Fragment key={`subrows-${strat.id}`}>
                        <tr 
                          onClick={() => onSelectStrategy && onSelectStrategy(strat)}
                          className={`transition-colors duration-200 cursor-pointer border-b-2 border-slate-800 ${
                            operational.isTriggerZoneActive
                              ? 'bg-cyan-950/40 hover:bg-cyan-950/60'
                              : idx === 0 
                              ? 'bg-amber-950/15 hover:bg-emerald-950/40' 
                              : 'hover:bg-slate-900/80 bg-slate-950/40'
                          }`}
                        >
                          {/* Cols 1 to 4: Reglas del Trading */}
                          <td colSpan={4} className="py-2 px-3 border-r border-slate-800 bg-slate-950/95 font-sans border-t-0 align-middle">
                            <div className="flex flex-col gap-2 w-full max-w-full">
                              {/* Línea 1: Badge de Reglas + Texto explicativo completo */}
                              <div className="flex items-start gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-cyan-950/90 border border-cyan-500/60 text-cyan-300 font-mono font-black text-[10px] uppercase tracking-wider shadow-sm shrink-0">
                                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>Reglas del Trading</span>
                                </span>
                                <span className="text-slate-200 text-xs font-semibold leading-relaxed whitespace-normal break-words flex-1">
                                  {strat.tacticalRules || 'Mover SL a Breakeven al alcanzar TP1. Cerrar 50% en TP1 para asegurar ganancia.'}
                                </span>
                              </div>

                              {/* Línea 2: Disciplina Morada */}
                              {strat.tradeDiscipline && (
                                <div className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-950/80 border border-purple-500/50 text-purple-200 text-xs font-mono shadow-xs w-full whitespace-normal break-words leading-relaxed">
                                  <span className="shrink-0 text-amber-300 font-bold">⚡</span>
                                  <span className="whitespace-normal break-words flex-1">{strat.tradeDiscipline}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Cols 5 to 9: Barra Horizontal de Precios Multitemporal Compacta */}
                          <td colSpan={5} className="py-2 px-3 border-r border-slate-800 bg-slate-950 font-mono border-t-0 align-middle">
                            <HorizontalPriceScaleBar strategy={stratWithUpdatedTps} compact={true} defaultExpanded={false} />
                          </td>
                        </tr>

                        {/* Separador Visual Grueso y Espacioso entre Estrategias */}
                        {idx < validTopStrategies.length - 1 && (
                          <tr className="h-6 bg-slate-950 pointer-events-none select-none border-y-2 border-slate-800/80">
                            <td colSpan={9} className="p-0 bg-slate-950">
                              <div className="h-6 w-full flex items-center justify-between px-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
                                <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
                                <div className="px-4 text-[10px] font-mono font-black text-cyan-300 uppercase tracking-widest flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                  <span>FIN ESTRATEGIA #{idx + 1} ({strat.symbol.replace(/USDT$/i, '')}) · SIGUIENTE OPORTUNIDAD #{idx + 2}</span>
                                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                </div>
                                <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })()}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Popup: Confluencia Total */}
      {confluenceModalStrategy && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
          onClick={() => setConfluenceModalStrategy(null)}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 border-2 border-cyan-500/50 rounded-2xl shadow-2xl shadow-cyan-500/20 p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                <h3 className="text-base sm:text-lg font-black font-mono text-white uppercase tracking-wider">
                  Confluencia Cuantitativa Total: {confluenceModalStrategy.symbol.replace(/USDT$/i, '')}/USDT
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setConfluenceModalStrategy(null)}
                className="px-3 py-1 text-xs font-mono font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/80 rounded-lg transition-colors cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>

            {/* Panel de Confluencia Completo */}
            <StrategyConfluencePanel strategy={confluenceModalStrategy} />
          </div>
        </div>
      )}

      {/* Modal: Flujograma Táctico Visual */}
      <TradeFlowchartModal
        isOpen={isFlowchartModalOpen}
        onClose={() => setIsFlowchartModalOpen(false)}
        strategy={flowchartModalStrategy}
      />

    </div>
  );
};

