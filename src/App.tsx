import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Strategy, 
  TakeProfitOrder, 
  StrategyWithOrders, 
  LiveTickerData, 
  ConnectionStatus, 
  SheetsConfig 
} from './types';
import { ActiveFilterRule } from './types/filters';
import { binanceStream } from './services/binanceService';
import { SheetsService, DEFAULT_SHEETS_CONFIG } from './services/sheetsService';
import { audioAlert } from './services/audioService';
import { Header } from './components/Header';
import { LegendBanner } from './components/LegendBanner';
import { RadarStatsBar } from './components/RadarStatsBar';
import { DynamicFilterBar } from './components/DynamicFilterBar';
import { StrategyTable } from './components/StrategyTable';
import { TradeHistoryLog } from './components/TradeHistoryLog';
import { SheetsConfigModal } from './components/SheetsConfigModal';
import { AddStrategyModal } from './components/AddStrategyModal';
import { DcaSimulatorModal } from './components/DcaSimulatorModal';
import { MultiStrategyComparisonModal } from './components/MultiStrategyComparisonModal';
import { calculateRiskReward } from './utils/riskReward';
import { INITIAL_STRATEGIES, INITIAL_ORDERS } from './data/initialStrategies';
import { TradeLogService } from './services/tradeLogService';
import { proxyService } from './services/proxyService';
import { TradeLogEntry } from './types';
import { BinanceFuturesTab } from './components/BinanceFuturesTab';

