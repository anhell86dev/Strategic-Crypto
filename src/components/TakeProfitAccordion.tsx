import React, { useState } from 'react';
import { StrategyWithOrders } from '../types';
import { MultiPathMatrix } from './MultiPathMatrix';
import { HorizontalPriceScaleBar } from './HorizontalPriceScaleBar';
import { calculateRiskReward } from '../utils/riskReward';
import { 
  Target, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownRight, 
  Percent, 
  DollarSign, 
  FileText,
  GitBranch,
  Sliders,
  Layers,
  Activity,
  Scale,
  Award,
  Zap
} from 'lucide-react';

interface TakeProfitAccordionProps {
  strategy: StrategyWithOrders;
  onUpdateThreshold?: (strategyId: number, threshold: number) => void;
  onOpenDcaSimulator?: (strategy: StrategyWithOrders) => void;
}

export const TakeProfitAccordion: React.FC<TakeProfitAccordionProps> = ({ 
  strategy, 
  onUpdateThreshold,
  onOpenDcaSimulator
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'horizontal_bar' | 'orders'>('matrix');

  const { entryPrice, stopLoss, type, orders, notes } = strategy;
  const currentThreshold = strategy.customAlertThreshold ?? 1.5;

  // Calculate comprehensive Risk:Reward metrics
  const rr = calculateRiskReward({
    entryPrice,
    stopLoss,
    type,
    orders
  });

  // Format currency
  const formatPrice = (val: number) => {
    if (val >= 1000) {
      return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (val >= 1) {
      return `$${val.toFixed(2)}`;
    } else if (val >= 0.01) {
      return `$${val.toFixed(4)}`;
    }
    return `$${val.toFixed(6)}`;
  };

  // Calculate profit percentage from entry
  const getProfitPercent = (tpPrice: number) => {
    if (!entryPrice || entryPrice === 0) return 0;
    if (type === 'LONG') {
      return ((tpPrice - entryPrice) / entryPrice) * 100;
    } else {
      return ((entryPrice - tpPrice) / entryPrice) * 100;
    }
  };

  // Stop loss risk percent
  const stopLossRiskPercent = entryPrice > 0
    ? Math.abs(((entryPrice - stopLoss) / entryPrice) * 100)
    : 0;

  // Total position allocation check
  const totalAllocation = orders.reduce((sum, o) => sum + (o.closePercentage || 0), 0);

  return (
    <div className="p-4 sm:p-6 bg-slate-950/95 border-t border-slate-800 space-y-5">
      
      {/* Sub-Navigation Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs sm:text-sm">
          
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>1. Matriz Multicamino</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('horizontal_bar')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'horizontal_bar'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>2. Barra Escala de Precios</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>3. Plan Take Profits & R:B</span>
          </button>

        </div>

        {/* Global R:B summary tag on tab header */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm font-mono flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Ratio R:B Máx:</span>
            <strong className="text-cyan-300 font-black">{rr.formattedRatio}</strong>
          </div>
          <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm font-mono hidden md:flex items-center gap-1.5">
            <span className="text-slate-400">R:B TP1:</span>
            <strong className="text-emerald-400 font-bold">{rr.formattedTp1Ratio}</strong>
          </div>
        </div>
      </div>

      {/* Tab 1: Matriz Multicamino del Trade */}
      {activeTab === 'matrix' && (
        <MultiPathMatrix 
          strategy={strategy} 
          onOpenDcaSimulator={onOpenDcaSimulator}
        />
      )}

      {/* Tab 2: Barra Horizontal de Precios en Diferentes Temporalidades */}
      {activeTab === 'horizontal_bar' && (
        <HorizontalPriceScaleBar strategy={strategy} />
      )}

      {/* Tab 3: Detailed Orders & Risk Structure */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
          
          {/* Left Column: Take Profit Orders Grid */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Target className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
                  Plan de Salidas / Take Profits ({orders.length} objetivos)
                </h4>
              </div>
              <span className="text-xs sm:text-sm font-mono text-slate-400">
                Total Asignado: <strong className={totalAllocation === 100 ? 'text-emerald-400 font-black' : 'text-amber-400 font-black'}>{totalAllocation}%</strong>
              </span>
            </div>

            {orders && orders.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {orders.map((tp, idx) => {
                  const profitPct = getProfitPercent(tp.targetPrice);
                  const isHit = strategy.currentPrice 
                    ? (type === 'LONG' ? strategy.currentPrice >= tp.targetPrice : strategy.currentPrice <= tp.targetPrice)
                    : false;

                  const orderDelta = Math.abs(tp.targetPrice - entryPrice);
                  const slDelta = Math.abs(entryPrice - stopLoss);
                  const orderRr = slDelta > 0 ? orderDelta / slDelta : 0;

                  return (
                    <div
                      key={idx}
                      className={`rounded-xl p-4 border transition-all ${
                        isHit
                          ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-md bg-slate-800 text-cyan-300 border border-slate-700">
                          {tp.type || `TP${idx + 1}`}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-0.5">
                          <Percent className="w-3.5 h-3.5 text-slate-400" />
                          {tp.closePercentage}% de posición
                        </span>
                      </div>

                      <div className="mt-2 flex items-baseline justify-between">
                        <div className="font-mono font-black text-base text-white">
                          {formatPrice(tp.targetPrice)}
                        </div>
                        <div className={`font-mono text-xs font-bold flex items-center gap-0.5 ${
                          profitPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">
                          R:B Individual:
                        </span>
                        <strong className="text-cyan-300 font-bold">
                          1:{orderRr.toFixed(2)}
                        </strong>
                      </div>

                      {/* Visual Progress Bar to this TP */}
                      {strategy.currentPrice && (
                        <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-400">
                            {isHit ? '✓ Objetivo alcanzado' : 'Pendiente'}
                          </span>
                          <span className="text-slate-500">
                            Distancia: {Math.abs(((strategy.currentPrice - tp.targetPrice) / strategy.currentPrice) * 100).toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic py-6 bg-slate-900/50 rounded-xl text-center border border-slate-800">
                No hay órdenes de Take Profit registradas en la hoja.
              </div>
            )}

            {/* Risk:Reward Detailed Mathematical Breakdown Banner */}
            <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 text-xs sm:text-sm font-mono">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Scale className="w-4 h-4 text-cyan-400" />
                  <span>Desglose de Expectativa y Ratio Riesgo / Beneficio (R:B)</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                  rr.maxRiskReward >= 3 ? 'bg-purple-950 text-purple-300 border border-purple-700' :
                  rr.maxRiskReward >= 2 ? 'bg-cyan-950 text-cyan-300 border border-cyan-700' :
                  'bg-emerald-950 text-emerald-300 border border-emerald-700'
                }`}>
                  {rr.quality === 'excellent' ? 'R:B Excelente (≥ 1:3)' : rr.quality === 'good' ? 'R:B Óptimo (≥ 1:2)' : 'R:B Convencional'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Riesgo a Stop Loss</span>
                  <span className="text-base font-black text-rose-400">-{rr.slDistancePct.toFixed(2)}%</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">{formatPrice(Math.abs(entryPrice - stopLoss))} / unidad</span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Recompensa Máxima</span>
                  <span className="text-base font-black text-emerald-400">+{rr.maxRewardPct.toFixed(2)}%</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Hasta último TP</span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Ratio R:B al TP1</span>
                  <span className="text-base font-black text-cyan-300">{rr.formattedTp1Ratio}</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Primer objetivo</span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Ratio R:B Máximo</span>
                  <span className="text-base font-black text-purple-300">{rr.formattedRatio}</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">1 : {rr.maxRiskReward.toFixed(2)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Invalidation & Risk/Reward Structure */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
            {/* Stop Loss Card */}
            <div className="bg-slate-900/90 border border-rose-950/90 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs sm:text-sm font-bold text-rose-400 flex items-center gap-2 uppercase tracking-wider font-mono">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Invalidación / Stop Loss
                </span>
                <span className="text-xs sm:text-sm font-mono font-black text-rose-400">
                  -{stopLossRiskPercent.toFixed(2)}%
                </span>
              </div>
              <div className="font-mono text-base sm:text-lg font-black text-white mt-1">
                {formatPrice(stopLoss)}
              </div>
              <div className="text-xs text-slate-400 mt-1 font-sans">
                {type === 'LONG' ? 'Salida protectora si el precio quiebra soporte clave' : 'Salida protectora si el precio supera resistencia'}
              </div>
            </div>

            {/* Custom Alert Threshold Card */}
            {onUpdateThreshold && (
              <div className="bg-slate-900/90 border border-cyan-950/90 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-bold text-cyan-400 flex items-center gap-2 uppercase tracking-wider font-mono">
                    <Target className="w-4 h-4 text-cyan-400" />
                    Umbral de Alerta
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950 px-2.5 py-1 rounded-md border border-cyan-800/60">
                    &lt; {currentThreshold.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3 font-sans">
                  Ajusta la sensibilidad de la alerta sonora y visual para esta estrategia:
                </p>
                <div className="flex flex-wrap items-center gap-2 font-mono">
                  {[0.5, 1.0, 1.5, 2.0, 3.0, 5.0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onUpdateThreshold(strategy.id, val)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        currentThreshold === val
                          ? 'bg-cyan-400 text-slate-950 shadow-sm font-black'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Setup Notes */}
            {notes ? (
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-slate-200 font-semibold mb-1.5">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>Tesis de Trading</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed font-sans">
                  {notes}
                </p>
              </div>
            ) : (
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-3 text-xs text-slate-500 font-mono">
                Registrado el {strategy.date} · {strategy.category || 'Crypto Spot/Futures'}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
