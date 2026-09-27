import React, { useMemo } from 'react';
import { TakeProfitOrder } from '../types';
import { Check } from 'lucide-react';

interface HorizontalPriceTrackProps {
  symbol: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  currentPrice?: number;
  orders: TakeProfitOrder[];
}

export const HorizontalPriceTrack: React.FC<HorizontalPriceTrackProps> = ({
  type,
  entryPrice,
  stopLoss,
  currentPrice,
  orders = []
}) => {
  const isLong = type === 'LONG';
  const livePrice = currentPrice && currentPrice > 0 ? currentPrice : entryPrice;

  // Format currency helper
  const formatPrice = (val?: number) => {
    if (val === undefined || isNaN(val) || val <= 0) return '$0.00';
    if (val >= 1000) return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (val >= 1) return `$${val.toFixed(2)}`;
    if (val >= 0.01) return `$${val.toFixed(4)}`;
    return `$${val.toFixed(6)}`;
  };

  // Derive TPs from orders
  const tps = useMemo(() => {
    if (orders.length > 0) {
      return orders.filter(o => o.targetPrice && o.targetPrice > 0);
    }
    // Fallback default 3 tiers if no TP in sheet
    return [
      { type: 'TP1', targetPrice: isLong ? entryPrice * 1.03 : entryPrice * 0.97, closePercentage: 40 },
      { type: 'TP2', targetPrice: isLong ? entryPrice * 1.06 : entryPrice * 0.94, closePercentage: 35 },
      { type: 'TP3', targetPrice: isLong ? entryPrice * 1.10 : entryPrice * 0.90, closePercentage: 25 },
    ];
  }, [orders, entryPrice, isLong]);

  // Calculate continuous min/max range
  const { minScale, maxScale, scaleSpan } = useMemo(() => {
    const allPrices = [livePrice, entryPrice, stopLoss, ...tps.map(t => t.targetPrice)].filter(p => p > 0);
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const padding = (max - min) * 0.07 || (min * 0.02);

    const minS = Math.max(0, min - padding);
    const maxS = max + padding;
    return {
      minScale: minS,
      maxScale: maxS,
      scaleSpan: Math.max(0.000001, maxS - minS)
    };
  }, [livePrice, entryPrice, stopLoss, tps]);

  // Calculate relative % position on track
  const getPos = (price: number) => {
    const pct = ((price - minScale) / scaleSpan) * 100;
    return Math.max(3, Math.min(97, pct));
  };

  const livePos = getPos(livePrice);
  const entryPos = getPos(entryPrice);
  const slPos = getPos(stopLoss);

  // Check if current price is in danger zone or hit SL
  const isSlHit = isLong ? livePrice <= stopLoss : livePrice >= stopLoss;

  return (
    <div className="w-full py-5 px-2 relative select-none font-mono text-xs">
      
      {/* 1. Track Bar Line */}
      <div className="h-2 rounded-full bg-slate-800 border border-slate-700/80 relative shadow-inner overflow-visible">
        
        {/* SL Risk Zone Background */}
        <div 
          className="absolute top-0 bottom-0 rounded-full bg-rose-500/20"
          style={{
            left: `${Math.min(slPos, entryPos)}%`,
            width: `${Math.abs(slPos - entryPos)}%`
          }}
        />

        {/* Profit Zone Background */}
        <div 
          className="absolute top-0 bottom-0 rounded-full bg-emerald-500/20"
          style={{
            left: `${Math.min(entryPos, getPos(tps[tps.length - 1]?.targetPrice || entryPrice))}%`,
            width: `${Math.abs(entryPos - getPos(tps[tps.length - 1]?.targetPrice || entryPrice))}%`
          }}
        />

        {/* Active Progress Trajectory Fill (from Entry to Live Price) */}
        <div 
          className={`absolute top-0 bottom-0 rounded-full transition-all duration-300 ${
            (isLong ? livePrice >= entryPrice : livePrice <= entryPrice)
              ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
              : 'bg-rose-400 shadow-[0_0_8px_#f43f5e]'
          }`}
          style={{
            left: `${Math.min(livePos, entryPos)}%`,
            width: `${Math.max(1, Math.abs(livePos - entryPos))}%`
          }}
        />
      </div>

      {/* 2. Stop Loss (SL) Marker */}
      <div 
        className="absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
        style={{ left: `${slPos}%`, transform: 'translate(-50%, -50%)' }}
      >
        <div className={`w-3.5 h-3.5 rounded-full border-2 border-slate-950 flex items-center justify-center text-[7px] font-black shadow-md ${
          isSlHit ? 'bg-rose-500 text-white animate-pulse' : 'bg-rose-400 text-slate-950'
        }`}>
          SL
        </div>
        <div className="absolute top-4 text-center whitespace-nowrap">
          <span className="text-[10px] font-bold text-rose-400 block bg-slate-950/85 px-1 rounded shadow-xs">
            {formatPrice(stopLoss)}
          </span>
        </div>
      </div>

      {/* 3. Planned Entry Marker */}
      <div 
        className="absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
        style={{ left: `${entryPos}%`, transform: 'translate(-50%, -50%)' }}
      >
        <div className="w-4 h-4 rounded-full bg-cyan-400 border-2 border-slate-950 ring-2 ring-cyan-500/30 flex items-center justify-center text-[8px] font-black text-slate-950 shadow-md">
          E
        </div>
        <div className="absolute top-4 text-center whitespace-nowrap">
          <span className="text-[10px] font-bold text-cyan-300 block bg-slate-950/85 px-1 rounded shadow-xs">
            Entrada: {formatPrice(entryPrice)}
          </span>
        </div>
      </div>

      {/* 4. Live Price Glowing Pin */}
      <div 
        className="absolute top-1/2 -translate-y-1/2 z-30 flex flex-col items-center pointer-events-none transition-all duration-300"
        style={{ left: `${livePos}%`, transform: 'translate(-50%, -50%)' }}
      >
        <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-cyan-500 shadow-[0_0_10px_#38bdf8] flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping-fast" />
        </div>
        <div className="absolute bottom-4 text-center whitespace-nowrap">
          <span className="text-[10px] font-black bg-cyan-500 text-slate-950 px-1.5 py-0.2 rounded shadow-md">
            Live {formatPrice(livePrice)}
          </span>
        </div>
      </div>

      {/* 5. Take Profit Markers (TP1, TP2, TP3, TP4...) */}
      {tps.map((tp, idx) => {
        const tpPos = getPos(tp.targetPrice);
        const isHit = isLong ? livePrice >= tp.targetPrice : livePrice <= tp.targetPrice;

        return (
          <div 
            key={idx}
            className="absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
            style={{ left: `${tpPos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className={`w-3.5 h-3.5 rounded-full border-2 border-slate-950 flex items-center justify-center shadow-md ${
              isHit 
                ? 'bg-emerald-400 text-slate-950 font-black ring-2 ring-emerald-400/50' 
                : 'bg-emerald-500/80 text-white font-bold'
            }`}>
              {isHit ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <span className="text-[7px]">{idx + 1}</span>}
            </div>

            <div className="absolute top-4 text-center whitespace-nowrap">
              <span className={`text-[10px] font-bold block bg-slate-950/85 px-1 rounded shadow-xs ${
                isHit ? 'text-emerald-300 underline' : 'text-emerald-400'
              }`}>
                {tp.type || `TP${idx + 1}`}: {formatPrice(tp.targetPrice)}
              </span>
            </div>
          </div>
        );
      })}

    </div>
  );
};
