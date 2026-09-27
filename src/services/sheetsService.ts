import { Strategy, TakeProfitOrder, SheetsConfig } from '../types';
import { INITIAL_STRATEGIES, INITIAL_ORDERS } from '../data/initialStrategies';

const STORAGE_KEY_CONFIG = 'crypto_radar_sheets_config';
const STORAGE_KEY_CUSTOM_STRATEGIES = 'crypto_radar_custom_strategies';
const STORAGE_KEY_CUSTOM_ORDERS = 'crypto_radar_custom_orders';

export const DEFAULT_SHEETS_CONFIG: SheetsConfig = {
  spreadsheetId: '1jwRLOHKGUlHSPcAF401LKtDtSW5erFwZvxYkSJm-2mE',
  apiKey: '',
  autoSync: true,
  syncIntervalSeconds: 60,
  usePresetFallback: true,
};

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
    } catch (e) {
      console.warn('Could not save sheets config:', e);
    }
  }

  public static getStoredCustomData(): { strategies: Strategy[]; orders: TakeProfitOrder[] } {
    try {
      const strData = localStorage.getItem(STORAGE_KEY_CUSTOM_STRATEGIES);
      const ordData = localStorage.getItem(STORAGE_KEY_CUSTOM_ORDERS);
      if (strData && ordData) {
        return {
          strategies: JSON.parse(strData),
          orders: JSON.parse(ordData)
        };
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
   * Fetches strategies & orders from Google Sheets REST API v4, or falls back gracefully
   */
  public static async fetchFromGoogleSheets(config: SheetsConfig): Promise<{
    strategies: Strategy[];
    orders: TakeProfitOrder[];
    source: 'google_sheets_api' | 'google_sheets_csv' | 'local_preset';
    timestamp: Date;
  }> {
    const { spreadsheetId, apiKey } = config;
    const timestamp = new Date();

    // 1. Try Google Sheets v4 REST API if API Key is present
    if (spreadsheetId && apiKey && apiKey.trim() !== '') {
      try {
        const cacheBuster = Date.now();
        const stratUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Estrategia?key=${apiKey}&t=${cacheBuster}`;
        const ordUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Ordenes?key=${apiKey}&t=${cacheBuster}`;

        const [stratRes, ordRes] = await Promise.all([
          fetch(stratUrl),
          fetch(ordUrl)
        ]);

        if (stratRes.ok && ordRes.ok) {
          const stratJson = await stratRes.json();
          const ordJson = await ordRes.json();

          const parsedStrategies = this.parseStrategiesSheetRows(stratJson.values || []);
          const parsedOrders = this.parseOrdersSheetRows(ordJson.values || []);

          if (parsedStrategies.length > 0) {
            this.saveCustomData(parsedStrategies, parsedOrders);
            return {
              strategies: parsedStrategies,
              orders: parsedOrders,
              source: 'google_sheets_api',
              timestamp
            };
          }
        }
      } catch (err) {
        console.warn('Google Sheets API request failed, trying CSV export fallback...', err);
      }
    }

    // 2. Try Public Google Sheets CSV / GViz Export (when document is publicly shared)
    if (spreadsheetId) {
      try {
        const stratCsvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Estrategia&t=${Date.now()}`;
        const ordCsvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Ordenes&t=${Date.now()}`;

        const [stratCsvRes, ordCsvRes] = await Promise.all([
          fetch(stratCsvUrl),
          fetch(ordCsvUrl)
        ]);

        if (stratCsvRes.ok && ordCsvRes.ok) {
          const stratText = await stratCsvRes.text();
          const ordText = await ordCsvRes.text();

          const stratRows = this.parseCsvToRows(stratText);
          const ordRows = this.parseCsvToRows(ordText);

          const parsedStrategies = this.parseStrategiesSheetRows(stratRows);
          const parsedOrders = this.parseOrdersSheetRows(ordRows);

          if (parsedStrategies.length > 0) {
            this.saveCustomData(parsedStrategies, parsedOrders);
            return {
              strategies: parsedStrategies,
              orders: parsedOrders,
              source: 'google_sheets_csv',
              timestamp
            };
          }
        }
      } catch (csvErr) {
        console.warn('Google Sheets CSV export fallback failed:', csvErr);
      }
    }

    // 3. Fallback to Local Stored or Default Preset Strategies
    const stored = this.getStoredCustomData();
    return {
      strategies: stored.strategies.length > 0 ? stored.strategies : INITIAL_STRATEGIES,
      orders: stored.orders.length > 0 ? stored.orders : INITIAL_ORDERS,
      source: 'local_preset',
      timestamp
    };
  }

  private static parseCsvToRows(csvText: string): string[][] {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    return lines.map(line => {
      // Split on comma ignoring commas inside quotes
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

  private static parseStrategiesSheetRows(rows: string[][]): Strategy[] {
    if (!rows || rows.length <= 1) return [];

    // Header row detection
    const dataRows = rows.slice(1);
    const strategies: Strategy[] = [];

    dataRows.forEach((row, index) => {
      if (!row || row.length < 5) return;
      const rawId = parseInt(row[0]) || (index + 1);
      const symbol = (row[1] || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const rawType = (row[2] || '').trim().toUpperCase();
      const type: 'LONG' | 'SHORT' = rawType.includes('SHORT') ? 'SHORT' : 'LONG';
      const entryPrice = parseFloat((row[3] || '0').replace(/,/g, '').replace('$', ''));
      const stopLoss = parseFloat((row[4] || '0').replace(/,/g, '').replace('$', ''));
      const date = row[5] || new Date().toISOString().split('T')[0];
      const rawStatus = (row[6] || 'Active').trim();
      
      let status: 'Active' | 'Pending' | 'Completed' = 'Active';
      if (rawStatus.toLowerCase().includes('pend')) status = 'Pending';
      else if (rawStatus.toLowerCase().includes('comp')) status = 'Completed';

      const customAlertThreshold = row[9] ? parseFloat(row[9].replace(/%/g, '')) : undefined;

      if (symbol && !isNaN(entryPrice) && entryPrice > 0) {
        strategies.push({
          id: rawId,
          symbol,
          coinName: symbol.replace('USDT', ''),
          type,
          entryPrice,
          stopLoss,
          date,
          status,
          category: row[7] || undefined,
          notes: row[8] || undefined,
          customAlertThreshold: (customAlertThreshold && !isNaN(customAlertThreshold) && customAlertThreshold > 0) ? customAlertThreshold : undefined
        });
      }
    });

    return strategies;
  }

  private static parseOrdersSheetRows(rows: string[][]): TakeProfitOrder[] {
    if (!rows || rows.length <= 1) return [];

    const dataRows = rows.slice(1);
    const orders: TakeProfitOrder[] = [];

    dataRows.forEach(row => {
      if (!row || row.length < 4) return;
      const strategyId = parseInt(row[0]);
      const type = (row[1] || 'TP1').trim();
      const targetPrice = parseFloat((row[2] || '0').replace(/,/g, '').replace('$', ''));
      const closePercentage = parseFloat((row[3] || '0').replace(/%/g, ''));

      if (!isNaN(strategyId) && !isNaN(targetPrice) && targetPrice > 0) {
        orders.push({
          strategyId,
          type,
          targetPrice,
          closePercentage: !isNaN(closePercentage) ? closePercentage : 33
        });
      }
    });

    return orders;
  }
}
