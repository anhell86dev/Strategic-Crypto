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
import { TradeHistoryLog } from './components/TradeHistoryLog';
import { SheetsConfigModal } from './components/SheetsConfigModal';
import { AddStrategyModal } from './components/AddStrategyModal';
import { DcaSimulatorModal } from './components/DcaSimulatorModal';
import { MultiStrategyComparisonModal } from './components/MultiStrategyComparisonModal';
import { INITIAL_STRATEGIES, INITIAL_ORDERS } from './data/initialStrategies';
import { TradeLogService } from './services/tradeLogService';
import { proxyService } from './services/proxyService';
import { TradeLogEntry } from './types';

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
  const [selectedStrategyForDca, setSelectedStrategyForDca] = useState<StrategyWithOrders | null>(null);
  const [isDcaModalOpen, setIsDcaModalOpen] = useState<boolean>(false);
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<Set<number>>(new Set());
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);

  // Trade History Log State
  const [tradeLogs, setTradeLogs] = useState<TradeLogEntry[]>(() => TradeLogService.getLogs());

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
    // Initial fetch of Google Apps Script Proxy Properties
    proxyService.fetchPropertiesFromProxy(sheetsConfig.proxyUrl).then(() => {
      loadStrategiesData(sheetsConfig);
    });

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
      const effectiveThreshold = strat.customAlertThreshold !== undefined ? strat.customAlertThreshold : 1.5;

      let distancePercent = 999;
      let isAlertZone = false;

      if (currentPrice && currentPrice > 0 && strat.entryPrice > 0) {
        const diferenciaAbsoluta = Math.abs(currentPrice - strat.entryPrice);
        distancePercent = (diferenciaAbsoluta / strat.entryPrice) * 100;
        isAlertZone = distancePercent <= effectiveThreshold;

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
        isAlertZone,
        effectiveThreshold
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

  // Track automatic alert fills when current price reaches entry trigger
  useEffect(() => {
    if (sortedAndFilteredStrategies.length > 0) {
      TradeLogService.checkAndTrackFills(
        sortedAndFilteredStrategies,
        tradeLogs,
        (newEntry) => {
          setTradeLogs(prev => [newEntry, ...prev]);
          audioAlert.playRadarPing(1050, 0.4); // distinctive fill chime
        }
      );
    }
  }, [sortedAndFilteredStrategies, tradeLogs]);

  // Clear trade logs handler
  const handleClearTradeLogs = () => {
    TradeLogService.clearLogs();
    setTradeLogs([]);
  };

  // Simulate fill handler for testing
  const handleSimulateFill = (strategy: StrategyWithOrders) => {
    const simPrice = strategy.currentPrice || strategy.entryPrice;
    const newEntry: TradeLogEntry = {
      id: `sim-${Date.now()}-${strategy.id}`,
      strategyId: strategy.id,
      symbol: strategy.symbol,
      coinName: strategy.coinName || strategy.symbol.replace('USDT', ''),
      type: strategy.type,
      plannedEntry: strategy.entryPrice,
      executionPrice: simPrice,
      distanceAtFill: strategy.distancePercent || 0.05,
      timestamp: new Date().toISOString(),
      status: 'ENTRY_FILLED',
      notes: `Ejecución simulada en tiempo real sobre ${strategy.symbol} a $${simPrice.toLocaleString()}.`,
      takeProfitsCount: strategy.orders?.length || 0
    };

    const updated = TradeLogService.addEntry(newEntry);
    setTradeLogs(updated);
    audioAlert.playRadarPing(1050, 0.4);
  };

  // Custom alert threshold update per strategy
  const handleUpdateThreshold = (strategyId: number, newThreshold: number) => {
    const updated = strategies.map(s => {
      if (s.id === strategyId) {
        return { ...s, customAlertThreshold: newThreshold };
      }
      return s;
    });
    setStrategies(updated);
    SheetsService.saveCustomData(updated, orders);
  };

  // Multi-selection handlers
  const handleToggleSelect = (strategyId: number) => {
    setSelectedStrategyIds(prev => {
      const next = new Set(prev);
      if (next.has(strategyId)) {
        next.delete(strategyId);
      } else {
        next.add(strategyId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const allFilteredSelected = sortedAndFilteredStrategies.length > 0 && 
      sortedAndFilteredStrategies.every(s => selectedStrategyIds.has(s.id));
    if (allFilteredSelected) {
      setSelectedStrategyIds(new Set());
    } else {
      setSelectedStrategyIds(new Set(sortedAndFilteredStrategies.map(s => s.id)));
    }
  };

  const handleRemoveFromComparison = (id: number) => {
    setSelectedStrategyIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedStrategyIds(new Set());
    setIsComparisonOpen(false);
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

  const selectedStrategiesForComparison = useMemo(() => {
    return sortedAndFilteredStrategies.filter(s => selectedStrategyIds.has(s.id));
  }, [sortedAndFilteredStrategies, selectedStrategyIds]);

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
          onUpdateThreshold={handleUpdateThreshold}
          onOpenDcaSimulator={(strat) => {
            setSelectedStrategyForDca(strat);
            setIsDcaModalOpen(true);
          }}
          selectedIds={selectedStrategyIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onOpenComparison={() => setIsComparisonOpen(true)}
        />

        {/* Chronological Trade History Log (Filled Alerts Tracker) */}
        <TradeHistoryLog
          logs={tradeLogs}
          onClearLogs={handleClearTradeLogs}
          onSimulateFill={handleSimulateFill}
          availableStrategies={sortedAndFilteredStrategies}
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

      <DcaSimulatorModal
        isOpen={isDcaModalOpen}
        onClose={() => setIsDcaModalOpen(false)}
        strategy={selectedStrategyForDca}
      />

      <MultiStrategyComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        strategies={selectedStrategiesForComparison}
        onRemoveStrategy={handleRemoveFromComparison}
        onClearSelection={handleClearSelection}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-xs text-slate-500 text-center font-mono">
        Crypto Strategy Radar · Sincronización continua de estrategias y ticks de Binance
      </footer>

    </div>
  );
}
