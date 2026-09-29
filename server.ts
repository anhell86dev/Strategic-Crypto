import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Google Apps Script Proxy Service URL (stores BINANCE_API, BINANCE_API_SECRET, SHEETS_API_KEY, GEMINI_API_KEY)
const GAPPS_PROXY_URL = 
  process.env.GAPPS_PROXY_URL || 
  'https://script.google.com/macros/s/AKfycbyh7HTOVbaUs8y0bfgzWXVuf8p5LGIFRRdfmbGO8-4hjFQiNwhpUyWj27BZNDAmzZWu/exec';

let gappsCachedProperties: {
  BINANCE_API?: string;
  BINANCE_API_SECRET?: string;
  SHEETS_API_KEY?: string;
  GEMINI_API_KEY?: string;
  lastFetched?: number;
} = {};

/**
 * Fetches credentials from Google Apps Script Web App
 */
async function fetchGappsProperties(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && gappsCachedProperties.lastFetched && (now - gappsCachedProperties.lastFetched < 180000) && gappsCachedProperties.BINANCE_API) {
    return gappsCachedProperties;
  }

  try {
    const separator = GAPPS_PROXY_URL.includes('?') ? '&' : '?';
    const targetUrl = `${GAPPS_PROXY_URL}${separator}action=getProperties&t=${now}`;

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*'
      }
    });

    if (res.ok) {
      const text = await res.text();
      let parsed: any = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        text.split('\n').forEach(line => {
          const [k, ...v] = line.split('=');
          if (k && v.length) parsed[k.trim()] = v.join('=').trim();
        });
      }

      // Handle nested structures
      const props = parsed.properties || parsed.data || parsed;

      const apiKey = props.BINANCE_API || props.binance_api || props.binanceApiKey || props.apiKey || gappsCachedProperties.BINANCE_API || '';
      const apiSecret = props.BINANCE_API_SECRET || props.binance_api_secret || props.binanceSecret || props.apiSecret || gappsCachedProperties.BINANCE_API_SECRET || '';
      const sheetsKey = props.SHEETS_API_KEY || props.sheets_api_key || props.sheetsKey || gappsCachedProperties.SHEETS_API_KEY || '';
      const geminiKey = props.GEMINI_API_KEY || props.gemini_api_key || props.geminiKey || gappsCachedProperties.GEMINI_API_KEY || '';

      gappsCachedProperties = {
        BINANCE_API: apiKey,
        BINANCE_API_SECRET: apiSecret,
        SHEETS_API_KEY: sheetsKey,
        GEMINI_API_KEY: geminiKey,
        lastFetched: now
      };

      if (apiKey) {
        console.log(`[GAPPS] Sincronizadas credenciales de Binance desde Google Apps Script. Key: ${apiKey.slice(0, 6)}... (longitud ${apiKey.length}), Secret: ${Boolean(apiSecret)}`);
      }
    }
  } catch (err: any) {
    console.warn('[GAPPS] Aviso al conectar con Google Apps Script:', err.message);
  }

  return gappsCachedProperties;
}

app.use(express.json());

// Enable CORS for all incoming requests (crucial for custom headers like x-binance-api-key)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-binance-api-key, x-binance-api-secret, x-binance-testnet');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helper to resolve credentials from Google Apps Script, Environment, or Request Headers
async function getBinanceCredentials(req: Request) {
  const envKey = (process.env.BINANCE_API_KEY || '').trim();
  const envSecret = (process.env.BINANCE_API_SECRET || '').trim();

  const headerKey = ((req.headers['x-binance-api-key'] as string) || '').trim();
  const headerSecret = ((req.headers['x-binance-api-secret'] as string) || '').trim();

  let apiKey = envKey || headerKey;
  let apiSecret = envSecret || headerSecret;
  let source = envKey ? 'environment' : (headerKey ? 'client_header' : 'none');

  // Si no vienen en variables de entorno ni en headers, obtener del servicio de Google Apps Script (gapps)
  if (!apiKey || !apiSecret) {
    const gprops = await fetchGappsProperties();
    if (gprops.BINANCE_API && gprops.BINANCE_API_SECRET) {
      apiKey = gprops.BINANCE_API;
      apiSecret = gprops.BINANCE_API_SECRET;
      source = 'gapps_service';
    }
  }

  const isTestnet = 
    process.env.BINANCE_FUTURES_TESTNET === 'true' || 
    req.query.testnet === 'true' ||
    req.headers['x-binance-testnet'] === 'true';

  const baseUrl = isTestnet 
    ? 'https://testnet.binancefuture.com' 
    : 'https://fapi.binance.com';

  return { apiKey, apiSecret, source, isTestnet, baseUrl };
}

