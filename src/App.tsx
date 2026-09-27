import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Strategy, 
  TakeProfitOrder, 
  StrategyWithOrders, 
  LiveTickerData, 
  ConnectionStatus, 
  SheetsConfig 
} from './types';
import { binanceStream } from './services/binanceService';
import { SheetsService, DEFAULT_SHEETS_CONFIG } from './services/sheetsService';
import { audioAlert } from './services/audioService';
import { Header } from './components/Header';
import { LegendBanner } from './components/LegendBanner';
import { RadarStatsBar } from './components/RadarStatsBar';
import { StrategyTable } from './components/StrategyTable';
import { SheetsConfigModal } from './components/SheetsConfigModal';
import { AddStrategyModal } from './components/AddStrategyModal';
import { INITIAL_STRATEGIES, INITIAL_ORDERS } from './data/initialStrategies';

export default function App() {
  // Raw Data State
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [orders, setOrders] = useState<TakeProfitOrder[]>([]);
  const [tickers, setTickers] = useState<Map<string, LiveTickerData>>(new Map());
  
  // Connection & Sync State
  const [sheetsConfig, setSheetsConfig] = useState<SheetsConfig>(SheetsService.getConfig());
  const [sheetsStatus, setSheetsStatus] = useState<ConnectionStatus>('connecting');
  const [binanceStatus, setBinanceStatus] = useState<ConnectionStatus>('connecting');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [tickCount, setTickCount] = useState<number>(0);

  // Audio State
  const [soundEnabled, setSoundEnabled] = useState<boolean>(audioAlert.isEnabled());

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Initial Sync from Google Sheets / Storage
  const loadStrategiesData = useCallback(async (cfg: SheetsConfig) => {
    setIsSyncing(true);
    setSheetsStatus('connecting');
    try {
      const res = await SheetsService.fetchFromGoogleSheets(cfg);
      setStrategies(res.strategies);
      setOrders(res.orders);
      setLastSyncTime(res.timestamp);
      setSheetsStatus('connected');
    } catch (err) {
      console.error('Error fetching sheets data:', err);
      setSheetsStatus('error');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Initialize and register periodic sync
  useEffect(() => {
    loadStrategiesData(sheetsConfig);

    // Subscribe to Binance connection status
    const unsubStatus = binanceStream.subscribeStatus((st) => {
      setBinanceStatus(st);
    });

    // Subscribe to incoming ticks
    const unsubTicks = binanceStream.subscribeTicker((ticker) => {
      setTickers(prev => {
        const next = new Map(prev);
        next.set(ticker.symbol, ticker);
        return next;
      });
      setTickCount(c => c + 1);
    });

    return () => {
      unsubStatus();
      unsubTicks();
      binanceStream.destroy();
    };
  }, [loadStrategiesData, sheetsConfig]);

  // Periodic Auto-Sync Interval
  useEffect(() => {
    if (!sheetsConfig.autoSync || sheetsConfig.syncIntervalSeconds <= 0) return;
    const intervalMs = Math.max(15, sheetsConfig.syncIntervalSeconds) * 1000;
    const timer = setInterval(() => {
      loadStrategiesData(sheetsConfig);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [sheetsConfig, loadStrategiesData]);

  // Update Binance subscribed stream symbols whenever strategies change
  useEffect(() => {
    if (strategies.length > 0) {
      const symbols = Array.from(new Set(strategies.map(s => s.symbol.toUpperCase().trim())));
      binanceStream.setSymbols(symbols);
    }
  }, [strategies]);

  // Dynamic Radar Engine (Calculate Distance %, Alert Zone & Sort)
  const sortedAndFilteredStrategies = useMemo(() => {
    // 1. Group orders by strategy ID
    const ordersMap = new Map<number, TakeProfitOrder[]>();
    orders.forEach(order => {
      const current = ordersMap.get(order.strategyId) || [];
      current.push(order);
      ordersMap.set(order.strategyId, current);
    });

    // 2. Enhance strategies with real-time ticker data and calculate distance
    const enhanced: StrategyWithOrders[] = strategies.map(strat => {
      const ticker = tickers.get(strat.symbol.toUpperCase());
      const currentPrice = ticker?.price;

      let distancePercent = 999;
      let isAlertZone = false;

      if (currentPrice && currentPrice > 0 && strat.entryPrice > 0) {
        const diferenciaAbsoluta = Math.abs(currentPrice - strat.entryPrice);
        distancePercent = (diferenciaAbsoluta / strat.entryPrice) * 100;
        isAlertZone = distancePercent < 1.5;

        // Check audio alert if in alert zone
        if (isAlertZone) {
          audioAlert.checkAlert(strat.symbol, distancePercent);
        }
      }

      return {
        ...strat,
        orders: ordersMap.get(strat.id) || [],
        currentPrice,
        priceChange24h: ticker?.priceChange,
        priceChangePercent24h: ticker?.priceChangePercent,
        high24h: ticker?.high,
        low24h: ticker?.low,
        volume24h: ticker?.volume,
        priceDirection: ticker?.direction,
        distancePercent,
        isAlertZone
      };
    });

    // 3. Filter by Direction, Status, Search
    const filtered = enhanced.filter(strat => {
      // Search
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchesSymbol = strat.symbol.toLowerCase().includes(q);
        const matchesName = (strat.coinName || '').toLowerCase().includes(q);
        const matchesCategory = (strat.category || '').toLowerCase().includes(q);
        if (!matchesSymbol && !matchesName && !matchesCategory) return false;
      }

      // Direction
      if (directionFilter !== 'ALL' && strat.type !== directionFilter) {
        return false;
      }

      // Status
      if (statusFilter !== 'ALL' && strat.status !== statusFilter) {
        return false;
      }

      return true;
    });

    // 4. Primary Radar Sort: Lowest distancePercent on top (Index 0)
    filtered.sort((a, b) => {
      const distA = a.distancePercent !== undefined ? a.distancePercent : 999999;
      const distB = b.distancePercent !== undefined ? b.distancePercent : 999999;
      return distA - distB;
    });

    return filtered;
  }, [strategies, orders, tickers, searchQuery, directionFilter, statusFilter]);

  // Audio Toggle
  const handleToggleSound = () => {
    const newState = audioAlert.toggleSound();
    setSoundEnabled(newState);
  };

  // Add Strategy Handler
  const handleAddStrategy = (newStrat: Strategy, newOrders: TakeProfitOrder[]) => {
    const nextStrategies = [newStrat, ...strategies];
    const nextOrders = [...orders, ...newOrders];
    setStrategies(nextStrategies);
    setOrders(nextOrders);
    SheetsService.saveCustomData(nextStrategies, nextOrders);
  };

  // Save Settings Handler
  const handleSaveSettings = (newConfig: SheetsConfig) => {
    setSheetsConfig(newConfig);
    SheetsService.saveConfig(newConfig);
    loadStrategiesData(newConfig);
  };

  // Test Sheets Connection Handler
  const handleTestConnection = async (cfg: SheetsConfig) => {
    try {
      const res = await SheetsService.fetchFromGoogleSheets(cfg);
      if (res.strategies.length > 0) {
        return {
          success: true,
          message: `Conexión exitosa. Se descargaron ${res.strategies.length} estrategias y ${res.orders.length} órdenes (${res.source}).`
        };
      }
      return {
        success: false,
        message: 'Conexión completada pero no se encontraron filas con el formato esperado.'
      };
    } catch (e: any) {
      return {
        success: false,
        message: e.message || 'Error al conectar con Google Sheets.'
      };
    }
  };

  // Reset to Demo Preset
  const handleResetToDemo = () => {
    setStrategies(INITIAL_STRATEGIES);
    setOrders(INITIAL_ORDERS);
    SheetsService.saveCustomData(INITIAL_STRATEGIES, INITIAL_ORDERS);
    setSheetsConfig(DEFAULT_SHEETS_CONFIG);
    SheetsService.saveConfig(DEFAULT_SHEETS_CONFIG);
    setIsSettingsOpen(false);
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setDirectionFilter('ALL');
    setStatusFilter('ALL');
  };

  const alertCount = useMemo(() => {
    return sortedAndFilteredStrategies.filter(s => s.isAlertZone).length;
  }, [sortedAndFilteredStrategies]);

  const isFiltered = searchQuery !== '' || directionFilter !== 'ALL' || statusFilter !== 'ALL';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* 1. Header / Panel de Control Superior */}
      <Header
        sheetsStatus={sheetsStatus}
        binanceStatus={binanceStatus}
        lastSyncTime={lastSyncTime}
        isSyncing={isSyncing}
        onManualSync={() => loadStrategiesData(sheetsConfig)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        directionFilter={directionFilter}
        onDirectionChange={setDirectionFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAddStrategy={() => setIsAddModalOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        tickCount={tickCount}
      />

      {/* 2. Main Body Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5">
        
        {/* Leyenda Informativa */}
        <LegendBanner alertCount={alertCount} />

        {/* Overview KPI Stats Bar */}
        <RadarStatsBar strategies={sortedAndFilteredStrategies} />

        {/* Main Strategy Radar Table */}
        <StrategyTable
          strategies={sortedAndFilteredStrategies}
          totalUnfilteredCount={strategies.length}
          onOpenAddStrategy={() => setIsAddModalOpen(true)}
          onClearFilters={handleClearFilters}
          isFiltered={isFiltered}
        />

      </main>

      {/* 3. Modals */}
      <SheetsConfigModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={sheetsConfig}
        onSaveConfig={handleSaveSettings}
        onTestConnection={handleTestConnection}
        onResetToDemo={handleResetToDemo}
      />

      <AddStrategyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddStrategy={handleAddStrategy}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-xs text-slate-500 text-center font-mono">
        Crypto Strategy Radar · Sincronización continua de estrategias y ticks de Binance
      </footer>

    </div>
  );
}
