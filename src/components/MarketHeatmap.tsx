import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { StrategyWithOrders } from '../types';
import { 
  Flame, 
  Target, 
  Layers, 
  Maximize2, 
  Minimize2, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  Info,
  Sparkles
} from 'lucide-react';

interface MarketHeatmapProps {
  strategies: StrategyWithOrders[];
  onSelectCoin?: (symbol: string) => void;
}

interface TreemapLeaf {
  id: number;
  symbol: string;
  coinName: string;
  distancePercent: number;
  entryPrice: number;
  currentPrice: number;
  type: 'LONG' | 'SHORT';
  status: string;
  isAlert: boolean;
  value: number; // sizing weight
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
}

export const MarketHeatmap: React.FC<MarketHeatmapProps> = ({
  strategies,
  onSelectCoin
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 260 });
  const [hoveredLeaf, setHoveredLeaf] = useState<TreemapLeaf | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<'treemap' | 'grid'>('treemap');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Resize listener
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          // Dynamic height based on width
          const h = width < 640 ? 300 : width < 1024 ? 260 : 240;
          setDimensions({ width, height: h });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // D3 Color Scale mapping distance intensity
  // Intensity is highest when distance is 0% (closest to entry trigger)
  const colorScale = useMemo(() => {
    // We create a multi-stage color interpolator using d3.scaleLinear
    return d3.scaleLinear<string>()
      .domain([0, 0.75, 1.5, 3.5, 7.0, 15.0])
      .range([
        '#00f2fe', // 0.0%: Electric Cyan (Super High Intensity)
        '#06b6d4', // 0.75%: Vibrant Cyan
        '#10b981', // 1.5%: Emerald (Alert Zone Boundary)
        '#3b82f6', // 3.5%: Cobalt Blue (Approaching)
        '#6366f1', // 7.0%: Indigo
        '#1e293b'  // 15%+: Slate Navy (Distant)
      ])
      .clamp(true);
  }, []);

  // D3 Treemap Computation
  const leaves = useMemo(() => {
    if (!strategies || strategies.length === 0 || dimensions.width === 0) return [];

    // Format data for D3 hierarchy
    const formattedData: TreemapLeaf[] = strategies.map(s => {
      const dist = s.distancePercent !== undefined && !isNaN(s.distancePercent) ? s.distancePercent : 15;
      // Proximity weight: closer assets get prominent tile sizing
      const proximityScore = Math.max(1, Math.round(100 / (dist + 0.8)));
      // Base value combining proximity and relative volume
      const weight = proximityScore * (s.isAlertZone ? 1.4 : 1.0);

      return {
        id: s.id,
        symbol: s.symbol,
        coinName: s.coinName,
        distancePercent: dist,
        entryPrice: s.entryPrice,
        currentPrice: s.currentPrice || s.entryPrice,
        type: s.type,
        status: s.status,
        isAlert: !!s.isAlertZone,
        value: weight
      };
    });

    const root = d3.hierarchy<{ children?: TreemapLeaf[]; name?: string }>({
      name: 'radar_root',
      children: formattedData
    })
      .sum((d: any) => d.value || 10)
      .sort((a, b) => (a.data as any).distancePercent - (b.data as any).distancePercent);

    const treemapLayout = d3.treemap<{ children?: TreemapLeaf[]; name?: string }>()
      .size([dimensions.width, dimensions.height])
      .paddingInner(3)
      .paddingOuter(2)
      .round(true);

    treemapLayout(root);

    return (root as d3.HierarchyRectangularNode<any>).leaves().map(leaf => {
      const data = leaf.data as TreemapLeaf;
      return {
        ...data,
        x0: leaf.x0,
        x1: leaf.x1,
        y0: leaf.y0,
        y1: leaf.y1
      };
    });
  }, [strategies, dimensions]);

  const handleMouseMove = (e: React.MouseEvent, leaf: TreemapLeaf) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setHoveredLeaf(leaf);
  };

  const formatPrice = (val: number) => {
    if (val >= 1000) return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (val >= 1) return `$${val.toFixed(2)}`;
    if (val >= 0.01) return `$${val.toFixed(4)}`;
    return `$${val.toFixed(6)}`;
  };

  const alertAssets = strategies.filter(s => s.isAlertZone);

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden mb-5 backdrop-blur-sm shadow-xl transition-all">
      
      {/* Header Bar */}
      <div className="px-4 sm:px-5 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400 border border-cyan-500/30">
            <Flame className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Mapa de Calor (Market Heatmap · D3 Engine)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                {strategies.length} activos mapeados
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Distribución visual de intensidad por cercanía al precio de entrada
            </p>
          </div>
        </div>

        {/* View Controls & Collapse */}
        <div className="flex items-center gap-2">
          {/* Mode Switch */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setViewMode('treemap')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                viewMode === 'treemap'
                  ? 'bg-slate-800 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Treemap
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                viewMode === 'grid'
                  ? 'bg-slate-800 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Matriz
            </button>
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expandir mapa de calor' : 'Minimizar mapa de calor'}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            {isCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 sm:p-5">
          
          {/* View Mode: D3 Interactive Treemap */}
          {viewMode === 'treemap' ? (
            <div
              ref={containerRef}
              className="relative w-full rounded-lg overflow-hidden border border-slate-800/80 bg-slate-950"
              style={{ height: dimensions.height }}
              onMouseLeave={() => setHoveredLeaf(null)}
            >
              {leaves.map((leaf) => {
                const width = (leaf.x1 || 0) - (leaf.x0 || 0);
                const height = (leaf.y1 || 0) - (leaf.y0 || 0);
                const isHovered = hoveredLeaf?.id === leaf.id;
                const bgColor = colorScale(leaf.distancePercent);
                const symbolClean = leaf.symbol.replace('USDT', '');
                const isLong = leaf.type === 'LONG';

                // Determine font sizes based on tile area
                const isCompact = width < 75 || height < 50;
                const isTiny = width < 50 || height < 35;

                return (
                  <div
                    key={leaf.id}
                    onClick={() => onSelectCoin && onSelectCoin(leaf.symbol)}
                    onMouseMove={(e) => handleMouseMove(e, leaf)}
                    className="absolute cursor-pointer rounded transition-transform duration-150 flex flex-col justify-between p-1.5 select-none overflow-hidden group"
                    style={{
                      left: leaf.x0,
                      top: leaf.y0,
                      width,
                      height,
                      backgroundColor: bgColor,
                      border: leaf.isAlert
                        ? '1.5px solid rgba(255, 255, 255, 0.7)'
                        : isHovered
                        ? '1.5px solid rgba(255, 255, 255, 0.4)'
                        : '1px solid rgba(15, 23, 42, 0.6)',
                      boxShadow: leaf.isAlert
                        ? '0 0 12px rgba(6, 182, 212, 0.45) inset'
                        : undefined,
                      zIndex: isHovered ? 20 : 1,
                      transform: isHovered ? 'scale(1.01)' : 'scale(1)'
                    }}
                  >
                    {/* Top Tile Info */}
                    <div className="flex items-center justify-between w-full leading-tight">
                      <span className={`font-mono font-bold tracking-tight text-slate-950 flex items-center gap-0.5 ${
                        isTiny ? 'text-[9px]' : isCompact ? 'text-[11px]' : 'text-xs'
                      }`}>
                        {symbolClean}
                        {leaf.isAlert && <Target className="w-2.5 h-2.5 text-slate-950 animate-pulse inline" />}
                      </span>

                      {!isTiny && (
                        <span className={`text-[9px] font-mono font-bold px-1 rounded ${
                          isLong ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-950/30 text-slate-950'
                        }`}>
                          {leaf.type}
                        </span>
                      )}
                    </div>

                    {/* Bottom Tile Metrics */}
                    {!isTiny && (
                      <div className="flex items-baseline justify-between w-full text-slate-950 font-mono leading-none pt-0.5">
                        <span className={`font-extrabold ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
                          {leaf.distancePercent.toFixed(1)}%
                        </span>
                        {!isCompact && (
                          <span className="text-[10px] font-semibold opacity-90">
                            {formatPrice(leaf.currentPrice)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Floating Custom Tooltip */}
              {hoveredLeaf && (
                <div
                  className="absolute pointer-events-none z-50 bg-slate-950/95 border border-cyan-500/50 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs font-mono w-56 animate-in fade-in zoom-in-95 duration-100"
                  style={{
                    left: Math.min(mousePos.x + 12, dimensions.width - 230),
                    top: Math.min(mousePos.y + 12, dimensions.height - 130)
                  }}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                    <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                      <span>{hoveredLeaf.symbol}</span>
                      {hoveredLeaf.isAlert && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          En Zona de Alerta
                        </span>
                      )}
                    </div>
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                      hoveredLeaf.type === 'LONG' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                    }`}>
                      {hoveredLeaf.type}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Distancia al Trigger:</span>
                      <strong className="text-cyan-300 font-bold">{hoveredLeaf.distancePercent.toFixed(2)}%</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Precio Actual:</span>
                      <span className="text-white font-bold">{formatPrice(hoveredLeaf.currentPrice)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Entrada Planificada:</span>
                      <span className="text-cyan-400 font-bold">{formatPrice(hoveredLeaf.entryPrice)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Estado:</span>
                      <span className="text-slate-200">{hoveredLeaf.status}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* View Mode: Grouped Proximity Matrix */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Bucket 1: < 1.5% Imminent */}
              <div className="bg-slate-950/70 border border-cyan-500/40 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    Inminente (&lt; 1.5%)
                  </span>
                  <span className="text-[11px] font-mono font-bold px-1.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {strategies.filter(s => (s.distancePercent || 999) < 1.5).length}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {strategies.filter(s => (s.distancePercent || 999) < 1.5).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono">
                      <span className="font-bold text-white">{s.symbol.replace('USDT', '')}</span>
                      <span className="text-cyan-300 font-bold">{s.distancePercent?.toFixed(2)}%</span>
                    </div>
                  ))}
                  {strategies.filter(s => (s.distancePercent || 999) < 1.5).length === 0 && (
                    <span className="text-slate-500 text-[11px] italic block text-center py-2">Sin activos en este rango</span>
                  )}
                </div>
              </div>

              {/* Bucket 2: 1.5% - 3.5% Close */}
              <div className="bg-slate-950/70 border border-emerald-500/30 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-300">
                    Cercano (1.5% - 3.5%)
                  </span>
                  <span className="text-[11px] font-mono font-bold px-1.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {strategies.filter(s => (s.distancePercent || 999) >= 1.5 && (s.distancePercent || 999) < 3.5).length}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {strategies.filter(s => (s.distancePercent || 999) >= 1.5 && (s.distancePercent || 999) < 3.5).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono">
                      <span className="font-bold text-white">{s.symbol.replace('USDT', '')}</span>
                      <span className="text-emerald-300 font-bold">{s.distancePercent?.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bucket 3: 3.5% - 7.0% Medium */}
              <div className="bg-slate-950/70 border border-blue-500/30 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-300">
                    Aproximándose (3.5% - 7%)
                  </span>
                  <span className="text-[11px] font-mono font-bold px-1.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                    {strategies.filter(s => (s.distancePercent || 999) >= 3.5 && (s.distancePercent || 999) < 7.0).length}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {strategies.filter(s => (s.distancePercent || 999) >= 3.5 && (s.distancePercent || 999) < 7.0).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono">
                      <span className="font-bold text-white">{s.symbol.replace('USDT', '')}</span>
                      <span className="text-blue-300 font-bold">{s.distancePercent?.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bucket 4: > 7.0% Far */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400">
                    Distante (&gt; 7%)
                  </span>
                  <span className="text-[11px] font-mono font-bold px-1.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {strategies.filter(s => (s.distancePercent || 999) >= 7.0).length}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {strategies.filter(s => (s.distancePercent || 999) >= 7.0).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono">
                      <span className="font-bold text-slate-300">{s.symbol.replace('USDT', '')}</span>
                      <span className="text-slate-400 font-bold">{s.distancePercent?.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* D3 Heatmap Color Intensity Legend Scale */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 font-semibold">Escala de Intensidad D3:</span>
              <span>Menor distancia = Mayor calor de ejecución</span>
            </div>

            {/* Gradient Bar with Tick Labels */}
            <div className="flex items-center gap-2">
              <span className="text-cyan-300 font-bold">0% (Inmediato)</span>
              <div
                className="h-2.5 w-36 sm:w-48 rounded-full border border-slate-700 shadow-inner"
                style={{
                  background: 'linear-gradient(to right, #00f2fe, #06b6d4, #10b981, #3b82f6, #6366f1, #1e293b)'
                }}
              />
              <span className="text-slate-500">15%+ (Lejano)</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