// Server time offset tracker for Binance
let serverTimeOffset = 0;
let lastTimeSync = 0;

async function syncTimeWithBinance(baseUrl: string) {
  const now = Date.now();
  if (lastTimeSync > 0 && now - lastTimeSync < 300000) return serverTimeOffset;

  try {
    const start = Date.now();
    const res = await fetch(`${baseUrl}/fapi/v1/time`);
    if (res.ok) {
      const data: any = await res.json();
      const end = Date.now();
      const rtt = Math.max(1, end - start);
      const sTime = Number(data.serverTime);
      if (sTime > 0) {
        serverTimeOffset = Math.round((sTime + rtt / 2) - end);
        lastTimeSync = end;
      }
    }
  } catch (e) {
    // ignore
  }
  return serverTimeOffset;
}

// Helper to make canonical signed requests to Binance Futures API safely
async function binanceSignedRequest(
  endpoint: string, 
  params: Record<string, string | number | boolean> = {}, 
  credentials: { apiKey: string; apiSecret: string; baseUrl: string },
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
) {
  const { apiKey, apiSecret, baseUrl } = credentials;

  if (!apiKey || !apiSecret) {
    const err: any = new Error('Credenciales de Binance no configuradas. Por favor añade BINANCE_API_KEY y BINANCE_API_SECRET.');
    err.code = -2015;
    err.status = 401;
    throw err;
  }

  await syncTimeWithBinance(baseUrl);
  const adjustedTimestamp = Date.now() + serverTimeOffset;

  const allParams: Record<string, string | number | boolean> = {
    ...params,
    recvWindow: 7000,
    timestamp: adjustedTimestamp
  };

  // Canonical sort of keys
  const sortedKeys = Object.keys(allParams).sort();
  const queryString = sortedKeys
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(allParams[key]))}`)
    .join('&');

  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(queryString)
    .digest('hex');

  const requestUrl = method === 'GET' || method === 'DELETE'
    ? `${baseUrl}${endpoint}?${queryString}&signature=${signature}`
    : `${baseUrl}${endpoint}`;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'X-MBX-APIKEY': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    }
  };

  if (method === 'POST' || method === 'PUT') {
    fetchOptions.body = `${queryString}&signature=${signature}`;
  }

  let response: any;
  try {
    response = await fetch(requestUrl, fetchOptions);
  } catch (netErr: any) {
    const err: any = new Error(`Error de red al conectar con Binance: ${netErr.message}`);
    err.status = 502;
    throw err;
  }

  // Track weight header
  const usedWeight = response.headers.get('x-mbx-used-weight-1m');
  if (usedWeight) {
    const weightNum = parseInt(usedWeight, 10);
    if (weightNum > 2000) {
      console.warn(`[Binance Rate Limit] Consumo de peso elevado: ${weightNum}/2400`);
    }
  }

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    if (response.status === 451) {
      const err: any = new Error(
        'Binance bloqueó la solicitud por restricción geográfica de IP (HTTP 451 Georestriction de Binance). Puedes activar el modo Testnet o usar el modo Simulación.'
      );
      err.code = 451;
      err.status = 451;
      throw err;
    }
    const err: any = new Error(
      `Binance devolvió una respuesta no válida (HTTP ${response.status}). Posible bloqueo o mantenimiento de Binance.`
    );
    err.status = response.status;
    throw err;
  }

  if (!response.ok || (data.code !== undefined && data.code < 0)) {
    const errorMsg = data.msg || `Binance API error (HTTP ${response.status})`;
    const err: any = new Error(errorMsg);
    err.code = data.code;
    err.status = response.status;
    throw err;
  }

  return data;
}

// 0. GET /api/gapps/properties - Fetches current properties from Google Apps Script Web App
app.get('/api/gapps/properties', async (_req: Request, res: Response) => {
  try {
    const props = await fetchGappsProperties(true);
    return res.json({
      ok: true,
      configured: Boolean(props.BINANCE_API && props.BINANCE_API_SECRET),
      hasBinanceKey: Boolean(props.BINANCE_API),
      hasBinanceSecret: Boolean(props.BINANCE_API_SECRET),
      hasSheetsKey: Boolean(props.SHEETS_API_KEY),
      hasGeminiKey: Boolean(props.GEMINI_API_KEY),
      properties: {
        BINANCE_API: props.BINANCE_API ? `${props.BINANCE_API.slice(0, 6)}...` : '',
        BINANCE_API_SECRET: props.BINANCE_API_SECRET ? '••••••••' : '',
        SHEETS_API_KEY: props.SHEETS_API_KEY ? `${props.SHEETS_API_KEY.slice(0, 6)}...` : '',
        GEMINI_API_KEY: props.GEMINI_API_KEY ? `${props.GEMINI_API_KEY.slice(0, 6)}...` : ''
      }
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 1. GET /api/binance/status
app.get('/api/binance/status', async (req: Request, res: Response) => {
  const creds = await getBinanceCredentials(req);
  const start = Date.now();

  try {
    const timeRes = await fetch(`${creds.baseUrl}/fapi/v1/time`);
    const timeText = await timeRes.text();
    let timeData: any = {};
    try {
      timeData = JSON.parse(timeText);
    } catch {
      // Ignored
    }
    const latency = Date.now() - start;

    return res.json({
      configured: Boolean(creds.apiKey && creds.apiSecret),
      hasKey: Boolean(creds.apiKey),
      hasSecret: Boolean(creds.apiSecret),
      testnet: creds.isTestnet,
      connected: timeRes.ok,
      source: creds.source,
      serverTime: timeData?.serverTime || Date.now(),
      latencyMs: latency
    });
  } catch (err: any) {
    return res.json({
      configured: Boolean(creds.apiKey && creds.apiSecret),
      hasKey: Boolean(creds.apiKey),
      hasSecret: Boolean(creds.apiSecret),
      testnet: creds.isTestnet,
      connected: false,
      source: creds.source,
      error: err.message || 'Error al conectar con Binance'
    });
  }
});

// 2. GET /api/binance/futures/account
app.get('/api/binance/futures/account', async (req: Request, res: Response) => {
  const creds = await getBinanceCredentials(req);

  if (!creds.apiKey || !creds.apiSecret) {
    return res.status(200).json({
      ok: false,
      configured: false,
      error: 'Credenciales de Binance no configuradas. Por favor añade BINANCE_API_KEY y BINANCE_API_SECRET.',
      code: -2015
    });
  }

  try {
    const data = await binanceSignedRequest('/fapi/v2/account', {}, creds);
    return res.json({ ok: true, data });
  } catch (err: any) {
    console.warn('[Binance Account Error]:', err.message);
    return res.status(200).json({
      ok: false,
      error: err.message || 'Error al obtener la cuenta de futuros de Binance',
      code: err.code
    });
  }
});

// 3. GET /api/binance/futures/positions
app.get('/api/binance/futures/positions', async (req: Request, res: Response) => {
  const creds = await getBinanceCredentials(req);

  if (!creds.apiKey || !creds.apiSecret) {
    return res.status(200).json({
      ok: false,
      configured: false,
      error: 'Credenciales de Binance no configuradas.',
      code: -2015,
      positions: []
    });
  }

  try {
    const rawPositions = await binanceSignedRequest('/fapi/v2/positionRisk', {}, creds);
    
    // Filter only active open positions (positionAmt != 0) unless requested all
    const showAll = req.query.all === 'true';
    const positions = (Array.isArray(rawPositions) ? rawPositions : [])
      .filter((pos: any) => showAll || parseFloat(pos.positionAmt) !== 0)
      .map((pos: any) => {
        const amt = parseFloat(pos.positionAmt);
        const entry = parseFloat(pos.entryPrice);
        const mark = parseFloat(pos.markPrice);
        const pnl = parseFloat(pos.unRealizedProfit);
        const lev = parseFloat(pos.leverage) || 1;
        const notional = Math.abs(amt * mark);
        const initialMargin = lev > 0 ? (notional / lev) : 0;
        const roe = initialMargin > 0 ? (pnl / initialMargin) * 100 : 0;

        return {
          symbol: pos.symbol,
          positionAmt: amt,
          entryPrice: entry,
          markPrice: mark,
          unRealizedProfit: pnl,
          liquidationPrice: parseFloat(pos.liquidationPrice) || 0,
          leverage: lev,
          marginType: (pos.marginType || 'cross').toLowerCase(),
          isolatedMargin: parseFloat(pos.isolatedMargin) || 0,
          positionSide: pos.positionSide || 'BOTH',
          notional,
          roe,
          side: amt > 0 ? 'LONG' : 'SHORT',
          breakEvenPrice: parseFloat(pos.breakEvenPrice) || entry,
          updateTime: pos.updateTime || Date.now()
        };
      });

    return res.json({
      ok: true,
      count: positions.length,
      positions
    });
  } catch (err: any) {
    console.warn('[Binance Positions Error]:', err.message);
    return res.status(200).json({
      ok: false,
      error: err.message || 'Error al obtener posiciones de futuros',
      code: err.code,
      positions: []
    });
  }
});

// 4. GET /api/binance/klines - Public Kline Proxy (Avoids CORS / Rate limits)
app.get('/api/binance/klines', async (req: Request, res: Response) => {
  const symbol = ((req.query.symbol as string) || 'BTCUSDT').toUpperCase().trim();
  const interval = (req.query.interval as string) || '1h';
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '5', 10)));

  const hosts = [
    'https://fapi.binance.com',
    'https://api.binance.com',
    'https://api1.binance.com',
    'https://data-api.binance.vision'
  ];

  for (const host of hosts) {
    try {
      const endpoint = host.includes('fapi') ? '/fapi/v1/klines' : '/api/v3/klines';
      const targetUrl = `${host}${endpoint}?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      const response = await fetch(targetUrl);
      if (response.ok) {
        const data = await response.json();
        return res.json({ ok: true, data });
      }
    } catch (e) {
      // try next host
    }
  }

  return res.status(502).json({ ok: false, error: 'No se pudieron obtener klines de Binance', data: [] });
});

