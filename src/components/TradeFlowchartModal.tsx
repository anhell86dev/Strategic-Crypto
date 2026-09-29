import React, { useState } from 'react';
import { 
  X, 
  GitBranch, 
  ArrowRight, 
  ArrowDownRight, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Target, 
  Layers, 
  Sparkles,
  Info
} from 'lucide-react';
import { Strategy } from '../types';

interface TradeFlowchartModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy?: Strategy | null;
}

export const TradeFlowchartModal: React.FC<TradeFlowchartModalProps> = ({
  isOpen,
  onClose,
  strategy
}) => {
  const [selectedPath, setSelectedPath] = useState<'ALL' | 'DIRECT_WIN' | 'DCA_REBOUND' | 'RISK_STOP'>('ALL');

  if (!isOpen) return null;

  // Extract strategy data or use fallback reference
  const symbol = strategy?.symbol || 'ACTIVO/USDT';
  const isLong = strategy ? strategy.type === 'LONG' : true;
  const entryPrice = strategy?.entryPrice || 0.3146;
  const e2Price = strategy?.e2Price || (isLong ? entryPrice * 0.957 : entryPrice * 1.043);
  const e3Price = strategy?.e3Price || (isLong ? entryPrice * 0.895 : entryPrice * 1.105);
  const stopLoss = strategy?.stopLoss || (isLong ? entryPrice * 0.938 : entryPrice * 1.062);
  
  const ordersList: any[] = (strategy as any)?.orders || [];
  const tp1 = ordersList.find((o: any) => o.type === 'TP1')?.targetPrice || (isLong ? entryPrice * 1.04 : entryPrice * 0.96);
  const tp2 = ordersList.find((o: any) => o.type === 'TP2')?.targetPrice || (isLong ? entryPrice * 1.08 : entryPrice * 0.92);
  const tp3 = ordersList.find((o: any) => o.type === 'TP3')?.targetPrice || (isLong ? entryPrice * 1.14 : entryPrice * 0.86);

  const formatP = (p: number) => {
    if (p >= 100) return `$${p.toFixed(2)}`;
    if (p >= 1) return `$${p.toFixed(4)}`;
    return `$${p.toFixed(6)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div 
        className="relative w-full max-w-5xl bg-slate-900 border-2 border-cyan-500/50 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/70 border-b border-cyan-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shadow-inner">
              <GitBranch className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white font-mono tracking-wide">
                  Flujograma Visual de Ejecución Táctica
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-400/50 text-cyan-300 font-mono text-[10px] font-bold">
                  {symbol} ({isLong ? 'LONG' : 'SHORT'})
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Árbol de decisión multiescenario: Ramificación de precio desde la entrada inicial hasta la salida
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Path Filter Tabs */}
        <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono shrink-0">
            Filtrar Camino:
          </span>
          <button
            type="button"
            onClick={() => setSelectedPath('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
              selectedPath === 'ALL'
                ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/30 font-black'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-cyan-500/50'
            }`}
          >
            🗺️ Todos los Caminos
          </button>

          <button
            type="button"
            onClick={() => setSelectedPath('DIRECT_WIN')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
              selectedPath === 'DIRECT_WIN'
                ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md shadow-emerald-500/30 font-black'
                : 'bg-slate-900 text-emerald-400 border-emerald-900/60 hover:border-emerald-500/50'
            }`}
          >
            🟢 Camino 1: Impulso Directo (TP1 ➔ BE ➔ TP3)
          </button>

          <button
            type="button"
            onClick={() => setSelectedPath('DCA_REBOUND')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
              selectedPath === 'DCA_REBOUND'
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30 font-black'
                : 'bg-slate-900 text-amber-400 border-amber-900/60 hover:border-amber-500/50'
            }`}
          >
            🟡 Camino 2: Retroceso DCA (E2/E3 ➔ Rebote)
          </button>

          <button
            type="button"
            onClick={() => setSelectedPath('RISK_STOP')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
              selectedPath === 'RISK_STOP'
                ? 'bg-rose-500 text-white border-rose-300 shadow-md shadow-rose-500/30 font-black'
                : 'bg-slate-900 text-rose-400 border-rose-900/60 hover:border-rose-500/50'
            }`}
          >
            🔴 Camino 3: Invalidez Estructural (SL)
          </button>
        </div>

        {/* Flujograma Canvas Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-950/40">
          
          {/* NODO PRINCIPAL: ENTRADA INICIAL E1 */}
          <div className="flex flex-col items-center">
            <div className="relative p-4 rounded-2xl bg-gradient-to-b from-cyan-900/80 to-slate-900 border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.4)] text-center max-w-sm w-full font-mono">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-md">
                Punto de Inicio • Paso #1
              </div>
              <div className="flex items-center justify-center gap-2 mt-1">
                <Target className="w-5 h-5 text-cyan-300" />
                <span className="text-base font-black text-white">ENTRADA E1 (50% Capital)</span>
              </div>
              <div className="text-lg font-black text-cyan-300 mt-1">
                {formatP(entryPrice)}
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                Apertura inicial en zona de confirmación con 50% de asignación aislada.
              </p>
            </div>

            {/* Conector Central SVG */}
            <div className="h-8 w-0.5 bg-gradient-to-b from-cyan-400 to-slate-600 my-1" />
            <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold text-slate-300 flex items-center gap-1.5 shadow-sm">
              <span>¿Cómo reacciona el precio tras la entrada?</span>
            </div>
            <div className="h-6 w-0.5 bg-gradient-to-b from-slate-600 to-slate-700 my-1" />
          </div>

          {/* RAMIFICACIÓN PRINCIPAL (3 GRANDES CAMINOS) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* =============================================================== */}
            {/* CAMINO 1: IMPULSO ALCISTA DIRECTO A TPS (VERDE) */}
            {/* =============================================================== */}
            <div className={`flex flex-col rounded-2xl border-2 transition-all p-4 space-y-4 ${
              selectedPath === 'ALL' || selectedPath === 'DIRECT_WIN'
                ? 'bg-slate-900/90 border-emerald-500/70 shadow-[0_0_30px_rgba(16,185,129,0.15)] opacity-100 ring-1 ring-emerald-400/40'
                : 'bg-slate-950/40 border-slate-800 opacity-30 grayscale'
            }`}>
              <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-black font-mono text-emerald-300 uppercase">
                    Camino 1: Impulso Directo
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                  Alta Probabilidad
                </span>
              </div>

              {/* Paso 1.1: Alcanza TP1 */}
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 font-mono space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Paso #2: TP1 Tocado
                  </span>
                  <span className="font-black text-white">{formatP(tp1)}</span>
                </div>
                <p className="text-[10px] text-slate-300">
                  • Cierre del <strong className="text-emerald-300">50% de la posición</strong> para asegurar ganancia parcial inmediata.
                </p>
              </div>

              <div className="flex justify-center -my-2 text-emerald-400">
                <ArrowDownRight className="w-5 h-5 animate-bounce" />
              </div>

              {/* Paso 1.2: Regla Táctica Obligatoria - Mover a BE */}
              <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-400 font-mono space-y-1 shadow-md">
                <div className="flex items-center gap-1.5 text-xs font-black text-cyan-300">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>REGLA TÁCTICA: Mover SL a Breakeven</span>
                </div>
                <p className="text-[10px] text-cyan-100">
                  El Stop Loss sube a <strong className="text-white">{formatP(entryPrice)}</strong>. El trade queda 100% libre de riesgo (Riesgo Cero).
                </p>
              </div>

              <div className="flex justify-center -my-2 text-emerald-400">
                <ArrowDownRight className="w-5 h-5" />
              </div>

              {/* Paso 1.3: Expansión a TP2 y TP3 */}
              <div className="p-3 rounded-xl bg-gradient-to-b from-emerald-950/60 to-slate-900 border border-emerald-400/60 font-mono space-y-2">
                <div className="text-xs font-black text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Paso #3 & #4: Objetivos Mayores</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-slate-200">
                  <span>TP2 (30%): {formatP(tp2)}</span>
                  <span className="text-emerald-400">✓ Asegurado</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-slate-200">
                  <span>TP3 (20%): {formatP(tp3)}</span>
                  <span className="text-emerald-400">✓ Target Final</span>
                </div>
                <div className="text-[10px] text-emerald-200 font-extrabold bg-emerald-900/40 p-1.5 rounded border border-emerald-500/40 text-center">
                  🏆 GANANCIA MÁXIMA ALCANZADA (100% Éxito)
                </div>
              </div>
            </div>

            {/* =============================================================== */}
            {/* CAMINO 2: RETROCESO Y DCA CONTROLADO (AMARILLO) */}
            {/* =============================================================== */}
            <div className={`flex flex-col rounded-2xl border-2 transition-all p-4 space-y-4 ${
              selectedPath === 'ALL' || selectedPath === 'DCA_REBOUND'
                ? 'bg-slate-900/90 border-amber-500/70 shadow-[0_0_30px_rgba(245,158,11,0.15)] opacity-100 ring-1 ring-amber-400/40'
                : 'bg-slate-950/40 border-slate-800 opacity-30 grayscale'
            }`}>
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-black font-mono text-amber-300 uppercase">
                    Camino 2: Retroceso DCA
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40">
                  Gestión Inteligente
                </span>
              </div>

              {/* Paso 2.1: Activa Refuerzo E2 */}
              <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/40 font-mono space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-sky-300">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                    Paso #2: Activa E2 (30%)
                  </span>
                  <span className="font-black text-white">{formatP(e2Price)}</span>
                </div>
                <p className="text-[10px] text-slate-300">
                  • Precio promedio recalculado a la baja ({formatP((entryPrice * 0.5 + e2Price * 0.3) / 0.8)}).
                </p>
              </div>

              <div className="flex justify-center -my-2 text-amber-400">
                <ArrowDownRight className="w-5 h-5" />
              </div>

              {/* Paso 2.2: ¿Rebote en E2 o Soporte E3? */}
              <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/50 font-mono space-y-1.5">
                <div className="text-xs font-black text-amber-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Paso #3: Soporte E3 (20%)</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-white">
                  <span>Precio E3:</span>
                  <span className="text-amber-300">{formatP(e3Price)}</span>
                </div>
                <p className="text-[10px] text-amber-200">
                  • 100% de la posición asignada. Precio promedio óptimo muy cerca del fondo.
                </p>
              </div>

              <div className="flex justify-center -my-2 text-emerald-400">
                <ArrowDownRight className="w-5 h-5" />
              </div>

              {/* Paso 2.3: Rebote desde Soporte hacia TP1 */}
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 font-mono space-y-1.5 text-center">
                <div className="text-xs font-black text-emerald-300 flex items-center justify-center gap-1">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Rebote Alcista hacia TP1</span>
                </div>
                <p className="text-[10px] text-slate-200">
                  Al rebotar, el precio supera el nuevo promedio ponderado. Se toma beneficio en TP1 y se mueve SL a Breakeven.
                </p>
                <div className="text-[10px] text-emerald-300 font-bold bg-emerald-900/40 p-1 rounded border border-emerald-500/30">
                  ✨ DCA COMPLETADO CON ALTO RETORNO
                </div>
              </div>
            </div>

            {/* =============================================================== */}
            {/* CAMINO 3: INVALIDACIÓN Y STOP LOSS (ROJO) */}
            {/* =============================================================== */}
            <div className={`flex flex-col rounded-2xl border-2 transition-all p-4 space-y-4 ${
              selectedPath === 'ALL' || selectedPath === 'RISK_STOP'
                ? 'bg-slate-900/90 border-rose-500/70 shadow-[0_0_30px_rgba(244,63,94,0.15)] opacity-100 ring-1 ring-rose-400/40'
                : 'bg-slate-950/40 border-slate-800 opacity-30 grayscale'
            }`}>
              <div className="flex items-center justify-between border-b border-rose-500/30 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-xs font-black font-mono text-rose-300 uppercase">
                    Camino 3: Invalidez Estructural
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40">
                  Protección de Capital
                </span>
              </div>

              {/* Paso 3.1: Quiebre de Soportes */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-900/60 font-mono space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-rose-300">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                    Paso #2: Quiebre de Soporte
                  </span>
                </div>
                <p className="text-[10px] text-slate-300">
                  El precio perfora los niveles de entrada sin mostrar volumen comprador institucional.
                </p>
              </div>

              <div className="flex justify-center -my-2 text-rose-400">
                <ArrowDownRight className="w-5 h-5" />
              </div>

              {/* Paso 3.2: Ejecución Inflexible del SL */}
              <div className="p-3 rounded-xl bg-rose-950/60 border-2 border-rose-500 font-mono space-y-2 shadow-lg">
                <div className="flex items-center justify-between text-xs font-black text-white">
                  <span className="flex items-center gap-1.5 text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Paso #3: Stop Loss Global
                  </span>
                  <span className="text-white bg-rose-600 px-2 py-0.5 rounded font-mono">
                    {formatP(stopLoss)}
                  </span>
                </div>
                <p className="text-[10px] text-rose-100">
                  • <strong>Cierre total automático</strong> de la posición.
                  <br />
                  • <strong>Pérdida estrictamente limitada</strong> al 2% - 5% del capital total.
                </p>
              </div>

              <div className="flex justify-center -my-2 text-rose-400">
                <ArrowDownRight className="w-5 h-5" />
              </div>

              {/* Paso 3.3: Disciplina de Hierro */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono space-y-1 text-center">
                <div className="text-xs font-black text-amber-300 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Disciplina del Trade</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  🚫 Prohibido promediar por debajo de SL. Se preserva el 95%+ del balance para la siguiente oportunidad de alta probabilidad.
                </p>
              </div>
            </div>

          </div>

          {/* Banner Inferior: Reglas de Oro Tácticas */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/40 flex items-center gap-3 font-mono text-xs">
            <Info className="w-5 h-5 text-cyan-400 shrink-0" />
            <div className="text-slate-300 text-[11px] leading-relaxed">
              <strong className="text-cyan-300">Regla Mestra de Ejecución:</strong> Al alcanzar y asegurar el <strong className="text-emerald-300">TP1</strong>, mover el Stop Loss a <strong className="text-cyan-300">Breakeven (BE)</strong> de manera inmediata. Nunca permitir que un trade ganador se convierta en perdedor.
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800 font-mono text-xs text-slate-400">
          <span>Estrategia: <strong className="text-slate-200">{strategy?.strategyName || 'Estrategia Táctica'}</strong></span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold transition-all cursor-pointer border border-slate-700 hover:border-slate-600 shadow-sm"
          >
            Cerrar Flujograma
          </button>
        </div>
      </div>
    </div>
  );
};
