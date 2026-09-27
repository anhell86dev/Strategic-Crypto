import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const GuatemalaClock: React.FC = () => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Formatter for America/Guatemala (UTC-6)
      const timeFormatter = new Intl.DateTimeFormat('es-GT', {
        timeZone: 'America/Guatemala',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      const dateFormatter = new Intl.DateTimeFormat('es-GT', {
        timeZone: 'America/Guatemala',
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });

      setTimeStr(timeFormatter.format(now));
      setDateStr(dateFormatter.format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="flex items-center gap-2 bg-slate-900/90 border border-cyan-500/40 px-3 py-1.5 rounded-xl shadow-md font-mono text-xs text-slate-200"
      title="Hora oficial de Guatemala (GMT-6 / CST) sincronizada con los análisis de la hoja"
    >
      <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
      <div className="flex items-center gap-1.5">
        <span className="text-slate-400 font-bold uppercase tracking-wider hidden lg:inline">Guatemala:</span>
        <span className="text-cyan-300 font-extrabold text-xs sm:text-sm tracking-tight">{timeStr}</span>
        <span className="text-slate-500 text-[10px] hidden sm:inline">({dateStr} · GMT-6)</span>
      </div>
    </div>
  );
};