// 4b. GET /api/binance/ticker/24hr - Public Ticker Proxy (Avoids CORS / Rate limits)
app.get('/api/binance/ticker/24hr', async (_req: Request, res: Response) => {
  const hosts = [
    'https://fapi.binance.com/fapi/v1/ticker/24hr',
    'https://api.binance.com/api/v3/ticker/24hr',
    'https://data-api.binance.vision/api/v3/ticker/24hr'
  ];

  for (const targetUrl of hosts) {
    try {
      const response = await fetch(targetUrl, {
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return res.json({ ok: true, data });
        }
      }
    } catch (e) {
      // try next host
    }
  }

  return res.status(502).json({ ok: false, error: 'No se pudieron obtener tickers de Binance', data: [] });
});

// 5. GET /api/binance/futures/orders
app.get('/api/binance/futures/orders', async (req: Request, res: Response) => {
  const creds = await getBinanceCredentials(req);

  if (!creds.apiKey || !creds.apiSecret) {
    return res.status(200).json({
      ok: false,
      configured: false,
      error: 'Credenciales de Binance no configuradas.',
      code: -2015,
      orders: []
    });
  }

  try {
    const rawOrders = await binanceSignedRequest('/fapi/v1/openOrders', {}, creds);
    return res.json({
      ok: true,
      orders: Array.isArray(rawOrders) ? rawOrders : []
    });
  } catch (err: any) {
    console.warn('[Binance Orders Error]:', err.message);
    return res.status(200).json({
      ok: false,
      error: err.message || 'Error al obtener órdenes abiertas',
      code: err.code,
      orders: []
    });
  }
});

