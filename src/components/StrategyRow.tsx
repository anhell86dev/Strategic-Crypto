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
  const highestHitTp = hitTps.length > 0
    ? (isLong
        ? [...hitTps].sort((a, b) => b.targetPrice - a.targetPrice)[0]
        : [...hitTps].sort((a, b) => a.targetPrice - b.targetPrice)[0])
    : null;

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

  const formatPrice = (val?: number) => {
    if (val === undefined || isNaN(val)) return '---';
    if (val >= 1000) {
      return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (val >= 1) {
      return `$${val.toFixed(2)}`;
    } else if (val >= 0.01) {
      return `$${val.toFixed(4)}`;
    }
    return `$${val.toFixed(6)}`;
  };

  const copyEntry = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${strategy.symbol} ${strategy.type} @ $${strategy.entryPrice} | SL: $${strategy.stopLoss} | R:B: ${rr.formattedRatio}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAlert = strategy.isAlertZone;
  const symbolClean = strategy.symbol.replace('USDT', '');

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
        
        {/* Left Elements: [1. Nombre Estrategia] + [2. TIPO] + [3. Riesgo Beneficio] + [4. Precio Actual] */}
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

          {/* 1. Nombre Estrategia */}
          <div className="w-40 sm:w-48 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base sm:text-lg font-mono text-white tracking-tight">
                {symbolClean}
              </span>
              <span className="text-xs text-slate-500 font-normal">/USDT</span>
            </div>
            <div className="text-xs text-slate-400 font-sans truncate mt-0.5">
              {strategy.coinName || symbolClean}
              {strategy.category && <span className="text-slate-500"> · {strategy.category}</span>}
            </div>
          </div>

          {/* 2. TIPO (Etiqueta LONG / SHORT) */}
          <div className="shrink-0">
            <span className={`inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-lg font-mono tracking-wider ${
              isLong
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/80 shadow-xs'
                : 'bg-rose-950 text-rose-300 border border-rose-700/80 shadow-xs'
            }`}>
              {isLong ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {strategy.type}
            </span>
          </div>

          {/* 3. Riesgo Beneficio (Columna) */}
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
              <Scale className="w-3 h-3 text-cyan-400" />
              <span>{rr.formattedRatio}</span>
            </span>
          </div>

          {/* 4. Precio Actual */}
          <div className={`w-32 sm:w-36 shrink-0 p-1 rounded-lg transition-colors ${flashClass}`}>
            <span className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1 mb-0.5 font-semibold">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping-fast absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Precio Actual
            </span>
            <div className="font-mono font-black text-sm sm:text-base text-white tabular-nums">
              {formatPrice(strategy.currentPrice)}
            </div>
            {strategy.priceChangePercent24h !== undefined && (
              <span className={`text-[10px] font-mono font-bold block ${
                strategy.priceChangePercent24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {strategy.priceChangePercent24h >= 0 ? '+' : ''}{strategy.priceChangePercent24h.toFixed(2)}% (24h)
              </span>
            )}
          </div>

        </div>

        {/* 5. Entrada, SL y Take Profits representados en Línea de Precios Horizontal */}
        <div className="flex-1 min-w-[280px] lg:min-w-[400px] px-2">
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
