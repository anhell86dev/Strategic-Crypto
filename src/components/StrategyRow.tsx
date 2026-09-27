import React, { useState, useEffect, useRef } from 'react';
import { StrategyWithOrders } from '../types';
import { TakeProfitAccordion } from './TakeProfitAccordion';
import { HorizontalPriceTrack } from './HorizontalPriceTrack';
import { StrategyAnalysisModal } from './StrategyAnalysisModal';
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
  Scale,
  Clock,
  SearchCode
} from 'lucide-react';

export const formatStrategyPublicationDate = (rawDate?: string, stratName?: string): string => {
  if (!rawDate && !stratName) return '';
  const str = rawDate || '';

  const monthMap: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };

  const dateMatch = str.match(/([A-Z]{3})\s+(\d{1,2})\s+(\d{4})/i);
  const timeMatches = [...str.matchAll(/(\d{2}):(\d{2})(?::\d{2})?/g)];

  let formattedTime = '';
  if (timeMatches.length >= 2) {
    formattedTime = `${timeMatches[1][1]}:${timeMatches[1][2]}`;
  } else if (timeMatches.length === 1) {
    formattedTime = `${timeMatches[0][1]}:${timeMatches[0][2]}`;
  }

  if (dateMatch && formattedTime) {
    const month = monthMap[dateMatch[1]] || dateMatch[1];
    const day = dateMatch[2].padStart(2, '0');
    const year = dateMatch[3];
    return `${day}/${month}/${year} · ${formattedTime} (GMT-6)`;
  }

  // Fallback pattern matching in strategyName (e.g. AAVE_PULLBACK_26-09-26_06:39)
  const nameMatch = (stratName || '').match(/_(\d{2})[-/.](\d{2})[-/.](\d{2,4})_(\d{2}:\d{2})/);
  if (nameMatch) {
    const [, d, m, y, t] = nameMatch;
    const fullYear = y.length === 2 ? `20${y}` : y;
    return `${d}/${m}/${fullYear} · ${t} (GMT-6)`;
  }

  if (str.length > 0 && str.length < 35) {
    return str;
  }

  return str.slice(0, 24);
};