// 6. POST /api/binance/futures/listenKey - Create User Data Stream listenKey
app.post('/api/binance/futures/listenKey', async (req: Request, res: Response) => {
  const creds = await getBinanceCredentials(req);
  if (!creds.apiKey) {
    return res.status(401).json({ ok: false, error: 'Falta API Key' });
  }

  try {
    const response = await fetch(`${creds.baseUrl}/fapi/v1/listenKey`, {
      method: 'POST',
      headers: {
        'X-MBX-APIKEY': creds.apiKey,
        'Content-Type': 'application/json'
      }
    });

    const data: any = await response.json();
    if (response.ok && data.listenKey) {
      return res.json({ ok: true, listenKey: data.listenKey });
    }
    return res.status(400).json({ ok: false, error: data.msg || 'No se pudo generar listenKey' });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 7. PUT /api/binance/futures/listenKey - Keep alive User Data Stream listenKey
app.put('/api/binance/futures/listenKey', async (req: Request, res: Response) => {
  const creds = await getBinanceCredentials(req);
  const listenKey = req.body?.listenKey;
  if (!creds.apiKey || !listenKey) {
    return res.status(400).json({ ok: false, error: 'Falta API Key o listenKey' });
  }

  try {
    const response = await fetch(`${creds.baseUrl}/fapi/v1/listenKey`, {
      method: 'PUT',
      headers: {
        'X-MBX-APIKEY': creds.apiKey,
        'Content-Type': 'application/json'
      }
    });
    return res.json({ ok: response.ok });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 8. POST /api/binance/futures/order - Place Order enforcing ISOLATED Margin & Max 5x Leverage Protection
app.post('/api/binance/futures/order', async (req: Request, res: Response) => {
  const creds = await getBinanceCredentials(req);
  if (!creds.apiKey || !creds.apiSecret) {
    return res.status(401).json({ ok: false, error: 'Credenciales de Binance no configuradas.' });
  }

  const {
    symbol,
    side, // 'BUY' | 'SELL'
    type = 'LIMIT', // 'LIMIT' | 'MARKET' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET'
    quantity,
    price,
    stopPrice,
    reduceOnly = false,
    timeInForce = 'GTC',
    leverage = 5
  } = req.body;

  if (!symbol || !side || !quantity) {
    return res.status(400).json({ ok: false, error: 'Faltan parámetros requeridos (symbol, side, quantity)' });
  }

  const cleanSymbol = symbol.toUpperCase().trim().replace('/', '');
  const enforcedLeverage = Math.min(5, Math.max(1, parseInt(String(leverage), 10) || 5));

  try {
    // 1. Force Isolated Margin
    try {
      await binanceSignedRequest('/fapi/v1/marginType', {
        symbol: cleanSymbol,
        marginType: 'ISOLATED'
      }, creds, 'POST');
    } catch {
      // Ignore if already isolated (-4046 No need to change margin type)
    }

    // 2. Force Max 5x Leverage
    try {
      await binanceSignedRequest('/fapi/v1/leverage', {
        symbol: cleanSymbol,
        leverage: enforcedLeverage
      }, creds, 'POST');
    } catch {
      // Ignore
    }

    // 3. Dispatch Order
    const orderParams: Record<string, string | number | boolean> = {
      symbol: cleanSymbol,
      side: side.toUpperCase(),
      type: type.toUpperCase(),
      quantity: String(quantity)
    };

    if (type === 'LIMIT') {
      orderParams.price = String(price);
      orderParams.timeInForce = timeInForce;
    }

    if (stopPrice) {
      orderParams.stopPrice = String(stopPrice);
    }

    if (reduceOnly) {
      orderParams.reduceOnly = 'true';
    }

    const orderResult = await binanceSignedRequest('/fapi/v1/order', orderParams, creds, 'POST');
    return res.json({ ok: true, data: orderResult });
  } catch (err: any) {
    console.error('[Binance Order Creation Error]:', err.message);
    return res.status(400).json({ ok: false, error: err.message, code: err.code });
  }
});

// 9. DELETE /api/binance/futures/order - Cancel Order
app.delete('/api/binance/futures/order', async (req: Request, res: Response) => {
  const creds = await getBinanceCredentials(req);
  if (!creds.apiKey || !creds.apiSecret) {
    return res.status(401).json({ ok: false, error: 'Credenciales no configuradas' });
  }

  const symbol = (req.query.symbol as string || '').toUpperCase().trim().replace('/', '');
  const orderId = req.query.orderId as string;

  if (!symbol || !orderId) {
    return res.status(400).json({ ok: false, error: 'Falta symbol u orderId' });
  }

  try {
    const result = await binanceSignedRequest('/fapi/v1/order', {
      symbol,
      orderId
    }, creds, 'DELETE');
    return res.json({ ok: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ ok: false, error: err.message, code: err.code });
  }
});

// 10. GET /api/sheets/live-data - Direct backend proxy to Google Sheets to eliminate CORS and stale caches
app.get('/api/sheets/live-data', async (req: Request, res: Response) => {
  const spreadsheetId = (req.query.spreadsheetId as string || '1jwRLOHKGUlHSPcAF401LKtDtSW5erFwZvxYkSJm-2mE').trim();
  const apiKey = (req.query.apiKey as string || '').trim();
  const cacheBuster = `_t=${Date.now()}_${Math.random()}`;

  let ordenesCsv: string | null = null;
  let estrategiaCsv: string | null = null;
  let values: any[][] | null = null;
  let source = 'unknown';

  // 1. Fetch Estrategia sheet (to know currently active strategy names in Col M)
  try {
    const estUrls = [
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Estrategia')}&${cacheBuster}`,
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Estrategias')}&${cacheBuster}`
    ];
    for (const u of estUrls) {
      const resp = await fetch(u, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      if (resp.ok) {
        const txt = await resp.text();
        if (txt && !txt.includes('<!DOCTYPE html>') && txt.length > 50) {
          estrategiaCsv = txt;
          break;
        }
      }
    }
  } catch (e: any) {
    console.warn('[Server Sheets Proxy] Warning fetching Estrategia tab:', e.message);
  }

  // 2. Fetch Ordenes sheet via CSV
  try {
    const ordUrls = [
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Ordenes')}&${cacheBuster}`,
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Órdenes')}&${cacheBuster}`
    ];
    for (const u of ordUrls) {
      const resp = await fetch(u, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      if (resp.ok) {
        const txt = await resp.text();
        // Validar que realmente sea la pestaña de Ordenes y no la de Mercados/Taxonomía
        if (txt && !txt.includes('<!DOCTYPE html>') && txt.length > 100 && (txt.includes('E1') || txt.includes('Capital Asignado') || txt.includes('Nombre Estrategia'))) {
          ordenesCsv = txt;
          source = 'server_gviz_csv';
          break;
        }
      }
    }
  } catch (e: any) {
    console.warn('[Server Sheets Proxy] Warning fetching Ordenes CSV:', e.message);
  }

  // 3. If CSV failed or if apiKey is provided, try Google Sheets REST API
  if ((!ordenesCsv || apiKey) && apiKey) {
    try {
      const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Ordenes?key=${apiKey}&${cacheBuster}`;
      const apiResp = await fetch(apiUrl);
      if (apiResp.ok) {
        const json = await apiResp.json();
        if (json.values && json.values.length > 1) {
          values = json.values;
          source = 'server_rest_api';
        }
      }
    } catch (e: any) {
      console.warn('[Server Sheets Proxy] Warning fetching via REST API:', e.message);
    }
  }

  if (ordenesCsv || values) {
    return res.json({
      ok: true,
      source,
      ordenesCsv,
      estrategiaCsv,
      values,
      estrategiaStatusOverrides,
      timestamp: new Date().toISOString()
    });
  }

  return res.status(502).json({
    ok: false,
    error: 'No se pudo obtener datos en vivo de Google Sheets desde el servidor'
  });
});

// Persisted status overrides for Hoja Estrategia (Columna M)
const ESTRATEGIA_STATUS_FILE = path.resolve(process.cwd(), 'estrategia-status-overrides.json');
let estrategiaStatusOverrides: Record<string, { cell: string; status: string; code: string; updatedAt: string }> = {};

try {
  if (fs.existsSync(ESTRATEGIA_STATUS_FILE)) {
    estrategiaStatusOverrides = JSON.parse(fs.readFileSync(ESTRATEGIA_STATUS_FILE, 'utf-8'));
  }
} catch (e) {
  // ignore
}

// 11. POST /api/sheets/update-estrategia-status - Batch updates for Estrategia sheet Col M
app.post('/api/sheets/update-estrategia-status', async (req: Request, res: Response) => {
  try {
    const { updates, proxyUrl } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ ok: false, error: 'Lista de actualizaciones inválida o vacía' });
    }

    const now = new Date().toISOString();
    updates.forEach((item: { code: string; cell: string; status: string }) => {
      if (item.code) {
        estrategiaStatusOverrides[item.code.toLowerCase().trim()] = {
          code: item.code,
          cell: item.cell || 'M',
          status: item.status,
          updatedAt: now
        };
      }
    });

    try {
      fs.writeFileSync(ESTRATEGIA_STATUS_FILE, JSON.stringify(estrategiaStatusOverrides, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[Server] Could not save status overrides file:', err.message);
    }

    // Forward to Google Apps Script proxy if configured
    let proxySent = false;
    if (proxyUrl && typeof proxyUrl === 'string' && proxyUrl.startsWith('http')) {
      try {
        await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'batchUpdateCells',
            sheetName: 'Estrategia',
            updates: updates.map((u: any) => ({ cell: u.cell, value: u.status }))
          })
        });
        proxySent = true;
      } catch (e: any) {
        console.warn('[Server] Forwarding to Apps Script proxy warning:', e.message);
      }
    }

    return res.json({
      ok: true,
      count: updates.length,
      proxySent,
      overrides: estrategiaStatusOverrides
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 12. GET /api/sheets/estrategia-status-overrides - Get current overrides for Estrategia sheet
app.get('/api/sheets/estrategia-status-overrides', (_req: Request, res: Response) => {
  return res.json({
    ok: true,
    overrides: estrategiaStatusOverrides
  });
});

// Setup dev server with Vite middlewares or production static files
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {}
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Binance Radar Server] Server listening on http://0.0.0.0:${PORT} (Node ${process.version})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
