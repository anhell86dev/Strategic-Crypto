import React, { useEffect, useState } from 'react';
import { Minimize2, Rows, Maximize2 } from 'lucide-react';

export type DensityMode = 'compact' | 'standard' | 'spacious';

const DENSITY_STORAGE_KEY = 'crypto_radar_density_mode';

export const DensityToggle: React.FC = () => {
  const [density, setDensity] = useState<DensityMode>(() => {
    try {
      const saved = localStorage.getItem(DENSITY_STORAGE_KEY) as DensityMode;
      return saved === 'compact' || saved === 'spacious' ? saved : 'standard';
    } catch {
      return 'standard';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
    document.body.setAttribute('data-density', density);
    try {
      localStorage.setItem(DENSITY_STORAGE_KEY, density);
    } catch (e) {
      console.warn('Could not save density preference:', e);
    }
  }, [density]);

  return (
    <div 
      className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono select-none shadow-inner"
      title="Ajustar densidad y tamaño de visualización (Compacto / Estándar / Espacioso)"
    >
      <button
        type="button"
        onClick={() => setDensity('compact')}
        className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
          density === 'compact'
            ? 'bg-slate-800 text-cyan-300 font-bold shadow-xs'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="Modo Compacto (Mayor cantidad de monedas por pantalla)"
      >
        <Minimize2 className="w-3.5 h-3.5" />
        <span className="hidden xl:inline">Compacto</span>
      </button>

      <button
        type="button"
        onClick={() => setDensity('standard')}
        className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
          density === 'standard'
            ? 'bg-slate-800 text-cyan-300 font-bold shadow-xs'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="Modo Estándar (Equilibrado para monitores medianos)"
      >
        <Rows className="w-3.5 h-3.5" />
        <span className="hidden xl:inline">Estándar</span>
      </button>

      <button
        type="button"
        onClick={() => setDensity('spacious')}
        className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
          density === 'spacious'
            ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
            : 'text-slate-400 hover:text-cyan-300'
        }`}
        title="Modo Espacioso (Texto grande, ultra legible para pantallas grandes / 4K)"
      >
        <Maximize2 className="w-3.5 h-3.5" />
        <span className="hidden xl:inline">Espacioso</span>
      </button>
    </div>
  );
};
