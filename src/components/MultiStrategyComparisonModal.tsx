import React, { useState } from 'react';
import { StrategyWithOrders } from '../types';
import { 
  X, 
  ArrowLeftRight, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  Target, 
  Layers, 
  Activity, 
  CheckCircle2, 
  AlertOctagon, 
  Percent, 
  DollarSign, 
  Copy, 
  Check, 
  Zap, 
  BarChart3,
  Flame,
  Award
} from 'lucide-react';

interface MultiStrategyComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategies: StrategyWithOrders[];
  onRemoveStrategy: (id: number) => void;
  onClearSelection: () => void;
}

export const MultiStrategyComparisonModal: React.FC<MultiStrategyComparisonModalProps> = ({
  isOpen,
  onClose,
  strategies,
  onRemoveStrategy,
  onClearSelection
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || strategies.length === 0) return null;

  // Format currency
  const formatPrice = (val?: number) => {
    if (val === undefined || isNaN(val) || val <= 0) return '$0.00';
    if (val >= 1000) return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (val >= 1) return `$${val.toFixed(4)}`;
    if (val >= 0.01) return `$${val.toFixed(5)}`;
    return `$${val.toFixed(7)}`;
  };

  // Find standout metrics
  const getMetrics = (s: StrategyWithOrders) => {
    const isLong = s.type === 'LONG';
    const live = s.currentPrice || s.entryPrice;
    const pnl = s.entryPrice > 0 ? ((live - s.entryPrice) / s.entryPrice) * 100 * (isLong ? 1 : -1) : 0;
    const roi = pnl * (s.leverage || 5);
    const slRisk = s.entryPrice > 0 ? Math.abs(((s.entryPrice - s.stopLoss) / s.entryPrice) * 100) : 0;
    const distance = s.distancePercent !== undefined ? s.distancePercent : Math.abs(((live - s.entryPrice) / live) * 100);

    const maxTp = s.orders.length > 0 ? s.orders[s.orders.length - 1].targetPrice : (isLong ? s.entryPrice * 1.1 : s.entryPrice * 0.9);
    const maxReward = s.entryPrice > 0 ? Math.abs(((maxTp - s.entryPrice) / s.entryPrice) * 100) : 0;
    const rrRatio = slRisk > 0 ? maxReward / slRisk : 0;

    return {
      live,
      pnl,
      roi,
      slRisk,
      distance,
      rrRatio,
      isLong
    };
  };

  // Identify Best setups
  let bestRoiId = strategies[0]?.id;
  let closestId = strategies[0]?.id;
  let bestRrId = strategies[0]?.id;

  let maxRoi = -9999;
  let minDistance = 9999;
  let maxRr = -1;

  strategies.forEach(s => {
    const m = getMetrics(s);
    if (m.roi > maxRoi) {
      maxRoi = m.roi;
      bestRoiId = s.id;
    }
    if (m.distance < minDistance) {
      minDistance = m.distance;
      closestId = s.id;
    }
    if (m.rrRatio > maxRr) {
      maxRr = m.rrRatio;
      bestRrId = s.id;
    }
  });

  const handleCopySummary = () => {
    const lines = [
      '=== COMPARACIÓN DE ESTRATEGIAS RADAR ===',
      `Fecha: ${new Date().toLocaleString()}`,
      `Estrategias comparadas: ${strategies.length}`,
      ''
    ];

    strategies.forEach((s, idx) => {
      const m = getMetrics(s);
      lines.push(`${idx + 1}. [${s.symbol}] ${s.type} ${s.leverage || 5}x`);
      lines.push(`   Precio Live: ${formatPrice(m.live)} | Entrada: ${formatPrice(s.entryPrice)}`);
      lines.push(`   Distancia: ${m.distance.toFixed(2)}% | ROI Actual: ${m.roi >= 0 ? '+' : ''}${m.roi.toFixed(2)}%`);
      lines.push(`   Stop Loss: ${formatPrice(s.stopLoss)} (-${m.slRisk.toFixed(2)}%) | R:B: 1:${m.rrRatio.toFixed(2)}`);
      lines.push(`   Take Profits: ${s.orders.map(o => `${o.type}: ${formatPrice(o.targetPrice)} (${o.closePercentage}%)`).join(' | ')}`);
      lines.push('');
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-100">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white font-mono flex items-center gap-2">
                  Comparación de Rendimiento Lado a Lado
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  {strategies.length} {strategies.length === 1 ? 'Estrategia' : 'Estrategias'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Análisis comparativo de métricas de riesgo, distancias, targets y temporalidades
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="px-3 py-1.5 text-xs font-mono font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
              title="Copiar resumen al portapapeles"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar Resumen'}</span>
            </button>

            <button
              onClick={onClearSelection}
              className="px-3 py-1.5 text-xs font-mono font-semibold text-rose-400 hover:bg-rose-950/40 border border-rose-900/60 rounded-lg transition-colors"
            >
              Limpiar Selección
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Side-by-Side Cards Container */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6">
          <div className={`grid gap-4 items-stretch ${
            strategies.length === 1 ? 'grid-cols-1 max-w-xl mx-auto' :
            strategies.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
            strategies.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
          }`}>
            
            {strategies.map((strategy) => {
              const m = getMetrics(strategy);
              const isBestRoi = strategy.id === bestRoiId && strategies.length > 1;
              const isClosest = strategy.id === closestId && strategies.length > 1;
              const isBestRr = strategy.id === bestRrId && strategies.length > 1;

              return (
                <div 
                  key={strategy.id}
                  className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl relative transition-all hover:border-slate-700 font-mono"
                >
                  {/* Remove pill */}
                  <button
                    onClick={() => onRemoveStrategy(strategy.id)}
                    title="Quitar de comparación"
                    className="absolute top-3 right-3 text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-900 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Card Header: Symbol & Direction */}
                  <div>
                    <div className="flex items-center gap-2 mb-2 pr-6">
                      <h4 className="text-base font-extrabold text-white tracking-tight">
                        {strategy.symbol.replace('USDT', '')}
                      </h4>
                      <span className="text-xs text-slate-500 font-sans">/USDT</span>
                      
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        m.isLong
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {strategy.type} {m.isLong ? '↗' : '↘'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-cyan-300">
                        {strategy.leverage || 5}x Apalancamiento
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        {strategy.category || 'Spot/Futures'}
                      </span>
                    </div>

                    {/* Highlights Badge */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {isBestRoi && (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600 font-bold flex items-center gap-1">
                          <Award className="w-3 h-3 text-emerald-400" /> Mayor Rendimiento
                        </span>
                      )}
                      {isClosest && (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-600 font-bold flex items-center gap-1">
                          <Target className="w-3 h-3 text-cyan-400" /> Más Próxima a Entrada
                        </span>
                      )}
                      {isBestRr && (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-600 font-bold flex items-center gap-1">
                          <Zap className="w-3 h-3 text-purple-400" /> Mejor Ratio R:B
                        </span>
                      )}
                    </div>

                    {/* Metric 1: Live Price & Entry Price */}
                    <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3 mb-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Precio Live:</span>
                        <span className="text-amber-300 font-bold text-sm bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {formatPrice(m.live)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-800">
                        <span className="text-slate-400">Entrada Planificada:</span>
                        <strong className="text-white">{formatPrice(strategy.entryPrice)}</strong>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <span className="text-slate-400">Distancia a Entrada:</span>
                        <span className={`font-bold ${m.distance <= 1.5 ? 'text-cyan-400' : 'text-slate-300'}`}>
                          {m.distance.toFixed(2)}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <span className="text-slate-400">ROI Actual:</span>
                        <span className={`font-bold text-sm ${m.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {m.roi >= 0 ? '+' : ''}{m.roi.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* Metric 2: Stop Loss & Invalidation */}
                    <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3 mb-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-rose-300 font-bold">
                        <span className="flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Stop Loss
                        </span>
                        <span>{formatPrice(strategy.stopLoss)}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Riesgo a SL:</span>
                        <span className="text-rose-400 font-semibold">-{m.slRisk.toFixed(2)}%</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-rose-900/30">
                        <span className="text-slate-400">Ratio Riesgo/Beneficio:</span>
                        <span className="text-cyan-300 font-bold">1:{m.rrRatio.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Metric 3: Take Profit Orders Breakdown */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 mb-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-300 font-bold text-[11px]">
                        <span className="flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 text-emerald-400" /> Objetivos Take Profit
                        </span>
                        <span className="text-slate-500">{strategy.orders.length} TPs</span>
                      </div>

                      <div className="space-y-1.5">
                        {strategy.orders.map((tp, idx) => {
                          const isHit = m.isLong ? m.live >= tp.targetPrice : m.live <= tp.targetPrice;
                          const gainPct = strategy.entryPrice > 0 
                            ? ((tp.targetPrice - strategy.entryPrice) / strategy.entryPrice) * 100 * (m.isLong ? 1 : -1)
                            : 0;

                          return (
                            <div 
                              key={idx}
                              className={`p-1.5 rounded flex items-center justify-between text-[11px] ${
                                isHit ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-200' : 'bg-slate-950/80 border border-slate-800/80 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-cyan-400">{tp.type}</span>
                                <span className="text-slate-500 text-[10px]">({tp.closePercentage}%)</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{formatPrice(tp.targetPrice)}</span>
                                <span className={gainPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                  +{gainPct.toFixed(1)}%
                                </span>
                                {isHit && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Metric 4: DCA Support Levels */}
                    {strategy.dcaLevels && strategy.dcaLevels.length > 0 && (
                      <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-amber-300 font-bold text-[11px]">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-amber-400" /> Soportes DCA
                          </span>
                          <span className="text-slate-400">Cupo Inicial: {strategy.initialAllocation || 50}%</span>
                        </div>

                        {strategy.dcaLevels.map((dca, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-950/60 p-1.5 rounded border border-slate-800">
                            <span className="text-amber-400 font-bold">{dca.level}</span>
                            <span className="text-white">{formatPrice(dca.price)}</span>
                            <span className="text-slate-400">{dca.allocationPercent}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer / Ticker Timestamp */}
                  <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Estado: <strong className="text-slate-300">{strategy.status}</strong></span>
                    <span>Binance Live</span>
                  </div>

                </div>
              );
            })}

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">
            Comparando {strategies.length} de {strategies.length} estrategias seleccionadas
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm transition-colors"
          >
            Cerrar Comparación
          </button>
        </div>

      </div>
    </div>
  );
};
