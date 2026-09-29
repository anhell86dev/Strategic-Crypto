import { Strategy, TakeProfitOrder, SheetsConfig, DcaLevel } from '../types';
import { INITIAL_STRATEGIES, INITIAL_ORDERS } from '../data/initialStrategies';
import { proxyService, DEFAULT_PROXY_SERVER_URL } from './proxyService';

const STORAGE_KEY_CONFIG = 'crypto_radar_sheets_config';
const STORAGE_KEY_CUSTOM_STRATEGIES = 'crypto_radar_custom_strategies_v4';
const STORAGE_KEY_CUSTOM_ORDERS = 'crypto_radar_custom_orders_v4';

export const DEFAULT_SHEETS_CONFIG: SheetsConfig = {
  spreadsheetId: '1jwRLOHKGUlHSPcAF401LKtDtSW5erFwZvxYkSJm-2mE',
  apiKey: '',
  autoSync: true,
  syncIntervalSeconds: 60,
  usePresetFallback: true,
  proxyUrl: DEFAULT_PROXY_SERVER_URL,
};

// Sheet name candidates prioritizing 'Ordenes'
const SHEET_NAME_CANDIDATES = [
  'Ordenes',
  'Órdenes',
  'Orders',
  'Estrategias',
  'Sheet1',
  'Hoja 1'
];

