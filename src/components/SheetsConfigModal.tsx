import React, { useState, useEffect } from 'react';
import { SheetsConfig, ProxyProperties } from '../types';
import { proxyService, DEFAULT_PROXY_SERVER_URL } from '../services/proxyService';
import { 
  X, 
  Database, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCw, 
  Key, 
  FileSpreadsheet,
  HelpCircle,
  Server,
  ShieldCheck,
  Cpu,
  Lock,
  Sparkles
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
  const [formData, setFormData] = useState<SheetsConfig>({
    ...config,
    proxyUrl: config.proxyUrl || DEFAULT_PROXY_SERVER_URL
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Proxy properties state
  const [proxyProps, setProxyProps] = useState<ProxyProperties>(() => proxyService.getProperties());
  const [isFetchingProxy, setIsFetchingProxy] = useState(false);
  const [proxySyncMessage, setProxySyncMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...config,
        proxyUrl: config.proxyUrl || DEFAULT_PROXY_SERVER_URL
      });
      setProxyProps(proxyService.getProperties());
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleSyncProxy = async () => {
    setIsFetchingProxy(true);
    setProxySyncMessage(null);
    try {
      const res = await proxyService.fetchPropertiesFromProxy(formData.proxyUrl);
      if (res.success) {
        setProxyProps(res.properties);
        setProxySyncMessage('Propiedades sincronizadas exitosamente desde Google Apps Script.');
        // If sheets api key was retrieved, update formData
        if (res.properties.SHEETS_API_KEY && !formData.apiKey) {
          setFormData(prev => ({ ...prev, apiKey: res.properties.SHEETS_API_KEY || '' }));
        }
      } else {
        setProxySyncMessage(`Aviso: ${res.message || 'No se pudo leer la respuesta'}`);
      }
    } catch (e: any) {
      setProxySyncMessage(`Error: ${e.message}`);
    } finally {
      setIsFetchingProxy(false);
    }
  };

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
    if (formData.proxyUrl) {
      proxyService.setProxyUrl(formData.proxyUrl);
    }
    onClose();
  };

  const maskSecret = (str?: string) => {
    if (!str || str.length < 6) return '••••••••••••';
    return `${str.substring(0, 4)}••••••••${str.substring(str.length - 4)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 font-sans text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono">
                Conexión & Proxy Server (Binance, Gemini, Sheets)
              </h3>
              <p className="text-xs text-slate-400">
                Sincronización segura de API Keys y estrategias mediante Google Apps Script
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
        <div className="py-5 space-y-5 text-xs font-mono">
          
          {/* 1. PROXY SERVER URL INPUT & SYNC */}
          <div className="bg-slate-950/90 border border-cyan-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Server className="w-4 h-4 text-cyan-400" />
                <span>Servidor Proxy (Google Apps Script Web App)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-sans">
                Endpoint Centralizado
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formData.proxyUrl || ''}
                onChange={(e) => setFormData({ ...formData, proxyUrl: e.target.value.trim() })}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-lg text-slate-100 text-[11px] outline-none"
              />
              <button
                type="button"
                onClick={handleSyncProxy}
                disabled={isFetchingProxy}
                className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isFetchingProxy ? 'animate-spin' : ''}`} />
                <span>{isFetchingProxy ? 'Sincronizando...' : 'Sincronizar Keys'}</span>
              </button>
            </div>

            {/* Properties Grid from Proxy */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                Propiedades del Script (Script Properties):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                
                {/* 1. BINANCE_API */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">Propiedad</span>
                    <strong className="text-white text-xs block">BINANCE_API</strong>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    proxyProps.BINANCE_API ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {proxyProps.BINANCE_API ? maskSecret(proxyProps.BINANCE_API) : 'No configurado'}
                  </span>
                </div>

                {/* 2. GEMINI_API_KEY */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">Propiedad</span>
                    <strong className="text-white text-xs block">GEMINI_API_KEY</strong>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    proxyProps.GEMINI_API_KEY ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {proxyProps.GEMINI_API_KEY ? maskSecret(proxyProps.GEMINI_API_KEY) : 'No configurado'}
                  </span>
                </div>

                {/* 3. SHEETS_API_KEY */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">Propiedad</span>
                    <strong className="text-white text-xs block">SHEETS_API_KEY</strong>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    proxyProps.SHEETS_API_KEY ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {proxyProps.SHEETS_API_KEY ? maskSecret(proxyProps.SHEETS_API_KEY) : 'No configurado'}
                  </span>
                </div>

                {/* 4. BINANCE_API_SECRET */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">Propiedad</span>
                    <strong className="text-white text-xs block">BINANCE_API_SECRET</strong>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    proxyProps.BINANCE_API_SECRET ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {proxyProps.BINANCE_API_SECRET ? maskSecret(proxyProps.BINANCE_API_SECRET) : 'No configurado'}
                  </span>
                </div>

              </div>

              {proxySyncMessage && (
                <div className="mt-2.5 text-[11px] text-cyan-300 bg-cyan-950/60 p-2 rounded border border-cyan-800/60">
                  {proxySyncMessage}
                </div>
              )}
            </div>
          </div>

          {/* 2. SPREADSHEET ID & DIRECT API KEY (FALLBACK) */}
          <div className="space-y-3">
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
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-600 focus:border-cyan-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
                <span>SHEETS API KEY (Manual / Sobrescribir Proxy)</span>
                <span className="text-slate-500 font-normal">Opcional</span>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value.trim() })}
                  placeholder={proxyProps.SHEETS_API_KEY ? 'Heredado del Proxy Server' : 'AIzaSyA1v-SVIdq765qYKcK7SPyxlDitbH8kAcM'}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-600 focus:border-cyan-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Sync Interval & AutoSync */}
          <div className="grid grid-cols-2 gap-3 pt-1">
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
                <span className="text-slate-300 text-xs">Sincronizar en vivo</span>
              </label>
            </div>

            <div>
              <label className="block font-semibold text-slate-200 mb-1.5">
                Intervalo de Sondeo
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
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm transition-colors"
            >
              Guardar y Aplicar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
