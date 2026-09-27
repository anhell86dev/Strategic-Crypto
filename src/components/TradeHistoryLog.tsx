import React, { useState, useMemo } from 'react';
import { TradeLogEntry, StrategyWithOrders } from '../types';
import { 
  History, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  Zap, 
  ShieldAlert, 
  Target, 
  ChevronRight,
  TrendingUp,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface TradeHistoryLogProps {
  logs: TradeLogEntry[];
  onClearLogs: () => void;
  onSimulateFill?: (strategy: StrategyWithOrders) => void;
  availableStrategies?: StrategyWithOrders[];
}

export const TradeHistoryLog: React.FC<TradeHistoryLogProps> = ({
  logs,
  onClearLogs,
  onSimulateFill,
  availableStrategies = []
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchesSymbol = log.symbol.toLowerCase().includes(q);
        const matchesName = log.coinName.toLowerCase().includes(q);
        if (!matchesSymbol && !matchesName) return false;
      }

      // Status
      if (statusFilter !== 'ALL' && log.status !== statusFilter) {
        return false;
      }

      // Direction
      if (directionFilter !== 'ALL' && log.type !== directionFilter) {
        return false;
      }

      return true;
    });
  }, [logs, searchQuery, statusFilter, directionFilter]);

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

  // Format date / relative time
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

      let relative = 'Ahora mismo';
      if (diffMins >= 1 && diffMins < 60) {
        relative = `Hace ${diffMins} min`;
      } else if (diffHours >= 1 && diffHours < 24) {
        relative = `Hace ${diffHours} h`;
      } else if (diffHours >= 24) {
        relative = dateStr;
      }

      return { timeStr, relative, full: `${dateStr} · ${timeStr}` };
    } catch {
      return { timeStr: '--:--', relative: '', full: '' };
    }
  };

  // Export to CSV
  const exportCsv = () => {
    if (logs.length === 0) return;
    const headers = ['ID', 'Fecha', 'Símbolo', 'Dirección', 'Entrada Planificada', 'Precio Ejecución', 'Desviación %', 'Estado', 'Notas'];
    const rows = logs.map(l => [
      l.id,
      l.timestamp,
      l.symbol,
      l.type,
      l.plannedEntry,
      l.executionPrice,
      `${l.distanceAtFill.toFixed(2)}%`,
      l.status,
      `"${(l.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trade_history_radar_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: TradeLogEntry['status']) => {
    switch (status) {
      case 'ENTRY_FILLED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Entrada Ejecutada
          </span>
        );
      case 'ZONE_TRIGGERED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/40">
            <Target className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            Zona Activada
          </span>
        );
      case 'TP_HIT':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-blue-950 text-blue-300 border border-blue-500/40">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            TP Alcanzado
          </span>
        );
      case 'SL_HIT':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-rose-950 text-rose-300 border border-rose-500/40">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            Stop Loss
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden mt-8 shadow-2xl backdrop-blur-md">
      
      {/* Top Header Bar */}
      <div className="p-4 sm:p-6 bg-slate-900/90 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Title & Stats */}
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-mono">
                Historial de Alertas Ejecutadas (Trade History Log)
              </h3>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-slate-800 text-cyan-300 border border-slate-700 font-bold">
                {logs.length} eventos
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-normal">
              Registro cronológico de órdenes y setups que alcanzaron su zona de disparo
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Quick Simulation Trigger */}
          {availableStrategies.length > 0 && onSimulateFill && (
            <button
              onClick={() => onSimulateFill(availableStrategies[0])}
              title="Simular ejecución de la estrategia #1 del radar"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 rounded-xl transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Simular Disparo #1</span>
            </button>
          )}

          {/* Export CSV */}
          <button
            onClick={exportCsv}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>

          {/* Clear History */}
          {logs.length > 0 && (
            <button
              onClick={onClearLogs}
              title="Borrar registro de eventos"
              className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Control Bar: Search & Status Filters */}
      <div className="bg-slate-950/70 px-4 sm:px-6 py-3 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por moneda..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-slate-100 placeholder-slate-500 outline-none"
          />
        </div>

        {/* Status & Direction Filters */}
        <div className="flex items-center flex-wrap gap-2.5 text-xs sm:text-sm">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs sm:text-sm rounded-xl px-3 py-1.5 focus:border-cyan-500 outline-none font-medium"
          >
            <option value="ALL">Todos los tipos de alerta</option>
            <option value="ENTRY_FILLED">Entrada Ejecutada (Filled)</option>
            <option value="ZONE_TRIGGERED">Zona Activada (Triggered)</option>
            <option value="TP_HIT">Take Profit Alcanzado</option>
          </select>

          {/* Direction Segmented */}
          <div className="flex items-center p-0.5 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono font-bold">
            <button
              onClick={() => setDirectionFilter('ALL')}
              className={`px-3 py-1 rounded-lg ${directionFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              ALL
            </button>
            <button
              onClick={() => setDirectionFilter('LONG')}
              className={`px-3 py-1 rounded-lg ${directionFilter === 'LONG' ? 'bg-emerald-950 text-emerald-300' : 'text-slate-400 hover:text-emerald-400'}`}
            >
              LONG
            </button>
            <button
              onClick={() => setDirectionFilter('SHORT')}
              className={`px-3 py-1 rounded-lg ${directionFilter === 'SHORT' ? 'bg-rose-950 text-rose-300' : 'text-slate-400 hover:text-rose-400'}`}
            >
              SHORT
            </button>
          </div>
        </div>
      </div>

      {/* History Table / Timeline List */}
      {filteredLogs.length === 0 ? (
        <div className="p-10 text-center text-sm text-slate-500">
          <History className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-50" />
          <p>No se registran alertas que coincidan con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/70">
          {filteredLogs.map((entry) => {
            const timeObj = formatTime(entry.timestamp);
            const isLong = entry.type === 'LONG';
            const symbolClean = entry.symbol.replace('USDT', '');
            const isExpanded = expandedId === entry.id;

            return (
              <div
                key={entry.id}
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                className="px-4 sm:px-6 py-4 hover:bg-slate-900/60 transition-colors cursor-pointer"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                  
                  {/* Left: Time & Symbol */}
                  <div className="flex items-center gap-4 min-w-[260px]">
                    {/* Time indicator */}
                    <div className="flex flex-col text-left font-mono">
                      <span className="text-sm font-bold text-slate-200">{timeObj.timeStr}</span>
                      <span className="text-xs text-cyan-400/90 font-medium">{timeObj.relative}</span>
                    </div>

                    <div className="h-8 w-px bg-slate-800" />

                    {/* Symbol and Direction */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base font-mono text-white">
                          {symbolClean}
                          <span className="text-xs text-slate-500 font-normal">/USDT</span>
                        </span>
                        
                        <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded font-mono ${
                          isLong
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}>
                          {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {entry.type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {entry.coinName}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Prices & Deviation */}
                  <div className="grid grid-cols-3 gap-4 sm:gap-8 flex-1 max-w-lg font-mono text-xs sm:text-sm">
                    <div>
                      <span className="text-xs uppercase text-slate-400 block font-semibold mb-0.5">Planificado</span>
                      <span className="font-bold text-cyan-300 tabular-nums text-sm">
                        {formatPrice(entry.plannedEntry)}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs uppercase text-slate-400 block font-semibold mb-0.5">Ejecutado (Fill)</span>
                      <span className="font-black text-white tabular-nums text-sm">
                        {formatPrice(entry.executionPrice)}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs uppercase text-slate-400 block font-semibold mb-0.5">Desviación</span>
                      <span className="font-bold text-emerald-400 tabular-nums text-sm">
                        ±{entry.distanceAtFill.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Right: Status Badge & Accordion Toggle */}
                  <div className="flex items-center justify-between md:justify-end gap-3.5 pt-2.5 md:pt-0 border-t md:border-t-0 border-slate-800/60">
                    {getStatusBadge(entry.status)}

                    <a
                      href={`https://www.binance.com/es/trade/${symbolClean}_USDT`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title="Abrir par en Binance"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3.5 pt-3.5 border-t border-slate-800 text-xs sm:text-sm text-slate-300 bg-slate-950/80 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs sm:text-sm text-slate-300">
                        <strong className="text-cyan-400">Detalles de Ejecución:</strong> {entry.notes || 'Disparo registrado automáticamente por el radar.'}
                      </div>
                      <div className="text-xs font-mono text-slate-500">
                        Registro: {timeObj.full} · Strategy ID: #{entry.strategyId}
                      </div>
                    </div>
                    {entry.takeProfitsCount !== undefined && entry.takeProfitsCount > 0 && (
                      <div className="shrink-0 text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-bold">
                        {entry.takeProfitsCount} órdenes TP en cola
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Footer Info */}
      <div className="bg-slate-950/90 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs sm:text-sm text-slate-400 font-mono">
        <span>Mostrando {filteredLogs.length} de {logs.length} alertas registradas</span>
        <span>Persistencia local activada</span>
      </div>

    </div>
  );
};
