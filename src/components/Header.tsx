import React from 'react';
import { 
  Radio, 
  RotateCw, 
  Settings, 
  Volume2, 
  VolumeX, 
  Plus, 
  Activity,
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { DensityToggle } from './DensityToggle';
import { ConnectionStatus } from '../types';

interface HeaderProps {
  sheetsStatus: ConnectionStatus;
  binanceStatus: ConnectionStatus;
  lastSyncTime: Date | null;
  isSyncing: boolean;
  onManualSync: () => void;
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
        return 'text-emerald-400';
      case 'connecting':
        return 'text-amber-400';
      case 'error':
        return 'text-rose-400';
      default:
        return 'text-slate-400';
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
    <header className="border-b border-slate-800/90 bg-slate-950/95 backdrop-blur-md sticky top-0 z-30 transition-all shadow-md">
      {/* Primary Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Brand Zone & Semáforos de Estado */}
        <div className="flex items-center justify-between md:justify-start gap-6">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/20 ring-1 ring-cyan-400/40">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-extrabold text-xl sm:text-2xl tracking-tight text-white flex items-center gap-2">
                  Crypto Strategy Radar
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-bold font-mono uppercase tracking-wider bg-cyan-950 text-cyan-400 border border-cyan-700/60 rounded-md">
                  Live Feed
                </span>
              </div>
              <p className="text-sm text-slate-400 font-medium">
                Monitoreo continuo de entradas, distancias y Take Profits
              </p>
            </div>
          </div>

          {/* Semáforos de Conexión */}
          <div className="flex items-center gap-3.5 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 text-xs sm:text-sm font-mono">
            {/* Sheets Status */}
            <div className="flex items-center gap-2" title="Estado de sincronización con Google Sheets">
              <span className={`w-2.5 h-2.5 rounded-full ${
                sheetsStatus === 'connected' ? 'bg-emerald-400 ring-2 ring-emerald-500/30' : sheetsStatus === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'
              }`} />
              <span className="text-slate-400 hidden sm:inline">Sheets:</span>
              <span className={`font-bold ${getStatusColor(sheetsStatus)}`}>
                {getStatusLabel(sheetsStatus)}
              </span>
            </div>

            <span className="text-slate-700 font-bold" aria-hidden="true">|</span>

            {/* Binance Live Stream Status */}
            <div className="flex items-center gap-2" title={`Binance WebSockets (${tickCount.toLocaleString()} ticks recibidos)`}>
              <span className="relative flex h-2.5 w-2.5">
                {binanceStatus === 'connected' && (
                  <span className="animate-ping-fast absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  binanceStatus === 'connected' ? 'bg-emerald-500' : binanceStatus === 'connecting' ? 'bg-amber-500' : 'bg-rose-500'
                }`} />
              </span>
              <span className="text-slate-400 hidden sm:inline">Binance:</span>
              <span className={`font-bold ${getStatusColor(binanceStatus)}`}>
                {binanceStatus === 'connected' ? 'Live WSS' : getStatusLabel(binanceStatus)}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Actions & Tool Bar */}
        <div className="flex items-center flex-wrap gap-3 justify-end">
          {/* Density Mode Switcher (Compact / Standard / Spacious) */}
          <DensityToggle />

          {/* Audio Alert Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Alertas sonoras activadas' : 'Alertas sonoras silenciadas'}
            className={`p-2.5 rounded-xl text-sm font-medium transition-colors border cursor-pointer ${
              soundEnabled
                ? 'bg-slate-900 border-cyan-500/40 text-cyan-400 hover:bg-slate-800'
                : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Sync Button & Timestamp */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={onManualSync}
              disabled={isSyncing}
              title="Forzar sincronización con Google Sheets"
              className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar Docs</span>
            </button>
            <div className="px-2.5 text-xs text-slate-400 font-mono border-l border-slate-800 hidden md:block">
              {formatTime(lastSyncTime)}
            </div>
          </div>

          {/* Add Strategy Button */}
          <button
            onClick={onOpenAddStrategy}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl shadow-md shadow-cyan-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva Estrategia</span>
          </button>

          {/* Settings / Sheets Config */}
          <button
            onClick={onOpenSettings}
            title="Configuración de Google Sheets y Binance"
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
