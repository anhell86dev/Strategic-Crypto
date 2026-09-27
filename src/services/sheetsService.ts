import { Strategy, TakeProfitOrder, SheetsConfig } from '../types';
import { INITIAL_STRATEGIES, INITIAL_ORDERS } from '../data/initialStrategies';
import { proxyService, DEFAULT_PROXY_SERVER_URL } from './proxyService';

const STORAGE_KEY_CONFIG = 'crypto_radar_sheets_config';
const STORAGE_KEY_CUSTOM_STRATEGIES = 'crypto_radar_custom_strategies_v2';
const STORAGE_KEY_CUSTOM_ORDERS = 'crypto_radar_custom_orders_v2';

export const DEFAULT_SHEETS_CONFIG: SheetsConfig = {
  spreadsheetId: '1jwRLOHKGUlHSPcAF401LKtDtSW5erFwZvxYkSJm-2mE',
  apiKey: '',
  autoSync: true,
  syncIntervalSeconds: 60,
  usePresetFallback: true,
  proxyUrl: DEFAULT_PROXY_SERVER_URL,
};

// Sheet name candidates to try when fetching from Google Sheets (prioritizing Ordenes)
const SHEET_NAME_CANDIDATES = [
  'Ordenes',
  'Órdenes',
  'Orders',
  'Estrategia',
  'Estrategias',
  'Trades',
  'TakeProfits',
  'TPs',
  'Sheet1',
  'Hoja 1',
  'Hoja1',
  'Crypto',
  'Radar',
  'Estrategias_74'
];

const ORDERS_SHEET_CANDIDATES = [
  'Ordenes',
  'Órdenes',
  'Orders',
  'TakeProfits',
  'TPs',
  'Sheet2',
  'Hoja 2',
  'Hoja2'
];

