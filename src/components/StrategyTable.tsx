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
  Sparkles,
  Scale,
  SlidersHorizontal
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
  onStatusUpdated?: (strategyId: number, newStatus: string) => void;
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
  onOpenComparison,
  onStatusUpdated
}) => {
  const isAllSelected = strategies.length > 0 && strategies.every(s => selectedIds.has(s.id));
  const selectedCount = selectedIds.size;

  if (strategies.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 sm:p-16 text-center my-6 shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-4">
          <Filter className="w-7 h-7" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
          {isFiltered ? 'No hay estrategias que coincidan con los filtros aplicados' : 'No hay estrategias planificadas'}
        </h3>
        <p className="text-sm text-slate-400 max-w-lg mx-auto mb-6">
          {isFiltered
            ? 'Prueba a eliminar o modificar los filtros de distancia, dirección o búsqueda para ver el resto de operaciones.'
            : 'Conecta tu Google Sheets o añade una nueva estrategia para iniciar el radar.'}
        </p>
        <div className="flex items-center justify-center gap-3.5">
          {isFiltered ? (
            <button
              onClick={onClearFilters}
              className="px-5 py-2.5 text-sm font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer shadow-md"
            >
              Restablecer Filtros
            </button>
          ) : (
            <button
              onClick={onOpenAddStrategy}
              className="px-5 py-2.5 text-sm font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Añadir Primera Estrategia</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="bg-slate-900/40 border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xs">
        
        {/* Table Top Toolbar */}
        <div className="bg-slate-900/95 border-b border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between flex-wrap gap-3">
          
          <div className="flex items-center gap-4">
            {/* Select All Checkbox */}
            {onToggleSelectAll && (
              <label 
                className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white select-none"
                title={isAllSelected ? "Deseleccionar todas" : "Seleccionar todas las estrategias"}
              >
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="w-5 h-5 rounded-md bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs sm:text-sm font-mono font-bold hidden sm:inline">
                  {isAllSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </span>
              </label>
            )}

            <div className="flex items-center gap-2.5">
              <span className="text-sm font-black text-white uppercase tracking-wider font-mono">
                Radar de Ejecución Prioritaria
              </span>
              <span className="text-xs sm:text-sm font-mono text-slate-400 font-semibold">
                ({strategies.length} {strategies.length === 1 ? 'operación' : 'operaciones'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {selectedCount > 0 && onOpenComparison && (
              <button
                type="button"
                onClick={onOpenComparison}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs sm:text-sm font-mono font-black bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <ArrowLeftRight className="w-4 h-4 stroke-[2.5]" />
                <span>Comparar ({selectedCount})</span>
              </button>
            )}

            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-slate-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>Alerta activa si precio está cercano a E1</span>
            </div>
          </div>

        </div>

        {/* Column Guide Header (Hidden on small mobile, visible on desktop) */}
        <div className="hidden xl:flex items-center justify-between px-6 py-2.5 bg-slate-950/80 border-b border-slate-800/80 text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
          <div className="flex items-center gap-6">
            <div className="w-7 text-center">#</div>
            <div className="w-64 sm:w-80">1. Par · Estrategia · R:B · Fecha</div>
          </div>
          <div className="flex-1 px-4 text-center">
            2. Escala de Precios Horizontal (Stop Loss · Entrada · Precio Live · Take Profits)
          </div>
          <div className="w-56 text-right">
            Acciones & Análisis
          </div>
        </div>

        {/* Strategies List */}
        <div className="divide-y divide-slate-800/70">
          {strategies.map((strategy, idx) => (
            <StrategyRow
              key={strategy.id || `${strategy.symbol}-${idx}`}
              strategy={strategy}
              rankIndex={idx}
              onUpdateThreshold={onUpdateThreshold}
              onOpenDcaSimulator={onOpenDcaSimulator}
              isSelected={selectedIds.has(strategy.id)}
              onToggleSelect={onToggleSelect}
              onStatusUpdated={onStatusUpdated}
            />
          ))}
        </div>

        {/* Footer Info */}
        <div className="bg-slate-950/80 px-6 py-3.5 border-t border-slate-800 flex items-center justify-between text-xs sm:text-sm text-slate-400 font-mono">
          <div>
            Mostrando <strong className="text-white">{strategies.length}</strong> de <span className="text-slate-500">{totalUnfilteredCount}</span> estrategias {selectedCount > 0 && `· ${selectedCount} seleccionadas`}
          </div>
          <div className="hidden sm:block">
            Extraído y sincronizado con Google Sheets · Binance Live WSS
          </div>
        </div>
      </div>

      {/* Floating Bottom Comparison Action Pill when items are selected */}
      {selectedCount > 0 && onOpenComparison && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900/95 border-2 border-cyan-500/80 backdrop-blur-md rounded-2xl px-6 py-3.5 shadow-2xl shadow-cyan-500/25 flex items-center gap-5 text-slate-100 font-mono">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-sm font-bold text-white">
                <strong className="text-cyan-300 text-base">{selectedCount}</strong> {selectedCount === 1 ? 'estrategia seleccionada' : 'estrategias seleccionadas'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onOpenComparison}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/30 transition-all active:scale-95 cursor-pointer"
              >
                <ArrowLeftRight className="w-4 h-4 stroke-[2.5]" />
                <span>Ver Comparación Lado a Lado</span>
              </button>

              {onToggleSelectAll && (
                <button
                  type="button"
                  onClick={onToggleSelectAll}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Deseleccionar todas"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
