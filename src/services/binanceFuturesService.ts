import { 
  BinanceFuturesAccount, 
  BinanceFuturesPosition, 
  BinanceFuturesOrder, 
  BinanceFuturesConnectionStatus 
} from '../types/binanceFutures';
import { proxyService } from './proxyService';

export class BinanceFuturesService {
  private static getAuthHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // If proxyService has retrieved BINANCE_API and BINANCE_API_SECRET from Google Apps Script, pass them
    const proxyKey = proxyService.getBinanceApiKey();
    const proxySecret = proxyService.getBinanceApiSecret();

    if (proxyKey) {
      headers['x-binance-api-key'] = proxyKey;
    }
    if (proxySecret) {
      headers['x-binance-api-secret'] = proxySecret;
    }

    return headers;
  }

  /**
   * Helper to perform safe fetch that NEVER throws JSON parse errors on HTML responses
   */
  private static async safeFetchJson(url: string, options: RequestInit = {}): Promise<{ 
    ok: boolean; 
    status: number; 
    data?: any; 
    error?: string;
  }> {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Non-JSON response (e.g. <!DOCTYPE html>...)
        return {
          ok: false,
          status: res.status,
          error: `El servidor devolvió una respuesta no válida (HTTP ${res.status}).`
        };
      }

      if (!res.ok || (parsed && parsed.ok === false)) {
        return {
          ok: false,
          status: res.status,
          error: parsed?.error || parsed?.msg || `Error HTTP ${res.status} de Binance`
        };
      }

      return {
        ok: true,
        status: res.status,
        data: parsed.data !== undefined ? parsed.data : parsed
      };
    } catch (e: any) {
      return {
        ok: false,
        status: 0,
        error: e.message || 'Error de conexión con el backend'
      };
    }
  }

  /**
   * Check connection status with backend and Binance Futures
   */
  public static async checkStatus(): Promise<BinanceFuturesConnectionStatus> {
    const result = await this.safeFetchJson('/api/binance/status', {
      headers: this.getAuthHeaders()
    });

    if (result.ok && result.data) {
      return {
        configured: Boolean(result.data.configured),
        hasKey: Boolean(result.data.hasKey),
        hasSecret: Boolean(result.data.hasSecret),
        testnet: Boolean(result.data.testnet),
        connected: Boolean(result.data.connected),
        source: result.data.source || 'none',
        serverTime: result.data.serverTime,
        latencyMs: result.data.latencyMs,
        error: result.data.error
      };
    }

    return {
      configured: false,
      hasKey: false,
      hasSecret: false,
      testnet: false,
      connected: false,
      source: 'none',
      error: result.error || 'No se pudo conectar con el servidor backend'
    };
  }

  /**
   * Fetch Binance Futures Account Information
   */
  public static async getAccount(): Promise<{ ok: boolean; data?: BinanceFuturesAccount; error?: string }> {
    const result = await this.safeFetchJson('/api/binance/futures/account', {
      headers: this.getAuthHeaders()
    });

    if (!result.ok || !result.data) {
      return {
        ok: false,
        error: result.error || 'Error al obtener cuenta de Binance Futuros'
      };
    }

    const raw = result.data;
    const account: BinanceFuturesAccount = {
      totalWalletBalance: parseFloat(raw.totalWalletBalance || '0'),
      totalUnrealizedProfit: parseFloat(raw.totalUnrealizedProfit || '0'),
      totalMarginBalance: parseFloat(raw.totalMarginBalance || '0'),
      availableBalance: parseFloat(raw.availableBalance || '0'),
      totalInitialMargin: parseFloat(raw.totalInitialMargin || '0'),
      totalMaintMargin: parseFloat(raw.totalMaintMargin || '0'),
      marginRatio: parseFloat(raw.totalMarginBalance || '0') > 0
        ? (parseFloat(raw.totalMaintMargin || '0') / parseFloat(raw.totalMarginBalance || '1')) * 100
        : 0,
      assets: (raw.assets || [])
        .filter((a: any) => parseFloat(a.walletBalance || '0') > 0 || a.asset === 'USDT' || a.asset === 'USDC')
        .map((a: any) => ({
          asset: a.asset,
          walletBalance: parseFloat(a.walletBalance || '0'),
          unrealizedProfit: parseFloat(a.unrealizedProfit || '0'),
          marginBalance: parseFloat(a.marginBalance || '0'),
          availableBalance: parseFloat(a.availableBalance || '0'),
          crossWalletBalance: parseFloat(a.crossWalletBalance || '0')
        })),
      positions: (raw.positions || [])
        .filter((p: any) => parseFloat(p.positionAmt || '0') !== 0)
        .map((p: any) => {
          const amt = parseFloat(p.positionAmt);
          const mark = parseFloat(p.entryPrice) || 1;
          const lev = parseFloat(p.leverage) || 1;
          const notional = Math.abs(amt * mark);
          const pnl = parseFloat(p.unrealizedProfit || '0');
          const initialMargin = lev > 0 ? notional / lev : 0;
          return {
            symbol: p.symbol,
            positionAmt: amt,
            entryPrice: parseFloat(p.entryPrice || '0'),
            markPrice: mark,
            unRealizedProfit: pnl,
            liquidationPrice: 0,
            leverage: lev,
            marginType: (p.isolated ? 'isolated' : 'cross') as any,
            isolatedMargin: parseFloat(p.isolatedMargin || '0'),
            positionSide: p.positionSide || 'BOTH',
            notional,
            roe: initialMargin > 0 ? (pnl / initialMargin) * 100 : 0,
            side: amt > 0 ? 'LONG' : 'SHORT'
          };
        }),
      openPositionsCount: (raw.positions || []).filter((p: any) => parseFloat(p.positionAmt || '0') !== 0).length,
      canTrade: Boolean(raw.canTrade),
      canDeposit: Boolean(raw.canDeposit),
      canWithdraw: Boolean(raw.canWithdraw),
      feeTier: raw.feeTier || 0,
      updateTime: raw.updateTime || Date.now()
    };

    return { ok: true, data: account };
  }

  /**
   * Fetch Binance Futures Open Positions Risk
   */
  public static async getPositions(): Promise<{ ok: boolean; positions?: BinanceFuturesPosition[]; error?: string }> {
    const result = await this.safeFetchJson('/api/binance/futures/positions', {
      headers: this.getAuthHeaders()
    });

    if (!result.ok || !result.data) {
      return {
        ok: false,
        error: result.error || 'Error al obtener posiciones de Binance Futuros'
      };
    }

    const positions = Array.isArray(result.data.positions) 
      ? result.data.positions 
      : (Array.isArray(result.data) ? result.data : []);

    return { ok: true, positions };
  }

  /**
   * Fetch Binance Futures Open Orders
   */
  public static async getOrders(): Promise<{ ok: boolean; orders?: BinanceFuturesOrder[]; error?: string }> {
    const result = await this.safeFetchJson('/api/binance/futures/orders', {
      headers: this.getAuthHeaders()
    });

    if (!result.ok || !result.data) {
      return {
        ok: false,
        error: result.error || 'Error al obtener órdenes abiertas'
      };
    }

    const orders = Array.isArray(result.data.orders) 
      ? result.data.orders 
      : (Array.isArray(result.data) ? result.data : []);

    return { ok: true, orders };
  }

  /**
   * Demo sample data for preview or when credentials are not yet configured
   */
  public static getSampleData(): { account: BinanceFuturesAccount; positions: BinanceFuturesPosition[] } {
    const positions: BinanceFuturesPosition[] = [
      {
        symbol: 'BTCUSDT',
        positionAmt: 0.15,
        entryPrice: 63840.50,
        markPrice: 65120.00,
        unRealizedProfit: 191.93,
        liquidationPrice: 51200.00,
        leverage: 10,
        marginType: 'cross',
        isolatedMargin: 0,
        positionSide: 'BOTH',
        notional: 9768.00,
        roe: 19.65,
        side: 'LONG',
        breakEvenPrice: 63870.00,
        updateTime: Date.now() - 3600000
      },
      {
        symbol: 'ETHUSDT',
        positionAmt: 1.80,
        entryPrice: 2680.20,
        markPrice: 2642.50,
        unRealizedProfit: -67.86,
        liquidationPrice: 2210.00,
        leverage: 8,
        marginType: 'cross',
        isolatedMargin: 0,
        positionSide: 'BOTH',
        notional: 4756.50,
        roe: -11.41,
        side: 'LONG',
        breakEvenPrice: 2682.00,
        updateTime: Date.now() - 7200000
      },
      {
        symbol: 'SOLUSDT',
        positionAmt: -25.00,
        entryPrice: 154.20,
        markPrice: 150.80,
        unRealizedProfit: 85.00,
        liquidationPrice: 178.50,
        leverage: 6,
        marginType: 'isolated',
        isolatedMargin: 642.50,
        positionSide: 'BOTH',
        notional: 3770.00,
        roe: 13.23,
        side: 'SHORT',
        breakEvenPrice: 154.00,
        updateTime: Date.now() - 1800000
      }
    ];

    const totalUnrealized = positions.reduce((acc, p) => acc + p.unRealizedProfit, 0);

    const account: BinanceFuturesAccount = {
      totalWalletBalance: 5240.85,
      totalUnrealizedProfit: totalUnrealized,
      totalMarginBalance: 5240.85 + totalUnrealized,
      availableBalance: 3260.40,
      totalInitialMargin: 1980.45,
      totalMaintMargin: 185.20,
      marginRatio: (185.20 / (5240.85 + totalUnrealized)) * 100,
      assets: [
        {
          asset: 'USDT',
          walletBalance: 4890.50,
          unrealizedProfit: totalUnrealized,
          marginBalance: 4890.50 + totalUnrealized,
          availableBalance: 2910.05,
          crossWalletBalance: 4890.50
        },
        {
          asset: 'BNB',
          walletBalance: 0.58,
          unrealizedProfit: 0,
          marginBalance: 350.35,
          availableBalance: 350.35,
          crossWalletBalance: 350.35
        }
      ],
      positions,
      openPositionsCount: positions.length,
      canTrade: true,
      canDeposit: true,
      canWithdraw: true,
      feeTier: 0,
      updateTime: Date.now()
    };

    return { account, positions };
  }

  /**
   * Place an order with mandatory ISOLATED margin and max 5x leverage risk enforcement
   */
  public static async placeOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type?: 'LIMIT' | 'MARKET' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET';
    quantity: number | string;
    price?: number | string;
    stopPrice?: number | string;
    reduceOnly?: boolean;
    leverage?: number;
  }): Promise<{ ok: boolean; data?: any; error?: string }> {
    const headers = this.getAuthHeaders();
    const result = await this.safeFetchJson('/api/binance/futures/order', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...params,
        leverage: Math.min(5, Math.max(1, params.leverage || 5))
      })
    });

    if (!result.ok) {
      return { ok: false, error: result.error || 'Error enviando orden a Binance Futuros' };
    }

    return { ok: true, data: result.data };
  }

  /**
   * Cancel an open order on Binance Futures
   */
  public static async cancelOrder(symbol: string, orderId: string | number): Promise<{ ok: boolean; data?: any; error?: string }> {
    const headers = this.getAuthHeaders();
    const result = await this.safeFetchJson(`/api/binance/futures/order?symbol=${encodeURIComponent(symbol)}&orderId=${encodeURIComponent(orderId)}`, {
      method: 'DELETE',
      headers
    });

    if (!result.ok) {
      return { ok: false, error: result.error || 'Error cancelando orden en Binance' };
    }

    return { ok: true, data: result.data };
  }
}

