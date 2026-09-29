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

export interface EstrategiaDetail {
  code: string;
  date?: string;
  time?: string;
  displayName?: string;
  pair?: string;
  timeframe?: string;
  orderType?: string;
  keyIndicators?: string;
  entryRules?: string;
  exitRules?: string;
  riskManagement?: string;
  commentsBacktesting?: string;
  status?: string;
  registrationTimestamp?: string;
  rowIndex?: number; // Fila exacta en pestaña 'Estrategia' (e.g. 2, 3...)
  cellM?: string;    // Celda de Estado en pestaña 'Estrategia' (e.g. "M2", "M3"...)
}

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
          const parsedOrd: TakeProfitOrder[] = ordData ? JSON.parse(ordData) : [];
          return {
            strategies: parsedStr,
            orders: parsedOrd
          };
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
   * Mapea y extrae todos los títulos y campos detallados de la pestaña 'Estrategia'.
   * Columnas analizadas:
   * Col 0: Nombre Estrategia (Código / ID ej: AAVE_PULLBACK_...)
   * Col 1: Fecha
   * Col 2: Hora
   * Col 3: Nombre de Estrategia (Título descriptivo ej: AAVE Pullback a Soporte...)
   * Col 4: Par
   * Col 5: Temporalidad (1D, 4h, 1h...)
   * Col 6: Tipo de Orden (Limit, Market...)
   * Col 7: Indicadores Clave (SMA-5, Estocástico, Bandas Bollinger...)
   * Col 8: Reglas de Entrada
   * Col 9: Reglas de Salida / TP
   * Col 10: Gestión de Riesgo & Stop Loss
   * Col 11: Comentarios / Backtesting
   * Col 12: Estado (Activa, Inactiva...)
   * Col 13: Fecha y Hora Registro
   */
  public static parseEstrategiaDetailsMap(csvOrRows: string | string[][]): Map<string, EstrategiaDetail> {
    const detailsMap = new Map<string, EstrategiaDetail>();
    let rows: string[][] = [];
    if (typeof csvOrRows === 'string') {
      if (!csvOrRows || csvOrRows.includes('<!DOCTYPE html>') || csvOrRows.trim().length < 20) {
        return detailsMap;
      }
      rows = this.parseCsvToRows(csvOrRows);
    } else if (Array.isArray(csvOrRows)) {
      rows = csvOrRows;
    }

    if (rows.length <= 1) return detailsMap;

    const header = rows[0].map(h => (h || '').toLowerCase().trim());
    let colCode = 0;
    let colDate = 1;
    let colTime = 2;
    let colTitle = 3;
    let colPair = 4;
    let colTf = 5;
    let colOrderType = 6;
    let colIndicators = 7;
    let colEntry = 8;
    let colExit = 9;
    let colRisk = 10;
    let colComments = 11;
    let colStatus = 12;
    let colTimestamp = 13;

    header.forEach((h, idx) => {
      if (/^(nombre\s*estrategia|c[oó]digo.*estrategia|id.*estrategia)$/i.test(h)) colCode = idx;
      else if (/^fecha$/i.test(h)) colDate = idx;
      else if (/^hora$/i.test(h)) colTime = idx;
      else if (/(nombre\s*de\s*estrategia|t[ií]tulo|descripci[oó]n)/i.test(h)) colTitle = idx;
      else if (/^(par|activo|ticker|s[ií]mbolo|symbol)$/i.test(h)) colPair = idx;
      else if (/(temporalidad|timeframe|^tf$)/i.test(h)) colTf = idx;
      else if (/(tipo\s*de\s*orden|tipo\s*orden|order\s*type)/i.test(h)) colOrderType = idx;
      else if (/(indicadores\s*clave|indicadores|key\s*indicators)/i.test(h)) colIndicators = idx;
      else if (/(reglas.*entrada|entry\s*rules)/i.test(h)) colEntry = idx;
      else if (/(reglas.*salida|reglas.*tp|exit\s*rules)/i.test(h)) colExit = idx;
      else if (/(gesti[oó]n.*riesgo|risk\s*management|stop\s*loss)/i.test(h)) colRisk = idx;
      else if (/(comentarios|backtesting|notas)/i.test(h)) colComments = idx;
      else if (/^(estado|status)$/i.test(h)) colStatus = idx;
      else if (/(fecha.*hora.*registro|fecha.*registro|timestamp|registro)/i.test(h)) colTimestamp = idx;
    });

    // Check local status overrides for Estrategia sheet
    let localOverrides: Record<string, { status: string; cell: string }> = {};
    try {
      const stored = localStorage.getItem('crypto_radar_estrategia_status_overrides');
      if (stored) localOverrides = JSON.parse(stored);
    } catch {
      // ignore
    }

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length <= colCode) continue;
      const code = (r[colCode] || r[0] || '').trim();
      if (!code) continue;

      const rowIndex = i + 1;
      const cellM = `M${rowIndex}`;

      const normCode = code.toLowerCase().trim();
      let status = (r[colStatus] || 'Activa').trim();
      if (localOverrides[normCode]?.status) {
        status = localOverrides[normCode].status;
      }

      const detail: EstrategiaDetail = {
        code,
        date: r[colDate] || '',
        time: r[colTime] || '',
        displayName: r[colTitle] || '',
        pair: r[colPair] || '',
        timeframe: r[colTf] || '1D',
        orderType: r[colOrderType] || 'Limit',
        keyIndicators: r[colIndicators] || '',
        entryRules: r[colEntry] || '',
        exitRules: r[colExit] || '',
        riskManagement: r[colRisk] || '',
        commentsBacktesting: r[colComments] || '',
        status,
        registrationTimestamp: r[colTimestamp] || '',
        rowIndex,
        cellM
      };

      detailsMap.set(normCode, detail);

      const rawPair = (r[colPair] || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (rawPair) {
        detailsMap.set(rawPair.toLowerCase(), detail);
        const withoutUsdt = rawPair.replace('USDT', '');
        if (withoutUsdt) detailsMap.set(withoutUsdt.toLowerCase(), detail);
      }
    }

    return detailsMap;
  }

  /**
   * Helper de compatibilidad: extrae nombres de estrategias con estado 'Activa'
   */
  public static parseActiveSetFromEstrategiaCsv(csvText: string): Set<string> {
    const detailsMap = this.parseEstrategiaDetailsMap(csvText);
    const activeSet = new Set<string>();
    detailsMap.forEach((detail, key) => {
      const st = (detail.status || '').toLowerCase();
      if (st.includes('activa') && !st.includes('inactiva') && !st.includes('retirada') && !st.includes('cerrada')) {
        activeSet.add(key);
        if (detail.code) activeSet.add(detail.code.toLowerCase().trim());
      }
    });
    return activeSet;
  }

  /**
   * Consulta la pestaña 'Estrategia' en vivo y devuelve el mapa completo de metadatos.
   */
  public static async fetchEstrategiaDetailsMap(spreadsheetId: string, apiKey?: string, forcePurgeCache: boolean = false): Promise<Map<string, EstrategiaDetail>> {
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
          const parsed = this.parseEstrategiaDetailsMap(csvText);
          if (parsed.size > 0) return parsed;
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
            const parsed = this.parseEstrategiaDetailsMap(rows);
            if (parsed.size > 0) return parsed;
          }
        }
      } catch (e) {
        console.warn('Error fetching Estrategia sheet via API:', e);
      }
    }

    return new Map<string, EstrategiaDetail>();
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

    // METHOD 0: Servidor Express Backend Proxy Directo (Elimina CORS y restricciones de navegador)
    try {
      const serverProxyUrl = `/api/sheets/live-data?spreadsheetId=${encodeURIComponent(spreadsheetId)}&apiKey=${encodeURIComponent(effectiveApiKey || '')}&${cacheBuster}`;
      const serverResp = await fetch(serverProxyUrl, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      if (serverResp.ok) {
        const serverData = await serverResp.json();
        if (serverData.ok) {
          // Extraer mapa de detalles de la hoja Estrategia
          let estrategiaMap: Map<string, EstrategiaDetail> | undefined = undefined;
          if (serverData.estrategiaCsv) {
            estrategiaMap = this.parseEstrategiaDetailsMap(serverData.estrategiaCsv);
          }

          let parsedResult: { strategies: Strategy[]; orders: TakeProfitOrder[] } | null = null;
          if (serverData.ordenesCsv) {
            const rows = this.parseCsvToRows(serverData.ordenesCsv);
            if (rows.length > 1) {
              parsedResult = this.parseStrategiesSheetRows(rows, estrategiaMap);
            }
          } else if (serverData.values && Array.isArray(serverData.values) && serverData.values.length > 1) {
            parsedResult = this.parseStrategiesSheetRows(serverData.values, estrategiaMap);
          }

          if (parsedResult && parsedResult.strategies.length > 0) {
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
    } catch (e: any) {
      console.warn('[SheetsService] Server proxy live-data aviso:', e.message);
    }

    // Consultar primero el mapa de detalles de la hoja Estrategia
    const estrategiaDetailsMap = await this.fetchEstrategiaDetailsMap(spreadsheetId, effectiveApiKey, forcePurgeCache);

    // METHOD 1: Direct Google Sheets GViz CSV Export (tab Ordenes)
    if (spreadsheetId) {
      const csvUrlsToTry = [
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Ordenes')}&${cacheBuster}`,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Órdenes')}&${cacheBuster}`
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
            // Asegurar que es la hoja de órdenes
            if (csvText && !csvText.includes('<!DOCTYPE html>') && csvText.trim().length > 100 && (csvText.includes('E1') || csvText.includes('Capital Asignado') || csvText.includes('Nombre Estrategia'))) {
              const rows = this.parseCsvToRows(csvText);
              if (rows.length > 1) {
                const parsedResult = this.parseStrategiesSheetRows(rows, estrategiaDetailsMap);
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
      for (const sheetName of ['Ordenes', 'Órdenes', 'Orders', 'Sheet1']) {
        try {
          const cacheBuster = Date.now();
          const stratUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?key=${effectiveApiKey}&t=${cacheBuster}`;
          
          const stratRes = await fetch(stratUrl);
          if (stratRes.ok) {
            const stratJson = await stratRes.json();
            const values = stratJson.values || [];
            
            if (values.length > 1) {
              const parsedResult = this.parseStrategiesSheetRows(values, estrategiaDetailsMap);
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

    // METHOD 3: Fallback to stored custom strategies (solo si NO se forzó depuración explícita de datos)
    if (!forcePurgeCache) {
      const stored = this.getStoredCustomData();
      if (stored.strategies.length > 0) {
        return {
          strategies: stored.strategies,
          orders: stored.orders,
          source: 'local_preset',
          timestamp
        };
      }
      return {
        strategies: INITIAL_STRATEGIES,
        orders: INITIAL_ORDERS,
        source: 'local_preset',
        timestamp
      };
    }

    // Si se forzó depuración de caché y el documento de Google Sheets está vacío:
    return {
      strategies: [],
      orders: [],
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
   * Mapea y procesa filas según el diccionario oficial y títulos actualizados de 'Ordenes':
   * Col 0: Nombre Estrategia (Código único)
   * Col 1: Fecha / Hora (GMT-6)
   * Col 2: Activo / Par
   * Col 3: Capital Asignado
   * Col 4: Mercado (Binance Futuros)
   * Col 5: Margen (Aislado)
   * Col 6: Apalancamiento (5X)
   * Col 7: Valor Nominal
   * Col 8: Tipo (Long / Short)
   * Col 9: Estrategia / Categoría
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
   * Col 40: Fecha y Hora Registro
   */
  public static parseStrategiesSheetRows(
    rows: string[][], 
    estrategiaSource?: Map<string, EstrategiaDetail> | Set<string>
  ): {
    strategies: Strategy[];
    orders: TakeProfitOrder[];
  } {
    if (!rows || rows.length <= 1) return { strategies: [], orders: [] };

    // Inspect headers
    const headerRow = rows[0].map(h => (h || '').toString().toLowerCase().trim());

    // Defaults based on the updated Google Sheets structure
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
    let colTimestamp = 40;

    // Detección dinámica y tolerante a cambios de nombres en títulos
    headerRow.forEach((h, idx) => {
      // 0. Código / Nombre Estrategia
      if (/^(nombre\s*estrategia|c[oó]digo.*estrategia|id.*estrategia|strategy\s*name)$/i.test(h)) colName = idx;
      // 1. Fecha / Hora
      else if (/(fecha\s*[\/\-]?\s*hora|date.*time|^fecha$)/i.test(h) && !h.includes('registro')) colDate = idx;
      // 2. Activo
      else if (/^(activo|par|ticker|moneda|symbol|s[ií]mbolo)$/i.test(h)) colAsset = idx;
      // 3. Capital Asignado
      else if (/(capital\s*asignado|capital|margen\s*asignado)/i.test(h)) colCapital = idx;
      // 4. Mercado
      else if (/^(mercado|exchange|market)$/i.test(h)) colMarket = idx;
      // 5. Margen
      else if (/(^margen$|modalidad.*margen|tipo.*margen|margin\s*type)/i.test(h)) colMargin = idx;
      // 6. Apalancamiento
      else if (/(apalancamiento|leverage|^lev$)/i.test(h)) colLev = idx;
      // 7. Valor Nominal
      else if (/(valor.*nominal|nominal|tama[ñn]o.*posici[oó]n|position\s*size)/i.test(h)) colNominal = idx;
      // 8. Tipo / Dirección
      else if (/^(tipo|direcci[oó]n|direccion|side|operaci[oó]n|operacion|direction)$/i.test(h)) colType = idx;
      // 9. Estrategia / Categoría
      else if (/^(estrategia|categor[ií]a|setup|patr[oó]n|tipo\s*estrategia)$/i.test(h)) colStrategy = idx;
      // 10. Escenario Principal
      else if (/(escenario\s*principal|escenario|tesis|notas\s*escenario)/i.test(h)) colScenario = idx;
      // 11-13. E1, % E1, Cantidad Unidades E1
      else if (/^(e1|entrada\s*1|precio\s*e1|entry\s*1)$/i.test(h)) colE1 = idx;
      else if (/(%\s*e1|e1\s*%|asignaci[oó]n\s*e1|porcentaje\s*e1)/i.test(h)) colE1Pct = idx;
      else if (/(unidades.*e1|cantidad.*e1|qty.*e1)/i.test(h)) colE1Units = idx;
      // 14-16. E2, % E2, Cantidad Unidades E2
      else if (/^(e2|entrada\s*2|precio\s*e2|entry\s*2)$/i.test(h)) colE2 = idx;
      else if (/(%\s*e2|e2\s*%|asignaci[oó]n\s*e2|porcentaje\s*e2)/i.test(h)) colE2Pct = idx;
      else if (/(unidades.*e2|cantidad.*e2|qty.*e2)/i.test(h)) colE2Units = idx;
      // 17-19. E3, % E3, Cantidad Unidades E3
      else if (/^(e3|entrada\s*3|precio\s*e3|entry\s*3)$/i.test(h)) colE3 = idx;
      else if (/(%\s*e3|e3\s*%|asignaci[oó]n\s*e3|porcentaje\s*e3)/i.test(h)) colE3Pct = idx;
      else if (/(unidades.*e3|cantidad.*e3|qty.*e3)/i.test(h)) colE3Units = idx;
      // 20-22. Promedios
      else if (/(promedio.*e1|avg.*e1)/i.test(h)) colAvgE1 = idx;
      else if (/(promedio.*e2|avg.*e2)/i.test(h)) colAvgE2 = idx;
      else if (/(promedio.*e3|avg.*e3|break\s*-?\s*even)/i.test(h)) colAvgE3 = idx;
      // 23-24. Stop Loss
      else if (/stop.*loss.*%/i.test(h) || /sl\s*%/i.test(h) || /%\s*sl/i.test(h)) colSLPct = idx;
      else if (/^(stop\s*-?\s*loss|sl|precio\s*sl|stoploss)$/i.test(h) || (/stop.*loss/i.test(h) && !h.includes('%') && !h.includes('capa'))) colSL = idx;
      // 25-27. Loss Capas
      else if (/(loss.*capa.*1|p[eé]rdida.*capa.*1|p[eé]rdida.*e1|loss.*1)/i.test(h)) colLoss1 = idx;
      else if (/(loss.*capa.*2|p[eé]rdida.*capa.*2|p[eé]rdida.*e2|loss.*2)/i.test(h)) colLoss2 = idx;
      else if (/(loss.*capa.*3|p[eé]rdida.*capa.*3|p[eé]rdida.*e3|loss.*3|p[eé]rdida.*m[aá]xima)/i.test(h)) colLoss3 = idx;
      // 28-30. TP1
      else if (/(%\s*tp1|tp1\s*%|asignaci[oó]n\s*tp1|porcentaje\s*tp1)/i.test(h)) colTP1Pct = idx;
      else if (/(profit.*capa.*1|ganancia.*capa.*1|profit.*1)/i.test(h)) colProfit1 = idx;
      else if (/^(tp1|take\s*profit\s*1|objetivo\s*1|target\s*1)$/i.test(h)) colTP1 = idx;
      // 31-33. TP2
      else if (/(%\s*tp2|tp2\s*%|asignaci[oó]n\s*tp2|porcentaje\s*tp2)/i.test(h)) colTP2Pct = idx;
      else if (/(profit.*capa.*2|ganancia.*capa.*2|profit.*2)/i.test(h)) colProfit2 = idx;
      else if (/^(tp2|take\s*profit\s*2|objetivo\s*2|target\s*2)$/i.test(h)) colTP2 = idx;
      // 34-36. TP3
      else if (/(%\s*tp3|tp3\s*%|asignaci[oó]n\s*tp3|porcentaje\s*tp3)/i.test(h)) colTP3Pct = idx;
      else if (/(profit.*capa.*3|ganancia.*capa.*3|profit.*3)/i.test(h)) colProfit3 = idx;
      else if (/^(tp3|take\s*profit\s*3|objetivo\s*3|target\s*3)$/i.test(h)) colTP3 = idx;
      // 37. Reglas de Ejecución Táctica
      else if (/(reglas.*ejecuci[oó]n|reglas.*t[aá]cticas|gesti[oó]n.*t[aá]ctica|tactical\s*rules)/i.test(h)) colTactical = idx;
      // 38. Disciplina del Trade
      else if (/(disciplina.*trade|disciplina|reglas.*disciplina|trade\s*discipline)/i.test(h)) colDiscipline = idx;
      // 39. Estado
      else if (/^(estado|status|estado.*trade|estado.*estrategia)$/i.test(h)) colStatus = idx;
      // 40. Fecha y Hora Registro
      else if (/(fecha.*hora.*registro|fecha.*registro|timestamp|registro)/i.test(h)) colTimestamp = idx;
    });

    const isEstrategiaMap = estrategiaSource instanceof Map;
    const isEstrategiaSet = estrategiaSource instanceof Set;

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

      // Extraer y validar Estado directo de la fila de la hoja Ordenes
      const rowStatusRaw = (row[colStatus] || '').toString().trim().toLowerCase();
      
      // Si la fila está marcada explícitamente como inactiva, retirada, cerrada, pasada, cancelada, etc.:
      if (/inactiv|retirad|cerrad|pasad|finaliz|cancel|pausad|eliminad|histor/i.test(rowStatusRaw)) {
        return; // Omitir estrategia retirada / pasada / inactiva
      }

      // Buscar metadatos enriquecidos de la hoja Estrategia
      const normName = stratName.toLowerCase().trim();
      const normAsset = rawAsset.toLowerCase().trim();
      let detail: EstrategiaDetail | undefined = undefined;

      if (isEstrategiaMap) {
        const map = estrategiaSource as Map<string, EstrategiaDetail>;
        detail = map.get(normName) || map.get(normAsset);
        if (!detail) {
          for (const [key, d] of map.entries()) {
            if (normName.startsWith(key) || key.startsWith(normName) || key.startsWith(normAsset + '_')) {
              detail = d;
              break;
            }
          }
        }
      }

      // Si la hoja Estrategia la marca como Inactiva/Retirada:
      if (detail && detail.status) {
        const st = detail.status.toLowerCase();
        if (st.includes('inactiv') || st.includes('retirad') || st.includes('cerrad') || st.includes('pasad')) {
          return;
        }
      }

      // Compatibilidad con activeStrategySet
      if (isEstrategiaSet) {
        const set = estrategiaSource as Set<string>;
        if (set.size > 0) {
          const isActive = set.has(normName) ||
            Array.from(set).some(a => normName === a || normName.startsWith(a) || a.startsWith(normName) || a.startsWith(normAsset + '_'));
          if (!isActive) {
            return;
          }
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

      const orderStatus = (row[colStatus] || 'Pendiente').toString().trim() || 'Pendiente';
      const estrategiaStatus = (detail?.status || 'Activa').trim();

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

      const registrationTimestamp = (row[colTimestamp] || detail?.registrationTimestamp || '').toString().trim();

      strategies.push({
        id,
        symbol,
        coinName: rawAsset,
        strategyName: stratName.length > 0 ? stratName : `${symbol}_STRATEGY`,
        date: (row[colDate] || detail?.date || '').toString().trim(),
        capitalAssigned,
        market,
        marginType,
        leverage,
        nominalValue,
        type,
        category,
        scenarioNotes,
        notes: scenarioNotes || detail?.commentsBacktesting,
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
        status: orderStatus,
        statusSheetEstrategia: detail?.status || estrategiaStatus,
        rowIndex: index + 2, // Fila exacta en pestaña Ordenes (Encabezados en fila 1)
        estrategiaRowIndex: detail?.rowIndex,
        estrategiaCellM: detail?.cellM || (detail?.rowIndex ? `M${detail.rowIndex}` : undefined),
        
        // Metadatos enriquecidos de la pestaña 'Estrategia'
        displayName: detail?.displayName || stratName,
        timeframe: detail?.timeframe || '1D',
        orderType: detail?.orderType || 'Limit',
        keyIndicators: detail?.keyIndicators,
        entryRules: detail?.entryRules,
        exitRules: detail?.exitRules,
        riskManagement: detail?.riskManagement,
        commentsBacktesting: detail?.commentsBacktesting,
        registrationTimestamp
      });

      // Take Profits
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

  /**
   * Guarda y persiste las actualizaciones de Estado para la pestaña 'Estrategia' (Columna M).
   * 1. Actualiza localStorage ('crypto_radar_estrategia_status_overrides')
   * 2. Envía solicitud POST al proxy backend /api/sheets/update-estrategia-status
   * 3. Si hay URL de Google Apps Script, envía las celdas a la hoja real
   */
  public static async saveEstrategiaStatusOverrides(
    updates: Array<{ code: string; cell: string; status: string; reason?: string }>,
    proxyUrl?: string
  ): Promise<{ success: boolean; message: string; count: number }> {
    try {
      // 1. Guardar en localStorage
      let currentOverrides: Record<string, { status: string; cell: string; code: string; updatedAt: string }> = {};
      try {
        const stored = localStorage.getItem('crypto_radar_estrategia_status_overrides');
        if (stored) currentOverrides = JSON.parse(stored);
      } catch {
        // ignore
      }

      const now = new Date().toISOString();
      updates.forEach(u => {
        if (u.code) {
          currentOverrides[u.code.toLowerCase().trim()] = {
            code: u.code,
            cell: u.cell || 'M',
            status: u.status,
            updatedAt: now
          };
        }
      });

      localStorage.setItem('crypto_radar_estrategia_status_overrides', JSON.stringify(currentOverrides));

      // 2. Enviar al backend /api/sheets/update-estrategia-status
      const effectiveProxy = proxyUrl || this.getConfig().proxyUrl || '';
      const response = await fetch('/api/sheets/update-estrategia-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates,
          proxyUrl: effectiveProxy
        })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          count: updates.length,
          message: `Se han actualizado ${updates.length} estados en la columna M de la hoja "Estrategia".`
        };
      }

      return {
        success: true,
        count: updates.length,
        message: `Se han registrado ${updates.length} estados en caché local para la columna M.`
      };
    } catch (e: any) {
      return {
        success: false,
        count: 0,
        message: e.message || 'Error al persistir estados de la hoja Estrategia.'
      };
    }
  }
}

