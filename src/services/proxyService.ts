import { ProxyProperties } from '../types';

export const DEFAULT_PROXY_SERVER_URL = 
  'https://script.google.com/macros/s/AKfycbyh7HTOVbaUs8y0bfgzWXVuf8p5LGIFRRdfmbGO8-4hjFQiNwhpUyWj27BZNDAmzZWu/exec';

const STORAGE_KEY_PROXY_PROPERTIES = 'crypto_radar_proxy_properties';
const STORAGE_KEY_PROXY_URL = 'crypto_radar_proxy_url';

class ProxyService {
  private properties: ProxyProperties = {};
  private proxyUrl: string = DEFAULT_PROXY_SERVER_URL;
  private isLoaded: boolean = false;
  private listeners: Set<(props: ProxyProperties) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const savedUrl = localStorage.getItem(STORAGE_KEY_PROXY_URL);
      if (savedUrl) {
        this.proxyUrl = savedUrl;
      }
      const savedProps = localStorage.getItem(STORAGE_KEY_PROXY_PROPERTIES);
      if (savedProps) {
        this.properties = JSON.parse(savedProps);
        this.isLoaded = true;
      }
    } catch (e) {
      console.warn('Error reading proxy properties from storage:', e);
    }
  }

  public getProxyUrl(): string {
    return this.proxyUrl || DEFAULT_PROXY_SERVER_URL;
  }

  public setProxyUrl(url: string) {
    this.proxyUrl = url.trim() || DEFAULT_PROXY_SERVER_URL;
    try {
      localStorage.setItem(STORAGE_KEY_PROXY_URL, this.proxyUrl);
    } catch (e) {
      console.warn('Error saving proxy URL:', e);
    }
  }

  public getProperties(): ProxyProperties {
    return { ...this.properties };
  }

  public subscribe(cb: (props: ProxyProperties) => void): () => void {
    this.listeners.add(cb);
    if (this.isLoaded) {
      cb(this.properties);
    }
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach(cb => cb(this.properties));
  }

  /**
   * Fetches the 4 properties from Google Apps Script Web App:
   * BINANCE_API, GEMINI_API_KEY, SHEETS_API_KEY, BINANCE_API_SECRET
   */
  public async fetchPropertiesFromProxy(customUrl?: string): Promise<{
    success: boolean;
    properties: ProxyProperties;
    message?: string;
  }> {
    const targetUrl = (customUrl || this.proxyUrl || DEFAULT_PROXY_SERVER_URL).trim();

    try {
      // Build fetch URL with cache buster and action parameter
      const separator = targetUrl.includes('?') ? '&' : '?';
      const requestUrl = `${targetUrl}${separator}action=getProperties&t=${Date.now()}`;

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from Google Apps Script Proxy`);
      }

      const text = await response.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        // In case it returns string formatted key-values
        parsed = {};
        const lines = text.split('\n');
        lines.forEach(line => {
          const [k, ...v] = line.split('=');
          if (k && v.length) parsed[k.trim()] = v.join('=').trim();
        });
      }

      // Handle nested property objects if returned as { properties: { ... } } or { data: { ... } }
      const dataObj = parsed.properties || parsed.data || parsed.result || parsed;

      // Extract properties standardizing exact names (BINANCE_API, BINANCE_API_SECRET, SHEETS_API_KEY, GEMINI_API_KEY)
      const extracted: ProxyProperties = {
        BINANCE_API: dataObj.BINANCE_API || dataObj.binance_api || dataObj.binanceApiKey || dataObj.apiKey || this.properties.BINANCE_API || '',
        GEMINI_API_KEY: dataObj.GEMINI_API_KEY || dataObj.gemini_api_key || dataObj.geminiKey || this.properties.GEMINI_API_KEY || '',
        SHEETS_API_KEY: dataObj.SHEETS_API_KEY || dataObj.sheets_api_key || dataObj.sheetsKey || dataObj.sheetApiKey || this.properties.SHEETS_API_KEY || '',
        BINANCE_API_SECRET: dataObj.BINANCE_API_SECRET || dataObj.binance_api_secret || dataObj.binanceSecret || dataObj.apiSecret || this.properties.BINANCE_API_SECRET || ''
      };

      this.properties = extracted;
      this.isLoaded = true;
      try {
        localStorage.setItem(STORAGE_KEY_PROXY_PROPERTIES, JSON.stringify(extracted));
      } catch (e) {
        console.warn('Could not cache proxy properties:', e);
      }

      this.notify();
      return { success: true, properties: extracted };
    } catch (err: any) {
      console.warn('Proxy fetch attempt returned warning, attempting backend gapps proxy fallback:', err);
      
      // Fallback: try querying backend `/api/gapps/properties`
      try {
        const backendRes = await fetch('/api/gapps/properties');
        if (backendRes.ok) {
          const backendData = await backendRes.json();
          if (backendData.ok && backendData.properties) {
            return {
              success: true,
              properties: this.properties
            };
          }
        }
      } catch {
        // Continue with error
      }

      return {
        success: false,
        properties: this.properties,
        message: err.message || 'Error al conectar con el servidor proxy de Google Apps Script'
      };
    }
  }

  public getSheetsApiKey(): string {
    return this.properties.SHEETS_API_KEY || '';
  }

  public getBinanceApiKey(): string {
    return this.properties.BINANCE_API || '';
  }

  public getBinanceApiSecret(): string {
    return this.properties.BINANCE_API_SECRET || '';
  }

  public getGeminiApiKey(): string {
    return this.properties.GEMINI_API_KEY || '';
  }

  public updateManualProperties(props: Partial<ProxyProperties>) {
    this.properties = {
      ...this.properties,
      ...props
    };
    try {
      localStorage.setItem(STORAGE_KEY_PROXY_PROPERTIES, JSON.stringify(this.properties));
    } catch (e) {
      console.warn('Error saving proxy properties:', e);
    }
    this.notify();
  }
}

export const proxyService = new ProxyService();
