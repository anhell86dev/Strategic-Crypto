import React from 'react';
import { Target, ArrowDownUp } from 'lucide-react';

interface LegendBannerProps {
  alertCount: number;
}

export const LegendBanner: React.FC<LegendBannerProps> = ({ alertCount }) => {
  return (
    <div className="bg-gradient-to-r from-blue-950/50 via-slate-900/80 to-slate-950 border border-blue-900/60 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm shadow-xl">
      <div className="flex items-start md:items-center gap-3.5">
        <div className="p-2.5 rounded-xl bg-blue-500/10 text-cyan-400 border border-blue-500/30 shrink-0">
          <ArrowDownUp className="w-5 h-5" />
        </div>
        <div>
          <p className="text-slate-200 font-medium leading-relaxed">
            <strong className="text-cyan-300 font-bold">Motor de Ordenamiento Dinámico:</strong> Las estrategias se actualizan en tiempo real por distancia porcentual al precio de entrada planificado. Las operaciones más próximas al trigger lideran la cabecera.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-900/40 border border-cyan-500/50 rounded-xl text-cyan-300 font-mono text-xs sm:text-sm">
          <Target className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>Zona de Alerta (&lt; 1.5%):</span>
          <span className="font-black text-white bg-cyan-500/20 px-2 py-0.5 rounded-md">
            {alertCount} {alertCount === 1 ? 'activa' : 'activas'}
          </span>
        </div>
      </div>
    </div>
  );
};
