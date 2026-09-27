import React, { useState } from 'react';
import { StrategyWithOrders } from '../types';
import { MultiPathMatrix } from './MultiPathMatrix';
import { HorizontalPriceScaleBar } from './HorizontalPriceScaleBar';
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
  Activity
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
    <div className="p-3 sm:p-5 bg-slate-950/90 border-t border-slate-800/80 space-y-4">
      
      {/* Sub-Navigation Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs">
          
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'matrix'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>1. Matriz Multicamino del Trade</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('horizontal_bar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'horizontal_bar'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>2. Barra Horizontal Multi-Temporalidad</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>3. Plan Take Profits & Riesgo</span>
          </button>

        </div>

        <div className="text-[11px] font-mono text-slate-400 hidden md:block">
          Sincronizado con Google Sheets & Binance Live API
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
          
          {/* Left Column: Take Profit Orders Grid */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  Plan de Salidas / Take Profits ({orders.length} objetivos)
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Total Asignado: <strong className={totalAllocation === 100 ? 'text-emerald-400' : 'text-amber-400'}>{totalAllocation}%</strong>
              </span>
            </div>

            {orders && orders.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {orders.map((tp, idx) => {
                  const profitPct = getProfitPercent(tp.targetPrice);
                  const isHit = strategy.currentPrice 
                    ? (type === 'LONG' ? strategy.currentPrice >= tp.targetPrice : strategy.currentPrice <= tp.targetPrice)
                    : false;

                  return (
                    <div
                      key={idx}
                      className={`rounded-lg p-3 border transition-all ${
                        isHit
                          ? 'bg-emerald-950/40 border-emerald-500/40 shadow-xs'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700/60">
                          {tp.type || `TP${idx + 1}`}
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-0.5">
                          <Percent className="w-3 h-3 text-slate-400" />
                          {tp.closePercentage}% de posición
                        </span>
                      </div>

                      <div className="mt-2 flex items-baseline justify-between">
                        <div className="font-mono font-bold text-sm text-white">
                          {formatPrice(tp.targetPrice)}
                        </div>
                        <div className={`font-mono text-xs font-semibold flex items-center gap-0.5 ${
                          profitPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
                        </div>
                      </div>

                      {/* Visual Progress Bar to this TP */}
                      {strategy.currentPrice && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono">
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
              <div className="text-xs text-slate-500 italic py-4 bg-slate-900/50 rounded-lg text-center border border-slate-800">
                No hay órdenes de Take Profit registradas en la hoja.
              </div>
            )}
          </div>

          {/* Right Column: Invalidation & Risk/Reward Structure */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-3">
            {/* Stop Loss Card */}
            <div className="bg-slate-900/90 border border-rose-950/80 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  Invalidación / Stop Loss
                </span>
                <span className="text-xs font-mono font-bold text-rose-400">
                  -{stopLossRiskPercent.toFixed(2)}%
                </span>
              </div>
              <div className="font-mono text-sm font-bold text-slate-100 mt-1">
                {formatPrice(stopLoss)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {type === 'LONG' ? 'Salida si el precio quiebra soporte' : 'Salida si el precio supera resistencia'}
              </div>
            </div>

            {/* Custom Alert Threshold Card */}
            {onUpdateThreshold && (
              <div className="bg-slate-900/90 border border-cyan-950/80 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                    <Target className="w-3.5 h-3.5 text-cyan-400" />
                    Umbral de Alerta
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/60">
                    &lt; {currentThreshold.toFixed(1)}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-2">
                  Ajusta la sensibilidad de la alerta sonora y visual para esta estrategia:
                </p>
                <div className="flex flex-wrap items-center gap-1.5 font-mono">
                  {[0.5, 1.0, 1.5, 2.0, 3.0, 5.0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onUpdateThreshold(strategy.id, val)}
                      className={`px-2 py-1 text-[11px] font-bold rounded transition-all ${
                        currentThreshold === val
                          ? 'bg-cyan-400 text-slate-950 shadow-sm font-extrabold'
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
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tesis de Trading</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {notes}
                </p>
              </div>
            ) : (
              <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-2.5 text-[11px] text-slate-500 font-mono">
                Registrado el {strategy.date} · {strategy.category || 'Crypto Spot/Futures'}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
