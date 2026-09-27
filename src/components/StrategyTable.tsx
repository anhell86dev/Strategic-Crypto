import React from 'react';
import { StrategyWithOrders } from '../types';
import { StrategyRow } from './StrategyRow';
import { 
  Target, 
  ArrowUpDown, 
  Filter, 
  Plus, 
  ArrowLeftRight, 
  CheckSquare, 
  Square, 
  X, 
  Sparkles 
} from 'lucide-react';

interface StrategyTableProps {
  strategies: StrategyWithOrders[];
  totalUnfilteredCount: number;
  onOpenAddStrategy: () => void;
  onClearFilters: () => void;
  isFiltered: boolean;
  onUpdateThreshold?: (strategyId: number, threshold: number) => void;
  onOpenDcaSimulator?: (strategy: StrategyWithOrders) => void;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  onToggleSelectAll?: () => void;
  onOpenComparison?: () => void;
}

export const StrategyTable: React.FC<StrategyTableProps> = ({
  strategies,
  totalUnfilteredCount,
  onOpenAddStrategy,
  onClearFilters,
  isFiltered,
  onUpdateThreshold,
  onOpenDcaSimulator,
  selectedIds = new Set(),
  onToggleSelect,
  onToggleSelectAll,
  onOpenComparison
}) => {
  const isAllSelected = strategies.length > 0 && strategies.every(s => selectedIds.has(s.id));
  const selectedCount = selectedIds.size;

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
    <div className="relative">
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl backdrop-blur-xs">
        
        {/* Table Header Bar */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-5 py-3 flex items-center justify-between flex-wrap gap-2">
          
          <div className="flex items-center gap-3">
            {/* Select All Checkbox */}
            {onToggleSelectAll && (
              <label 
                className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200 select-none"
                title={isAllSelected ? "Deseleccionar todas" : "Seleccionar todas las estrategias"}
              >
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px] font-mono font-medium hidden sm:inline">
                  {isAllSelected ? 'Deseleccionar' : 'Seleccionar todas'}
                </span>
              </label>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Radar de Ejecución Prioritaria
              </span>
              <span className="text-xs font-mono text-slate-500">
                ({strategies.length} {strategies.length === 1 ? 'operación' : 'operaciones'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedCount > 0 && onOpenComparison && (
              <button
                type="button"
                onClick={onOpenComparison}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 transition-all active:scale-95"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Comparar ({selectedCount})</span>
              </button>
            )}

            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>Orden: Menor distancia primero</span>
            </div>
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
              isSelected={selectedIds.has(strategy.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>

        {/* Footer Info */}
        <div className="bg-slate-950/60 px-5 py-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div>
            Mostrando {strategies.length} de {totalUnfilteredCount} estrategias {selectedCount > 0 && `· ${selectedCount} seleccionadas`}
          </div>
          <div>
            Ticks en tiempo real vía Binance WebSockets
          </div>
        </div>
      </div>

      {/* Floating Bottom Comparison Action Pill when items are selected */}
      {selectedCount > 0 && onOpenComparison && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900/95 border-2 border-cyan-500/70 backdrop-blur-md rounded-2xl px-5 py-3 shadow-2xl shadow-cyan-500/20 flex items-center gap-4 text-slate-100 font-mono">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-bold text-white">
                <strong className="text-cyan-300">{selectedCount}</strong> {selectedCount === 1 ? 'estrategia seleccionada' : 'estrategias seleccionadas'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenComparison}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/30 transition-all active:scale-95 cursor-pointer"
              >
                <ArrowLeftRight className="w-4 h-4 stroke-[2.5]" />
                <span>Ver Comparación Lado a Lado</span>
              </button>

              {onToggleSelectAll && (
                <button
                  type="button"
                  onClick={() => {
                    // Deselect all
                    if (isAllSelected) onToggleSelectAll();
                    else {
                      // Trigger deselect
                      onToggleSelectAll();
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Deseleccionar todas"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
