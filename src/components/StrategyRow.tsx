import React, { useState, useEffect, useRef } from 'react';
import { StrategyWithOrders } from '../types';
import { TakeProfitAccordion } from './TakeProfitAccordion';
import { MiniSparkline } from './MiniSparkline';
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
  Check
} from 'lucide-react';

interface StrategyRowProps {
  strategy: StrategyWithOrders;
  rankIndex: number;
  onUpdateThreshold?: (strategyId: number, threshold: number) => void;
  onOpenDcaSimulator?: (strategy: StrategyWithOrders) => void;
}

export const StrategyRow: React.FC<StrategyRowProps> = ({ 
  strategy, 
  rankIndex,
  onUpdateThreshold,
  onOpenDcaSimulator
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [flashClass, setFlashClass] = useState<string>('');
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);
  const prevPriceRef = useRef<number | undefined>(strategy.currentPrice);

  const effectiveThreshold = strategy.customAlertThreshold ?? 1.5;

  // Price Flash Effect
  useEffect(() => {
    if (strategy.currentPrice !== undefined && prevPriceRef.current !== undefined) {
      if (strategy.currentPrice > prevPriceRef.current) {
        setFlashClass('flash-up');
      } else if (strategy.currentPrice < prevPriceRef.current) {
        setFlashClass('flash-down');
      }
      const timer = setTimeout(() => setFlashClass(''), 800);
      prevPriceRef.current = strategy.currentPrice;
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = strategy.currentPrice;
  }, [strategy.currentPrice]);

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
    navigator.clipboard.writeText(`${strategy.symbol} ${strategy.type} @ $${strategy.entryPrice}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAlert = strategy.isAlertZone;
  const isLong = strategy.type === 'LONG';
  const distance = strategy.distancePercent !== undefined ? strategy.distancePercent : 999;
  const symbolClean = strategy.symbol.replace('USDT', '');

  return (
    <div className={`border-b transition-all ${
      isAlert
        ? 'bg-blue-950/40 hover:bg-blue-950/60 border-cyan-500/30'
        : 'bg-slate-900/30 hover:bg-slate-900/70 border-slate-800/60'
    }`}>
      {/* Main Row Grid */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3 sm:px-5 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer select-none"
      >
        
        {/* Left Section: Rank, Alert Icon, Symbol & Badges */}
        <div className="flex items-center gap-3.5 min-w-[280px]">
          
          {/* Radar Position / Rank */}
          <div className="flex items-center gap-1.5 w-9 shrink-0">
            {isAlert ? (
              <div className="relative flex items-center justify-center">
                <Target className="w-5 h-5 text-cyan-400 animate-pulse" />
                <span className="sr-only">Alerta activa</span>
              </div>
            ) : (
              <span className="text-xs font-mono font-bold text-slate-500 pl-1">
                #{rankIndex + 1}
              </span>
            )}
          </div>

          {/* Symbol & Name */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base font-mono text-white tracking-tight flex items-center gap-1">
                {symbolClean}
                <span className="text-xs text-slate-500 font-normal">/USDT</span>
              </span>

              {/* Direction Badge */}
              <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded font-mono ${
                isLong
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                  : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
              }`}>
                {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {strategy.type}
              </span>

              {/* Status Badge */}
              <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                strategy.status === 'Active'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  : strategy.status === 'Pending'
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                  : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
              }`}>
                {strategy.status}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>{strategy.coinName || symbolClean}</span>
              {strategy.category && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-[11px] text-slate-500 truncate max-w-[140px]">{strategy.category}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Middle Section: Live Price, 15m Sparkline, Planned Entry, Radar Distance */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 flex-1 max-w-2xl items-center">
          
          {/* 1. Precio Actual (Live Ticker con Ping) */}
          <div className={`p-1.5 rounded-lg transition-colors ${flashClass}`}>
            <span className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1 mb-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping-fast absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Actual (Live)
            </span>
            <div className="font-mono font-bold text-sm text-slate-100 tabular-nums">
              {formatPrice(strategy.currentPrice)}
            </div>
            {strategy.priceChangePercent24h !== undefined && (
              <span className={`text-[10px] font-mono block ${
                strategy.priceChangePercent24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {strategy.priceChangePercent24h >= 0 ? '+' : ''}{strategy.priceChangePercent24h.toFixed(2)}% (24h)
              </span>
            )}
          </div>

          {/* 2. Mini Sparkline Chart (Últimos 15 min con Recharts) */}
          <div className="p-1">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">
              Tendencia (15m)
            </span>
            <MiniSparkline
              symbol={strategy.symbol}
              currentPrice={strategy.currentPrice}
              isAlert={isAlert}
            />
          </div>

          {/* 3. Precio Entrada Planificado */}
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">
              Entrada
            </span>
            <div className="font-mono font-bold text-sm text-cyan-300 tabular-nums">
              {formatPrice(strategy.entryPrice)}
            </div>
            <span className="text-[10px] font-mono text-slate-500 block">
              SL: {formatPrice(strategy.stopLoss)}
            </span>
          </div>

          {/* 4. Distancia al Trigger (Radar Score) */}
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] uppercase font-mono text-slate-400">
                Distancia Radar
              </span>
              {/* Threshold Pill */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingThreshold(!isEditingThreshold);
                }}
                title="Haga clic para cambiar el umbral de alerta personalizado"
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold transition-colors flex items-center gap-0.5 ${
                  strategy.customAlertThreshold !== undefined
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/80'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>&lt; {effectiveThreshold.toFixed(1)}%</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 relative">
              <span className={`font-mono font-bold text-sm tabular-nums px-2 py-0.5 rounded ${
                isAlert
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-xs'
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
                  className="absolute right-0 top-7 z-50 bg-slate-900 border border-cyan-500/40 rounded-lg p-2 shadow-2xl backdrop-blur-md text-[10px] font-mono w-44"
                >
                  <div className="text-slate-300 font-bold mb-1.5 flex items-center justify-between">
                    <span>Umbral de Alerta</span>
                    <button
                      onClick={() => setIsEditingThreshold(false)}
                      className="text-slate-500 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[0.5, 1.0, 1.5, 2.0, 3.0, 5.0].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          onUpdateThreshold(strategy.id, val);
                          setIsEditingThreshold(false);
                        }}
                        className={`py-1 rounded text-center font-bold ${
                          effectiveThreshold === val
                            ? 'bg-cyan-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-full bg-slate-800/80 h-1 rounded-full mt-1.5 overflow-hidden">
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
        <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">
              {strategy.orders.length} TP{strategy.orders.length === 1 ? '' : 's'}
            </span>
            
            <button
              onClick={copyEntry}
              title="Copiar parámetros del trade"
              className="p-1.5 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <a
              href={`https://www.binance.com/es/trade/${symbolClean}_USDT`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Abrir en Binance"
              className="p-1.5 rounded text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-cyan-300 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/70 rounded-lg transition-colors shadow-xs"
          >
            <span>{isExpanded ? 'Ocultar Matriz' : 'Matriz & Escala'}</span>
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
