import React, { useState, useRef, useEffect } from 'react';
import { ActiveFilterRule, FilterType } from '../types/filters';
import { StrategyWithOrders } from '../types';
import { 
  Plus, 
  X, 
  Search, 
  Filter, 
  Target, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Zap, 
  Award, 
  ShieldAlert, 
  Sparkles,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';

interface DynamicFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeFilters: ActiveFilterRule[];
  onAddFilter: (filter: ActiveFilterRule) => void;
  onRemoveFilter: (filterId: string) => void;
  onClearAllFilters: () => void;
  strategies: StrategyWithOrders[];
  totalCount: number;
  filteredCount: number;
}

export const DynamicFilterBar: React.FC<DynamicFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  activeFilters,
  onAddFilter,
  onRemoveFilter,
  onClearAllFilters,
  strategies,
  totalCount,
  filteredCount
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'distance' | 'direction' | 'status' | 'leverage' | 'special' | 'category'>('distance');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Extract unique categories from strategies
  const availableCategories = Array.from(
    new Set(strategies.map(s => s.category).filter(Boolean))
  ) as string[];

  // Helper to add or replace filter of same type
  const handleSelectRule = (rule: ActiveFilterRule) => {
    onAddFilter(rule);
    setIsDropdownOpen(false);
  };

  const isRuleActive = (type: FilterType, value: any) => {
    return activeFilters.some(f => f.type === type && f.value === value);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md mb-6 space-y-4">
      
      {/* Top Row: Search Input & Add Filter Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Search Field */}
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por moneda o símbolo (ej. BTC, ETH, SOL, SUI, AVAX)..."
            className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-950/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-white placeholder-slate-400 transition-all outline-none font-sans shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              title="Borrar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Buttons: Add Filter & Results Counter */}
        <div className="flex items-center gap-3 flex-wrap justify-between md:justify-end">
          
          {/* Add Filter Button with Popover */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Agregar Filtro</span>
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {/* Filter Selector Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs font-bold text-slate-300 font-mono">
                  <span className="flex items-center gap-1.5 text-white">
                    <Filter className="w-4 h-4 text-cyan-400" />
                    Seleccionar Criterio de Filtro
                  </span>
                  <button
                    onClick={() => setIsDropdownOpen(false)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sub-Tabs */}
                <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl mb-3 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveCategoryTab('distance')}
                    className={`py-1.5 px-2 rounded-lg transition-colors ${
                      activeCategoryTab === 'distance' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Distancia
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategoryTab('direction')}
                    className={`py-1.5 px-2 rounded-lg transition-colors ${
                      activeCategoryTab === 'direction' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Dirección
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategoryTab('special')}
                    className={`py-1.5 px-2 rounded-lg transition-colors ${
                      activeCategoryTab === 'special' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Especiales
                  </button>
                </div>

                {/* Tab: Distancia */}
                {activeCategoryTab === 'distance' && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-slate-400 block mb-2 font-medium">
                      Filtrar por cercanía a la entrada planificada:
                    </span>
                    {[
                      { val: 1.0, label: 'Muy cerca (≤ 1.0%)' },
                      { val: 2.0, label: 'Zona próxima (≤ 2.0%)' },
                      { val: 3.0, label: 'En radar cercano (≤ 3.0%)' },
                      { val: 5.0, label: 'Medio alcance (≤ 5.0%)' },
                      { val: 10.0, label: 'Largo alcance (≤ 10.0%)' }
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => handleSelectRule({
                          id: `distance-${item.val}`,
                          type: 'DISTANCE_LE',
                          label: 'Distancia',
                          displayValue: `≤ ${item.val}%`,
                          value: item.val
                        })}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono font-medium flex items-center justify-between transition-colors ${
                          isRuleActive('DISTANCE_LE', item.val)
                            ? 'bg-cyan-950 border border-cyan-500 text-cyan-300'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-200'
                        }`}
                      >
                        <span>{item.label}</span>
                        {isRuleActive('DISTANCE_LE', item.val) && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                      </button>
                    ))}
                  </div>
                )}

                {/* Tab: Dirección & Estado */}
                {activeCategoryTab === 'direction' && (
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-slate-400 block mb-1.5 font-medium">Dirección de Operación:</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectRule({
                            id: 'dir-LONG',
                            type: 'DIRECTION',
                            label: 'Dirección',
                            displayValue: 'LONG ▲',
                            value: 'LONG'
                          })}
                          className="px-3 py-2 rounded-xl text-xs font-mono font-bold bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 flex items-center justify-center gap-1.5"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Solo LONG</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectRule({
                            id: 'dir-SHORT',
                            type: 'DIRECTION',
                            label: 'Dirección',
                            displayValue: 'SHORT ▼',
                            value: 'SHORT'
                          })}
                          className="px-3 py-2 rounded-xl text-xs font-mono font-bold bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 flex items-center justify-center gap-1.5"
                        >
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>Solo SHORT</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-slate-400 block mb-1.5 font-medium">Estado de la Estrategia:</span>
                      <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                        {['Active', 'Pending', 'Completed'].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleSelectRule({
                              id: `status-${st}`,
                              type: 'STATUS',
                              label: 'Estado',
                              displayValue: st,
                              value: st
                            })}
                            className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-center font-semibold"
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Especiales */}
                {activeCategoryTab === 'special' && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleSelectRule({
                        id: 'alert-zone',
                        type: 'ALERT_ZONE',
                        label: 'Zona Alerta',
                        displayValue: 'En Zona Activa',
                        value: true
                      })}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-cyan-400" />
                        Solo en Zona de Alerta
                      </span>
                      <span className="text-xs text-slate-400">&lt; Umbral</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectRule({
                        id: 'tp-hit',
                        type: 'TP_HIT',
                        label: 'Take Profit',
                        displayValue: 'TP Alcanzado',
                        value: true
                      })}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Con TP Alcanzado
                      </span>
                      <span className="text-xs text-slate-400">≥ 1 TP Hit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectRule({
                        id: 'has-dca',
                        type: 'HAS_DCA',
                        label: 'DCA',
                        displayValue: 'Con Niveles DCA',
                        value: true
                      })}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-amber-400" />
                        Con Matriz DCA
                      </span>
                      <span className="text-xs text-slate-400">Escalonado</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectRule({
                        id: 'perf-positive',
                        type: 'PERF_24H',
                        label: '24h Change',
                        displayValue: 'En Ganancia (> 0%)',
                        value: 'POSITIVE'
                      })}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-800 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        Top Gainers 24h
                      </span>
                      <span className="text-xs text-emerald-400">&gt; 0%</span>
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Stats count badge */}
          <div className="text-xs font-mono font-semibold text-slate-400 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            Mostrando <strong className="text-white text-sm">{filteredCount}</strong> de <span className="text-slate-500">{totalCount}</span>
          </div>

        </div>

      </div>

      {/* Quick Presets & Active Filters Section */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        
        {/* Preset Fast Filter Pills */}
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mr-1">
          Filtros Rápidos:
        </span>

        {/* Preset 1: En Alerta */}
        <button
          type="button"
          onClick={() => {
            const exists = activeFilters.some(f => f.type === 'ALERT_ZONE');
            if (exists) {
              const rule = activeFilters.find(f => f.type === 'ALERT_ZONE');
              if (rule) onRemoveFilter(rule.id);
            } else {
              onAddFilter({
                id: 'preset-alert',
                type: 'ALERT_ZONE',
                label: 'Zona Alerta',
                displayValue: 'Alerta Activa',
                value: true
              });
            }
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeFilters.some(f => f.type === 'ALERT_ZONE')
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>⚡ En Zona Alerta</span>
        </button>

        {/* Preset 2: TP Hit */}
        <button
          type="button"
          onClick={() => {
            const exists = activeFilters.some(f => f.type === 'TP_HIT');
            if (exists) {
              const rule = activeFilters.find(f => f.type === 'TP_HIT');
              if (rule) onRemoveFilter(rule.id);
            } else {
              onAddFilter({
                id: 'preset-tp',
                type: 'TP_HIT',
                label: 'Take Profit',
                displayValue: 'TP Hit',
                value: true
              });
            }
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeFilters.some(f => f.type === 'TP_HIT')
              ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-400/20'
              : 'bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>🎯 TP Alcanzado</span>
        </button>

        {/* Preset 3: Distancia <= 2% */}
        <button
          type="button"
          onClick={() => {
            const exists = activeFilters.some(f => f.type === 'DISTANCE_LE' && f.value === 2.0);
            if (exists) {
              const rule = activeFilters.find(f => f.type === 'DISTANCE_LE' && f.value === 2.0);
              if (rule) onRemoveFilter(rule.id);
            } else {
              onAddFilter({
                id: 'preset-dist-2',
                type: 'DISTANCE_LE',
                label: 'Distancia',
                displayValue: '≤ 2%',
                value: 2.0
              });
            }
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeFilters.some(f => f.type === 'DISTANCE_LE' && f.value === 2.0)
              ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
              : 'bg-slate-950 hover:bg-slate-800 text-blue-300 border border-blue-500/30'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>📍 Distancia ≤ 2%</span>
        </button>

        {/* Preset 4: DCA Configurado */}
        <button
          type="button"
          onClick={() => {
            const exists = activeFilters.some(f => f.type === 'HAS_DCA');
            if (exists) {
              const rule = activeFilters.find(f => f.type === 'HAS_DCA');
              if (rule) onRemoveFilter(rule.id);
            } else {
              onAddFilter({
                id: 'preset-dca',
                type: 'HAS_DCA',
                label: 'DCA',
                displayValue: 'Con DCA',
                value: true
              });
            }
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeFilters.some(f => f.type === 'HAS_DCA')
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/30'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>🛡️ Con DCA</span>
        </button>

      </div>

      {/* Active Filter Chips / Tags Display */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 animate-in fade-in duration-150">
          <span className="text-xs font-bold text-slate-400 font-mono">
            Filtros Aplicados ({activeFilters.length}):
          </span>

          {activeFilters.map((filter) => (
            <span
              key={filter.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-950 border border-cyan-500/40 text-cyan-300 shadow-sm"
            >
              <span className="text-slate-400 font-normal">{filter.label}:</span>
              <strong className="text-white">{filter.displayValue}</strong>
              <button
                type="button"
                onClick={() => onRemoveFilter(filter.id)}
                className="hover:text-rose-400 p-0.5 -mr-0.5 rounded transition-colors"
                title={`Eliminar filtro ${filter.label}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={onClearAllFilters}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/60 rounded-xl transition-colors ml-auto cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar Todos</span>
          </button>
        </div>
      )}

    </div>
  );
};