export default function App() {
  // Raw Data State (initialized immediately with 74+ strategies from stored custom data or presets)
  const [strategies, setStrategies] = useState<Strategy[]>(() => SheetsService.getStoredCustomData().strategies);
  const [orders, setOrders] = useState<TakeProfitOrder[]>(() => SheetsService.getStoredCustomData().orders);
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

  // Dynamic Composable Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilterRule[]>([]);

  // Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [selectedStrategyForDca, setSelectedStrategyForDca] = useState<StrategyWithOrders | null>(null);
  const [isDcaModalOpen, setIsDcaModalOpen] = useState<boolean>(false);
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<Set<number>>(new Set());
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);

  // Trade History Log State
  const [tradeLogs, setTradeLogs] = useState<TradeLogEntry[]>(() => TradeLogService.getLogs());

  // Primary Navigation Tab (Radar vs Binance)
  const [activeMainTab, setActiveMainTab] = useState<'radar' | 'binance'>('radar');

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

  // Filter Management Handlers
  const handleAddFilter = (rule: ActiveFilterRule) => {
    setActiveFilters(prev => {
      // Replace if same type or append
      const filtered = prev.filter(f => f.id !== rule.id && f.type !== rule.type);
      return [...filtered, rule];
    });
  };

  const handleRemoveFilter = (filterId: string) => {
    setActiveFilters(prev => prev.filter(f => f.id !== filterId));
  };

  const handleClearAllFilters = () => {
    setActiveFilters([]);
    setSearchQuery('');
  };

  // Dynamic Radar Engine (Calculate Distance %, Alert Zone & Dynamic Filters Application)
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

    // 3. Apply Dynamic Composable Filters
    const filtered = enhanced.filter(strat => {
      // A. Text Search
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchesSymbol = strat.symbol.toLowerCase().includes(q);
        const matchesName = (strat.coinName || '').toLowerCase().includes(q);
        const matchesCategory = (strat.category || '').toLowerCase().includes(q);
        if (!matchesSymbol && !matchesName && !matchesCategory) return false;
      }

      // B. Dynamic Active Filter Rules
      for (const rule of activeFilters) {
        switch (rule.type) {
          case 'DISTANCE_LE': {
            const maxDist = Number(rule.value);
            if ((strat.distancePercent ?? 999) > maxDist) return false;
            break;
          }
          case 'DIRECTION': {
            if (strat.type !== rule.value) return false;
            break;
          }
          case 'STATUS': {
            if (strat.status !== rule.value) return false;
            break;
          }
          case 'ALERT_ZONE': {
            if (!strat.isAlertZone) return false;
            break;
          }
          case 'TP_HIT': {
            const isLong = strat.type === 'LONG';
            const live = strat.currentPrice || 0;
            const hasHit = strat.orders.some(tp => {
              if (!live || !tp.targetPrice) return false;
              return isLong ? live >= tp.targetPrice : live <= tp.targetPrice;
            });
            if (!hasHit) return false;
            break;
          }
          case 'LEVERAGE_GE': {
            const minLev = Number(rule.value);
            if ((strat.leverage || 5) < minLev) return false;
            break;
          }
          case 'RR_GE': {
            const minRr = Number(rule.value);
            const stratRr = calculateRiskReward({
              entryPrice: strat.entryPrice,
              stopLoss: strat.stopLoss,
              type: strat.type,
              orders: strat.orders
            });
            if (stratRr.maxRiskReward < minRr) return false;
            break;
          }
          case 'HAS_DCA': {
            if (!strat.dcaLevels || strat.dcaLevels.length === 0) return false;
            break;
          }
          case 'PERF_24H': {
            const pct = strat.priceChangePercent24h || 0;
            if (rule.value === 'POSITIVE' && pct <= 0) return false;
            if (rule.value === 'GAINERS_5' && pct < 5) return false;
            if (rule.value === 'LOSERS' && pct >= 0) return false;
            break;
          }
          case 'CATEGORY': {
            if (strat.category !== rule.value) return false;
            break;
          }
        }
      }

      return true;
    });

    // 4. Mantener el orden original de las estrategias según la hoja de cálculo
    // La fila solo se alertará visualmente si el precio live está cercano a E1
    return filtered;
  }, [strategies, orders, tickers, searchQuery, activeFilters]);

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
          audioAlert.playRadarPing(1050, 0.4);
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

  // Status update handler (AN cell from Analysis Modal)
  const handleStatusUpdated = (strategyId: number, newStatus: string) => {
    const updated = strategies.map(s => {
      if (s.id === strategyId) {
        return { ...s, status: newStatus };
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

  const alertCount = useMemo(() => {
    return sortedAndFilteredStrategies.filter(s => s.isAlertZone).length;
  }, [sortedAndFilteredStrategies]);

  const selectedStrategiesForComparison = useMemo(() => {
    return sortedAndFilteredStrategies.filter(s => selectedStrategyIds.has(s.id));
  }, [sortedAndFilteredStrategies, selectedStrategyIds]);

  const isFiltered = searchQuery !== '' || activeFilters.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200 font-sans">
      
      {/* 1. Header / Panel de Control Superior */}
      <Header
        sheetsStatus={sheetsStatus}
        binanceStatus={binanceStatus}
        lastSyncTime={lastSyncTime}
        isSyncing={isSyncing}
        onManualSync={() => loadStrategiesData(sheetsConfig)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAddStrategy={() => setIsAddModalOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        tickCount={tickCount}
        activeTab={activeMainTab}
        onTabChange={setActiveMainTab}
      />

      {/* 2. Main Body Container */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-5">
        {activeMainTab === 'binance' ? (
          <BinanceFuturesTab onSwitchToStrategies={() => setActiveMainTab('radar')} />
        ) : (
          <>
            {/* Leyenda Informativa */}
            <LegendBanner alertCount={alertCount} />

            {/* Overview KPI Stats Bar */}
            <RadarStatsBar strategies={sortedAndFilteredStrategies} />

            {/* Dynamic Composable Filter Bar */}
            <DynamicFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeFilters={activeFilters}
              onAddFilter={handleAddFilter}
              onRemoveFilter={handleRemoveFilter}
              onClearAllFilters={handleClearAllFilters}
              strategies={strategies as StrategyWithOrders[]}
              totalCount={strategies.length}
              filteredCount={sortedAndFilteredStrategies.length}
            />

            {/* Main Strategy Radar Table */}
            <StrategyTable
              strategies={sortedAndFilteredStrategies}
              totalUnfilteredCount={strategies.length}
              onOpenAddStrategy={() => setIsAddModalOpen(true)}
              onClearFilters={handleClearAllFilters}
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
              onStatusUpdated={handleStatusUpdated}
            />

            {/* Chronological Trade History Log (Filled Alerts Tracker) */}
            <TradeHistoryLog
              logs={tradeLogs}
              onClearLogs={handleClearTradeLogs}
              onSimulateFill={handleSimulateFill}
              availableStrategies={sortedAndFilteredStrategies}
            />
          </>
        )}
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
      <footer className="border-t border-slate-900 bg-slate-950 py-5 px-6 text-sm text-slate-400 text-center font-mono">
        Crypto Strategy Radar · Sincronización continua de estrategias y ticks de Binance
      </footer>

    </div>
  );
}
