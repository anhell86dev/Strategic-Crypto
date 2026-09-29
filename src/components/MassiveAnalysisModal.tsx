import React, { useState, useEffect, useMemo } from 'react';
import { StrategyWithOrders, MassiveAnalysisItem, MassiveAnalysisSummary } from '../types';
import { StrategyAnalyzerService } from '../services/strategyAnalyzerService';
import { 
  Zap, 
  X, 
  Play, 
  RotateCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Database, 
  Copy, 
  Download, 
  Check, 
  Filter, 
  ShieldAlert, 
  Target, 
  Layers, 
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface MassiveAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategies: StrategyWithOrders[];
  onAnalysisApplied?: (updatedStrategies: StrategyWithOrders[]) => void;
}

export const MassiveAnalysisModal: React.FC<MassiveAnalysisModalProps> = ({
  isOpen,
  onClose,
  strategies,
  onAnalysisApplied
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number; symbol: string }>({
    current: 0,
    total: strategies.length,
    symbol: ''
  });
  const [summary, setSummary] = useState<MassiveAnalysisSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'discarded' | 'sl' | 'tp' | 'active'>('all');
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Lock body scroll on open
  useEffect(() => {
    if (!isOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [isOpen]);

  // Run analysis automatically when opened if no summary yet
  useEffect(() => {
    if (isOpen && !summary && !isRunning && strategies.length > 0) {
      handleRunAnalysis();
    }
  }, [isOpen, strategies.length]);

  const handleRunAnalysis = async () => {
    setIsRunning(true);
    setFeedback(null);
    setProgress({ current: 0, total: strategies.length, symbol: 'Iniciando...' });

    try {
      const res = await StrategyAnalyzerService.runMassiveAnalysis(
        strategies,
        (current, total, symbol) => {
          setProgress({ current, total, symbol });
        }
      );
      setSummary(res);
    } catch (err: any) {
      setFeedback({
        success: false,
        message: err.message || 'Error durante la ejecución del análisis masivo.'
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Guardar y Aplicar a Hoja Estrategia (Columna M)
  const handleApplyToSheets = async () => {
    if (!summary || summary.results.length === 0) return;
    setIsApplying(true);
    setFeedback(null);

    try {
      const resp = await StrategyAnalyzerService.applyMassiveAnalysisToSheets(summary.results);
      setFeedback({
        success: resp.success,
        message: resp.message || 'Estados sincronizados con éxito en la Hoja "Estrategia" (Columna M).'
      });

      // Update in memory strategies
      if (onAnalysisApplied) {
        const resultMap = new Map<string, MassiveAnalysisItem>();
        summary.results.forEach(r => {
          resultMap.set(r.code.toLowerCase().trim(), r);
          resultMap.set(r.symbol.toUpperCase().trim(), r);
        });

        const updatedStrategies = strategies.map(strat => {
          const key = (strat.strategyName || strat.symbol).toLowerCase().trim();
          const match = resultMap.get(key) || resultMap.get(strat.symbol.toUpperCase().trim());
          if (match) {
            return {
              ...strat,
              statusSheetEstrategia: match.statusLabelM,
              status: match.isDiscarded ? 'Invalidado' : strat.status
            };
          }
          return strat;
        });

        onAnalysisApplied(updatedStrategies);
      }
    } catch (e: any) {
      setFeedback({
        success: false,
        message: e.message || 'Error al persistir cambios en Google Sheets.'
      });
    } finally {
      setIsApplying(false);
    }
  };

  // Copiar valores de la Columna M ordenados por fila
  const handleCopyColumnM = () => {
    if (!summary) return;
    const sorted = [...summary.results].sort((a, b) => a.sheetRowIndex - b.sheetRowIndex);
    const textToCopy = sorted
      .map(item => `${item.sheetCellM}\t${item.code}\t${item.statusLabelM}`)
      .join('\n');

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Exportar CSV
  const handleDownloadCsv = () => {
    if (!summary) return;
    const sorted = [...summary.results].sort((a, b) => a.sheetRowIndex - b.sheetRowIndex);
    const headers = ['Celda_Hoja_Estrategia', 'Fila', 'Codigo_Estrategia', 'Par', 'Temporalidad_PUB', 'Fecha_PUB', 'Fecha_Analisis', 'Estado_Columna_M', 'Descartada', 'Razon_Descarte', 'Tiempo_Transcurrido'];
    const rows = sorted.map(item => [
      item.sheetCellM,
      item.sheetRowIndex,
      `"${item.code}"`,
      item.symbol,
      `"${item.pubTimeframe}"`,
      `"${item.pubDateFormatted}"`,
      `"${item.analysisDateFormatted}"`,
      `"${item.statusLabelM}"`,
      item.isDiscarded ? 'SI' : 'NO',
      `"${item.reasonText}"`,
      `"${item.timeAgoStr || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `analisis_masivo_estrategia_colM_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered results
  const filteredResults = useMemo(() => {
    if (!summary) return [];
    let list = summary.results;

    if (activeTab === 'discarded') {
      list = list.filter(r => r.isDiscarded);
    } else if (activeTab === 'sl') {
      list = list.filter(r => r.discardReason === 'SL_HIT');
    } else if (activeTab === 'tp') {
      list = list.filter(r => r.discardReason === 'TP_HIT');
    } else if (activeTab === 'active') {
      list = list.filter(r => !r.isDiscarded);
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      list = list.filter(r => 
        r.symbol.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.statusLabelM.toLowerCase().includes(q) ||
        r.sheetCellM.toLowerCase().includes(q)
      );
    }

    return list;
  }, [summary, activeTab, searchFilter]);

  if (!isOpen) return null;

  const pctProgress = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div 
      className="fixed inset-0 z-[99999] w-screen h-screen bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-7xl h-[95vh] sm:h-[92vh] shadow-2xl shadow-black/80 flex flex-col overflow-hidden animate-fade-in text-slate-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-cyan-500 flex items-center justify-center text-slate-950 shadow-lg shadow-indigo-500/25 font-black shrink-0">
              <Zap className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold text-white font-mono tracking-tight flex items-center gap-2">
                  <span>Análisis Masivo de Estrategias</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-950 border border-violet-500 text-violet-300 uppercase tracking-wider font-mono">
                    Hoja Estrategia · Columna M (Estado)
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Evaluación temporal estricta de las 76 estrategias desde su publicación (PUB) hasta la actualidad.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAnalysis}
              disabled={isRunning}
              title="Volver a ejecutar análisis masivo"
              className="p-2 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-200 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 text-cyan-400 ${isRunning ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Re-analizar</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Info Banner: Fechas Principales y Reglas */}
        <div className="px-5 py-3 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-400">Fecha del Análisis:</span>
              <strong className="text-cyan-300 font-bold">
                {summary?.analysisDateFormatted || new Date().toLocaleString('es-GT', { timeZone: 'America/Guatemala' })} (GMT-6)
              </strong>
            </div>

            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Temporalidad PUB:</span>
              <strong className="text-amber-300 font-bold">
                Fecha / Hora & Timeframe Col B, C, F
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800/80">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              Regla: Si tocó <strong>SL</strong> o <strong>TP</strong> = <strong>Descartada</strong> → <code className="text-rose-300 bg-slate-900 px-1 py-0.5 rounded">invalidada: razon</code> en Col M.
            </span>
          </div>
        </div>

        {/* Progress Bar (during run) */}
        {isRunning && (
          <div className="px-5 py-3 bg-indigo-950/60 border-b border-indigo-800/60 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-indigo-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
                Analizando {progress.symbol} ({progress.current}/{progress.total})...
              </span>
              <span className="text-white font-black">{pctProgress}%</span>
            </div>
            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-indigo-900">
              <div 
                className="bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 h-full rounded-full transition-all duration-200"
                style={{ width: `${pctProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Feedback Message */}
        {feedback && (
          <div className={`px-5 py-2.5 text-xs font-mono border-b flex items-center justify-between gap-3 ${
            feedback.success 
              ? 'bg-emerald-950/70 border-emerald-800/60 text-emerald-200' 
              : 'bg-rose-950/70 border-rose-800/60 text-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              {feedback.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
          </div>
        )}

        {/* KPI Stats Cards Bar */}
        {summary && (
          <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            {/* Total */}
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Total Analizadas</p>
                <p className="text-xl font-black text-white font-mono">{summary.totalStrategies}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            {/* Descartadas por SL */}
            <div className="p-3 bg-rose-950/30 rounded-xl border border-rose-900/50 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-rose-300 uppercase tracking-wider">Descartadas por SL</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-xl font-black text-rose-400 font-mono">{summary.discardedBySlCount}</p>
                  <span className="text-[10px] text-rose-400/80 font-mono">Tocaron Stop Loss</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-rose-900/40 border border-rose-700/50 flex items-center justify-center text-rose-300">
                <XCircle className="w-5 h-5 text-rose-400" />
              </div>
            </div>

            {/* Descartadas por TP */}
            <div className="p-3 bg-purple-950/30 rounded-xl border border-purple-900/50 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-purple-300 uppercase tracking-wider">Descartadas por TP</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-xl font-black text-purple-400 font-mono">{summary.discardedByTpCount}</p>
                  <span className="text-[10px] text-purple-400/80 font-mono">Tocaron TP1 / TP2 / TP3</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-purple-900/40 border border-purple-700/50 flex items-center justify-center text-purple-300">
                <Target className="w-5 h-5 text-purple-400" />
              </div>
            </div>

            {/* Vigentes / Válidas */}
            <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-900/50 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-emerald-300 uppercase tracking-wider">Vigentes (En Radar)</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-xl font-black text-emerald-400 font-mono">{summary.activeCount + summary.pendingCount}</p>
                  <span className="text-[10px] text-emerald-400/80 font-mono">No tocaron SL ni TP</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-900/40 border border-emerald-700/50 flex items-center justify-center text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs & Search Bar */}
        <div className="px-5 py-2.5 bg-slate-900/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none font-mono text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Todas ({summary?.totalStrategies || 0})
            </button>
            <button
              onClick={() => setActiveTab('discarded')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'discarded'
                  ? 'bg-rose-500 text-white font-black shadow-sm'
                  : 'text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/40'
              }`}
            >
              Descartadas ({summary?.discardedCount || 0})
            </button>
            <button
              onClick={() => setActiveTab('sl')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'sl'
                  ? 'bg-rose-600 text-white font-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Solo SL ({summary?.discardedBySlCount || 0})
            </button>
            <button
              onClick={() => setActiveTab('tp')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'tp'
                  ? 'bg-purple-600 text-white font-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Solo TP ({summary?.discardedByTpCount || 0})
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-950/40'
              }`}
            >
              Vigentes ({(summary?.activeCount || 0) + (summary?.pendingCount || 0)})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filtrar por par, celda M o código..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Results Table */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-slate-950/40">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-2.5 px-3 font-bold w-12 text-center">#</th>
                <th className="py-2.5 px-3 font-bold w-28">Par / Tipo</th>
                <th className="py-2.5 px-3 font-bold">Código Estrategia</th>
                <th className="py-2.5 px-3 font-bold w-40">Temporalidad PUB</th>
                <th className="py-2.5 px-3 font-bold w-28 text-center">Hoja Celda</th>
                <th className="py-2.5 px-3 font-bold w-36">Veredicto</th>
                <th className="py-2.5 px-3 font-bold">Nuevo Valor Columna M (Estado)</th>
                <th className="py-2.5 px-3 font-bold w-32 text-right">Tiempo Transc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredResults.map((item, idx) => {
                const isSl = item.discardReason === 'SL_HIT';
                const isTp = item.discardReason === 'TP_HIT';
                const isDiscarded = item.isDiscarded;

                return (
                  <tr 
                    key={item.strategyId}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isSl 
                        ? 'bg-rose-950/15' 
                        : isTp 
                        ? 'bg-purple-950/15' 
                        : 'bg-emerald-950/10'
                    }`}
                  >
                    {/* Index */}
                    <td className="py-2.5 px-3 text-center text-slate-500 font-bold">
                      {idx + 1}
                    </td>

                    {/* Par / Tipo */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs">{item.symbol}</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                          item.type === 'LONG' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {item.type}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        E1: ${item.entryPrice.toFixed(4)} · SL: ${item.stopLoss.toFixed(4)}
                      </div>
                    </td>

                    {/* Código Estrategia */}
                    <td className="py-2.5 px-3">
                      <div className="text-slate-300 font-semibold truncate max-w-xs sm:max-w-md" title={item.code}>
                        {item.code}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {item.coinName}
                      </div>
                    </td>

                    {/* Temporalidad PUB */}
                    <td className="py-2.5 px-3 text-slate-300">
                      <div className="flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 font-black text-[10px]">
                          TF: {item.pubTimeframe}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {item.pubDateFormatted}
                      </div>
                    </td>

                    {/* Hoja Celda */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-cyan-500/40 text-cyan-300 font-black text-xs">
                        {item.sheetCellM}
                      </span>
                      <div className="text-[9px] text-slate-500 mt-0.5 font-sans">
                        Fila {item.sheetRowIndex}
                      </div>
                    </td>

                    {/* Veredicto */}
                    <td className="py-2.5 px-3">
                      {isSl ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-950 border border-rose-600 text-rose-300 font-black text-[11px]">
                          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>Descartada (SL)</span>
                        </span>
                      ) : isTp ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-950 border border-purple-600 text-purple-300 font-black text-[11px]">
                          <Target className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>Descartada (TP)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-950 border border-emerald-600 text-emerald-300 font-black text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Vigente (Activa)</span>
                        </span>
                      )}
                    </td>

                    {/* Nuevo Valor Col M (Estado) */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <code className={`px-2 py-1 rounded text-xs font-bold font-mono border ${
                          isDiscarded
                            ? 'bg-rose-950/80 text-rose-200 border-rose-700/60'
                            : 'bg-emerald-950/80 text-emerald-200 border-emerald-700/60'
                        }`}>
                          {item.statusLabelM}
                        </code>
                      </div>
                      {item.diffFromPubStr && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Tocado a {item.diffFromPubStr} de la publicación ({item.eventTimeStr || ''})
                        </div>
                      )}
                    </td>

                    {/* Tiempo Transcurrido */}
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-slate-300 text-xs font-bold">
                        {item.timeAgoStr || 'vigente'}
                      </span>
                      <div className="text-[10px] text-slate-500">
                        hasta hoy
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Bottom Actions Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>
              Destino: Hoja <strong className="text-white font-bold">Estrategia</strong>, Columna <strong className="text-cyan-300 font-bold">M (Estado)</strong>.
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto justify-end">
            {/* Copiar Valores Col M */}
            <button
              onClick={handleCopyColumnM}
              title="Copiar lista de celdas y valores M para pegar en Google Sheets"
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copied ? '¡Copiado al Portapapeles!' : 'Copiar Columna M (TSV)'}</span>
            </button>

            {/* Descargar CSV */}
            <button
              onClick={handleDownloadCsv}
              title="Descargar reporte completo en CSV"
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Exportar CSV</span>
            </button>

            {/* Aplicar a Google Sheets */}
            <button
              onClick={handleApplyToSheets}
              disabled={isApplying || !summary}
              title="Guardar y actualizar los estados 'invalidada: razon' en la columna M de Google Sheets"
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-mono font-black bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <Database className={`w-4 h-4 ${isApplying ? 'animate-pulse' : ''}`} />
              <span>{isApplying ? 'Sincronizando...' : 'Guardar y Aplicar en Hoja Estrategia'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
