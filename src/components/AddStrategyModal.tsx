import React, { useState } from 'react';
import { Strategy, TakeProfitOrder } from '../types';
import { X, Plus, Trash2, TrendingUp, TrendingDown, Target, Shield } from 'lucide-react';

interface AddStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStrategy: (strategy: Strategy, orders: TakeProfitOrder[]) => void;
  defaultEntryGuess?: number;
}

const POPULAR_COINS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'SUIUSDT', 'NEARUSDT', 
  'AVAXUSDT', 'LINKUSDT', 'DOGEUSDT', 'TAOUSDT', 'AAVEUSDT',
  'INJUSDT', 'RENDERUSDT', 'XRPUSDT', 'ARBUSDT', 'FETUSDT'
];

export const AddStrategyModal: React.FC<AddStrategyModalProps> = ({
  isOpen,
  onClose,
  onAddStrategy
}) => {
  const [symbol, setSymbol] = useState('SOLUSDT');
  const [type, setType] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState<string>('122.50');
  const [stopLoss, setStopLoss] = useState<string>('116.00');
  const [status, setStatus] = useState<'Active' | 'Pending'>('Active');
  const [category, setCategory] = useState('Layer 1');
  const [notes, setNotes] = useState('Rebote en soporte de 4H.');

  const [tps, setTps] = useState<{ type: string; targetPrice: string; closePercentage: string }[]>([
    { type: 'TP1', targetPrice: '128.50', closePercentage: '40' },
    { type: 'TP2', targetPrice: '136.00', closePercentage: '35' },
    { type: 'TP3', targetPrice: '144.00', closePercentage: '25' },
  ]);

  if (!isOpen) return null;

  const handleAddTp = () => {
    const nextIdx = tps.length + 1;
    setTps([...tps, { type: `TP${nextIdx}`, targetPrice: '', closePercentage: '25' }]);
  };

  const handleRemoveTp = (index: number) => {
    setTps(tps.filter((_, i) => i !== index));
  };

  const handleTpChange = (index: number, field: string, value: string) => {
    const updated = [...tps];
    updated[index] = { ...updated[index], [field]: value };
    setTps(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);

    if (isNaN(entry) || entry <= 0 || !symbol) return;

    const newId = Date.now();
    const newStrategy: Strategy = {
      id: newId,
      symbol: symbol.toUpperCase().trim(),
      coinName: symbol.replace('USDT', '').toUpperCase(),
      type,
      entryPrice: entry,
      stopLoss: isNaN(sl) ? 0 : sl,
      date: new Date().toISOString().split('T')[0],
      status,
      category,
      notes
    };

    const newOrders: TakeProfitOrder[] = tps
      .filter(tp => parseFloat(tp.targetPrice) > 0)
      .map(tp => ({
        strategyId: newId,
        type: tp.type || 'TP',
        targetPrice: parseFloat(tp.targetPrice),
        closePercentage: parseFloat(tp.closePercentage) || 33
      }));

    onAddStrategy(newStrategy, newOrders);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Nueva Estrategia de Trading
              </h3>
              <p className="text-xs text-slate-400">
                Planifica tu punto de entrada y objetivos de toma de ganancias
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

        <form onSubmit={handleSubmit} className="py-4 space-y-4 text-xs">
          
          {/* Symbol & Direction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-200 mb-1">
                Símbolo (Par USDT)
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="Ej. BTCUSDT"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-slate-100 uppercase focus:border-cyan-500 outline-none"
                required
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {POPULAR_COINS.slice(0, 5).map(c => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setSymbol(c)}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    {c.replace('USDT', '')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-200 mb-1">
                Dirección de la Operación
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('LONG')}
                  className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors border ${
                    type === 'LONG'
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>LONG</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('SHORT')}
                  className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors border ${
                    type === 'SHORT'
                      ? 'bg-rose-950/80 border-rose-500/50 text-rose-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                  <span>SHORT</span>
                </button>
              </div>
            </div>
          </div>

          {/* Entry Price & Stop Loss */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-200 mb-1 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                <span>Precio de Entrada ($)</span>
              </label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="122.50"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-slate-100 focus:border-cyan-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-200 mb-1 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                <span>Stop Loss / Invalidación ($)</span>
              </label>
              <input
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="116.00"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-slate-100 focus:border-rose-500 outline-none"
                required
              />
            </div>
          </div>

          {/* Status & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-200 mb-1">
                Estado
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:border-cyan-500 outline-none"
              >
                <option value="Active">Activo (Active)</option>
                <option value="Pending">Pendiente (Pending)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-200 mb-1">
                Categoría / Sector
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Layer 1, DeFi, AI..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-cyan-500 outline-none"
              />
            </div>
          </div>

          {/* Take Profit Builder */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-cyan-400" />
                <span>Niveles de Take Profit (TPs)</span>
              </label>
              <button
                type="button"
                onClick={handleAddTp}
                className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir TP</span>
              </button>
            </div>

            <div className="space-y-2">
              {tps.map((tp, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <span className="w-12 text-xs font-mono font-bold text-slate-400 pl-1">
                    {tp.type}
                  </span>
                  <div className="flex-1">
                    <input
                      type="number"
                      step="any"
                      value={tp.targetPrice}
                      onChange={(e) => handleTpChange(idx, 'targetPrice', e.target.value)}
                      placeholder="Precio Objetivo ($)"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded font-mono text-slate-100 text-xs focus:border-cyan-500 outline-none"
                      required
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      value={tp.closePercentage}
                      onChange={(e) => handleTpChange(idx, 'closePercentage', e.target.value)}
                      placeholder="% cierre"
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded font-mono text-slate-100 text-xs focus:border-cyan-500 outline-none"
                    />
                  </div>
                  {tps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTp(idx)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-900 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-200 mb-1">
              Notas / Tesis del Setup
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Razón técnica para la entrada, indicadores, temporalidad..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-cyan-500 outline-none text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm transition-colors"
            >
              Guardar Estrategia
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
