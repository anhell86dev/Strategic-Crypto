import React, { useState, useEffect, useRef } from 'react';
import { StrategyWithOrders } from '../types';
import { TakeProfitAccordion } from './TakeProfitAccordion';
import { MiniSparkline } from './MiniSparkline';
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
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);
  const [tpBurstActive, setTpBurstActive] = useState<boolean>(false);
  const prevPriceRef = useRef<number | undefined>(strategy.currentPrice);

  const effectiveThreshold = strategy.customAlertThreshold ?? 1.5;
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

      // Price tick direction flash
      if (curr > prev) {
        setFlashClass('flash-up');
      } else if (curr < prev) {
        setFlashClass('flash-down');
      }
      const timer = setTimeout(() => setFlashClass(''), 800);

      // Check if this tick newly crossed any user-defined TP target
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
  const distance = strategy.distancePercent !== undefined ? strategy.distancePercent : 999;
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
      {/* Main Row Grid */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none"
      >
        
        {/* Left Section: Checkbox, Rank, Alert Icon, Symbol & Badges */}
        <div className="flex items-center gap-3.5 min-w-[320px]">
          
          {/* Multi-Selection Checkbox */}
          {onToggleSelect && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(strategy.id);
              }}
              className="p-1.5 -ml-1 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {}}
                className="w-5 h-5 rounded-md bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </div>
          )}

          {/* Radar Position / Rank / TP Hit Beacon */}
          <div className="flex items-center gap-1.5 w-9 shrink-0">
            {isTpHit ? (
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-5 w-5 rounded-full bg-emerald-400 opacity-75"></span>
                <Target className="w-6 h-6 text-emerald-400 relative z-10 animate-pulse" />
              </div>
            ) : isAlert ? (
              <div className="relative flex items-center justify-center">
                <Target className="w-6 h-6 text-cyan-400 animate-pulse" />
                <span className="sr-only">Alerta activa</span>
              </div>
            ) : (
              <span className="text-sm font-mono font-bold text-slate-400 pl-0.5">
                #{rankIndex + 1}
              </span>
            )}
          </div>

          {/* Symbol & Name */}
          <div className="flex-1">
            <div className="flex items-center flex-wrap gap-2.5">
              <span className="font-black text-lg sm:text-xl font-mono text-white tracking-tight flex items-center gap-1">
                {symbolClean}
                <span className="text-xs text-slate-500 font-sans font-normal">/USDT</span>
              </span>

              {/* Direction Badge */}
              <span className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-0.5 rounded-md font-mono ${
                isLong
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/80 shadow-xs'
                  : 'bg-rose-950 text-rose-300 border border-rose-700/80 shadow-xs'
              }`}>
                {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {strategy.type}
              </span>

              {/* TP Crossed Active Badge */}
              {isTpHit && (
                <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-0.5 rounded-md font-mono bg-emerald-400 text-slate-950 shadow-sm animate-pulse">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{highestHitTp?.type || 'TP'} ALCANZADO</span>
                </span>
              )}

              {/* R:B (Risk:Reward) Ratio Badge */}
              <span 
                title={`Ratio Riesgo/Beneficio: 1 a ${rr.maxRiskReward.toFixed(2)} (Riesgo: -${rr.slDistancePct.toFixed(1)}% | Recompensa TP Max: +${rr.maxRewardPct.toFixed(1)}%)`}
                className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-0.5 rounded-md font-mono shadow-xs border ${
                  rr.maxRiskReward >= 3.0
                    ? 'bg-purple-950 text-purple-300 border-purple-600/80'
                    : rr.maxRiskReward >= 2.0
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-600/80'
                    : rr.maxRiskReward >= 1.5
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700/80'
                    : 'bg-slate-900 text-slate-400 border-slate-700'
                }`}
              >
                <Scale className="w-3 h-3 text-cyan-400" />
                <span>R:B {rr.formattedRatio}</span>
              </span>

              {/* Leverage Badge */}
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300">
                {strategy.leverage || 5}x
              </span>

              {/* Status Badge */}
              <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded ${
                strategy.status === 'Active'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : strategy.status === 'Pending'
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                  : 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
              }`}>
                {strategy.status}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 mt-1 font-sans">
              <span className="font-semibold text-slate-300">{strategy.coinName || symbolClean}</span>
              {strategy.category && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs text-slate-400 truncate max-w-[180px]">{strategy.category}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Middle Section: Live Price, 15m Sparkline, Planned Entry & R:B, Radar Distance */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 flex-1 max-w-2xl items-center">
          
          {/* 1. Precio Actual (Live Ticker con Ping) */}
          <div className={`p-2 rounded-xl transition-colors ${flashClass}`}>
            <span className="text-xs uppercase font-mono text-slate-400 flex items-center gap-1.5 mb-1 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping-fast absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Precio Actual
            </span>
            <div className="font-mono font-black text-base sm:text-lg text-white tabular-nums">
              {formatPrice(strategy.currentPrice)}
            </div>
            {strategy.priceChangePercent24h !== undefined && (
              <span className={`text-xs font-mono font-bold block mt-0.5 ${
                strategy.priceChangePercent24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {strategy.priceChangePercent24h >= 0 ? '+' : ''}{strategy.priceChangePercent24h.toFixed(2)}% (24h)
              </span>
            )}
          </div>

          {/* 2. Mini Sparkline Chart (Últimos 15 min con Recharts) */}
          <div className="p-1">
            <span className="text-xs uppercase font-mono text-slate-400 block mb-1 font-semibold">
              Tendencia (15m)
            </span>
            <MiniSparkline
              symbol={strategy.symbol}
              currentPrice={strategy.currentPrice}
              isAlert={isAlert}
            />
          </div>

          {/* 3. Precio Entrada Planificado & R:B Ratio */}
          <div>
            <span className="text-xs uppercase font-mono text-slate-400 block mb-1 font-semibold">
              Entrada
            </span>
            <div className="font-mono font-black text-base text-cyan-300 tabular-nums">
              {formatPrice(strategy.entryPrice)}
            </div>
            <div className="flex items-center justify-between text-xs font-mono mt-0.5">
              <span className="text-rose-400 font-semibold">
                SL: {formatPrice(strategy.stopLoss)}
              </span>
              <span className="text-cyan-400 font-bold ml-1.5" title="Ratio Riesgo/Beneficio Máximo">
                {rr.formattedRatio}
              </span>
            </div>
          </div>

          {/* 4. Distancia al Trigger (Radar Score) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase font-mono text-slate-400 font-semibold">
                Distancia
              </span>
              {/* Threshold Pill */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingThreshold(!isEditingThreshold);
                }}
                title="Haga clic para cambiar el umbral de alerta personalizado"
                className={`text-xs font-mono px-2 py-0.5 rounded-md font-bold transition-colors flex items-center gap-0.5 ${
                  strategy.customAlertThreshold !== undefined
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/80'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>&lt; {effectiveThreshold.toFixed(1)}%</span>
              </button>
            </div>

            <div className="flex items-center gap-2 relative">
              <span className={`font-mono font-black text-base tabular-nums px-2.5 py-0.5 rounded-lg ${
                isAlert
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm'
                  : distance <= 3.0
                  ? 'bg-slate-800 text-slate-200'
                  : 'text-slate-400'
              }`}>
                {distance.toFixed(2)}%
              </span>

              {/* Quick Threshold Popover */}
              {isEditingThreshold && onUpdateThreshold && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-8 z-50 bg-slate-950 border border-cyan-500/50 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs font-mono w-52"
                >
                  <div className="text-white font-bold mb-2 flex items-center justify-between">
                    <span>Umbral de Alerta</span>
                    <button
                      onClick={() => setIsEditingThreshold(false)}
                      className="text-slate-400 hover:text-white p-0.5"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[0.5, 1.0, 1.5, 2.0, 3.0, 5.0].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          onUpdateThreshold(strategy.id, val);
                          setIsEditingThreshold(false);
                        }}
                        className={`py-1.5 rounded-lg text-center font-bold ${
                          effectiveThreshold === val
                            ? 'bg-cyan-400 text-slate-950 font-black'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isAlert ? 'bg-cyan-400' : distance < 3 ? 'bg-blue-500' : 'bg-slate-600'
                }`}
                style={{ width: `${Math.min(100, Math.max(8, (1 - distance / 10) * 100))}%` }}
              />
            </div>
          </div>

        </div>

        {/* Right Section: TP Summary count & Accordion Toggle */}
        <div className="flex items-center justify-between lg:justify-end gap-3.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <span className="text-xs sm:text-sm font-mono font-bold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              {strategy.orders.length} TP{strategy.orders.length === 1 ? '' : 's'}
            </span>
            
            <button
              onClick={copyEntry}
              title="Copiar parámetros del trade con R:B"
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
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-cyan-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <span>{isExpanded ? 'Ocultar Matriz' : 'Matriz & Escala'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
