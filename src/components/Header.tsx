import React from 'react';
import { 
  Radio, 
  RotateCw, 
  Search, 
  Settings, 
  Volume2, 
  VolumeX, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Activity,
  Filter
} from 'lucide-react';
import { ConnectionStatus } from '../types';

interface HeaderProps {
  sheetsStatus: ConnectionStatus;
  binanceStatus: ConnectionStatus;
  lastSyncTime: Date | null;
  isSyncing: boolean;
  onManualSync: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  directionFilter: 'ALL' | 'LONG' | 'SHORT';
  onDirectionChange: (dir: 'ALL' | 'LONG' | 'SHORT') => void;
  statusFilter: string;
  onStatusChange: (st: string) => void;
  onOpenSettings: () => void;
  onOpenAddStrategy: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  tickCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  sheetsStatus,
  binanceStatus,
  lastSyncTime,
  isSyncing,
  onManualSync,
  searchQuery,
  onSearchChange,
  directionFilter,
  onDirectionChange,
  statusFilter,
  onStatusChange,
  onOpenSettings,
  onOpenAddStrategy,
  soundEnabled,
  onToggleSound,
  tickCount,
}) => {
  const formatTime = (d: Date | null) => {
    if (!d) return '--:--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'bg-emerald-500 text-emerald-400';
      case 'connecting':
        return 'bg-amber-500 text-amber-400';
      case 'error':
        return 'bg-rose-500 text-rose-400';
      default:
        return 'bg-slate-500 text-slate-400';
    }
  };

  const getStatusLabel = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'En línea';
      case 'connecting':
        return 'Sincronizando';
      case 'error':
        return 'Desconectado';
      default:
        return 'Inactivo';
    }
  };

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-30 transition-all">
      {/* Primary Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Brand Zone & Semáforos de Estado */}
        <div className="flex items-center justify-between md:justify-start gap-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                  Crypto Strategy Radar
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-cyan-950 text-cyan-400 border border-cyan-800/60 rounded">
                  Live v4
                </span>
              </div>
              <p className="text-xs text-slate-400 font-normal">
                Monitoreo continuo de entradas y distancias de trading
              </p>
            </div>
          </div>

          {/* Semáforos de Conexión */}
          <div className="flex items-center gap-3 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
            {/* Sheets Status */}
            <div className="flex items-center gap-1.5" title="Estado de conexión con Google Sheets">
              <span className={`w-2 h-2 rounded-full ${sheetsStatus === 'connected' ? 'bg-emerald-400 ring-2 ring-emerald-500/20' : sheetsStatus === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'}`}></span>
              <span className="text-slate-400 hidden sm:inline">Sheets:</span>
              <span className={getStatusColor(sheetsStatus).split(' ')[1]}>
                {getStatusLabel(sheetsStatus)}
              </span>
            </div>

            <span className="text-slate-700" aria-hidden="true">|</span>

            {/* Binance Live Stream Status */}
            <div className="flex items-center gap-1.5" title={`Binance WebSockets (${tickCount} ticks recibidos)`}>
              <span className="relative flex h-2 w-2">
                {binanceStatus === 'connected' && (
                  <span className="animate-ping-fast absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${binanceStatus === 'connected' ? 'bg-emerald-500' : binanceStatus === 'connecting' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
              </span>
              <span className="text-slate-400 hidden sm:inline">Binance:</span>
              <span className={getStatusColor(binanceStatus).split(' ')[1]}>
                {binanceStatus === 'connected' ? 'Live WSS' : getStatusLabel(binanceStatus)}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Actions & Tool Bar */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Audio Alert Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Alertas sonoras activadas' : 'Alertas sonoras silenciadas'}
            className={`p-2 rounded-lg text-xs font-medium transition-colors border ${
              soundEnabled
                ? 'bg-slate-900 border-cyan-500/30 text-cyan-400 hover:bg-slate-800'
                : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Sync Button & Timestamp */}
          <div className="flex items-center bg-slate-900/80 border border-slate-800 rounded-lg p-1">
            <button
              onClick={onManualSync}
              disabled={isSyncing}
              title="Forzar sincronización con Google Sheets"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded transition-all disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar Docs</span>
            </button>
            <div className="px-2 text-[11px] text-slate-400 font-mono border-l border-slate-800 hidden md:block">
              {formatTime(lastSyncTime)}
            </div>
          </div>

          {/* Add Strategy Button */}
          <button
            onClick={onOpenAddStrategy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm shadow-cyan-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Estrategia</span>
          </button>

          {/* Settings / Sheets Config */}
          <button
            onClick={onOpenSettings}
            title="Configuración de Google Sheets y Binance"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Direction & Status Filters */}
      <div className="border-t border-slate-900 bg-slate-950/60 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Buscador Inteligente */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por símbolo (ej. BTC, SOL, SUI, ETH)..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-900/90 border border-slate-800 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 rounded-lg text-slate-100 placeholder-slate-500 transition-all outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Controls: Direction & Status */}
          <div className="flex items-center flex-wrap gap-3">
            
            {/* Direction Filter Segmented Control */}
            <div className="flex items-center p-0.5 bg-slate-900 rounded-lg border border-slate-800 text-xs font-medium">
              <button
                onClick={() => onDirectionChange('ALL')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  directionFilter === 'ALL'
                    ? 'bg-slate-800 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => onDirectionChange('LONG')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  directionFilter === 'LONG'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                    : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                <span className="text-emerald-400">▲</span> LONG
              </button>
              <button
                onClick={() => onDirectionChange('SHORT')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  directionFilter === 'SHORT'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold'
                    : 'text-slate-400 hover:text-rose-400'
                }`}
              >
                <span className="text-rose-400">▼</span> SHORT
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 text-[11px] hidden sm:inline">Estado:</span>
              <select
                value={statusFilter}
                onChange={(e) => onStatusChange(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1 focus:border-cyan-500 outline-none"
              >
                <option value="ALL">Todos los estados</option>
                <option value="Active">Solo Activos (Active)</option>
                <option value="Pending">Pendientes (Pending)</option>
                <option value="Completed">Completados (Completed)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
