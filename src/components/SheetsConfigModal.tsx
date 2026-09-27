import React, { useState } from 'react';
import { SheetsConfig } from '../types';
import { 
  X, 
  Database, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCw, 
  Key, 
  FileSpreadsheet,
  HelpCircle
} from 'lucide-react';

interface SheetsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SheetsConfig;
  onSaveConfig: (cfg: SheetsConfig) => void;
  onTestConnection: (cfg: SheetsConfig) => Promise<{ success: boolean; message: string }>;
  onResetToDemo: () => void;
}

export const SheetsConfigModal: React.FC<SheetsConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onTestConnection,
  onResetToDemo
}) => {
  const [formData, setFormData] = useState<SheetsConfig>(config);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection(formData);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Error al conectar' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSaveConfig(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Conexión con Google Sheets
              </h3>
              <p className="text-xs text-slate-400">
                Sincroniza tus estrategias y órdenes de Take Profit en tiempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-5 space-y-4 text-xs">
          
          {/* Spreadsheet ID Input */}
          <div>
            <label className="block font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
              <span>SPREADSHEET ID (ID del Documento)</span>
              <a
                href={`https://docs.google.com/spreadsheets/d/${formData.spreadsheetId || '1jwRLOHKGUlHSPcAF401LKtDtSW5erFwZvxYkSJm-2mE'}/edit`}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-normal"
              >
                <span>Ver hoja actual</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              type="text"
              value={formData.spreadsheetId}
              onChange={(e) => setFormData({ ...formData, spreadsheetId: e.target.value.trim() })}
              placeholder="Ej. 1jwRLOHKGUlHSPcAF401LKtDtSW5erFwZvxYkSJm-2mE"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-slate-100 placeholder-slate-600 focus:border-cyan-500 outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Es el identificador que aparece en la URL del Google Sheets entre <code>/d/</code> y <code>/edit</code>.
            </p>
          </div>

          {/* SHEETS API KEY Input */}
          <div>
            <label className="block font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
              <span>SHEETS API KEY (Opcional / Recomendado)</span>
              <span className="text-slate-500 font-normal">Google Cloud Console</span>
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value.trim() })}
                placeholder="AIzaSyA1v-SVIdq765qYKcK7SPyxlDitbH8kAcM"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-slate-100 placeholder-slate-600 focus:border-cyan-500 outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Si la hoja es pública (&quot;Cualquier persona con el enlace puede leer&quot;), la app también descargará los datos directamente vía exportador GViz/CSV.
            </p>
          </div>

          {/* Sync Interval & AutoSync */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block font-semibold text-slate-200 mb-1.5">
                Auto-Sincronización
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-950 border border-slate-800">
                <input
                  type="checkbox"
                  checked={formData.autoSync}
                  onChange={(e) => setFormData({ ...formData, autoSync: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span className="text-slate-300 text-xs">Sincronizar automáticamente</span>
              </label>
            </div>

            <div>
              <label className="block font-semibold text-slate-200 mb-1.5">
                Intervalo de Sincronización
              </label>
              <select
                value={formData.syncIntervalSeconds}
                onChange={(e) => setFormData({ ...formData, syncIntervalSeconds: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:border-cyan-500 outline-none"
              >
                <option value={30}>Cada 30 segundos</option>
                <option value={60}>Cada 60 segundos (Recomendado)</option>
                <option value={120}>Cada 2 minutos</option>
                <option value={300}>Cada 5 minutos</option>
              </select>
            </div>
          </div>

          {/* Schema Requirements Help Box */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-[11px] space-y-2 text-slate-400">
            <div className="flex items-center gap-1.5 font-bold text-slate-300">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Estructura Requerida de la Hoja de Cálculo:</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 font-mono text-[10px]">
              <li>
                <strong className="text-slate-200">Pestaña &quot;Estrategia&quot;:</strong> ID, Símbolo (ej. BTCUSDT), Dirección (LONG/SHORT), Entrada, StopLoss, Fecha, Estado
              </li>
              <li>
                <strong className="text-slate-200">Pestaña &quot;Ordenes&quot;:</strong> StrategyID, Tipo (TP1, TP2...), Precio Objetivo, % Cierre
              </li>
            </ul>
          </div>

          {/* Test Connection Output */}
          {testResult && (
            <div className={`p-3 rounded-lg border flex items-start gap-2 ${
              testResult.success 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs">
                {testResult.message}
              </div>
            </div>
          )}

        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 gap-2">
          <button
            type="button"
            onClick={onResetToDemo}
            className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Restablecer Demo
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 text-cyan-400 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Probando...' : 'Probar Conexión'}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm transition-colors"
            >
              Guardar y Aplicar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