export class SheetsService {
  public static getConfig(): SheetsConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        return { ...DEFAULT_SHEETS_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Could not read sheets config from storage:', e);
    }
    return DEFAULT_SHEETS_CONFIG;
  }

  public static saveConfig(config: SheetsConfig): void {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
      if (config.proxyUrl) {
        proxyService.setProxyUrl(config.proxyUrl);
      }
    } catch (e) {
      console.warn('Could not save sheets config:', e);
    }
  }

  public static getStoredCustomData(): { strategies: Strategy[]; orders: TakeProfitOrder[] } {
    try {
      const strData = localStorage.getItem(STORAGE_KEY_CUSTOM_STRATEGIES);
      const ordData = localStorage.getItem(STORAGE_KEY_CUSTOM_ORDERS);
      if (strData) {
        const parsedStr = JSON.parse(strData);
        if (Array.isArray(parsedStr) && parsedStr.length > 0) {
          // Check that strategies have valid strategyName and entryPrice
          const hasValidData = parsedStr.some(s => s.strategyName && s.entryPrice > 0);
          if (hasValidData) {
            return {
              strategies: parsedStr,
              orders: ordData ? JSON.parse(ordData) : []
            };
          }
        }
      }
    } catch (e) {
      console.warn('Error reading stored strategies:', e);
    }
    return { strategies: INITIAL_STRATEGIES, orders: INITIAL_ORDERS };
  }

  public static saveCustomData(strategies: Strategy[], orders: TakeProfitOrder[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_STRATEGIES, JSON.stringify(strategies));
      localStorage.setItem(STORAGE_KEY_CUSTOM_ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.warn('Error storing custom strategies:', e);
    }
  }

  /**
   * Fetches strategies & orders from Google Sheets REST API, Google Apps Script Proxy, or GViz/CSV
   */
  public static async fetchFromGoogleSheets(config: SheetsConfig): Promise<{
    strategies: Strategy[];
    orders: TakeProfitOrder[];
    source: 'google_sheets_api' | 'google_apps_script_proxy' | 'google_sheets_csv' | 'local_preset';
    timestamp: Date;
  }> {
    const { spreadsheetId, proxyUrl } = config;
    const effectiveApiKey = (config.apiKey && config.apiKey.trim() !== '') 
      ? config.apiKey.trim() 
      : proxyService.getSheetsApiKey();

    const timestamp = new Date();

    // METHOD 1: Try Google Apps Script Proxy endpoint (if available)
    const effectiveProxy = (proxyUrl || DEFAULT_PROXY_SERVER_URL).trim();
    if (effectiveProxy) {
      try {
        const sep = effectiveProxy.includes('?') ? '&' : '?';
        const proxyFetchUrl = `${effectiveProxy}${sep}action=getData&spreadsheetId=${encodeURIComponent(spreadsheetId)}&sheet=Ordenes&t=${Date.now()}`;
        
        const proxyRes = await fetch(proxyFetchUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json, text/plain, */*' }
        });

        if (proxyRes.ok) {
          const json = await proxyRes.json();
          if (json && (json.strategies || json.data || Array.isArray(json))) {
            const rawStratList = json.strategies || json.data || (Array.isArray(json) ? json : []);
            const rawOrdersList = json.orders || [];

            let parsedStrategies: Strategy[] = [];
            let parsedOrders: TakeProfitOrder[] = [];

            if (rawStratList.length > 0) {
              if (Array.isArray(rawStratList[0])) {
                const res = this.parseStrategiesSheetRows(rawStratList);
                parsedStrategies = res.strategies;
                parsedOrders = res.orders;
              } else if (typeof rawStratList[0] === 'object') {
                parsedStrategies = this.normalizeObjectStrategies(rawStratList);
              }
            }

            if (rawOrdersList.length > 0 && Array.isArray(rawOrdersList[0])) {
              const extraOrders = this.parseOrdersSheetRows(rawOrdersList);
              parsedOrders = [...parsedOrders, ...extraOrders];
            }

            if (parsedStrategies.length > 0) {
              this.saveCustomData(parsedStrategies, parsedOrders);
              return {
                strategies: parsedStrategies,
                orders: parsedOrders,
                source: 'google_apps_script_proxy',
                timestamp
              };
            }
          }
        }
      } catch (err) {
        console.warn('Apps Script Proxy data fetch failed, continuing to Sheets API...', err);
      }
    }

    // METHOD 2: Try Google Sheets v4 REST API (if apiKey is present)
    if (spreadsheetId && effectiveApiKey) {
      for (const sheetName of SHEET_NAME_CANDIDATES) {
        try {
          const cacheBuster = Date.now();
          const stratUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?key=${effectiveApiKey}&t=${cacheBuster}`;
          
          const stratRes = await fetch(stratUrl);
          if (stratRes.ok) {
            const stratJson = await stratRes.json();
            const values = stratJson.values || [];
            
            if (values.length > 1) {
              const parsedResult = this.parseStrategiesSheetRows(values);
              let parsedOrders = parsedResult.orders;

              // Also try fetching separate Orders sheet if needed
              for (const ordSheet of ORDERS_SHEET_CANDIDATES) {
                if (ordSheet.toLowerCase() === sheetName.toLowerCase()) continue;
                try {
                  const ordUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(ordSheet)}?key=${effectiveApiKey}&t=${cacheBuster}`;
                  const ordRes = await fetch(ordUrl);
                  if (ordRes.ok) {
                    const ordJson = await ordRes.json();
                    const extraOrders = this.parseOrdersSheetRows(ordJson.values || []);
                    if (extraOrders.length > 0) {
                      parsedOrders = [...parsedOrders, ...extraOrders];
                      break;
                    }
                  }
                } catch {
                  // Ignore and continue
                }
              }

              if (parsedResult.strategies.length > 0) {
                this.saveCustomData(parsedResult.strategies, parsedOrders);
                return {
                  strategies: parsedResult.strategies,
                  orders: parsedOrders,
                  source: 'google_sheets_api',
                  timestamp
                };
              }
            }
          }
        } catch (err) {
          console.warn(`Sheets API for tab ${sheetName} failed:`, err);
        }
      }
    }

    // METHOD 3: Try Public Google Sheets CSV / GViz Export
    if (spreadsheetId) {
      const csvUrlsToTry = [
        ...SHEET_NAME_CANDIDATES.map(name => `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}&t=${Date.now()}`),
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=0&t=${Date.now()}`,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0&t=${Date.now()}`
      ];

      for (const csvUrl of csvUrlsToTry) {
        try {
          const csvRes = await fetch(csvUrl);
          if (csvRes.ok) {
            const csvText = await csvRes.text();
            if (csvText && !csvText.includes('<!DOCTYPE html>') && csvText.trim().length > 20) {
              const rows = this.parseCsvToRows(csvText);
              if (rows.length > 1) {
                const parsedResult = this.parseStrategiesSheetRows(rows);
                let parsedOrders = parsedResult.orders;

                if (parsedResult.strategies.length > 0) {
                  this.saveCustomData(parsedResult.strategies, parsedOrders);
                  return {
                    strategies: parsedResult.strategies,
                    orders: parsedOrders,
                    source: 'google_sheets_csv',
                    timestamp
                  };
                }
              }
            }
          }
        } catch (csvErr) {
          // Continue to next candidate
        }
      }
    }

    // METHOD 4: Fallback to Local Stored or Default Preset Strategies
    const stored = this.getStoredCustomData();
    return {
      strategies: stored.strategies.length > 0 ? stored.strategies : INITIAL_STRATEGIES,
      orders: stored.orders.length > 0 ? stored.orders : INITIAL_ORDERS,
      source: 'local_preset',
      timestamp
    };
  }

  public static parseCsvToRows(csvText: string): string[][] {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    return lines.map(line => {
      const row: string[] = [];
      let inQuotes = false;
      let currentToken = '';

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(currentToken.replace(/^"|"$/g, '').trim());
          currentToken = '';
        } else {
          currentToken += char;
        }
      }
      row.push(currentToken.replace(/^"|"$/g, '').trim());
      return row;
    });
  }

  /**
   * Intelligently parses spreadsheet rows with dedicated mapping for the 'Ordenes' sheet structure:
   * Col A (0): Nombre Estrategia (e.g. AERO_PULLBACK_26-09-26_18:09)
   * Col B (1): Fecha / Hora
   * Col C (2): Activo (e.g. AERO, SOL, BTC, AVAX)
   * Col D (3): Capital Asignado
   * Col E (4): Mercado
   * Col F (5): Margen
   * Col G (6): Apalancamiento (e.g. 5)
   * Col H (7): Valor Nominal
   * Col I (8): Tipo (e.g. Long / Short)
   * Col J (9): Estrategia (e.g. Rebote en soporte, Rango)
   * Col K (10): Entrada / Precio Entrada
   * Col L (11): Stop Loss / SL
   * Col M (12): TP1
   * Col N (13): TP2
   * Col O (14): TP3
   * Col P (15): TP4
   */
  public static parseStrategiesSheetRows(rows: string[][]): {
    strategies: Strategy[];
    orders: TakeProfitOrder[];
  } {
    if (!rows || rows.length <= 1) return { strategies: [], orders: [] };

    const headerRow = rows[0].map(h => (h || '').toString().toLowerCase().trim());
    
    // Find column positions dynamically
    let stratNameCol = -1;
    let idCol = -1;
    let symbolCol = -1;
    let typeCol = -1;
    let entryCol = -1;
    let slCol = -1;
    let dateCol = -1;
    let statusCol = -1;
    let categoryCol = -1;
    let notesCol = -1;
    let leverageCol = -1;
    let thresholdCol = -1;

    // Track horizontal TP columns (e.g. TP1, TP2, TP3, TP4)
    const tpCols: { type: string; colIndex: number }[] = [];

    headerRow.forEach((h, idx) => {
      if (/nombre.*estrategia|^nombre$|^name$/i.test(h)) stratNameCol = idx;
      else if (/^id$|^#$|^n[uú]m|^c[oó]digo/i.test(h)) idCol = idx;
      else if (/^activo$|s[ií]mbol|symbol|ticker|moneda|asset|pair|par/i.test(h) && symbolCol === -1) symbolCol = idx;
      else if (/^tipo$|type|dir|direcci[oó]n|side|posici[oó]n/i.test(h) && typeCol === -1) typeCol = idx;
      else if (/entrad|entry|precio.*entrad|buy.*price|precio\s*compra|precio.*l[ií]mite/i.test(h) && entryCol === -1) entryCol = idx;
      else if (/stop.*loss|^sl$|invalida|stop/i.test(h) && slCol === -1) slCol = idx;
      else if (/fecha|date|timestamp/i.test(h) && dateCol === -1) dateCol = idx;
      else if (/estado|status/i.test(h) && statusCol === -1) statusCol = idx;
      else if (/estrategia$|categor[ií]a|sector/i.test(h) && categoryCol === -1) categoryCol = idx;
      else if (/nota|notes|tesis|comentario|descripci[oó]n/i.test(h) && notesCol === -1) notesCol = idx;
      else if (/apalancamiento|leverage|lev/i.test(h) && leverageCol === -1) leverageCol = idx;
      else if (/umbral|threshold|alerta/i.test(h) && thresholdCol === -1) thresholdCol = idx;
      
      // Horizontal TP columns
      const tpMatch = h.match(/tp\s*([0-9]+)|take\s*profit\s*([0-9]+)|target\s*([0-9]+)/i);
      if (tpMatch) {
        const num = tpMatch[1] || tpMatch[2] || tpMatch[3] || `${tpCols.length + 1}`;
        tpCols.push({ type: `TP${num}`, colIndex: idx });
      }
    });

    // Fallbacks matched strictly to the Ordenes sheet structure
    if (stratNameCol === -1) stratNameCol = 0; // Col A is 'Nombre Estrategia'
    if (symbolCol === -1) symbolCol = 2; // Col C is 'Activo'
    if (dateCol === -1) dateCol = 1; // Col B is 'Fecha / Hora'
    if (leverageCol === -1) leverageCol = 6; // Col G is 'Apalancamiento'
    if (typeCol === -1) typeCol = 8; // Col I is 'Tipo'
    if (categoryCol === -1) categoryCol = 9; // Col J is 'Estrategia' (Rebote, Rango, etc.)
    if (entryCol === -1) entryCol = 10; // Col K is 'Entrada'
    if (slCol === -1) slCol = 11; // Col L is 'Stop Loss'

    // If no TP columns matched via headers, assign default TP columns (Cols M, N, O, P)
    if (tpCols.length === 0) {
      tpCols.push(
        { type: 'TP1', colIndex: 12 },
        { type: 'TP2', colIndex: 13 },
        { type: 'TP3', colIndex: 14 }
      );
    }

    const dataRows = rows.slice(1);
    const strategies: Strategy[] = [];
    const orders: TakeProfitOrder[] = [];

    dataRows.forEach((row, index) => {
      if (!row || row.length < 2) return;

      // 1. Extract Strategy Name (Exact text from Column A)
      const rawStratName = (row[stratNameCol] || row[0] || '').toString().trim();
      if (!rawStratName && (!row[symbolCol] || row[symbolCol].trim() === '')) return;

      // 2. Extract Active Symbol (e.g. AERO, SOL, BTC, AVAX)
      let rawSymbol = (row[symbolCol] || '').toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      // If symbol is empty, try to extract ticker from strategy name (e.g. AERO_PULLBACK -> AERO)
      if (!rawSymbol && rawStratName) {
        const parts = rawStratName.split('_');
        if (parts.length > 0 && parts[0].length >= 2) {
          rawSymbol = parts[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
        }
      }

      if (!rawSymbol || rawSymbol.length < 2) return;

      const symbol = rawSymbol.endsWith('USDT') ? rawSymbol : `${rawSymbol}USDT`;
      const strategyName = rawStratName.length > 0 ? rawStratName : `${symbol}_STRATEGY`;
      const coinName = rawSymbol.replace('USDT', '');

      const rawId = (idCol !== -1 && row[idCol]) ? parseInt(row[idCol]) : (index + 1);
      const stratId = !isNaN(rawId) && rawId > 0 ? rawId : (index + 1);

      // 3. Direction (LONG / SHORT)
      const rawType = (row[typeCol] || 'LONG').toString().trim().toUpperCase();
      const type: 'LONG' | 'SHORT' = (rawType.includes('SHORT') || rawType === 'S' || rawType.includes('VENTA') || rawType.includes('SELL')) ? 'SHORT' : 'LONG';

      // 4. Entry Price
      let entryPrice = 0;
      if (entryCol !== -1 && row[entryCol]) {
        const entryStr = row[entryCol].toString().replace(/,/g, '').replace('$', '').trim();
        entryPrice = parseFloat(entryStr);
      }

      // If entryPrice not found at entryCol, scan for numerical price in columns >= 9
      if (isNaN(entryPrice) || entryPrice <= 0) {
        for (let c = 9; c < row.length; c++) {
          const val = parseFloat((row[c] || '').toString().replace(/,/g, '').replace('$', '').trim());
          if (!isNaN(val) && val > 0) {
            entryPrice = val;
            break;
          }
        }
      }

      // Fallback if still invalid
      if (isNaN(entryPrice) || entryPrice <= 0) {
        entryPrice = 1.0;
      }

      // 5. Stop Loss
      let stopLoss = 0;
      if (slCol !== -1 && row[slCol]) {
        const slStr = row[slCol].toString().replace(/,/g, '').replace('$', '').trim();
        stopLoss = parseFloat(slStr);
      }

      if (isNaN(stopLoss) || stopLoss <= 0) {
        stopLoss = type === 'LONG' ? entryPrice * 0.95 : entryPrice * 1.05;
      }

      // 6. Leverage & Metadata
      const rawLev = (leverageCol !== -1 && row[leverageCol]) ? parseFloat(row[leverageCol].toString().replace(/x/i, '')) : 5;
      const leverage = (!isNaN(rawLev) && rawLev > 0) ? rawLev : 5;

      const date = (dateCol !== -1 && row[dateCol]) ? row[dateCol].toString().trim() : new Date().toISOString().split('T')[0];
      const category = (categoryCol !== -1 && row[categoryCol]) ? row[categoryCol].toString().trim() : 'Estrategia';
      const notes = (notesCol !== -1 && row[notesCol]) ? row[notesCol].toString().trim() : undefined;

      strategies.push({
        id: stratId,
        symbol,
        coinName,
        strategyName,
        type,
        entryPrice,
        stopLoss,
        date,
        status: 'Active',
        category,
        notes,
        leverage
      });

      // 7. Take Profits extraction
      let rowTpsFound = 0;
      tpCols.forEach((tpCol) => {
        if (row[tpCol.colIndex]) {
          const rawTpStr = row[tpCol.colIndex].toString().replace(/,/g, '').replace('$', '').trim();
          const targetPrice = parseFloat(rawTpStr);
          if (!isNaN(targetPrice) && targetPrice > 0) {
            rowTpsFound++;
            orders.push({
              strategyId: stratId,
              type: tpCol.type,
              targetPrice,
              closePercentage: 33
            });
          }
        }
      });

      // If no TPs in row, create proportional TPs from Entry
      if (rowTpsFound === 0) {
        const tp1Price = type === 'LONG' ? entryPrice * 1.03 : entryPrice * 0.97;
        const tp2Price = type === 'LONG' ? entryPrice * 1.06 : entryPrice * 0.94;
        const tp3Price = type === 'LONG' ? entryPrice * 1.10 : entryPrice * 0.90;
        
        orders.push(
          { strategyId: stratId, type: 'TP1', targetPrice: tp1Price, closePercentage: 40 },
          { strategyId: stratId, type: 'TP2', targetPrice: tp2Price, closePercentage: 35 },
          { strategyId: stratId, type: 'TP3', targetPrice: tp3Price, closePercentage: 25 }
        );
      }
    });

    return { strategies, orders };
  }

  public static parseOrdersSheetRows(rows: string[][]): TakeProfitOrder[] {
    if (!rows || rows.length <= 1) return [];

    const dataRows = rows.slice(1);
    const orders: TakeProfitOrder[] = [];

    dataRows.forEach(row => {
      if (!row || row.length < 3) return;
      const strategyId = parseInt(row[0]);
      const type = (row[1] || 'TP1').toString().trim();
      const targetPrice = parseFloat((row[2] || '0').toString().replace(/,/g, '').replace('$', ''));
      const closePercentage = parseFloat((row[3] || '0').toString().replace(/%/g, ''));

      if (!isNaN(strategyId) && !isNaN(targetPrice) && targetPrice > 0) {
        orders.push({
          strategyId,
          type,
          targetPrice,
          closePercentage: !isNaN(closePercentage) && closePercentage > 0 ? closePercentage : 33
        });
      }
    });

    return orders;
  }

  private static normalizeObjectStrategies(rawList: any[]): Strategy[] {
    return rawList.map((item, idx) => {
      const id = item.id || idx + 1;
      const strategyName = item.strategyName || item.nombreEstrategia || item.nombre || item.name || item.estrategia || `STRATEGY_${idx + 1}`;
      const symbol = (item.symbol || item.activo || item.Symbol || item.moneda || item.coin || 'BTCUSDT').toUpperCase().trim();
      const cleanSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;
      const type: 'LONG' | 'SHORT' = (item.type || item.tipo || item.side || 'LONG').toUpperCase().includes('SHORT') ? 'SHORT' : 'LONG';
      const entryPrice = parseFloat(item.entryPrice || item.entrada || item.entry || item.precio || item.buyPrice || 0);
      const stopLoss = parseFloat(item.stopLoss || item.sl || (type === 'LONG' ? entryPrice * 0.95 : entryPrice * 1.05));

      return {
        id,
        symbol: cleanSymbol,
        coinName: cleanSymbol.replace('USDT', ''),
        strategyName,
        type,
        entryPrice: !isNaN(entryPrice) ? entryPrice : 0,
        stopLoss: !isNaN(stopLoss) ? stopLoss : 0,
        date: item.date || item.fecha || new Date().toISOString().split('T')[0],
        status: item.status || item.estado || 'Active',
        category: item.category || item.estrategia || undefined,
        notes: item.notes || item.notas || undefined,
        leverage: parseFloat(item.leverage || item.apalancamiento || 5) || 5,
        customAlertThreshold: item.customAlertThreshold || undefined
      };
    }).filter(s => s.entryPrice > 0);
  }
}
