import React, { useState, useEffect, useMemo } from 'react';
import { 
  BinanceFuturesAccount, 
  BinanceFuturesPosition, 
  BinanceFuturesOrder, 
  BinanceFuturesConnectionStatus 
} from '../types/binanceFutures';
import { BinanceFuturesService } from '../services/binanceFuturesService';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  RotateCw, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Sliders, 
  ExternalLink,
  Flame,
  Key,
  Clock,
  Activity,
  DollarSign,
  Sparkles,
  RefreshCw,
  Eye,
  Lock
} from 'lucide-react';

interface BinanceFuturesTabProps {
  onSwitchToStrategies?: () => void;
}

export const BinanceFuturesTab: React.FC<BinanceFuturesTabProps> = ({
  onSwitchToStrategies
}) => {
  const [account, setAccount] = useState<BinanceFuturesAccount | null>(null);
  const [positions, setPositions] = useState<BinanceFuturesPosition[]>([]);
  const [orders, setOrders] = useState<BinanceFuturesOrder[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<BinanceFuturesConnectionStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [useDemoFallback, setUseDemoFallback] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [searchSymbol, setSearchSymbol] = useState<string>('');
  const [sideFilter, setSideFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'positions' | 'orders' | 'assets'>('positions');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load account & positions
  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Check connection status
      const status = await BinanceFuturesService.checkStatus();
      setConnectionStatus(status);

      // 2. Fetch Account
      const accRes = await BinanceFuturesService.getAccount();
      
      // 3. Fetch Positions
      const posRes = await BinanceFuturesService.getPositions();

      // 4. Fetch Orders
      const ordRes = await BinanceFuturesService.getOrders();

      if (accRes.ok && accRes.data) {
        setAccount(accRes.data);
        setPositions(posRes.ok && posRes.positions ? posRes.positions : (accRes.data.positions || []));
        setOrders(ordRes.ok && ordRes.orders ? ordRes.orders : []);
        setUseDemoFallback(false);
      } else {
        // If error or unconfigured, notify
        const errMsg = accRes.error || posRes.error || 'No se pudo conectar a la API de Binance Futuros';
        setErrorMsg(errMsg);
        
        // If demo fallback enabled, load sample
        if (useDemoFallback) {
          const sample = BinanceFuturesService.getSampleData();
          setAccount(sample.account);
          setPositions(sample.positions);
        }
      }
      setLastUpdated(new Date());
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inesperado al conectar con Binance');
      if (useDemoFallback) {
        const sample = BinanceFuturesService.getSampleData();
        setAccount(sample.account);
        setPositions(sample.positions);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [useDemoFallback]);

  // Periodic Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, 12000); // 12 seconds polling
    return () => clearInterval(interval);
  }, [autoRefresh, useDemoFallback]);

  // Filtered positions
  const filteredPositions = useMemo(() => {
    return positions.filter(pos => {
      const matchSymbol = pos.symbol.toLowerCase().includes(searchSymbol.toLowerCase());
      const matchSide = sideFilter === 'ALL' || pos.side === sideFilter;
      return matchSymbol && matchSide;
    });
  }, [positions, searchSymbol, sideFilter]);

  // Overall KPIs calculation
  const totalUnrealizedPnl = account?.totalUnrealizedProfit ?? positions.reduce((acc, p) => acc + p.unRealizedProfit, 0);
  const totalWallet = account?.totalWalletBalance ?? 0;
  const totalMargin = account?.totalMarginBalance ?? (totalWallet + totalUnrealizedPnl);
  const availableBal = account?.availableBalance ?? 0;
  const isPnlPositive = totalUnrealizedPnl >= 0;
  const pnlPercent = totalWallet > 0 ? (totalUnrealizedPnl / totalWallet) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <span className="text-xl font-bold">⚡</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                Binance USD-M Futuros
              </h2>
              
              {connectionStatus?.connected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/80">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Conectado API
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700/80">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {useDemoFallback ? 'Modo Simulación' : 'API Desconectada'}
                </span>
              )}

              {connectionStatus?.latencyMs !== undefined && (
                <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                  Ping: {connectionStatus.latencyMs}ms
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Extracción en vivo de balance de cuenta, margen y posiciones activas abiertas
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5 justify-end">
          
          {/* Demo toggle if not connected */}
          {(!account || errorMsg) && (
            <button
              onClick={() => setUseDemoFallback(!useDemoFallback)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer ${
                useDemoFallback
                  ? 'bg-amber-950 text-amber-300 border-amber-600'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{useDemoFallback ? 'Desactivar Demo' : 'Vista Previa (Demo)'}</span>
            </button>
          )}

          {/* Auto Refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer ${
              autoRefresh 
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Auto (12s)</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-bold font-mono text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:scale-95 rounded-xl shadow-md shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* Warning / Error banner with setup guidance if keys are not ready */}
      {errorMsg && !useDemoFallback && (
        <div className="bg-gradient-to-r from-amber-950/70 to-slate-900 border border-amber-600/60 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="flex items-start gap-3">
            <Key className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <h3 className="text-base font-bold text-amber-200 font-mono">
                Conexión con Binance Futuros
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                {errorMsg}
              </p>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 space-y-1.5 mt-2">
                <div className="text-cyan-400 font-bold">📋 Instrucciones para conectar tus llaves de Binance:</div>
                <div>
                  1. Configura <strong className="text-amber-300">BINANCE_API_KEY</strong> y <strong className="text-amber-300">BINANCE_API_SECRET</strong> en tu archivo <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">.env</code> del servidor o en las propiedades de Google Apps Script.
                </div>
                <div>
                  2. En Binance, crea una API Key con permiso de lectura de Futuros (<em className="text-slate-400">"Enable Reading" / "Enable Futures"</em>).
                </div>
                <div>
                  3. Las llaves se autentican de forma segura en el servidor mediante HMAC-SHA256 y nunca son expuestas al navegador.
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => setUseDemoFallback(true)}
                  className="px-3.5 py-2 text-xs font-mono font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Ver Datos de Ejemplo (Modo Simulación)
                </button>
                <button
                  onClick={() => fetchData(true)}
                  className="px-3.5 py-2 text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-all cursor-pointer"
                >
                  Reintentar Conexión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards: Cuenta de Futuros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Total Wallet Balance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono font-bold uppercase tracking-wider">
              Balance Billetera
            </span>
            <Wallet className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
            ${totalWallet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
            <span>Capital total en USDT</span>
            <span className="text-cyan-400 font-bold">Futuros USD-M</span>
          </div>
        </div>

        {/* 2. Total Margin Balance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono font-bold uppercase tracking-wider">
              Balance de Margen
            </span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
            ${totalMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
            <span>Billetera + PnL no realizado</span>
            <span className="text-purple-400 font-bold">Margen Actual</span>
          </div>
        </div>

        {/* 3. Unrealized PnL */}
        <div className={`bg-slate-900/90 border rounded-2xl p-4 space-y-2 shadow-md relative overflow-hidden ${
          isPnlPositive ? 'border-emerald-600/40' : 'border-rose-600/40'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono font-bold uppercase tracking-wider">
              PnL No Realizado
            </span>
            {isPnlPositive ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight flex items-baseline gap-2 ${
            isPnlPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            <span>{isPnlPositive ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}</span>
            <span className="text-sm font-bold opacity-80">
              ({isPnlPositive ? '+' : ''}{pnlPercent.toFixed(2)}%)
            </span>
          </div>
          <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
            <span>{positions.length} posiciones abiertas</span>
            <span className={isPnlPositive ? 'text-emerald-400' : 'text-rose-400'}>
              {isPnlPositive ? 'En ganancia neta' : 'En pérdida neta'}
            </span>
          </div>
        </div>

        {/* 4. Available Balance / Margen Libre */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono font-bold uppercase tracking-wider">
              Margen Disponible
            </span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
            ${availableBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
            <span>Libre para nuevas órdenes</span>
            <span className="text-slate-300 font-bold">
              {totalWallet > 0 ? `${((availableBal / totalWallet) * 100).toFixed(0)}% libre` : '--'}
            </span>
          </div>
        </div>

      </div>

      {/* Sub Tabs: Posiciones Abiertas | Órdenes Activas | Activos */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          
          <button
            onClick={() => setActiveSubTab('positions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === 'positions'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Posiciones Abiertas ({positions.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === 'orders'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Órdenes Pendientes ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('assets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === 'assets'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Activos Billetera ({account?.assets?.length || 0})</span>
          </button>

        </div>

        {/* Search & Filter for Positions */}
        {activeSubTab === 'positions' && (
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchSymbol}
                onChange={(e) => setSearchSymbol(e.target.value)}
                placeholder="Buscar símbolo (BTC, ETH...)"
                className="pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-44 sm:w-56"
              />
            </div>

            {/* Side filter pills */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setSideFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  sideFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setSideFilter('LONG')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  sideFilter === 'LONG' ? 'bg-emerald-950 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Longs
              </button>
              <button
                onClick={() => setSideFilter('SHORT')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  sideFilter === 'SHORT' ? 'bg-rose-950 text-rose-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Shorts
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SUBTAB 1: POSICIONES ABIERTAS */}
      {activeSubTab === 'positions' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {filteredPositions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Activity className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-base font-bold font-mono text-slate-300">
                {positions.length === 0 ? 'No hay posiciones abiertas actualmente' : 'Ninguna posición coincide con el filtro'}
              </div>
              <p className="text-xs font-mono text-slate-500 max-w-md mx-auto">
                {positions.length === 0 
                  ? 'Cuando abras operaciones en Binance Futuros aparecerán aquí automáticamente en tiempo real con su margen, PnL y precio de liquidación.' 
                  : 'Intenta limpiar el buscador o seleccionar "Todos" los lados.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Símbolo / Par</th>
                    <th className="py-3 px-4">Tamaño / Nocional</th>
                    <th className="py-3 px-4">Precio Entrada</th>
                    <th className="py-3 px-4">Precio Marca</th>
                    <th className="py-3 px-4">Precio Liquidación</th>
                    <th className="py-3 px-4">Margen</th>
                    <th className="py-3 px-4 text-right">PnL No Realizado (ROE %)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs sm:text-sm">
                  {filteredPositions.map((pos) => {
                    const isLong = pos.side === 'LONG';
                    const isProfitable = pos.unRealizedProfit >= 0;
                    const cleanSymbol = pos.symbol.replace('USDT', '');

                    return (
                      <tr 
                        key={`${pos.symbol}-${pos.positionSide}`}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        {/* 1. Símbolo y Lado */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="font-extrabold text-white text-sm sm:text-base">
                              {cleanSymbol}/USDT
                            </span>
                            
                            <span className={`inline-flex items-center gap-0.5 text-[11px] font-black px-2 py-0.5 rounded-md border ${
                              isLong 
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-700/80' 
                                : 'bg-rose-950 text-rose-300 border-rose-700/80'
                            }`}>
                              {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                              {pos.side}
                            </span>

                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                              {pos.leverage}x
                            </span>

                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 uppercase">
                              {pos.marginType}
                            </span>
                          </div>
                        </td>

                        {/* 2. Tamaño y Valor Nocional */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">
                            {pos.positionAmt > 0 ? `+${pos.positionAmt}` : pos.positionAmt} {cleanSymbol}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            ≈ ${pos.notional.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>

                        {/* 3. Precio Entrada */}
                        <td className="py-3.5 px-4 text-slate-300 font-bold">
                          ${pos.entryPrice.toLocaleString()}
                        </td>

                        {/* 4. Precio Marca */}
                        <td className="py-3.5 px-4 font-bold text-cyan-300">
                          ${pos.markPrice.toLocaleString()}
                        </td>

                        {/* 5. Precio Liquidación */}
                        <td className="py-3.5 px-4">
                          {pos.liquidationPrice > 0 ? (
                            <span className="font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/60">
                              ${pos.liquidationPrice.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-500">--</span>
                          )}
                        </td>

                        {/* 6. Margen Asignado */}
                        <td className="py-3.5 px-4 text-slate-400">
                          ${pos.leverage > 0 ? (pos.notional / pos.leverage).toFixed(2) : '--'}
                        </td>

                        {/* 7. PnL No Realizado & ROE */}
                        <td className="py-3.5 px-4 text-right">
                          <div className={`font-black text-sm sm:text-base ${
                            isProfitable ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {isProfitable ? '+' : ''}${pos.unRealizedProfit.toFixed(2)}
                          </div>
                          <div className={`text-xs font-bold ${
                            isProfitable ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {isProfitable ? '+' : ''}{pos.roe.toFixed(2)}%
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: ÓRDENES PENDIENTES */}
      {activeSubTab === 'orders' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {orders.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Sliders className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-base font-bold font-mono text-slate-300">
                No hay órdenes pendientes en Binance Futuros
              </div>
              <p className="text-xs font-mono text-slate-500 max-w-md mx-auto">
                Las órdenes límite, stop loss y take profit colocadas en Binance se listarán aquí.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 font-bold uppercase">
                    <th className="py-3 px-4">Símbolo</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Lado</th>
                    <th className="py-3 px-4">Precio</th>
                    <th className="py-3 px-4">Cantidad</th>
                    <th className="py-3 px-4">Ejecutado</th>
                    <th className="py-3 px-4 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {orders.map((ord) => (
                    <tr key={ord.orderId} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-white">{ord.symbol}</td>
                      <td className="py-3 px-4 text-slate-300">{ord.type}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          ord.side === 'BUY' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                        }`}>
                          {ord.side}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-cyan-300 font-bold">${ord.price}</td>
                      <td className="py-3 px-4 text-slate-300">{ord.origQty}</td>
                      <td className="py-3 px-4 text-slate-400">{ord.executedQty}</td>
                      <td className="py-3 px-4 text-right font-bold text-amber-400">{ord.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: ACTIVOS DE BILLETERA */}
      {activeSubTab === 'assets' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-slate-400">
              Desglose de Activos en Futuros USD-M
            </span>
            <span className="text-xs font-mono text-cyan-400">
              {account?.assets?.length || 0} activos registrados
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 font-bold uppercase">
                  <th className="py-3 px-4">Activo</th>
                  <th className="py-3 px-4">Balance Billetera</th>
                  <th className="py-3 px-4">Margen Disponible</th>
                  <th className="py-3 px-4">Balance Margen</th>
                  <th className="py-3 px-4 text-right">PnL No Realizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(account?.assets || []).map((ast) => (
                  <tr key={ast.asset} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-extrabold text-white text-base">{ast.asset}</td>
                    <td className="py-3 px-4 font-bold text-slate-200">{ast.walletBalance.toLocaleString()}</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">{ast.availableBalance.toLocaleString()}</td>
                    <td className="py-3 px-4 text-purple-400 font-bold">{ast.marginBalance.toLocaleString()}</td>
                    <td className={`py-3 px-4 text-right font-bold ${
                      ast.unrealizedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {ast.unrealizedProfit >= 0 ? '+' : ''}${ast.unrealizedProfit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info footer */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono text-slate-500 pt-2">
        <div>
          Última actualización: {lastUpdated ? lastUpdated.toLocaleTimeString() : '--:--:--'}
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
          <span>Binance USD-M Futures API (HMAC-SHA256 Server Proxy)</span>
        </div>
      </div>

    </div>
  );
};
