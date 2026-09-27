import React, { useState, useEffect, useRef } from 'react';
import { StrategyWithOrders } from '../types';
import { TakeProfitAccordion } from './TakeProfitAccordion';
import { HorizontalPriceTrack } from './HorizontalPriceTrack';
import { calculateRiskReward } from '../utils/riskReward';
import { 
  Target, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  ExternalLink,
  Zap,
  Activity,
  Copy,
  Check,
  Percent,
  Scale
} from 'lucide-react';

interface StrategyRowProps {
  strategy: StrategyWithOrders;
  rankIndex: number;
  onUpdateThreshold?: (strategyId: number, threshold: number) => void;
  onOpenDcaSimulator?: (strategy: StrategyWithOrders) => void;
  isSelected?: boolean;
  onToggleSelect?: (strategyId: number) => void;
}

export const StrategyRow: React.FC<StrategyRowProps> = ({ 
  strategy, 
  rankIndex,
  onUpdateThreshold,
  onOpenDcaSimulator,
  isSelected = false,
  onToggleSelect
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [flashClass, setFlashClass] = useState<string>('');
  const [tpBurstActive, setTpBurstActive] = useState<boolean>(false);
  const prevPriceRef = useRef<number | undefined>(strategy.currentPrice);

  const isLong = strategy.type === 'LONG';
  const currentPrice = strategy.currentPrice;

  // Calculate Risk:Reward metrics
  const rr = calculateRiskReward({
    entryPrice: strategy.entryPrice,
    stopLoss: strategy.stopLoss,
    type: strategy.type,
    orders: strategy.orders
  });

  // Evaluate which user-defined Take Profit targets are hit
  const hitTps = strategy.orders.filter(tp => {
    if (!currentPrice || currentPrice <= 0 || !tp.targetPrice) return false;
    return isLong ? currentPrice >= tp.targetPrice : currentPrice <= tp.targetPrice;
  });

  const isTpHit = hitTps.length > 0;

  // Real-time TP crossing detection & price flash
  useEffect(() => {
    if (currentPrice !== undefined && prevPriceRef.current !== undefined) {
      const prev = prevPriceRef.current;
      const curr = currentPrice;

      if (curr > prev) {
        setFlashClass('flash-up');
      } else if (curr < prev) {
        setFlashClass('flash-down');
      }
      const timer = setTimeout(() => setFlashClass(''), 800);

      const crossedNewTp = strategy.orders.some(tp => {
        if (isLong) {
          return prev < tp.targetPrice && curr >= tp.targetPrice;
        } else {
          return prev > tp.targetPrice && curr <= tp.targetPrice;
        }
      });

      if (crossedNewTp) {
        setTpBurstActive(true);
        const burstTimer = setTimeout(() => setTpBurstActive(false), 3500);
        return () => {
          clearTimeout(timer);
          clearTimeout(burstTimer);
        };
      }

      prevPriceRef.current = currentPrice;
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = currentPrice;
  }, [currentPrice, strategy.orders, isLong]);

  const copyEntry = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${strategy.symbol} ${strategy.type} @ $${strategy.entryPrice} | SL: $${strategy.stopLoss} | R:B: ${rr.formattedRatio}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAlert = strategy.isAlertZone;
  const symbolClean = strategy.symbol.replace('USDT', '');
  const displayStrategyName = strategy.strategyName || strategy.coinName || symbolClean;

  return (
    <div className={`border-b transition-all duration-300 relative ${
      tpBurstActive
        ? 'animate-tp-burst border-emerald-400 bg-emerald-950/70 shadow-2xl shadow-emerald-500/30 ring-2 ring-emerald-400'
        : isTpHit
        ? 'animate-tp-pulse border-emerald-500/70 bg-emerald-950/40 hover:bg-emerald-950/60 shadow-lg shadow-emerald-500/10'
        : isAlert
        ? 'bg-blue-950/40 hover:bg-blue-950/60 border-cyan-500/40'
        : 'bg-slate-900/30 hover:bg-slate-900/80 border-slate-800/80'
    }`}>
      {/* Ordered Execution Radar Row */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 sm:px-6 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 cursor-pointer select-none"
      >
        
        {/* Left Section: [1. Nombre Estrategia & TIPO abajo] + [2. Riesgo Beneficio] */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 sm:gap-6 shrink-0">
          
          {/* Multi-Selection Checkbox & Rank */}
          <div className="flex items-center gap-2">
            {onToggleSelect && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(strategy.id);
                }}
                className="p-1 -ml-1 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="w-5 h-5 rounded-md bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </div>
            )}

            <div className="flex items-center justify-center w-7">
              {isTpHit ? (
                <div className="relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-emerald-400 opacity-75"></span>
                  <Target className="w-5 h-5 text-emerald-400 relative z-10" />
                </div>
              ) : isAlert ? (
                <Target className="w-5 h-5 text-cyan-400 animate-pulse" />
              ) : (
                <span className="text-xs font-mono font-bold text-slate-500">
                  #{rankIndex + 1}
                </span>
              )}
            </div>
          </div>

          {/* 1. Nombre Estrategia (Valor exacto de la Celda A de Ordenes) con TIPO como etiqueta abajo */}
          <div className="w-56 sm:w-64 shrink-0">
            {/* Nombre de Estrategia extraído de la celda A de Ordenes */}
            <div className="font-extrabold text-sm sm:text-base font-mono text-cyan-300 tracking-tight truncate leading-snug" title={displayStrategyName}>
              {displayStrategyName}
            </div>

            {/* Sublínea con Activo (Símbolo) y TIPO (LONG / SHORT) como etiqueta abajo */}
            <div className="mt-1.5 flex items-center flex-wrap gap-1.5">
              <span className="font-bold text-[11px] text-white font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-700/80 shadow-xs">
                {symbolClean}/USDT
              </span>

              {/* TIPO (LONG / SHORT) como etiqueta */}
              <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-md font-mono tracking-wider ${
                isLong
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/80 shadow-xs'
                  : 'bg-rose-950 text-rose-300 border border-rose-700/80 shadow-xs'
              }`}>
                {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {strategy.type}
              </span>

              {strategy.leverage && (
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                  {strategy.leverage}x
                </span>
              )}
            </div>
          </div>

          {/* 2. Riesgo Beneficio (Columna) */}
          <div className="w-28 sm:w-32 shrink-0">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5 font-semibold">
              Riesgo Beneficio
            </span>
            <span 
              title={`Riesgo: -${rr.slDistancePct.toFixed(1)}% | Recompensa Máx: +${rr.maxRewardPct.toFixed(1)}%`}
              className={`inline-flex items-center gap-1 text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-md font-mono border ${
                rr.maxRiskReward >= 3.0
                  ? 'bg-purple-950 text-purple-300 border-purple-600/80'
                  : rr.maxRiskReward >= 2.0
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-600/80'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-700/80'
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              <span>{rr.formattedRatio}</span>
            </span>
          </div>

        </div>

        {/* 3. Escala de Precios Horizontal con Entrada, SL, Precio Live y Take Profits */}
        <div className="flex-1 min-w-[300px] lg:min-w-[450px] px-2">
          <HorizontalPriceTrack
            symbol={strategy.symbol}
            type={strategy.type}
            entryPrice={strategy.entryPrice}
            stopLoss={strategy.stopLoss}
            currentPrice={strategy.currentPrice}
            orders={strategy.orders}
          />
        </div>

        {/* Right Section: Actions & Accordion Toggle */}
        <div className="flex items-center justify-end gap-2.5 shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-slate-800/60">
          <button
            onClick={copyEntry}
            title="Copiar parámetros del trade"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" /> : <Copy className="w-4 h-4" />}
          </button>

          <a
            href={`https://www.binance.com/es/trade/${symbolClean}_USDT`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Abrir en Binance"
            className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-cyan-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <span>{isExpanded ? 'Ocultar' : 'Matriz & Escala'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

      </div>

      {/* Accordion Content */}
      {isExpanded && (
        <TakeProfitAccordion
          strategy={strategy}
          onUpdateThreshold={onUpdateThreshold}
          onOpenDcaSimulator={onOpenDcaSimulator}
        />
      )}
    </div>
  );
};
