import React from 'react';
import { Target, Zap, Info, ArrowDownUp } from 'lucide-react';

interface LegendBannerProps {
  alertCount: number;
}

export const LegendBanner: React.FC<LegendBannerProps> = ({ alertCount }) => {
  return (
    <div className="bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-slate-950 border border-blue-900/40 rounded-xl p-3.5 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
      <div className="flex items-start md:items-center gap-3">
        <div className="p-1.5 rounded-lg bg-blue-500/10 text-cyan-400 border border-blue-500/20 shrink-0">
          <ArrowDownUp className="w-4 h-4" />
        </div>
        <div>
          <p className="text-slate-200 font-medium leading-relaxed">
            <strong className="text-cyan-300">Motor de Ordenamiento Dinámico:</strong> Las estrategias se ordenan automáticamente en tiempo real según la distancia porcentual al precio de entrada planificado. Las operaciones más próximas al trigger se posicionan en la cabecera.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-900/30 border border-cyan-500/40 rounded-lg text-cyan-300 font-mono text-[11px]">
          <Target className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Zona de Alerta (&lt; 1.5%):</span>
          <span className="font-bold text-white bg-cyan-500/20 px-1.5 py-0.2 rounded">
            {alertCount} {alertCount === 1 ? 'activa' : 'activas'}
          </span>
        </div>
      </div>
    </div>
  );
};
