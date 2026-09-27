import React, { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { klineCache, SparklinePoint } from '../services/klineService';

interface MiniSparklineProps {
  symbol: string;
  currentPrice?: number;
  isAlert?: boolean;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  symbol,
  currentPrice,
  isAlert
}) => {
  const [data, setData] = useState<SparklinePoint[]>(() => {
    return klineCache.getCached(symbol) || [];
  });

  useEffect(() => {
    const unsub = klineCache.subscribe(symbol, (points) => {
      setData(points);
    });
    return unsub;
  }, [symbol]);

  // If we have a currentPrice and empty data, trigger synthetic seed
  useEffect(() => {
    if (data.length === 0 && currentPrice && currentPrice > 0) {
      klineCache.updateLatestTick(symbol, currentPrice);
    }
  }, [symbol, currentPrice, data.length]);

  // Compute 15m price metrics
  const { minPrice, maxPrice, change15m, isUp, gradientId } = useMemo(() => {
    const symClean = symbol.replace(/[^a-zA-Z0-9]/g, '');
    const gradId = `sparkGrad_${symClean}`;

    if (!data || data.length === 0) {
      const p = currentPrice || 100;
      return {
        minPrice: p * 0.99,
        maxPrice: p * 1.01,
        change15m: 0,
        isUp: true,
        gradientId: gradId
      };
    }

    let min = Infinity;
    let max = -Infinity;
    data.forEach(d => {
      if (d.price < min) min = d.price;
      if (d.price > max) max = d.price;
    });

    const firstPrice = data[0].price;
    const lastPrice = data[data.length - 1].price;
    const diff = lastPrice - firstPrice;
    const changePct = firstPrice > 0 ? (diff / firstPrice) * 100 : 0;
    const up = changePct >= 0;

    // Buffer Y axis domain slightly
    const padding = (max - min) * 0.1 || (min * 0.002);

    return {
      minPrice: Math.max(0, min - padding),
      maxPrice: max + padding,
      change15m: changePct,
      isUp: up,
      gradientId: gradId
    };
  }, [data, currentPrice, symbol]);

  const strokeColor = isAlert 
    ? '#38bdf8' // light cyan for alert
    : isUp 
    ? '#10b981' // emerald
    : '#f43f5e'; // rose

  const formatTooltipPrice = (val: number) => {
    if (val >= 1000) return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (val >= 1) return `$${val.toFixed(2)}`;
    if (val >= 0.01) return `$${val.toFixed(4)}`;
    return `$${val.toFixed(6)}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as SparklinePoint;
      return (
        <div className="bg-slate-950/95 border border-slate-700/80 rounded-md px-2 py-1 shadow-xl text-[10px] font-mono pointer-events-none backdrop-blur-md z-50">
          <div className="text-slate-400">{item.time}</div>
          <div className="font-bold text-white tabular-nums">{formatTooltipPrice(item.price)}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex items-center gap-2 w-full max-w-[130px] sm:max-w-[150px] select-none">
      {/* 15m Sparkline SVG Chart */}
      <div className="h-8 w-20 sm:w-24 relative overflow-visible">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 1, bottom: 2, left: 1 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <YAxis domain={[minPrice, maxPrice]} hide />
              <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
              <Area
                type="monotone"
                dataKey="price"
                stroke={strokeColor}
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 3, fill: strokeColor, stroke: '#020617', strokeWidth: 1.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="w-12 h-0.5 bg-slate-800 rounded animate-pulse" />
          </div>
        )}
      </div>

      {/* 15m Delta Badge */}
      <div className="flex flex-col items-start leading-none shrink-0 font-mono">
        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
          15m
        </span>
        <span
          className={`text-[10px] font-bold tabular-nums ${
            isAlert
              ? 'text-cyan-300'
              : isUp
              ? 'text-emerald-400'
              : 'text-rose-400'
          }`}
        >
          {change15m >= 0 ? '+' : ''}{change15m.toFixed(2)}%
        </span>
      </div>
    </div>
  );
};