// Lista oficial de estrategias ACTIVAS según la Hoja: Estrategia, Columna M (Estado === 'Activa')
export const KNOWN_ACTIVE_ESTRATEGIA_NAMES: string[] = [
  "AAVE_PULLBACK_26-09-26_06:39",
  "APT_PULLBACK_26-09-26_00:19",
  "ATOM_PULLBACK_26-09-26_17:56",
  "FET_PULLBACK_25-09-26_04:55",
  "PENDLE_PULLBACK_26-09-26_07:00",
  "PENGU_RANGO_26-09-26_18:31",
  "PI_REBOTE_26-09-26_06:28",
  "PIEVERSE_PULLBACK_26-09-26_18:17",
  "POL_PULLBACK_25-09-26_18:23",
  "QNT_PULLBACK_26-09-26_17:33",
  "SEI_PULLBACK_26-09-26_11:39",
  "INJ_PULLBACK_26-09-26_18:26",
  "KAS_PULLBACK_26-09-26_00:12",
  "NEAR_PULLBACK_25-09-26_22:54",
  "NEXO_ACUMULACION_26-09-26_00:55",
  "U_RANGO_25-09-26_05:18",
  "USDE_PULLBACK_26-09-26_05:35",
  "ZRO_PULLBACK_25-09-26_18:03",
  "BGB_RANGO_26-09-26_23:22",
  "CRO_PULLBACK_27-09-26_05:08",
  "ENA_PULLBACK_27-09-26_05:20",
  "MNT_PULLBACK_27-09-26_05:16",
  "ONDO_PULLBACK_27-09-26_05:23",
  "PONS_RANGO_26-09-26_23:46",
  "PUMP_ACUMULACION_27-09-26_05:30",
  "VIRTUAL_PULLBACK_27-09-26_05:12",
  "VVV_HOLD_27-09-26_05:12",
  "PEPE_RANGO_27-09-26_05:29",
  "VET_RANGO_27-09-26_05:25",
  "CAKE_RANGO_26-09-26_23:42",
  "TRUMP_RANGO_26-09-26_23:46",
  "WLFI_RANGO_26-09-26_23:29",
  "STABLE_RANGO_27-09-26_05:02",
  "ADA_RANGO_28-09-26_10:30",
  "AERO_RANGO_28-09-26_05:22",
  "ALGO_PULLBACK_28-09-26_05:00",
  "AVAX_PULLBACK_28-09-26_11:11",
  "BCH_PULLBACK_28-09-26_10:43",
  "BNB_RANGO_28-09-26_16:12",
  "BSV_RANGO_28-09-26_05:34",
  "BTC_RANGO_28-09-26_10:03",
  "CC_RANGO_28-09-26_11:05",
  "CRV_ACUMULACION_28-09-26_05:35",
  "DASH_PULLBACK_28-09-26_05:22",
  "DOGE_RANGO_28-09-26_16:23",
  "ETH_ACUMULACION_28-09-26_16:05",
  "ETHFI_ACUMULACION_28-09-26_05:25",
  "FIL_PULLBACK_28-09-26_05:30",
  "GRAM_PULLBACK_28-09-26_11:15",
  "HBAR_PULLBACK_28-09-26_11:00",
  "HYPE_RANGO_28-09-26_16:19",
  "ICP_RANGO_28-09-26_05:41",
  "JST_PULLBACK_28-09-26_05:07",
  "JUP_RANGO_27-09-26_23:27",
  "LEO_RANGO_28-09-26_04:30",
  "LINK_PULLBACK_28-09-26_16:24",
  "LIT_PULLBACK_27-09-26_23:52",
  "LTC_PULLBACK_28-09-26_04:44",
  "MORPHO_RANGO_28-09-26_05:27",
  "NIGHT_PULLBACK_28-09-26_05:13",
  "PYTH_RANGO_27-09-26_23:37",
  "RAY_ACUMULACION_28-09-26_05:12",
  "RENDER_CONSOLIDACION_28-09-26_05:45",
  "SHIB_RANGO_28-09-26_04:54",
  "SOL_ACUMULACION_28-09-26_10:16",
  "STX_RANGO_28-09-26_05:27",
  "SUI_RANGO_28-09-26_11:10",
  "TAO_PULLBACK_28-09-26_04:51",
  "TRX_RANGO_28-09-26_16:14",
  "UNI_PULLBACK_28-09-26_17:08",
  "WLD_RANGO_28-09-26_05:25",
  "XLM_PULLBACK_28-09-26_10:35",
  "XMR_RANGO_28-09-26_10:32",
  "XRP_ACUMULACION_28-09-26_10:06",
  "ZEC_PULLBACK_28-09-26_10:21",
  "XDC_HOLD_28-09-26_04:56",
  "ARB_RANGO_28-09-26_05:16",
  "SKY_PULLBACK_28-09-26_05:04",
  "TIA_RANGO_28-09-26_05:40"
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
          const knownActiveSet = new Set(KNOWN_ACTIVE_ESTRATEGIA_NAMES.map(n => n.toLowerCase().trim()));
          const activeStrats = parsedStr.filter((s: Strategy) => {
            const k = (s.strategyName || '').toLowerCase().trim();
            return knownActiveSet.has(k);
          });
          if (activeStrats.length > 0) {
            const activeIds = new Set(activeStrats.map(s => s.id));
            const allOrders: TakeProfitOrder[] = ordData ? JSON.parse(ordData) : INITIAL_ORDERS;
            const activeOrders = allOrders.filter(o => activeIds.has(o.strategyId));
            return {
              strategies: activeStrats,
              orders: activeOrders
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
   * Depura y elimina por completo la caché de estrategias y órdenes de localStorage.
   */
  public static clearCache(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_STRATEGIES);
      localStorage.removeItem(STORAGE_KEY_CUSTOM_ORDERS);
      console.log('🧹 [SheetsService] Caché local de estrategias y órdenes depurada y eliminada con éxito.');
    } catch (e) {
      console.warn('Error al depurar caché:', e);
    }
  }

  /**
   * Fetches sheet 'Estrategia' to read Column M (Col 12: Estado).
   * Returns a set of strategy names (in lowercase) that are marked 'Activa' (not 'Inactiva').
   */
  public static async fetchEstrategiaActiveSet(spreadsheetId: string, apiKey?: string, forcePurgeCache: boolean = false): Promise<Set<string>> {
    const activeSet = new Set<string>();
    const cacheBuster = `_cb=${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    // 1. Try GViz CSV export for sheet 'Estrategia'
    if (spreadsheetId) {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Estrategia')}&${cacheBuster}`;
      try {
        const res = await fetch(csvUrl, {
          method: 'GET',
          cache: forcePurgeCache ? 'no-store' : 'default',
          headers: { 
            'Accept': 'text/csv, text/plain, */*',
            ...(forcePurgeCache ? { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' } : {})
          }
        });
        if (res.ok) {
          const csvText = await res.text();
          if (csvText && !csvText.includes('<!DOCTYPE html>') && csvText.trim().length > 50) {
            const rows = this.parseCsvToRows(csvText);
            if (rows.length > 1) {
              const header = rows[0].map(h => (h || '').toLowerCase().trim());
              let colName = 0;
              let colStatus = 12; // Column M is 12 (0-indexed)
              header.forEach((h, idx) => {
                if (/nombre.*estrategia/i.test(h)) colName = idx;
                else if (/^estado$/i.test(h)) colStatus = idx;
              });

              for (let i = 1; i < rows.length; i++) {
                const r = rows[i];
                if (!r || r.length <= colName) continue;
                const name = (r[colName] || r[0] || '').trim().toLowerCase();
                const status = (r[colStatus] || (r.length > 12 ? r[12] : '') || '').trim().toLowerCase();
                if (name && status.includes('activa') && !status.includes('inactiva')) {
                  activeSet.add(name);
                }
              }

              if (activeSet.size > 0) {
                return activeSet;
              }
            }
          }
        }
      } catch (e) {
        console.warn('Error fetching Estrategia sheet via CSV:', e);
      }
    }

    // 2. Try REST API if apiKey available
    if (spreadsheetId && apiKey) {
      try {
        const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Estrategia?key=${apiKey}&${cacheBuster}`;
        const res = await fetch(apiUrl, {
          cache: forcePurgeCache ? 'no-store' : 'default',
          headers: forcePurgeCache ? { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' } : {}
        });
        if (res.ok) {
          const json = await res.json();
          const rows: string[][] = json.values || [];
          if (rows.length > 1) {
            const header = rows[0].map(h => (h || '').toLowerCase().trim());
            let colName = 0;
            let colStatus = 12;
            header.forEach((h, idx) => {
              if (/nombre.*estrategia/i.test(h)) colName = idx;
              else if (/^estado$/i.test(h)) colStatus = idx;
            });

            for (let i = 1; i < rows.length; i++) {
              const r = rows[i];
              if (!r || r.length <= colName) continue;
              const name = (r[colName] || r[0] || '').trim().toLowerCase();
              const status = (r[colStatus] || (r.length > 12 ? r[12] : '') || '').trim().toLowerCase();
              if (name && status.includes('activa') && !status.includes('inactiva')) {
                activeSet.add(name);
              }
            }

            if (activeSet.size > 0) {
              return activeSet;
            }
          }
        }
      } catch (e) {
        console.warn('Error fetching Estrategia sheet via API:', e);
      }
    }

    // 3. Fallback: Use known active strategy names from sheet Estrategia Col M
    KNOWN_ACTIVE_ESTRATEGIA_NAMES.forEach(n => activeSet.add(n.toLowerCase().trim()));
    return activeSet;
  }

  /**
   * Fetches strategies & orders from Google Sheets GViz CSV export, REST API, or proxy.
   * Si forcePurgeCache es true, depura y borra la caché local y fuerza peticiones sin caché HTTP.
   */
  public static async fetchFromGoogleSheets(config: SheetsConfig, forcePurgeCache: boolean = false): Promise<{
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

    // Depuración de caché local si se solicita
    if (forcePurgeCache) {
      this.clearCache();
    }

    const cacheBuster = `_cb=${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    // Consultar primero el estado de las estrategias en la Hoja: Estrategia, Columna M
    const activeStrategySet = await this.fetchEstrategiaActiveSet(spreadsheetId, effectiveApiKey, forcePurgeCache);

    // METHOD 1: Direct Google Sheets GViz CSV Export (tab Ordenes)
    if (spreadsheetId) {
      const csvUrlsToTry = [
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Ordenes')}&${cacheBuster}`,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Órdenes')}&${cacheBuster}`,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=0&${cacheBuster}`
      ];

      for (const csvUrl of csvUrlsToTry) {
        try {
          const csvRes = await fetch(csvUrl, {
            method: 'GET',
            cache: forcePurgeCache ? 'no-store' : 'default',
            headers: { 
              'Accept': 'text/csv, text/plain, */*',
              ...(forcePurgeCache ? { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' } : {})
            }
          });

          if (csvRes.ok) {
            const csvText = await csvRes.text();
            if (csvText && !csvText.includes('<!DOCTYPE html>') && csvText.trim().length > 100) {
              const rows = this.parseCsvToRows(csvText);
              if (rows.length > 1) {
                const parsedResult = this.parseStrategiesSheetRows(rows, activeStrategySet);
                if (parsedResult.strategies.length > 0) {
                  this.saveCustomData(parsedResult.strategies, parsedResult.orders);
                  return {
                    strategies: parsedResult.strategies,
                    orders: parsedResult.orders,
                    source: 'google_sheets_csv',
                    timestamp
                  };
                }
              }
            }
          }
        } catch {
          // Continue to next candidate
        }
      }
    }

    // METHOD 2: Google Sheets v4 REST API (if apiKey is configured)
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
              const parsedResult = this.parseStrategiesSheetRows(values, activeStrategySet);
              if (parsedResult.strategies.length > 0) {
                this.saveCustomData(parsedResult.strategies, parsedResult.orders);
                return {
                  strategies: parsedResult.strategies,
                  orders: parsedResult.orders,
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

    // METHOD 3: Fallback to stored or initial strategies
    const stored = this.getStoredCustomData();
    return {
      strategies: stored.strategies.length > 0 ? stored.strategies : INITIAL_STRATEGIES,
      orders: stored.orders.length > 0 ? stored.orders : INITIAL_ORDERS,
      source: 'local_preset',
      timestamp
    };
  }

  /**
   * RFC 4180 compliant CSV parser.
   * Correctly handles quoted fields that contain newlines, commas, and escaped double quotes.
   */
  public static parseCsvToRows(csvText: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          cell += '"';
          i++; // Skip the next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(cell.trim());
        cell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(cell.trim());
        if (row.some(val => val.length > 0)) {
          rows.push(row);
        }
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }

    if (cell.length > 0 || row.length > 0) {
      row.push(cell.trim());
      if (row.some(val => val.length > 0)) {
        rows.push(row);
      }
    }

    return rows;
  }

  private static parseNum(val: any): number | undefined {
    if (val === undefined || val === null) return undefined;
    const clean = val.toString().replace(/,/g, '').replace(/\$/g, '').replace(/%/g, '').replace(/x/i, '').trim();
    if (!clean) return undefined;
    const num = parseFloat(clean);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Parses rows according to the official Ordenes dictionary:
   * Col 0: Nombre Estrategia
   * Col 1: Fecha / Hora (GMT-6)
   * Col 2: Activo
   * Col 3: Capital Asignado
   * Col 4: Mercado
   * Col 5: Margen
   * Col 6: Apalancamiento
   * Col 7: Valor Nominal
   * Col 8: Tipo
   * Col 9: Estrategia
   * Col 10: Escenario Principal
   * Col 11: E1
   * Col 12: % E1
   * Col 13: Cantidad Unidades E1
   * Col 14: E2
   * Col 15: % E2
   * Col 16: Cantidad Unidades E2
   * Col 17: E3
   * Col 18: % E3
   * Col 19: Cantidad Unidades E3
   * Col 20: Precio Promedio E1
   * Col 21: Precio Promedio E2
   * Col 22: Precio Promedio E3
   * Col 23: Stop-Loss
   * Col 24: Stop-Loss %
   * Col 25: Loss Capa 1
   * Col 26: Loss Capa 2
   * Col 27: Loss Capa 3
   * Col 28: TP1
   * Col 29: % TP1
   * Col 30: Profit Capa 1
   * Col 31: TP2
   * Col 32: % TP2
   * Col 33: Profit Capa 2
   * Col 34: TP3
   * Col 35: % TP3
   * Col 36: Profit Capa 3
   * Col 37: Reglas de Ejecución Táctica
   * Col 38: Disciplina del Trade
   * Col 39: Estado
   */
  public static parseStrategiesSheetRows(rows: string[][], activeStrategySet?: Set<string>): {
    strategies: Strategy[];
    orders: TakeProfitOrder[];
  } {
    if (!rows || rows.length <= 1) return { strategies: [], orders: [] };

    // Inspect headers to find any offset
    const headerRow = rows[0].map(h => (h || '').toString().toLowerCase().trim());

    // Locate base columns
    let colName = 0;
    let colDate = 1;
    let colAsset = 2;
    let colCapital = 3;
    let colMarket = 4;
    let colMargin = 5;
    let colLev = 6;
    let colNominal = 7;
    let colType = 8;
    let colStrategy = 9;
    let colScenario = 10;
    let colE1 = 11;
    let colE1Pct = 12;
    let colE1Units = 13;
    let colE2 = 14;
    let colE2Pct = 15;
    let colE2Units = 16;
    let colE3 = 17;
    let colE3Pct = 18;
    let colE3Units = 19;
    let colAvgE1 = 20;
    let colAvgE2 = 21;
    let colAvgE3 = 22;
    let colSL = 23;
    let colSLPct = 24;
    let colLoss1 = 25;
    let colLoss2 = 26;
    let colLoss3 = 27;
    let colTP1 = 28;
    let colTP1Pct = 29;
    let colProfit1 = 30;
    let colTP2 = 31;
    let colTP2Pct = 32;
    let colProfit2 = 33;
    let colTP3 = 34;
    let colTP3Pct = 35;
    let colProfit3 = 36;
    let colTactical = 37;
    let colDiscipline = 38;
    let colStatus = 39;

    // Dynamic header check
    headerRow.forEach((h, idx) => {
      if (/nombre.*estrategia/i.test(h)) colName = idx;
      else if (/fecha/i.test(h)) colDate = idx;
      else if (/^activo$/i.test(h)) colAsset = idx;
      else if (/capital.*asignado/i.test(h)) colCapital = idx;
      else if (/^mercado$/i.test(h)) colMarket = idx;
      else if (/^margen$/i.test(h)) colMargin = idx;
      else if (/apalancamiento/i.test(h)) colLev = idx;
      else if (/valor.*nominal/i.test(h)) colNominal = idx;
      else if (/^tipo$/i.test(h)) colType = idx;
      else if (/^estrategia$/i.test(h)) colStrategy = idx;
      else if (/escenario.*principal/i.test(h)) colScenario = idx;
      else if (/^e1$/i.test(h)) colE1 = idx;
      else if (/%\s*e1/i.test(h)) colE1Pct = idx;
      else if (/unidades.*e1/i.test(h)) colE1Units = idx;
      else if (/^e2$/i.test(h)) colE2 = idx;
      else if (/%\s*e2/i.test(h)) colE2Pct = idx;
      else if (/unidades.*e2/i.test(h)) colE2Units = idx;
      else if (/^e3$/i.test(h)) colE3 = idx;
      else if (/%\s*e3/i.test(h)) colE3Pct = idx;
      else if (/unidades.*e3/i.test(h)) colE3Units = idx;
      else if (/promedio.*e1/i.test(h)) colAvgE1 = idx;
      else if (/promedio.*e2/i.test(h)) colAvgE2 = idx;
      else if (/promedio.*e3/i.test(h)) colAvgE3 = idx;
      else if (/stop.*loss/i.test(h) && !h.includes('%')) colSL = idx;
      else if (/stop.*loss.*%/i.test(h)) colSLPct = idx;
      else if (/loss.*capa.*1/i.test(h)) colLoss1 = idx;
      else if (/loss.*capa.*2/i.test(h)) colLoss2 = idx;
      else if (/loss.*capa.*3/i.test(h)) colLoss3 = idx;
      else if (/^tp1$/i.test(h)) colTP1 = idx;
      else if (/%\s*tp1/i.test(h)) colTP1Pct = idx;
      else if (/profit.*capa.*1/i.test(h)) colProfit1 = idx;
      else if (/^tp2$/i.test(h)) colTP2 = idx;
      else if (/%\s*tp2/i.test(h)) colTP2Pct = idx;
      else if (/profit.*capa.*2/i.test(h)) colProfit2 = idx;
      else if (/^tp3$/i.test(h)) colTP3 = idx;
      else if (/%\s*tp3/i.test(h)) colTP3Pct = idx;
      else if (/profit.*capa.*3/i.test(h)) colProfit3 = idx;
      else if (/reglas.*ejecuci[oó]n/i.test(h)) colTactical = idx;
      else if (/disciplina/i.test(h)) colDiscipline = idx;
      else if (/^estado$/i.test(h)) colStatus = idx;
    });

    const dataRows = rows.slice(1);
    const strategies: Strategy[] = [];
    const orders: TakeProfitOrder[] = [];

    dataRows.forEach((row, index) => {
      if (!row || row.length < 2) return;

      const stratName = (row[colName] || row[0] || '').toString().trim();
      let rawAsset = (row[colAsset] || '').toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

      if (!rawAsset && stratName) {
        const parts = stratName.split('_');
        if (parts.length > 0 && parts[0].length >= 2) {
          rawAsset = parts[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
        }
      }

      if (!stratName && !rawAsset) return;
      if (stratName.toLowerCase().includes('nombre estrategia') || rawAsset === 'ACTIVO') return;

      // FILTRAR ESTRICTAMENTE: Solo estrategias ACTIVAS según la Hoja: Estrategia, Columna M
      if (activeStrategySet && activeStrategySet.size > 0) {
        const normName = stratName.toLowerCase().trim();
        const normAsset = rawAsset.toLowerCase().trim();
        const isActive = activeStrategySet.has(normName) ||
          Array.from(activeStrategySet).some(a => normName === a || normName.startsWith(a) || a.startsWith(normName) || a.startsWith(normAsset + '_'));
        if (!isActive) {
          return; // Omitir estrategia inactiva según Hoja Estrategia, Columna M
        }
      }

      const symbol = rawAsset.endsWith('USDT') ? rawAsset : `${rawAsset}USDT`;
      const id = index + 1;
      const rawType = (row[colType] || 'Long').toString().toUpperCase();
      const type: 'LONG' | 'SHORT' = rawType.includes('SHORT') ? 'SHORT' : 'LONG';

      const capitalAssigned = this.parseNum(row[colCapital]) || 5;
      const market = (row[colMarket] || 'Binance Futuros').toString().trim();
      const marginType = (row[colMargin] || 'Aislado (Isolated)').toString().trim();
      const leverage = this.parseNum(row[colLev]) || 5;
      const nominalValue = this.parseNum(row[colNominal]) || (capitalAssigned * leverage);

      const category = (row[colStrategy] || 'Estrategia').toString().trim();
      const scenarioNotes = (row[colScenario] || '').toString().trim();

      const e1Price = this.parseNum(row[colE1]) || 1;
      const e1Alloc = this.parseNum(row[colE1Pct]) || 50;
      const e1Units = this.parseNum(row[colE1Units]);

      const e2Price = this.parseNum(row[colE2]);
      const e2Alloc = this.parseNum(row[colE2Pct]);
      const e2Units = this.parseNum(row[colE2Units]);

      const e3Price = this.parseNum(row[colE3]);
      const e3Alloc = this.parseNum(row[colE3Pct]);
      const e3Units = this.parseNum(row[colE3Units]);

      const avgPriceE1 = this.parseNum(row[colAvgE1]) || e1Price;
      const avgPriceE2 = this.parseNum(row[colAvgE2]);
      const avgPriceE3 = this.parseNum(row[colAvgE3]);

      const stopLoss = this.parseNum(row[colSL]) || (type === 'LONG' ? e1Price * 0.95 : e1Price * 1.05);
      const stopLossPercent = this.parseNum(row[colSLPct]);
      const lossCapa1 = this.parseNum(row[colLoss1]);
      const lossCapa2 = this.parseNum(row[colLoss2]);
      const lossCapa3 = this.parseNum(row[colLoss3]);

      const tacticalRules = (row[colTactical] || '').toString().trim();
      const tradeDiscipline = (row[colDiscipline] || '').toString().trim();

      const rawStatus = (row[colStatus] || 'Pendiente').toString().trim().toLowerCase();
      let status: 'Active' | 'Pending' | 'Completed' = 'Active';
      if (rawStatus.includes('pend')) status = 'Pending';
      else if (rawStatus.includes('cerr') || rawStatus.includes('comp')) status = 'Completed';

      const dcaLevels: DcaLevel[] = [
        {
          level: 'E1',
          price: e1Price,
          allocationPercent: e1Alloc,
          units: e1Units,
          averagePriceAfter: avgPriceE1,
          label: 'Entrada Principal E1'
        }
      ];

      if (e2Price && e2Price > 0) {
        dcaLevels.push({
          level: 'E2',
          price: e2Price,
          allocationPercent: e2Alloc || 30,
          units: e2Units,
          averagePriceAfter: avgPriceE2,
          label: 'Refuerzo E2'
        });
      }

      if (e3Price && e3Price > 0) {
        dcaLevels.push({
          level: 'E3',
          price: e3Price,
          allocationPercent: e3Alloc || 20,
          units: e3Units,
          averagePriceAfter: avgPriceE3,
          label: 'Soporte E3'
        });
      }

      strategies.push({
        id,
        symbol,
        coinName: rawAsset,
        strategyName: stratName.length > 0 ? stratName : `${symbol}_STRATEGY`,
        date: (row[colDate] || '').toString().trim(),
        capitalAssigned,
        market,
        marginType,
        leverage,
        nominalValue,
        type,
        category,
        scenarioNotes,
        notes: scenarioNotes,
        entryPrice: e1Price,
        e1AllocationPercent: e1Alloc,
        e1Units,
        e2Price,
        e2AllocationPercent: e2Alloc,
        e2Units,
        e3Price,
        e3AllocationPercent: e3Alloc,
        e3Units,
        avgPriceE1,
        avgPriceE2,
        avgPriceE3,
        dcaLevels,
        stopLoss,
        stopLossPercent,
        lossCapa1,
        lossCapa2,
        lossCapa3,
        tacticalRules,
        tradeDiscipline,
        status: 'Active',
        statusSheetEstrategia: 'Activa',
        rowIndex: index + 1 // Row 1 is header, data rows start at 2
      });

      // TPs
      const tp1Price = this.parseNum(row[colTP1]);
      const tp1Pct = this.parseNum(row[colTP1Pct]) || 50;
      const tp1Profit = this.parseNum(row[colProfit1]);
      if (tp1Price && tp1Price > 0) {
        orders.push({
          strategyId: id,
          type: 'TP1',
          targetPrice: tp1Price,
          closePercentage: tp1Pct,
          profitUsd: tp1Profit,
          label: 'TP1 - Mover BE'
        });
      }

      const tp2Price = this.parseNum(row[colTP2]);
      const tp2Pct = this.parseNum(row[colTP2Pct]) || 30;
      const tp2Profit = this.parseNum(row[colProfit2]);
      if (tp2Price && tp2Price > 0) {
        orders.push({
          strategyId: id,
          type: 'TP2',
          targetPrice: tp2Price,
          closePercentage: tp2Pct,
          profitUsd: tp2Profit,
          label: 'TP2 - Toma Parcial'
        });
      }

      const tp3Price = this.parseNum(row[colTP3]);
      const tp3Pct = this.parseNum(row[colTP3Pct]) || 20;
      const tp3Profit = this.parseNum(row[colProfit3]);
      if (tp3Price && tp3Price > 0) {
        orders.push({
          strategyId: id,
          type: 'TP3',
          targetPrice: tp3Price,
          closePercentage: tp3Pct,
          profitUsd: tp3Profit,
          label: 'TP3 - Objetivo Mayor'
        });
      }
    });

    return { strategies, orders };
  }
}
