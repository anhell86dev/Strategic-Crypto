import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  ShieldCheck, 
  Key, 
  RotateCw, 
  ArrowRight, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  ExternalLink,
  Layers,
  Zap,
  Activity
} from 'lucide-react';
import { BinanceFuturesService } from '../services/binanceFuturesService';
import { BinanceFuturesConnectionStatus } from '../types/binanceFutures';

interface BinanceGatewayScreenProps {
  onEnterApp: (options?: { startInBinance?: boolean; useDemo?: boolean }) => void;
}

export const BinanceGatewayScreen: React.FC<BinanceGatewayScreenProps> = ({
  onEnterApp
}) => {
  const [status, setStatus] = useState<BinanceFuturesConnectionStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [checking, setChecking] = useState<boolean>(false);
  const [rememberPreference, setRememberPreference] = useState<boolean>(true);

  const checkConnection = async () => {
    setChecking(true);
    try {
      const res = await BinanceFuturesService.checkStatus();
      setStatus(res);
    } catch {
      setStatus({
        configured: false,
        hasKey: false,
        hasSecret: false,
        testnet: false,
        connected: false,
        source: 'none',
        error: 'No se pudo conectar con el servidor backend'
      });
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleProceed = (options?: { startInBinance?: boolean; useDemo?: boolean }) => {
    if (rememberPreference) {
      localStorage.setItem('crypto_radar_gateway_passed', 'true');
    }
    onEnterApp(options);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200 font-sans relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-cyan-500/10 via-blue-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/5 blur-3xl pointer-events-none" />

      {/* Top Branding Header */}
      <header className="w-full px-6 py-5 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/40">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white font-mono tracking-tight flex items-center gap-2">
              Crypto Strategy Radar
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase">
                Gateway
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Conexión de cuenta y monitor en tiempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Servidor Seguro HMAC-SHA256</span>
        </div>
      </header>

      {/* Main Connection Gateway Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl space-y-6">
          
          {/* Header of the Card */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-xl shadow-amber-500/20 mb-1 ring-1 ring-amber-300/40">
              <Zap className="w-7 h-7 stroke-[2.5]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              Conexión Binance Futuros
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Verifica la conexión a Binance para sincronizar balances, margen y posiciones abiertas antes de ingresar al radar de estrategias.
            </p>
          </div>

          {/* Connection Status Box */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                Estado del Servidor
              </span>

              {loading || checking ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-amber-300 border border-amber-600/40 animate-pulse">
                  <RotateCw className="w-3 h-3 animate-spin" /> Verificando...
                </span>
              ) : status?.configured ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-600/50 shadow-sm shadow-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Llaves Configuradas
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950/70 text-amber-300 border border-amber-600/40">
                  <AlertTriangle className="w-3.5 h-3.5" /> Llaves No Detectadas
                </span>
              )}
            </div>

            {/* Diagnostic Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">Binance API Key:</span>
                <span className={status?.hasKey ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {status?.hasKey ? 'Configurada (OK)' : 'No detectada'}
                </span>
              </div>
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">Binance Secret:</span>
                <span className={status?.hasSecret ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {status?.hasSecret ? 'Configurado (OK)' : 'No detectado'}
                </span>
              </div>
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">Red / Entorno:</span>
                <span className="text-cyan-400 font-bold">
                  {status?.testnet ? 'Testnet Futuros' : 'Producción (Live)'}
                </span>
              </div>
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">Latencia / Ping:</span>
                <span className="text-slate-200 font-bold">
                  {status?.latencyMs !== undefined ? `${status.latencyMs} ms` : '--'}
                </span>
              </div>
            </div>

            {/* Security Notice & Instructions */}
            {!status?.configured && (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-300 leading-relaxed space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Seguridad de Llaves de API:</span>
                </div>
                <p className="text-slate-400">
                  Por seguridad, tus llaves privadas nunca se introducen en formularios web vulnerables a extensiones de navegador. Se configuran de forma protegida en el archivo <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-300">.env</code> del servidor:
                </p>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] text-amber-300 space-y-1 font-mono">
                  <div>BINANCE_API_KEY="tu_api_key_de_binance"</div>
                  <div>BINANCE_API_SECRET="tu_api_secret_de_binance"</div>
                </div>
                <p className="text-[11px] text-slate-500">
                  * Recomendado: activa únicamente permisos de lectura (<em className="text-slate-400">"Enable Reading" / "Enable Futures"</em>) en el panel de Binance.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            
            {/* Primary Action Button */}
            {status?.configured ? (
              <button
                onClick={() => handleProceed({ startInBinance: true })}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black font-mono text-base shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Conectar y Ver Cuenta de Futuros</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            ) : (
              <button
                onClick={checkConnection}
                disabled={checking}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold font-mono text-sm border border-slate-700 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-4 h-4 text-cyan-400 ${checking ? 'animate-spin' : ''}`} />
                <span>{checking ? 'Verificando con Binance...' : 'Reintentar Verificación de Llaves'}</span>
              </button>
            )}

            {/* Alternative Access Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              
              {/* Go directly to Strategies Radar */}
              <button
                onClick={() => handleProceed({ startInBinance: false })}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 font-bold font-mono text-xs sm:text-sm border border-cyan-700/60 hover:border-cyan-500 transition-all cursor-pointer"
              >
                <Radio className="w-4 h-4 text-cyan-400" />
                <span>Ingresar al Radar de Estrategias</span>
              </button>

              {/* Demo / Sample Futures Mode */}
              <button
                onClick={() => handleProceed({ startInBinance: true, useDemo: true })}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-bold font-mono text-xs sm:text-sm border border-slate-700 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Entrar con Datos Demo</span>
              </button>

            </div>

          </div>

          {/* Remember gateway checkbox */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/60">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberPreference}
                onChange={(e) => setRememberPreference(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-slate-400 hover:text-slate-300">
                Recordar y entrar directamente las próximas veces
              </span>
            </label>

            <span className="text-[11px] font-mono text-slate-500">
              v1.2 · Real-Time Feed
            </span>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs font-mono text-slate-500 border-t border-slate-900 bg-slate-950">
        Crypto Strategy Radar · Conexión segura con Binance API y feeds en vivo
      </footer>

    </div>
  );
};
