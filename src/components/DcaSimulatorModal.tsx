import React, { useState, useMemo } from 'react';
import { StrategyWithOrders } from '../types';
import { 
  X, 
  Calculator, 
  RotateCcw, 
  Layers, 
  Target, 
  ShieldAlert, 
  TrendingUp, 
  Check, 
  DollarSign, 
  Percent 
} from 'lucide-react';

interface DcaSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: StrategyWithOrders | null;
}

export const DcaSimulatorModal: React.FC<DcaSimulatorModalProps> = ({
  isOpen,
  onClose,
  strategy
}) => {
  if (!isOpen || !strategy) return null;

  const { symbol, type, entryPrice, stopLoss, currentPrice, leverage = 5 } = strategy;
  const isLong = type === 'LONG';
  const live = currentPrice || entryPrice;

  // Initial order parameters
  const [totalBudget, setTotalBudget] = useState<number>(1000); // USD
  const [e1Alloc, setE1Alloc] = useState<number>(50); // %
  const [e2Alloc, setE2Alloc] = useState<number>(30); // %
  const [e3Alloc, setE3Alloc] = useState<number>(20); // %

  const defaultE2Price = isLong ? entryPrice - (entryPrice - stopLoss) * 0.45 : entryPrice + (stopLoss - entryPrice) * 0.45;
  const defaultE3Price = isLong ? entryPrice - (entryPrice - stopLoss) * 0.75 : entryPrice + (stopLoss - entryPrice) * 0.75;

  const [e2Price, setE2Price] = useState<number>(parseFloat(defaultE2Price.toFixed(4)));
  const [e3Price, setE3Price] = useState<number>(parseFloat(defaultE3Price.toFixed(4)));

  // Toggles for which entries are executed
  const [e1Filled, setE1Filled] = useState<boolean>(true);
  const [e2Filled, setE2Filled] = useState<boolean>(true);
  const [e3Filled, setE3Filled] = useState<boolean>(false);

  // Format price
  const formatPrice = (val: number) => {
    if (val >= 1000) return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (val >= 1) return `$${val.toFixed(4)}`;
    return `$${val.toFixed(6)}`;
  };

  // DCA Calculations
  const { totalCapitalUsed, totalCoinsBought, averageEntryPrice, distanceToCurrent, newSlRiskPercent } = useMemo(() => {
    let capital = 0;
    let coins = 0;

    // E1
    if (e1Filled && entryPrice > 0) {
      const e1Capital = (totalBudget * e1Alloc) / 100;
      capital += e1Capital;
      coins += e1Capital / entryPrice;
    }

    // E2
    if (e2Filled && e2Price > 0) {
      const e2Capital = (totalBudget * e2Alloc) / 100;
      capital += e2Capital;
      coins += e2Capital / e2Price;
    }

    // E3
    if (e3Filled && e3Price > 0) {
      const e3Capital = (totalBudget * e3Alloc) / 100;
      capital += e3Capital;
      coins += e3Capital / e3Price;
    }

    const avgPrice = coins > 0 ? capital / coins : entryPrice;
    const distToCurr = avgPrice > 0 ? ((live - avgPrice) / avgPrice) * 100 * (isLong ? 1 : -1) : 0;
    const slDist = avgPrice > 0 ? Math.abs(((avgPrice - stopLoss) / avgPrice) * 100) : 0;

    return {
      totalCapitalUsed: capital,
      totalCoinsBought: coins,
      averageEntryPrice: avgPrice,
      distanceToCurrent: distToCurr,
      newSlRiskPercent: slDist * leverage
    };
  }, [totalBudget, e1Alloc, e2Alloc, e3Alloc, e1Filled, e2Filled, e3Filled, entryPrice, e2Price, e3Price, live, stopLoss, isLong, leverage]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 text-slate-100 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                Simulador DCA y Recálculo de Break-Even
              </h3>
              <p className="text-xs text-slate-400">
                {symbol} · {type} {isLong ? '↗' : '↘'} · Apalancamiento {leverage}x
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="py-4 space-y-5 text-xs font-mono">
          
          {/* Total Budget Setting */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-400 block text-[11px]">Capital Asignado para la Operación</span>
              <span className="text-white font-bold text-sm">Margen Total Disponible</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700">
              <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
              <input
                type="number"
                value={totalBudget}
                onChange={(e) => setTotalBudget(Math.max(10, parseFloat(e.target.value) || 0))}
                className="w-24 bg-transparent text-white font-bold focus:outline-none text-right"
              />
              <span className="text-slate-400 text-xs">USDT</span>
            </div>
          </div>

          {/* 3 DCA Level Nodes Config */}
          <div className="space-y-2.5">
            <span className="text-slate-300 font-bold uppercase tracking-wider block text-[11px]">
              Nodos de Entrada y Compras Escalonadas (DCA)
            </span>

            {/* E1 Node */}
            <div className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              e1Filled ? 'bg-cyan-950/30 border-cyan-500/50' : 'bg-slate-950 border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={e1Filled}
                  onChange={(e) => setE1Filled(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <div>
                  <span className="font-bold text-cyan-300">[E1] Entrada Inicial</span>
                  <span className="text-slate-400 block text-[10px]">{e1Alloc}% cupo (${(totalBudget * e1Alloc) / 100} USDT)</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-white text-sm">{formatPrice(entryPrice)}</span>
                <span className="text-slate-500 block text-[10px]">Precio Base</span>
              </div>
            </div>

            {/* E2 Node */}
            <div className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              e2Filled ? 'bg-amber-950/30 border-amber-500/50' : 'bg-slate-950 border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={e2Filled}
                  onChange={(e) => setE2Filled(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                />
                <div>
                  <span className="font-bold text-amber-300">[E2] Soporte 1 (DCA)</span>
                  <span className="text-slate-400 block text-[10px]">{e2Alloc}% cupo (${(totalBudget * e2Alloc) / 100} USDT)</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  value={e2Price}
                  onChange={(e) => setE2Price(parseFloat(e.target.value) || 0)}
                  className="w-28 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-bold text-white focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            {/* E3 Node */}
            <div className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              e3Filled ? 'bg-amber-950/30 border-amber-500/50' : 'bg-slate-950 border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={e3Filled}
                  onChange={(e) => setE3Filled(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                />
                <div>
                  <span className="font-bold text-amber-300">[E3] Piso Extremo (Carga)</span>
                  <span className="text-slate-400 block text-[10px]">{e3Alloc}% cupo (${(totalBudget * e3Alloc) / 100} USDT)</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  value={e3Price}
                  onChange={(e) => setE3Price(parseFloat(e.target.value) || 0)}
                  className="w-28 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-right font-bold text-white focus:border-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Results Outcome Card */}
          <div className="bg-gradient-to-br from-cyan-950/60 via-slate-900 to-slate-950 border border-cyan-500/50 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                Nuevo Precio Promedio (Break-Even)
              </span>
              <span className="text-xl font-bold font-mono text-cyan-300">
                {formatPrice(averageEntryPrice)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
              <div>
                <span className="text-slate-500 block">Capital Desplegado:</span>
                <strong className="text-white">${totalCapitalUsed.toFixed(2)} USDT</strong>
              </div>

              <div>
                <span className="text-slate-500 block">Distancia al Live:</span>
                <strong className={distanceToCurrent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {distanceToCurrent >= 0 ? '+' : ''}{distanceToCurrent.toFixed(2)}%
                </strong>
              </div>

              <div>
                <span className="text-slate-500 block">Riesgo a SL Global:</span>
                <strong className="text-rose-400">-{newSlRiskPercent.toFixed(1)}% ROI</strong>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm transition-colors"
          >
            Entendido / Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
