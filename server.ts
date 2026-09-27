import express, { Request, Response } from 'express';
import path from 'path';
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

// Helper to make signed requests to Binance Futures API safely without throwing on non-JSON
async function binanceSignedRequest(
  endpoint: string, 
  params: Record<string, string | number> = {}, 
  credentials: { apiKey: string; apiSecret: string; baseUrl: string }
) {
  const { apiKey, apiSecret, baseUrl } = credentials;

  if (!apiKey || !apiSecret) {
    const err: any = new Error('Credenciales de Binance no configuradas. Por favor añade BINANCE_API_KEY y BINANCE_API_SECRET.');
    err.code = -2015;
    err.status = 401;
    throw err;
  }

  const timestamp = Date.now();
  const allParams: Record<string, string | number> = {
    ...params,
    recvWindow: 6000,
    timestamp
  };

  const queryString = Object.entries(allParams)
    .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
    .join('&');

  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(queryString)
    .digest('hex');

  const requestUrl = `${baseUrl}${endpoint}?${queryString}&signature=${signature}`;

  let response: any;
  try {
    response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json'
      }
    });
  } catch (netErr: any) {
    const err: any = new Error(`Error de red al conectar con Binance: ${netErr.message}`);
    err.status = 502;
    throw err;
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