export const getStrategyTimeDifference = (rawDate?: string, stratName?: string): string => {
  if (!rawDate && !stratName) return '';
  const str = rawDate || '';

  const monthMap: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };

  let targetDate: Date | null = null;
  const dateMatch = str.match(/([A-Z]{3})\s+(\d{1,2})\s+(\d{4})/i);
  const timeMatches = [...str.matchAll(/(\d{2}):(\d{2})(?::\d{2})?/g)];

  let formattedTime = '';
  if (timeMatches.length >= 2) {
    formattedTime = `${timeMatches[1][1]}:${timeMatches[1][2]}`;
  } else if (timeMatches.length === 1) {
    formattedTime = `${timeMatches[0][1]}:${timeMatches[0][2]}`;
  }

  if (dateMatch && formattedTime) {
    const month = monthMap[dateMatch[1]] || dateMatch[1];
    const day = dateMatch[2].padStart(2, '0');
    const year = dateMatch[3];
    targetDate = new Date(`${year}-${month}-${day}T${formattedTime}:00-06:00`);
  }

  if (!targetDate || isNaN(targetDate.getTime())) {
    const nameMatch = (stratName || '').match(/_(\d{2})[-/.](\d{2})[-/.](\d{2,4})_(\d{2}:\d{2})/);
    if (nameMatch) {
      const [, d, m, y, t] = nameMatch;
      const fullYear = y.length === 2 ? `20${y}` : y;
      targetDate = new Date(`${fullYear}-${m}-${d}T${t}:00-06:00`);
    }
  }

  if (!targetDate || isNaN(targetDate.getTime())) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) targetDate = parsed;
  }

  if (!targetDate || isNaN(targetDate.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - targetDate.getTime();
  const totalMinutes = Math.floor(Math.abs(diffMs) / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  const prefix = diffMs >= 0 ? 'Hace ' : 'En ';

  if (days > 0) {
    return `${prefix}${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${prefix}${hours}h ${minutes}m`;
  }
  return `${prefix}${minutes}m`;
};

interface StrategyRowProps {
  strategy: StrategyWithOrders;
  rankIndex: number;
  onUpdateThreshold?: (strategyId: number, threshold: number) => void;
  onOpenDcaSimulator?: (strategy: StrategyWithOrders) => void;
  isSelected?: boolean;
  onToggleSelect?: (strategyId: number) => void;
  onStatusUpdated?: (strategyId: number, newStatus: string) => void;
}

export const StrategyRow: React.FC<StrategyRowProps> = ({ 
  strategy, 
  rankIndex,
  onUpdateThreshold,
  onOpenDcaSimulator,
  isSelected = false,
  onToggleSelect,
  onStatusUpdated
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
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
        ? 'bg-cyan-950/40 hover:bg-cyan-950/60 border-cyan-400/80 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-500/50'
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

          {/* 1. Bloque de Identificación: PAR arriba, Nombre de Estrategia + Riesgo Beneficio abajo, y Fecha + Tiempo Transcurrido */}
          <div className="w-64 sm:w-80 shrink-0">
            {/* PAR arriba con TIPO (LONG / SHORT) */}
            <div className="flex items-center flex-wrap gap-2">
              <span className="font-extrabold text-base sm:text-lg text-white font-mono tracking-tight">
                {symbolClean}/USDT
              </span>

              {/* TIPO (LONG / SHORT) como etiqueta al lado del Par */}
              <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-md font-mono tracking-wider ${
                isLong
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/80 shadow-xs'
                  : 'bg-rose-950 text-rose-300 border border-rose-700/80 shadow-xs'
              }`}>
                {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {strategy.type}
              </span>
            </div>

            {/* Nombre de Estrategia abajo del Par + Etiqueta de Riesgo Beneficio al lado */}
            <div className="mt-1.5 flex items-center flex-wrap gap-1.5">
              <div 
                className="font-bold text-xs sm:text-sm font-mono text-cyan-300 tracking-tight truncate max-w-[200px] sm:max-w-[230px]" 
                title={displayStrategyName}
              >
                {displayStrategyName}
              </div>

              {/* Riesgo Beneficio como etiqueta a la par de la estrategia */}
              <span 
                title={`Riesgo: -${rr.slDistancePct.toFixed(1)}% | Recompensa Máx: +${rr.maxRewardPct.toFixed(1)}%`}
                className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md font-mono border ${
                  rr.maxRiskReward >= 3.0
                    ? 'bg-purple-950 text-purple-300 border-purple-600/80'
                    : rr.maxRiskReward >= 2.0
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-600/80'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-700/80'
                }`}
              >
                <Scale className="w-3 h-3 text-cyan-400" />
                <span>R:B {rr.formattedRatio}</span>
              </span>
            </div>

            {/* Fecha y Hora de Publicación (Columna B) */}
            {strategy.date && (
              <div 
                className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-slate-400 truncate"
                title={`Fecha / Hora de Registro (Columna B): ${strategy.date}`}
              >
                <Clock className="w-3 h-3 text-cyan-400/80 shrink-0" />
                <span className="text-slate-300 font-medium">
                  {formatStrategyPublicationDate(strategy.date, strategy.strategyName)}
                </span>
              </div>
            )}

            {/* Diferencia en horas/tiempo desde la publicación hasta la fecha actual abajo de la fecha */}
            {strategy.date && (
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-mono text-amber-400/90 pl-4.5">
                <span className="text-slate-500">•</span>
                <span className="font-bold bg-amber-950/50 px-1.5 py-0.2 rounded border border-amber-900/60">
                  {getStrategyTimeDifference(strategy.date, strategy.strategyName)}
                </span>
              </div>
            )}
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
            <span>{isExpanded ? 'Ocultar' : 'Escala & Matriz'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Botón Analizar al final de la columna Acciones */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsAnalysisOpen(true);
            }}
            title="Analizar según hora de publicación vs tiempo actual y verificar toques en SL, E1-E3 y TP"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 rounded-xl transition-all shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer shrink-0"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Analizar</span>
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

      {/* Modal Emergente de Análisis */}
      {isAnalysisOpen && (
        <StrategyAnalysisModal
          strategy={strategy}
          isOpen={isAnalysisOpen}
          onClose={() => setIsAnalysisOpen(false)}
          onStatusUpdated={onStatusUpdated}
        />
      )}
    </div>
  );
};
