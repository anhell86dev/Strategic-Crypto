import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { StrategyWithOrders } from '../types';
import { HorizontalPriceScaleBar } from './HorizontalPriceScaleBar';
import { StrategyConfluencePanel } from './StrategyConfluencePanel';
import { 
  StrategyAnalyzerService, 
  StrategyAnalysisResult, 
  AnalysisEvent 
} from '../services/strategyAnalyzerService';
import { 
  X, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Save, 
  RotateCw, 
  Target, 
  ShieldAlert, 
  Flame, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  Maximize2
} from 'lucide-react';

interface StrategyAnalysisModalProps {
  strategy: StrategyWithOrders;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: (strategyId: number, newStatus: string) => void;
}

export const StrategyAnalysisModal: React.FC<StrategyAnalysisModalProps> = ({
  strategy,
  isOpen,
  onClose,
  onStatusUpdated
}) => {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<StrategyAnalysisResult | null>(null);
  const [isUpdatingSheet, setIsUpdatingSheet] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ success?: boolean; message?: string } | null>(null);

  // Disable body scroll when modal is open and handle Esc key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const runAnalysis = async () => {
    setLoading(true);
    setSyncFeedback(null);
    try {
      const result = await StrategyAnalyzerService.analyzeStrategy(strategy);
      setAnalysis(result);
    } catch (e) {
      console.error('Error running strategy analysis:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runAnalysis();
    }
  }, [isOpen, strategy.id, strategy.symbol]);

  // Handle write to Sheet AN cell
  const handleApplyToSheet = async () => {
    if (!analysis) return;
    setIsUpdatingSheet(true);
    setSyncFeedback(null);
    try {
      const resp = await StrategyAnalyzerService.updateSheetStatusCell(
        strategy.id,
        analysis.sheetCellTarget,
        analysis.statusLabel
      );
      setSyncFeedback(resp);
      if (resp.success && onStatusUpdated) {
        onStatusUpdated(strategy.id, analysis.statusLabel);
      }
    } catch (err: any) {
      setSyncFeedback({
        success: false,
        message: err.message || 'Error al comunicarse con la hoja de cálculo.'
      });
    } finally {
      setIsUpdatingSheet(false);
    }
  };

  if (!isOpen) return null;

  const symbolClean = strategy.symbol.replace('USDT', '');
  const isLong = strategy.type === 'LONG';

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] w-screen h-screen bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[95vh] sm:h-[92vh] shadow-2xl shadow-black/80 flex flex-col overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20 font-black shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold text-white font-mono tracking-tight">
                  Analizar: {symbolClean}/USDT
                </h2>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-md font-mono ${
                  isLong ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-700'
                }`}>
                  {strategy.type}
                </span>
                <span className="text-xs text-cyan-300/80 font-mono hidden sm:inline px-2 py-0.5 bg-slate-900 rounded border border-slate-800">
                  {strategy.strategyName}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Verificación temporal histórica vs. tiempo actual y escala de precios
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runAnalysis}
              disabled={loading}
              title="Volver a analizar"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              title="Cerrar modal (Esc)"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          
          {/* SECTION 1: Barra Horizontal de Precios */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <Target className="w-4 h-4" />
                1. Barra Horizontal de Precios en Escala Continua
              </h3>
              <span className="text-xs font-mono text-slate-300 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                Precio Live: <strong className="text-cyan-400 font-bold">${strategy.currentPrice?.toLocaleString() || strategy.entryPrice}</strong>
              </span>
            </div>
            
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 shadow-inner">
              <HorizontalPriceScaleBar strategy={strategy} />
            </div>
          </div>

          {/* SECTION 2: Dictamen de Análisis Automático */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              2. Auditoría Cronológica vs. Hora de Publicación
            </h3>

            {loading ? (
              <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                <RotateCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
                <p className="text-sm font-mono text-slate-300">
                  Cargando velas históricas de Binance desde la hora de publicación ({strategy.date || 'Col B'})...
                </p>
                <p className="text-xs font-mono text-slate-500 mt-1">
                  Verificando toques en Stop Loss, E1, E2, E3 y Take Profits
                </p>
              </div>
            ) : analysis ? (
              <div className="space-y-4">
                
                {/* Status Hero Card */}
                <div className={`p-4 sm:p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg ${analysis.statusColor}`}>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                        Estado Dictaminado:
                      </span>
                      <span className="text-base sm:text-lg font-black font-mono uppercase px-3 py-0.5 rounded-lg bg-black/40 border border-white/20">
                        {analysis.statusLabel}
                      </span>
                      <span className="text-xs font-mono text-slate-300">
                        (Hoja "Ordenes" Celda <strong className="text-white underline">{analysis.sheetCellTarget}</strong>)
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-sans text-slate-200 leading-relaxed font-medium">
                      {analysis.summary}
                    </p>
                  </div>

                  {/* Apply to Sheet Button */}
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={handleApplyToSheet}
                      disabled={isUpdatingSheet}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-extrabold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Save className={`w-4 h-4 ${isUpdatingSheet ? 'animate-spin' : ''}`} />
                      <span>{isUpdatingSheet ? 'Guardando...' : `Asignar "${analysis.statusLabel}" a ${analysis.sheetCellTarget}`}</span>
                    </button>
                  </div>
                </div>

                {/* Sync Feedback Message */}
                {syncFeedback && (
                  <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                    syncFeedback.success 
                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300' 
                      : 'bg-rose-950/70 border-rose-500 text-rose-300'
                  }`}>
                    {syncFeedback.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                    <span>{syncFeedback.message}</span>
                  </div>
                )}

                {/* Timeline & Validation Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* Publicación */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">
                      Fecha / Hora de Publicación
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-slate-200 font-bold">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{analysis.pubTimeFormatted}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 block">
                      Columna B de Ordenes (GMT-6)
                    </span>
                  </div>

                  {/* Stop Loss Validation */}
                  <div className={`border rounded-xl p-3.5 space-y-1 ${
                    analysis.slHitTime 
                      ? 'bg-rose-950/40 border-rose-600/70' 
                      : 'bg-slate-950/80 border-slate-800'
                  }`}>
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">
                      Verificación Stop Loss ($ {strategy.stopLoss})
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                      {analysis.slHitTime ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span className="text-rose-300">Tocado: {analysis.slHitTime}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-slate-300">No ha sido tocado</span>
                        </>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 block">
                      {analysis.slHitTime ? 'Regla: "Invalidado"' : 'SL protegido'}
                    </span>
                  </div>

                  {/* Rango E3 - E1 Validation */}
                  <div className={`border rounded-xl p-3.5 space-y-1 ${
                    analysis.status === 'ACTIVA' 
                      ? 'bg-emerald-950/40 border-emerald-600/70' 
                      : 'bg-slate-950/80 border-slate-800'
                  }`}>
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">
                      Zona de Entrada (E3 a E1)
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                      {analysis.e1HitTime || analysis.status === 'ACTIVA' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-emerald-300">En Rango de Activación</span>
                        </>
                      ) : (
                        <span className="text-slate-400">Sin activación aún</span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 space-y-0.5 pt-0.5">
                      {analysis.e1HitTime && <div>• E1 ({strategy.entryPrice}): {analysis.e1HitTime}</div>}
                      {analysis.e2HitTime && <div>• E2: {analysis.e2HitTime}</div>}
                      {analysis.e3HitTime && <div>• E3: {analysis.e3HitTime}</div>}
                    </div>
                  </div>

                </div>

                {/* Take Profits Check */}
                <div className={`p-3.5 rounded-xl border ${
                  analysis.tpHitTime 
                    ? 'bg-purple-950/30 border-purple-500/50' 
                    : 'bg-slate-950/60 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-mono font-bold text-slate-200">
                        Monitoreo de Take Profits (TP1 - TP3):
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-purple-300">
                      {analysis.tpHitTime ? `Tocado: ${analysis.tpHitTime} → INVALIDADO TARDE` : 'Ningún TP alcanzado antes de entrada'}
                    </span>
                  </div>
                </div>

              </div>
            ) : null}
          </div>

          {/* SECTION 3: Confluencia Multicapa & Métricas FAPI */}
          <div className="space-y-2 pt-2">
            <StrategyConfluencePanel strategy={strategy} />
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="text-[11px] font-mono text-slate-500">
            Reglas automáticas: Si tocó SL → "Invalidado" | Si entre E3 y E1 → "ACTIVA" | Si tocó TP1..3 → "INVALIDADO TARDE"
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
