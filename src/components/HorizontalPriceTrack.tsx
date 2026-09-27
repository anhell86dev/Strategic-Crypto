import React, { useMemo } from 'react';
import { TakeProfitOrder } from '../types';
import { Check, Target, ShieldAlert, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface HorizontalPriceTrackProps {
  symbol: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  e2Price?: number;
  e3Price?: number;
  stopLoss: number;
  currentPrice?: number;
  orders: TakeProfitOrder[];
}

export const HorizontalPriceTrack: React.FC<HorizontalPriceTrackProps> = ({
  type,
  entryPrice,
  e2Price,
  e3Price,
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

  // Helper to calculate signed % distance from LIVE price to a target price
  const getDeltaPct = (targetPrice?: number) => {
    if (!targetPrice || targetPrice <= 0 || !livePrice || livePrice <= 0) return null;
    const delta = ((targetPrice - livePrice) / livePrice) * 100;
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(2)}%`;
  };

  // Determine DCA levels E2 and E3 if present or valid
  const hasE2 = e2Price !== undefined && e2Price > 0;
  const hasE3 = e3Price !== undefined && e3Price > 0;

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

  // Calculate continuous min/max range including all Entries (E1, E2, E3), SL, Live, and TPs
  const { minScale, maxScale, scaleSpan } = useMemo(() => {
    const allPrices = [
      livePrice, 
      entryPrice, 
      ...(hasE2 && e2Price ? [e2Price] : []),
      ...(hasE3 && e3Price ? [e3Price] : []),
      stopLoss, 
      ...tps.map(t => t.targetPrice)
    ].filter(p => p > 0);

    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const padding = (max - min) * 0.09 || (min * 0.03);

    const minS = Math.max(0, min - padding);
    const maxS = max + padding;
    return {
      minScale: minS,
      maxScale: maxS,
      scaleSpan: Math.max(0.000001, maxS - minS)
    };
  }, [livePrice, entryPrice, e2Price, e3Price, hasE2, hasE3, stopLoss, tps]);

  // Calculate relative % position on track
  const getPos = (price: number) => {
    const pct = ((price - minScale) / scaleSpan) * 100;
    return Math.max(3, Math.min(97, pct));
  };

  const livePos = getPos(livePrice);
  const e1Pos = getPos(entryPrice);
  const e2Pos = hasE2 && e2Price ? getPos(e2Price) : null;
  const e3Pos = hasE3 && e3Price ? getPos(e3Price) : null;
  const slPos = getPos(stopLoss);

  // Check if current price is in danger zone or hit SL
  const isSlHit = isLong ? livePrice <= stopLoss : livePrice >= stopLoss;

  // Furthest entry position for zone drawing
  const lowestEntryPrice = Math.min(entryPrice, ...(hasE2 && e2Price ? [e2Price] : []), ...(hasE3 && e3Price ? [e3Price] : []));
  const highestEntryPrice = Math.max(entryPrice, ...(hasE2 && e2Price ? [e2Price] : []), ...(hasE3 && e3Price ? [e3Price] : []));
  const furthestEntryPos = getPos(lowestEntryPrice);
  const nearestEntryPos = getPos(highestEntryPrice);

  const highestTpPrice = Math.max(...tps.map(t => t.targetPrice));
  const tpMaxPos = getPos(highestTpPrice);

  return (
    <div className="w-full py-8 px-3 relative select-none font-mono text-xs">
      
      {/* 1. Track Bar Line */}
      <div className="h-3 rounded-full bg-slate-900 border border-slate-700/90 relative shadow-inner overflow-visible">
        
        {/* SL Risk Zone Background */}
        <div 
          className="absolute top-0 bottom-0 rounded-full bg-rose-500/25 border-r border-rose-500/40"
          style={{
            left: `${Math.min(slPos, furthestEntryPos)}%`,
            width: `${Math.abs(slPos - furthestEntryPos)}%`
          }}
        />

        {/* DCA Zone Background (between E3 and E1) */}
        {(hasE2 || hasE3) && (
          <div 
            className="absolute top-0 bottom-0 rounded-full bg-cyan-500/20 border-x border-cyan-400/40"
            style={{
              left: `${Math.min(furthestEntryPos, nearestEntryPos)}%`,
              width: `${Math.abs(furthestEntryPos - nearestEntryPos)}%`
            }}
          />
        )}

        {/* Profit Zone Background */}
        <div 
          className="absolute top-0 bottom-0 rounded-full bg-emerald-500/25 border-l border-emerald-500/40"
          style={{
            left: `${Math.min(e1Pos, tpMaxPos)}%`,
            width: `${Math.abs(e1Pos - tpMaxPos)}%`
          }}
        />

        {/* Active Progress Trajectory Fill (from Entry to Live Price) */}
        <div 
          className={`absolute top-0 bottom-0 rounded-full transition-all duration-300 ${
            (isLong ? livePrice >= entryPrice : livePrice <= entryPrice)
              ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_12px_#34d399]'
              : 'bg-gradient-to-r from-rose-500 to-amber-400 shadow-[0_0_12px_#f43f5e]'
          }`}
          style={{
            left: `${Math.min(livePos, e1Pos)}%`,
            width: `${Math.max(1.5, Math.abs(livePos - e1Pos))}%`
          }}
        />
      </div>

      {/* 2. Stop Loss (SL) Marker */}
      <div 
        className="absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
        style={{ left: `${slPos}%`, transform: 'translate(-50%, -50%)' }}
      >
        <div className={`w-4 h-4 rounded-full border-2 border-slate-950 flex items-center justify-center text-[7px] font-black shadow-md ${
          isSlHit ? 'bg-rose-500 text-white animate-pulse' : 'bg-rose-400 text-slate-950'
        }`}>
          SL
        </div>
        <div className="absolute top-5 text-center whitespace-nowrap">
          <span className="text-[10px] font-bold text-rose-300 block bg-slate-950/95 border border-rose-900/80 px-1.5 py-0.5 rounded shadow-md">
            SL: {formatPrice(stopLoss)}
            <span className="text-[9px] font-extrabold text-rose-400 block -mt-0.5">
              {getDeltaPct(stopLoss)}
            </span>
          </span>
        </div>
      </div>

      {/* 3. Extreme Entry DCA E3 Marker (if present) */}
      {hasE3 && e3Price && e3Pos !== null && (
        <div 
          className="absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
          style={{ left: `${e3Pos}%`, transform: 'translate(-50%, -50%)' }}
        >
          <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-950 flex items-center justify-center text-[7px] font-black text-slate-950 shadow-md">
            E3
          </div>
          <div className="absolute bottom-5 text-center whitespace-nowrap">
            <span className="text-[10px] font-bold text-amber-300 block bg-slate-950/95 border border-amber-800/80 px-1.5 py-0.5 rounded shadow-md">
              E3: {formatPrice(e3Price)}
              <span className="text-[9px] font-extrabold text-amber-400 block -mt-0.5">
                {getDeltaPct(e3Price)}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* 4. Reinforcement DCA E2 Marker (if present) */}
      {hasE2 && e2Price && e2Pos !== null && (
        <div 
          className="absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
          style={{ left: `${e2Pos}%`, transform: 'translate(-50%, -50%)' }}
        >
          <div className="w-3.5 h-3.5 rounded-full bg-sky-400 border-2 border-slate-950 flex items-center justify-center text-[7px] font-black text-slate-950 shadow-md">
            E2
          </div>
          <div className="absolute top-5 text-center whitespace-nowrap">
            <span className="text-[10px] font-bold text-sky-300 block bg-slate-950/95 border border-sky-800/80 px-1.5 py-0.5 rounded shadow-md">
              E2: {formatPrice(e2Price)}
              <span className="text-[9px] font-extrabold text-sky-400 block -mt-0.5">
                {getDeltaPct(e2Price)}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* 5. Main Entry E1 Marker */}
      <div 
        className="absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
        style={{ left: `${e1Pos}%`, transform: 'translate(-50%, -50%)' }}
      >
        <div className="w-4 h-4 rounded-full bg-cyan-400 border-2 border-slate-950 ring-2 ring-cyan-500/40 flex items-center justify-center text-[7px] font-black text-slate-950 shadow-md">
          E1
        </div>
        <div className="absolute bottom-5 text-center whitespace-nowrap">
          <span className="text-[10px] font-bold text-cyan-300 block bg-slate-950/95 border border-cyan-700/90 px-1.5 py-0.5 rounded shadow-md ring-1 ring-cyan-500/20">
            E1: {formatPrice(entryPrice)}
            <span className="text-[9px] font-extrabold text-cyan-400 block -mt-0.5">
              {getDeltaPct(entryPrice)}
            </span>
          </span>
        </div>
      </div>

      {/* 6. Live Price Glowing Pin */}
      <div 
        className="absolute top-1/2 -translate-y-1/2 z-30 flex flex-col items-center pointer-events-none transition-all duration-300"
        style={{ left: `${livePos}%`, transform: 'translate(-50%, -50%)' }}
      >
        <div className="w-4 h-4 rounded-full bg-white border-2 border-cyan-400 shadow-[0_0_14px_#38bdf8] flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping-fast" />
        </div>
        <div className="absolute top-5 text-center whitespace-nowrap">
          <span className="text-[10px] font-black bg-cyan-400 text-slate-950 px-2 py-0.5 rounded shadow-lg ring-1 ring-cyan-300">
            Live {formatPrice(livePrice)}
          </span>
        </div>
      </div>

      {/* 7. Take Profit Markers (TP1, TP2, TP3, TP4...) */}
      {tps.map((tp, idx) => {
        const tpPos = getPos(tp.targetPrice);
        const isHit = isLong ? livePrice >= tp.targetPrice : livePrice <= tp.targetPrice;
        const isEven = idx % 2 === 0;

        return (
          <div 
            key={idx}
            className="absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
            style={{ left: `${tpPos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className={`w-4 h-4 rounded-full border-2 border-slate-950 flex items-center justify-center shadow-md ${
              isHit 
                ? 'bg-emerald-400 text-slate-950 font-black ring-2 ring-emerald-400/50' 
                : 'bg-emerald-500/80 text-white font-bold'
            }`}>
              {isHit ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <span className="text-[7px]">{idx + 1}</span>}
            </div>

            <div className={`absolute ${isEven ? 'bottom-5' : 'top-5'} text-center whitespace-nowrap`}>
              <span className={`text-[10px] font-bold block bg-slate-950/95 border border-emerald-900/80 px-1.5 py-0.5 rounded shadow-md ${
                isHit ? 'text-emerald-300 underline ring-1 ring-emerald-500/50' : 'text-emerald-400'
              }`}>
                {tp.type || `TP${idx + 1}`}: {formatPrice(tp.targetPrice)}
                <span className="text-[9px] font-extrabold text-emerald-300 block -mt-0.5">
                  {getDeltaPct(tp.targetPrice)}
                </span>
              </span>
            </div>
          </div>
        );
      })}

    </div>
  );
};
