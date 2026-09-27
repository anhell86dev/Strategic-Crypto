/**
 * Binance USDⓈ-M Futures Cryptographic & Canonical Signature Utilities
 * Supports HMAC-SHA256, Time Offset Synchronization & Parameter Canonicalization
 */

export interface BinanceEndpoints {
  wsApi: string;
  wsStream: string;
  rest: string;
}

export const BINANCE_ENDPOINTS = {
  production: {
    wsApi: 'wss://ws-fapi.binance.com/ws-fapi/v1',
    wsStream: 'wss://fstream.binance.com/ws',
    rest: 'https://fapi.binance.com'
  },
  testnet: {
    wsApi: 'wss://testnet.binancefuture.com/ws-fapi/v1',
    wsStream: 'wss://stream.binancefuture.com/ws',
    rest: 'https://testnet.binancefuture.com'
  }
} as const;

// Module-level clock offset against Binance server (serverTime - localTime)
let serverTimeOffsetMs = 0;
let lastTimeSync = 0;

/**
 * Synchronize local time with Binance Futures server clock to avoid TIMESTAMP_AHEAD_OF_SERVER (-1021)
 */
export async function syncBinanceServerTime(restBaseUrl = BINANCE_ENDPOINTS.production.rest): Promise<number> {
  const now = Date.now();
  // Resync every 10 minutes or on initial call
  if (lastTimeSync > 0 && now - lastTimeSync < 600000) {
    return serverTimeOffsetMs;
  }

  try {
    const start = Date.now();
    const res = await fetch(`${restBaseUrl}/fapi/v1/time`);
    if (res.ok) {
      const data = await res.json();
      const end = Date.now();
      const roundTrip = Math.max(1, end - start);
      const serverTime = Number(data.serverTime);
      if (serverTime > 0) {
        // Estimate server time at response arrival
        const adjustedServerTime = serverTime + (roundTrip / 2);
        serverTimeOffsetMs = Math.round(adjustedServerTime - end);
        lastTimeSync = end;
        console.log(`[Binance-Crypto] Sincronización horaria con Binance completada. Offset: ${serverTimeOffsetMs}ms (RTT: ${roundTrip}ms)`);
      }
    }
  } catch (err) {
    console.warn('[Binance-Crypto] No se pudo sincronizar reloj con Binance server:', err);
  }

  return serverTimeOffsetMs;
}

/**
 * Returns current timestamp in UTC ms adjusted with Binance server offset
 */
export function getAdjustedTimestamp(): number {
  return Date.now() + serverTimeOffsetMs;
}

/**
 * Sorts parameters alphabetically and appends timestamp + recvWindow to form canonical query string
 */
export function buildCanonicalQuery(
  params: Record<string, string | number | boolean | undefined>,
  recvWindow: number = 5000
): { queryString: string; sortedParams: Record<string, any> } {
  const cleanParams: Record<string, string | number | boolean> = {};

  // Copy non-empty, defined parameters
  Object.keys(params).forEach(key => {
    const val = params[key];
    if (val !== undefined && val !== null && val !== '') {
      cleanParams[key] = val;
    }
  });

  // Attach timestamp and recvWindow
  if (!cleanParams.timestamp) {
    cleanParams.timestamp = getAdjustedTimestamp();
  }
  if (!cleanParams.recvWindow) {
    cleanParams.recvWindow = recvWindow;
  }

  // Sort keys alphabetically
  const sortedKeys = Object.keys(cleanParams).sort();
  const sortedParams: Record<string, any> = {};
  const queryParts: string[] = [];

  sortedKeys.forEach(key => {
    sortedParams[key] = cleanParams[key];
    queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(cleanParams[key]))}`);
  });

  return {
    queryString: queryParts.join('&'),
    sortedParams
  };
}

/**
 * Computes HMAC-SHA256 signature using browser native Web Crypto API (SubtleCrypto)
 */
export async function signHmacSha256(secret: string, message: string): Promise<string> {
  if (!secret || !message) return '';

  try {
    const enc = new TextEncoder();
    const keyData = enc.encode(secret);
    const msgData = enc.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.error('[Binance-Crypto] Error al generar firma HMAC-SHA256:', err);
    return '';
  }
}

/**
 * Formats canonical request with signature for REST or WebSocket API
 */
export async function createSignedPayload(
  apiKey: string,
  apiSecret: string,
  params: Record<string, any> = {},
  recvWindow: number = 5000
): Promise<{
  queryString: string;
  signature: string;
  signedQueryString: string;
  headers: Record<string, string>;
  sortedParams: Record<string, any>;
}> {
  const { queryString, sortedParams } = buildCanonicalQuery(params, recvWindow);
  const signature = await signHmacSha256(apiSecret, queryString);
  const signedQueryString = `${queryString}&signature=${signature}`;

  return {
    queryString,
    signature,
    signedQueryString,
    headers: {
      'X-MBX-APIKEY': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    sortedParams: {
      ...sortedParams,
      signature
    }
  };
}
