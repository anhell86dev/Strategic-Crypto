import React, { useState, useMemo } from 'react';
import { StrategyWithOrders, DcaLevel } from '../types';
import { 
  GitBranch, 
  TrendingUp, 
  ShieldAlert, 
  Layers, 
  Target, 
  Lock, 
  AlertOctagon, 
  CheckCircle2, 
  Calculator, 
  Activity, 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight,
  Shield,
  RotateCcw,
  Sliders,
  DollarSign
} from 'lucide-react';

interface MultiPathMatrixProps {
  strategy: StrategyWithOrders;
  onOpenDcaSimulator?: (strategy: StrategyWithOrders) => void;
}

export const MultiPathMatrix: React.FC<MultiPathMatrixProps> = ({
  strategy,
  onOpenDcaSimulator
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PROFIT' | 'DCA' | 'PROTECTION'>('ALL');

  const {
    symbol,
    coinName,
    type,
    entryPrice,
    stopLoss,
    currentPrice,
    orders = [],
    leverage = 5,
    initialAllocation = 50,
    dcaLevels
  } = strategy;

  const isLong = type === 'LONG';
  const live = currentPrice || entryPrice;

  // Format currency
  const formatPrice = (val?: number) => {
    if (val === undefined || isNaN(val) || val <= 0) return '$0.00';
    if (val >= 1000) return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (val >= 1) return `$${val.toFixed(4)}`;
    if (val >= 0.01) return `$${val.toFixed(5)}`;
    return `$${val.toFixed(7)}`;
  };

  // Build / derive DCA support levels if not directly configured
  const effectiveDcaLevels: DcaLevel[] = useMemo(() => {
    if (dcaLevels && dcaLevels.length > 0) return dcaLevels;
    if (isLong) {
      const step1 = entryPrice - (entryPrice - stopLoss) * 0.45;
      const step2 = entryPrice - (entryPrice - stopLoss) * 0.75;
      return [
        { level: 'E2 DCA', price: Math.max(0, step1), allocationPercent: 30, label: 'Soporte 1' },
        { level: 'E3 Carga', price: Math.max(0, step2), allocationPercent: 20, label: 'Piso Extremo' }
      ];
    } else {
      const step1 = entryPrice + (stopLoss - entryPrice) * 0.45;
      const step2 = entryPrice + (stopLoss - entryPrice) * 0.75;
      return [
        { level: 'E2 DCA', price: step1, allocationPercent: 30, label: 'Resistencia 1' },
        { level: 'E3 Carga', price: step2, allocationPercent: 20, label: 'Techo Extremo' }
      ];
    }
  }, [dcaLevels, entryPrice, stopLoss, isLong]);

  // Derived TP orders with labels
  const tp1 = orders[0] || { type: 'TP1', targetPrice: isLong ? entryPrice * 1.03 : entryPrice * 0.97, closePercentage: 50 };
  const tp2 = orders[1] || { type: 'TP2', targetPrice: isLong ? entryPrice * 1.06 : entryPrice * 0.94, closePercentage: 30 };
  const tp3 = orders[2] || { type: 'TP3', targetPrice: isLong ? entryPrice * 1.10 : entryPrice * 0.90, closePercentage: 20 };

  // Calculate distances
  const distToTp1 = tp1.targetPrice > 0 ? Math.abs(((live - tp1.targetPrice) / live) * 100) : 0;
  const distToDca1 = effectiveDcaLevels[0] ? Math.abs(((live - effectiveDcaLevels[0].price) / live) * 100) : 0;
  const distToSl = stopLoss > 0 ? Math.abs(((live - stopLoss) / live) * 100) : 0;

  // Status checks
  const isSlHit = isLong ? live <= stopLoss : live >= stopLoss;
  const isTp1Hit = isLong ? live >= tp1.targetPrice : live <= tp1.targetPrice;
  const isDcaZone = isLong 
    ? live < entryPrice && live > stopLoss 
    : live > entryPrice && live < stopLoss;

  return (
    <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 sm:p-6 text-slate-100 shadow-2xl overflow-hidden font-sans select-none">
      
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        
        {/* Title, Symbol & Live Price */}
        <div className="flex items-center flex-wrap gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <GitBranch className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center flex-wrap gap-2">
              <h3 className="font-extrabold text-base tracking-wider uppercase text-white font-mono flex items-center gap-1.5">
                MATRIZ MULTICAMINO DEL TRADE
              </h3>
              <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-slate-900 border border-slate-700 text-cyan-300">
                {symbol} · {type} {isLong ? '↗' : '↘'} · {leverage}x
              </span>
            </div>
            
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                Precio Live: {formatPrice(live)}
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Diagrama de topología de decisiones: Nodos interconectados de ejecución, cancelaciones y salidas tácticas.
              </span>
            </div>
          </div>
        </div>

        {/* Filter Navigation Tabs & DCA Simulator Button */}
        <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeFilter === 'ALL'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Todos los Caminos
          </button>

          <button
            onClick={() => setActiveFilter('PROFIT')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
              activeFilter === 'PROFIT'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 text-emerald-400 hover:bg-emerald-950/50 border border-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Ruta Ganancia</span>
          </button>

          <button
            onClick={() => setActiveFilter('DCA')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
              activeFilter === 'DCA'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-amber-400 hover:bg-amber-950/50 border border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Ruta DCA</span>
          </button>

          <button
            onClick={() => setActiveFilter('PROTECTION')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
              activeFilter === 'PROTECTION'
                ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20'
                : 'bg-slate-900 text-rose-400 hover:bg-rose-950/50 border border-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Ruta Protección</span>
          </button>

          {onOpenDcaSimulator && (
            <button
              onClick={() => onOpenDcaSimulator(strategy)}
              className="px-3 py-1.5 rounded-lg font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1 shadow-sm transition-all active:scale-95"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Simulador DCA</span>
            </button>
          )}
        </div>

      </div>

      {/* Dynamic Rule Alert Banner */}
      <div className={`my-4 p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-mono transition-all ${
        isSlHit
          ? 'bg-rose-950/50 border-rose-500/60 text-rose-200'
          : isTp1Hit
          ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200'
          : isDcaZone
          ? 'bg-amber-950/50 border-amber-500/60 text-amber-200'
          : 'bg-slate-900/80 border-slate-800 text-slate-300'
      }`}>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="text-white">Regla Activa:</strong>{' '}
            {isSlHit
              ? 'Disciplina #8: Nivel de invalidación alcanzado. Respetar salida estricta sin promediar pérdidas.'
              : isTp1Hit
              ? 'Disciplina #3: TP1 impactado exitosamente. Activar Gatillo de BE para blindar el capital libre de riesgo.'
              : isDcaZone
              ? 'Disciplina #5: Retroceso táctico hacia soportes DCA. Verificar confirmación de rebote antes de promediar.'
              : 'Disciplina #1: Monitoreo continuo de liquidez. Esperar confirmación de trigger de entrada sin forzar órdenes.'}
          </span>
        </div>

        <div className={`px-2.5 py-1 rounded text-[11px] font-bold shrink-0 flex items-center gap-1 border ${
          isSlHit
            ? 'bg-rose-900 text-rose-200 border-rose-700'
            : isTp1Hit
            ? 'bg-emerald-900 text-emerald-200 border-emerald-700'
            : isDcaZone
            ? 'bg-amber-900 text-amber-200 border-amber-700'
            : 'bg-slate-800 text-slate-300 border-slate-700'
        }`}>
          {isSlHit ? <AlertOctagon className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
          <span>
            {isSlHit ? 'Ruta SL Tocada' : isTp1Hit ? 'Objetivo TP1 Activo' : isDcaZone ? 'Zona DCA Próxima' : 'Ruta Normal'}
          </span>
        </div>
      </div>

      {/* Matrix Topological Decision Tree Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch relative">
        
        {/* Left Column: NODO RAÍZ (E1 Entrada Inicial) */}
        <div className="lg:col-span-3 flex flex-col justify-center">
          <div className="border-2 border-cyan-500/80 bg-slate-900/90 rounded-2xl p-4 shadow-xl shadow-cyan-500/10 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold font-mono tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                NODO RAÍZ
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-semibold mb-1">
              <Target className="w-3.5 h-3.5" />
              <span>[E1] Entrada Inicial</span>
            </div>

            <div className="text-xl font-bold font-mono text-white tracking-tight">
              {formatPrice(entryPrice)}
            </div>
            
            <div className="text-[11px] font-mono text-slate-400 mt-1">
              Asignación: <strong className="text-slate-200">{initialAllocation}% cupo</strong>
            </div>

            {/* Live Indicator */}
            <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Live:</span>
              <span className="font-bold text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {formatPrice(live)}
              </span>
            </div>
          </div>
        </div>

        {/* Middle/Right Column: 3 Scenario Paths */}
        <div className="lg:col-span-9 space-y-3.5 flex flex-col justify-between">
          
          {/* 1. ESCENARIO A: Trayectoria Favorable a Objetivos (TP) */}
          {(activeFilter === 'ALL' || activeFilter === 'PROFIT') && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 transition-all hover:border-emerald-500/60">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 font-mono">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>ESCENARIO A: Trayectoria Favorable a Objetivos (TP)</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  A <strong className="text-emerald-300">{distToTp1.toFixed(2)}%</strong> de TP1
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                {/* TP1 */}
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-emerald-400">[TP1]</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">{tp1.closePercentage}%</span>
                  </div>
                  <div className="font-bold text-white text-sm">{formatPrice(tp1.targetPrice)}</div>
                  <span className="text-[10px] text-emerald-400 block mt-0.5">Gatillo de BE</span>
                </div>

                {/* TP2 */}
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-emerald-400">[TP2]</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">{tp2.closePercentage}%</span>
                  </div>
                  <div className="font-bold text-white text-sm">{formatPrice(tp2.targetPrice)}</div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Trailing</span>
                </div>

                {/* TP3 */}
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-emerald-400">[TP3]</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">{tp3.closePercentage}%</span>
                  </div>
                  <div className="font-bold text-white text-sm">{formatPrice(tp3.targetPrice)}</div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Target Max</span>
                </div>

                {/* Salida Ganancia */}
                <div className="bg-emerald-950/70 border border-emerald-500/40 p-2.5 rounded-lg flex flex-col justify-between">
                  <div className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>SALIDA GANANCIA</span>
                  </div>
                  <div className="font-bold text-white text-xs mt-1">Cierre 100%</div>
                  <span className="text-[10px] text-emerald-300">R:B Máximo</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. ESCENARIO B: Retroceso Táctico a Soportes DCA */}
          {(activeFilter === 'ALL' || activeFilter === 'DCA') && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 transition-all hover:border-amber-500/60">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 font-mono">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>ESCENARIO B: Retroceso Táctico a Soportes DCA</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  A <strong className="text-amber-300">{distToDca1.toFixed(2)}%</strong> de soporte
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                {/* E2 DCA */}
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-amber-400">[E2 DCA]</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {effectiveDcaLevels[0]?.allocationPercent || 30}%
                    </span>
                  </div>
                  <div className="font-bold text-white text-sm">{formatPrice(effectiveDcaLevels[0]?.price)}</div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {effectiveDcaLevels[0]?.label || 'Soporte 1'}
                  </span>
                </div>

                {/* E3 Carga */}
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-amber-400">[E3 Carga]</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {effectiveDcaLevels[1]?.allocationPercent || 20}%
                    </span>
                  </div>
                  <div className="font-bold text-white text-sm">{formatPrice(effectiveDcaLevels[1]?.price)}</div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {effectiveDcaLevels[1]?.label || 'Piso Extremo'}
                  </span>
                </div>

                {/* Filler Card */}
                <div className="hidden sm:block bg-slate-900/40 border border-slate-800/60 p-2.5 rounded-lg">
                  <div className="text-[10px] text-slate-500">Gestión de Riesgo</div>
                  <div className="text-[11px] text-slate-300 font-semibold mt-1">Recálculo BE</div>
                  <span className="text-[10px] text-slate-500">Límite 3 Entradas</span>
                </div>

                {/* Salida Rebote */}
                <div className="bg-amber-950/70 border border-amber-500/40 p-2.5 rounded-lg flex flex-col justify-between">
                  <div className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>SALIDA REBOTE</span>
                  </div>
                  <div className="font-bold text-white text-xs mt-1">Nuevo BE</div>
                  <span className="text-[10px] text-amber-300">Defensa de Costo</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. ESCENARIO C: Invalidación Estricta & Blindaje de Capital */}
          {(activeFilter === 'ALL' || activeFilter === 'PROTECTION') && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3.5 transition-all hover:border-rose-500/60">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 font-mono">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>ESCENARIO C: Invalidación Estricta & Blindaje de Capital</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  A <strong className="text-rose-300">{distToSl.toFixed(2)}%</strong> del SL
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                {/* BE */}
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-cyan-400">[BE]</span>
                    <Lock className="w-3 h-3 text-cyan-400" />
                  </div>
                  <div className="font-bold text-white text-sm">{formatPrice(entryPrice)}</div>
                  <span className="text-[10px] text-cyan-400 block mt-0.5">Tras TP1</span>
                </div>

                {/* SL Global */}
                <div className="bg-slate-900/90 border border-rose-950 p-2.5 rounded-lg">
                  <div className="flex items-center justify-between text-[10px] text-rose-400 mb-1">
                    <span className="font-bold">[SL Global]</span>
                    <AlertOctagon className="w-3 h-3 text-rose-400" />
                  </div>
                  <div className="font-bold text-rose-300 text-sm">{formatPrice(stopLoss)}</div>
                  <span className="text-[10px] text-rose-400 block mt-0.5">
                    {isSlHit ? 'Impactado' : 'Activo'}
                  </span>
                </div>

                {/* Buffer Card */}
                <div className="hidden sm:block bg-slate-900/40 border border-slate-800/60 p-2.5 rounded-lg">
                  <div className="text-[10px] text-slate-500">Pérdida Máxima</div>
                  <div className="text-[11px] text-rose-400 font-bold mt-1">
                    -{Math.abs(((entryPrice - stopLoss) / entryPrice) * 100 * leverage).toFixed(1)}% ROI
                  </div>
                  <span className="text-[10px] text-slate-500">Apalancamiento {leverage}x</span>
                </div>

                {/* Salida Control */}
                <div className="bg-rose-950/70 border border-rose-500/40 p-2.5 rounded-lg flex flex-col justify-between">
                  <div className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>SALIDA CONTROL</span>
                  </div>
                  <div className="font-bold text-white text-xs mt-1">SL Limitado</div>
                  <span className="text-[10px] text-rose-300">Capital a Salvo</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
