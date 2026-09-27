import React, { useState } from 'react';
import { StrategyWithOrders } from '../types';
import { 
  Target, 
  ShieldAlert, 
  GitBranch, 
  Scale, 
  Percent, 
  Sliders, 
  FileText,
  DollarSign,
  ShieldCheck,
  BrainCircuit,
  Coins,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { MultiPathMatrix } from './MultiPathMatrix';
import { HorizontalPriceScaleBar } from './HorizontalPriceScaleBar';

interface TakeProfitAccordionProps {
  strategy: StrategyWithOrders;
  onUpdateThreshold?: (strategyId: number, threshold: number) => void;
  onOpenDcaSimulator?: (strategy: StrategyWithOrders) => void;
}

export const TakeProfitAccordion: React.FC<TakeProfitAccordionProps> = ({
  strategy,
  onUpdateThreshold,
  onOpenDcaSimulator
}) => {
  const [activeTab, setActiveTab] = useState<'horizontal_bar' | 'matrix' | 'orders' | 'governance'>('horizontal_bar');

  const {
    type,
    entryPrice,
    stopLoss,
    orders = [],
    customAlertThreshold,
    notes,
    scenarioNotes,
    capitalAssigned = 5,
    leverage = 5,
    nominalValue,
    market = 'Binance Futuros',
    marginType = 'Aislado (Isolated)',
    tacticalRules,
    tradeDiscipline,
    lossCapa1,
    lossCapa2,
    lossCapa3,
    stopLossPercent,
    dcaLevels = []
  } = strategy;

  const currentThreshold = customAlertThreshold || 1.5;
  const effectiveNominal = nominalValue || (capitalAssigned * leverage);

  const formatPrice = (val?: number) => {
    if (val === undefined || isNaN(val) || val <= 0) return '$0.00';
    if (val >= 1000) return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (val >= 1) return `$${val.toFixed(4)}`;
    if (val >= 0.01) return `$${val.toFixed(5)}`;
    return `$${val.toFixed(7)}`;
  };

  const formatUsd = (val?: number) => {
    if (val === undefined || isNaN(val)) return '$0.00';
    return `$${val.toFixed(2)}`;
  };

  const getProfitPercent = (targetPrice: number) => {
    if (!entryPrice || entryPrice === 0) return 0;
    if (type === 'LONG') {
      return ((targetPrice - entryPrice) / entryPrice) * 100;
    } else {
      return ((entryPrice - targetPrice) / entryPrice) * 100;
    }
  };

  const calculateRiskReward = () => {
    const slDistance = Math.abs(entryPrice - stopLoss);
    const slDistancePct = entryPrice > 0 ? (slDistance / entryPrice) * 100 : 0;

    if (slDistance === 0 || orders.length === 0) {
      return {
        slDistancePct,
        maxRewardPct: 0,
        maxRiskReward: 0,
        formattedRatio: '1:0.00',
        tp1RiskReward: 0,
        formattedTp1Ratio: '1:0.00',
        quality: 'low'
      };
    }

    const tpDistances = orders.map((o) => Math.abs(o.targetPrice - entryPrice));
    const maxTpDistance = Math.max(...tpDistances);
    const maxRewardPct = entryPrice > 0 ? (maxTpDistance / entryPrice) * 100 : 0;
    const maxRiskReward = maxTpDistance / slDistance;

    const tp1Dist = tpDistances[0] || 0;
    const tp1RiskReward = tp1Dist / slDistance;

    let quality: 'excellent' | 'good' | 'fair' | 'low' = 'low';
    if (maxRiskReward >= 3.0) quality = 'excellent';
    else if (maxRiskReward >= 2.0) quality = 'good';
    else if (maxRiskReward >= 1.5) quality = 'fair';

    return {
      slDistancePct,
      maxRewardPct,
      maxRiskReward,
      formattedRatio: `1:${maxRiskReward.toFixed(2)}`,
      tp1RiskReward,
      formattedTp1Ratio: `1:${tp1RiskReward.toFixed(2)}`,
      quality
    };
  };

  const rr = calculateRiskReward();

  return (
    <div className="p-4 sm:p-6 bg-slate-950/95 border-t border-slate-800 space-y-5">
      
      {/* Position Header Banner: Capital, Apalancamiento y Valor Nominal */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] font-sans">Gestión de Posición (Cols D a H)</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-black text-white text-sm">
                Capital: <span className="text-cyan-300">{formatUsd(capitalAssigned)}</span>
              </span>
              <span className="text-slate-600">×</span>
              <span className="font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                {leverage}x {marginType}
              </span>
              <span className="text-slate-600">=</span>
              <span className="font-black text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-700/80 text-sm">
                Nominal: {formatUsd(effectiveNominal)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs">
            {market}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-300 border border-cyan-900 text-xs font-bold">
            {strategy.category || 'Estrategia'}
          </span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs sm:text-sm">
          
          <button
            type="button"
            onClick={() => setActiveTab('horizontal_bar')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'horizontal_bar'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>1. Barra Escala de Precios</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>2. Matriz Multicamino</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>3. Plan Take Profits & R:B</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('governance')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'governance'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>4. Gobernanza & Reglas</span>
          </button>

        </div>

        {/* Global R:B summary tag on tab header */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm font-mono flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Ratio R:B Máx:</span>
            <strong className="text-cyan-300 font-black">{rr.formattedRatio}</strong>
          </div>
          <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm font-mono hidden md:flex items-center gap-1.5">
            <span className="text-slate-400">R:B TP1:</span>
            <strong className="text-emerald-400 font-bold">{rr.formattedTp1Ratio}</strong>
          </div>
        </div>
      </div>

      {/* Tab 1: Barra Horizontal de Precios en Diferentes Temporalidades */}
      {activeTab === 'horizontal_bar' && (
        <HorizontalPriceScaleBar strategy={strategy} />
      )}

      {/* Tab 2: Matriz Multicamino del Trade */}
      {activeTab === 'matrix' && (
        <MultiPathMatrix 
          strategy={strategy} 
          onOpenDcaSimulator={onOpenDcaSimulator}
        />
      )}

      {/* Tab 3: Detailed Orders & Risk Structure (Take Profits y Retornos en USD) */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
          
          {/* Left Column: Take Profit Orders Grid con Beneficio en USD */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Target className="w-5 h-5 text-cyan-400" />
                <h4 className="font-extrabold text-sm sm:text-base text-white uppercase tracking-wider font-mono">
                  Toma de Beneficios Escalonada (Cols AC a AK)
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400">
                {orders.length} niveles configurados
              </span>
            </div>

            {orders && orders.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {orders.map((tp, idx) => {
                  const profitPct = getProfitPercent(tp.targetPrice);
                  const isHit = strategy.currentPrice 
                    ? (type === 'LONG' ? strategy.currentPrice >= tp.targetPrice : strategy.currentPrice <= tp.targetPrice)
                    : false;

                  const orderDelta = Math.abs(tp.targetPrice - entryPrice);
                  const slDelta = Math.abs(entryPrice - stopLoss);
                  const orderRr = slDelta > 0 ? orderDelta / slDelta : 0;

                  return (
                    <div
                      key={idx}
                      className={`rounded-xl p-4 border transition-all ${
                        isHit
                          ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-md bg-slate-800 text-cyan-300 border border-slate-700">
                          {tp.type || `TP${idx + 1}`}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-0.5">
                          <Percent className="w-3.5 h-3.5 text-slate-400" />
                          {tp.closePercentage}% de posición
                        </span>
                      </div>

                      <div className="mt-2 flex items-baseline justify-between">
                        <div className="font-mono font-black text-base text-white">
                          {formatPrice(tp.targetPrice)}
                        </div>
                        <div className={`font-mono text-xs font-bold flex items-center gap-0.5 ${
                          profitPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
                        </div>
                      </div>

                      {/* Beneficio Proyectado en USD (Col AE, AH, AK) */}
                      {tp.profitUsd !== undefined && tp.profitUsd > 0 && (
                        <div className="mt-2 py-1 px-2 rounded-md bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-between font-mono text-xs">
                          <span className="text-emerald-300 font-semibold">Profit Proyectado:</span>
                          <strong className="text-emerald-400 font-black">+{formatUsd(tp.profitUsd)}</strong>
                        </div>
                      )}

                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">
                          R:B Individual:
                        </span>
                        <strong className="text-cyan-300 font-bold">
                          1:{orderRr.toFixed(2)}
                        </strong>
                      </div>

                      {strategy.currentPrice && (
                        <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-400">
                            {isHit ? '✓ Objetivo alcanzado' : 'Pendiente'}
                          </span>
                          <span className="text-slate-500">
                            Distancia: {Math.abs(((strategy.currentPrice - tp.targetPrice) / strategy.currentPrice) * 100).toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic py-6 bg-slate-900/50 rounded-xl text-center border border-slate-800">
                No hay órdenes de Take Profit registradas en la hoja.
              </div>
            )}

            {/* Risk:Reward Detailed Mathematical Breakdown Banner */}
            <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 text-xs sm:text-sm font-mono">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Scale className="w-4 h-4 text-cyan-400" />
                  <span>Desglose de Expectativa y Ratio Riesgo / Beneficio (R:B)</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                  rr.maxRiskReward >= 3 ? 'bg-purple-950 text-purple-300 border border-purple-700' :
                  rr.maxRiskReward >= 2 ? 'bg-cyan-950 text-cyan-300 border border-cyan-700' :
                  'bg-emerald-950 text-emerald-300 border border-emerald-700'
                }`}>
                  {rr.quality === 'excellent' ? 'R:B Excelente (≥ 1:3)' : rr.quality === 'good' ? 'R:B Óptimo (≥ 1:2)' : 'R:B Convencional'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Riesgo a Stop Loss</span>
                  <span className="text-base font-black text-rose-400">-{rr.slDistancePct.toFixed(2)}%</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">{formatPrice(Math.abs(entryPrice - stopLoss))} / u</span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Recompensa Máxima</span>
                  <span className="text-base font-black text-emerald-400">+{rr.maxRewardPct.toFixed(2)}%</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Hasta último TP</span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Ratio R:B al TP1</span>
                  <span className="text-base font-black text-cyan-300">{rr.formattedTp1Ratio}</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Primer objetivo</span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Ratio R:B Máximo</span>
                  <span className="text-base font-black text-purple-300">{rr.formattedRatio}</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">1 : {rr.maxRiskReward.toFixed(2)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Invalidation & Pérdida Monetaria en USD por Capas */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
            
            {/* Stop Loss Card con Pérdida Monetaria Exacta (Cols X a AB) */}
            <div className="bg-slate-900/90 border border-rose-950/90 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs sm:text-sm font-bold text-rose-400 flex items-center gap-2 uppercase tracking-wider font-mono">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Control de Riesgo (Cols X-AB)
                </span>
                <span className="text-xs sm:text-sm font-mono font-black text-rose-400">
                  -{stopLossPercent ? stopLossPercent.toFixed(2) : rr.slDistancePct.toFixed(2)}%
                </span>
              </div>
              
              <div className="font-mono text-base sm:text-lg font-black text-white mt-1">
                Stop-Loss: {formatPrice(stopLoss)}
              </div>

              {/* Pérdidas Proyectadas por Capa (Cols Z, AA, AB) */}
              <div className="mt-3 pt-3 border-t border-rose-950/80 space-y-2 font-mono text-xs">
                <span className="text-slate-400 text-[11px] block font-sans">Pérdida si el precio toca Stop-Loss:</span>
                
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-300">Si solo llena E1 (Loss Capa 1):</span>
                  <strong className="text-rose-400 font-black">-{formatUsd(lossCapa1 || 0.80)}</strong>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-300">Si llena E1 + E2 (Loss Capa 2):</span>
                  <strong className="text-rose-400 font-black">-{formatUsd(lossCapa2 || 1.12)}</strong>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-rose-950/40 border border-rose-900/60">
                  <span className="text-rose-200 font-bold">Riesgo Máx. E1+E2+E3 (Capa 3):</span>
                  <strong className="text-rose-300 font-black">-{formatUsd(lossCapa3 || 1.17)}</strong>
                </div>
              </div>
            </div>

            {/* Custom Alert Threshold Card */}
            {onUpdateThreshold && (
              <div className="bg-slate-900/90 border border-cyan-950/90 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-bold text-cyan-400 flex items-center gap-2 uppercase tracking-wider font-mono">
                    <Target className="w-4 h-4 text-cyan-400" />
                    Umbral de Alerta
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950 px-2.5 py-1 rounded-md border border-cyan-800/60">
                    &lt; {currentThreshold.toFixed(1)}%
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 font-mono">
                  {[0.5, 1.0, 1.5, 2.0, 3.0, 5.0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onUpdateThreshold(strategy.id, val)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        currentThreshold === val
                          ? 'bg-cyan-400 text-slate-950 shadow-sm font-black'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Tab 4: Gobernanza, Reglas Tácticas y Disciplina del Trade (Cols AL a AN) */}
      {activeTab === 'governance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          
          {/* Reglas de Ejecución Táctica (Col AL) */}
          <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center gap-2.5 text-cyan-300 font-mono font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span className="uppercase tracking-wider">Reglas de Ejecución Táctica (Col AL)</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs sm:text-sm leading-relaxed font-sans">
              {tacticalRules || 'Mover el Stop Loss a precio de entrada (Breakeven) de forma inmediata al alcanzar y asegurar el TP1. Cerrar 50% de la posición en TP1 para mitigar riesgo de rango lateral.'}
            </div>
            <div className="text-[11px] font-mono text-cyan-400/80 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Protocolo de Breakeven automático tras TP1</span>
            </div>
          </div>

          {/* Disciplina del Trade (Col AM) */}
          <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center gap-2.5 text-purple-300 font-mono font-bold text-sm">
              <BrainCircuit className="w-5 h-5 text-purple-400" />
              <span className="uppercase tracking-wider">Disciplina del Trade (Col AM)</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs sm:text-sm leading-relaxed font-sans">
              {tradeDiscipline || 'No promediar por debajo del tercer nivel de entrada (e3) bajo ninguna circunstancia y respetar estrictamente el apalancamiento de 5X en margen aislado.'}
            </div>
            <div className="text-[11px] font-mono text-purple-400/80 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Límite de riesgo psicológico no negociable</span>
            </div>
          </div>

          {/* Escenario Principal / Tesis Técnica (Col K) */}
          <div className="md:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-slate-200 font-semibold mb-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="font-mono text-cyan-300 uppercase tracking-wide">Escenario Principal y Tesis Técnica (Col K)</span>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-sans">
              {scenarioNotes || notes || 'Consolidación lateral y retroceso hacia zonas de confluencia técnica para validación de entrada.'}
            </p>
          </div>

        </div>
      )}

    </div>
  );
};
