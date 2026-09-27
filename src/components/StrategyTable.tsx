import React from 'react';
import { StrategyWithOrders } from '../types';
import { StrategyRow } from './StrategyRow';
import { Target, ArrowUpDown, Filter, Plus } from 'lucide-react';

interface StrategyTableProps {
  strategies: StrategyWithOrders[];
  totalUnfilteredCount: number;
  onOpenAddStrategy: () => void;
  onClearFilters: () => void;
  isFiltered: boolean;
  onUpdateThreshold?: (strategyId: number, threshold: number) => void;
  onOpenDcaSimulator?: (strategy: StrategyWithOrders) => void;
}

export const StrategyTable: React.FC<StrategyTableProps> = ({
  strategies,
  totalUnfilteredCount,
  onOpenAddStrategy,
  onClearFilters,
  isFiltered,
  onUpdateThreshold,
  onOpenDcaSimulator
}) => {
  if (strategies.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center my-6">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
          <Filter className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">
          {isFiltered ? 'No hay estrategias que coincidan con los filtros' : 'No hay estrategias planificadas'}
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
          {isFiltered
            ? 'Prueba a cambiar el buscador o el filtro de dirección para ver el resto de operaciones.'
            : 'Conecta tu Google Sheets o añade una nueva estrategia para iniciar el radar.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          {isFiltered ? (
            <button
              onClick={onClearFilters}
              className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Restablecer Filtros
            </button>
          ) : (
            <button
              onClick={onOpenAddStrategy}
              className="px-4 py-2 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Primera Estrategia</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl backdrop-blur-xs">
      {/* Table Header Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Radar de Ejecución Prioritaria
          </span>
          <span className="text-xs font-mono text-slate-500">
            ({strategies.length} {strategies.length === 1 ? 'operación' : 'operaciones'})
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-400">
          <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
          <span>Orden: Menor distancia a entrada primero</span>
        </div>
      </div>

      {/* Strategies List */}
      <div className="divide-y divide-slate-800/60">
        {strategies.map((strategy, idx) => (
          <StrategyRow
            key={strategy.id || `${strategy.symbol}-${idx}`}
            strategy={strategy}
            rankIndex={idx}
            onUpdateThreshold={onUpdateThreshold}
            onOpenDcaSimulator={onOpenDcaSimulator}
          />
        ))}
      </div>

      {/* Footer Info */}
      <div className="bg-slate-950/60 px-5 py-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <div>
          Mostrando {strategies.length} de {totalUnfilteredCount} estrategias
        </div>
        <div>
          Ticks en tiempo real vía Binance WebSockets
        </div>
      </div>
    </div>
  );
};
