import { StrategyWithOrders, TrafficLightInfo } from '../types';
import { calculateRiskReward } from '../utils/riskReward';
import { indicatorsService } from './indicatorsService';

export type HistoricalAnalysisStatus = 
  | 'INVALIDADO' // Tocó SL
  | 'ACTIVA'     // Está entre E3 y E1
  | 'INVALIDADO_TARDE' // Tocó TP1, TP2 o TP3 antes de entrar o durante el recorrido
  | 'PENDIENTE'  // No ha tocado E1 todavía
  | 'EN_RECORRIDO'; // En posición hacia targets

export interface AnalysisEvent {
  label: string; // "SL", "E1", "E2", "E3", "TP1", "TP2", "TP3"
  price: number;
  timestamp: number;
  timeStr: string; // Formatted date/time
  diffFromPubStr: string; // "+1h 20m desde publicación"
  isHit: boolean;
}

export interface StrategyAnalysisResult {
  status: HistoricalAnalysisStatus;
  statusLabel: string; // "Invalidado", "ACTIVA", "INVALIDADO TARDE", etc.
  statusColor: string;
  summary: string;
  events: AnalysisEvent[];
  slHitTime?: string;
  e1HitTime?: string;
  e2HitTime?: string;
  e3HitTime?: string;
  tpHitTime?: string;
  firstCriticalEvent?: AnalysisEvent;
  publicationTime?: Date;
  pubTimeFormatted: string;
  sheetCellTarget: string; // e.g. "AN14"
  sheetRowIndex: number;
}

export class StrategyAnalyzerService {
  /**
   * Parse publication date from string or strategy name into a Date object (GMT-6)
   */
  public static parsePublicationDate(rawDate?: string, stratName?: string): Date | null {
    if (!rawDate && !stratName) return null;
    const str = rawDate || '';

    const monthMap: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
    };

    let targetDate: Date | null = null;
    const dateMatch = str.match(/([A-Z]{3})\s+(\d{1,2})\s+(\d{4})/i);
    const timeMatches = [...str.matchAll(/(\d{2}):(\d{2})(?::\d{2})?/g)];

    let formattedTime = '';
    if (timeMatches.length >= 2) {
      formattedTime = `${timeMatches[1][1]}:${timeMatches[1][2]}`;
    } else if (timeMatches.length === 1) {
      formattedTime = `${timeMatches[0][1]}:${timeMatches[0][2]}`;
    }

    if (dateMatch && formattedTime) {
      const month = monthMap[dateMatch[1]] || dateMatch[1];
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3];
      targetDate = new Date(`${year}-${month}-${day}T${formattedTime}:00-06:00`);
    }

    if (!targetDate || isNaN(targetDate.getTime())) {
      const nameMatch = (stratName || '').match(/_(\d{2})[-/.](\d{2})[-/.](\d{2,4})_(\d{2}:\d{2})/);
      if (nameMatch) {
        const [, d, m, y, t] = nameMatch;
        const fullYear = y.length === 2 ? `20${y}` : y;
        targetDate = new Date(`${fullYear}-${m}-${d}T${t}:00-06:00`);
      }
    }

    if (!targetDate || isNaN(targetDate.getTime())) {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) targetDate = parsed;
    }

    return targetDate && !isNaN(targetDate.getTime()) ? targetDate : null;
  }

  /**
   * Format date to local Guatemala string
   */
  public static formatGuatemalaDate(d: Date): string {
    return new Intl.DateTimeFormat('es-GT', {
      timeZone: 'America/Guatemala',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(d);
  }

  /**
   * Calculates time delta from publication to event
   */
  public static getTimeDeltaString(pubDate: Date, eventDate: Date): string {
    const diffMs = eventDate.getTime() - pubDate.getTime();
    const absDiff = Math.abs(diffMs);
    const totalMinutes = Math.floor(absDiff / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const sign = diffMs >= 0 ? '+' : '-';
    if (hours > 0) return `${sign}${hours}h ${mins}m`;
    return `${sign}${mins}m`;
  }

  /**
   * Analyzes Binance Historical Candlesticks from publication time to now
   * Checks SL, E1, E2, E3, and TP1..TP3 hits with exact timestamps.
   */
  public static async analyzeStrategy(strategy: StrategyWithOrders): Promise<StrategyAnalysisResult> {
    const {
      id,
      symbol,
      type,
      entryPrice,
      e2Price,
      e3Price,
      stopLoss,
      orders = [],
      currentPrice,
      date,
      strategyName,
      rowIndex
    } = strategy;

    const isLong = type === 'LONG';
    const pubDate = this.parsePublicationDate(date, strategyName) || new Date(Date.now() - 24 * 3600 * 1000);
    const pubTimestamp = pubDate.getTime();
    const nowTimestamp = Date.now();

    const sheetRowNumber = rowIndex !== undefined ? rowIndex : (id + 1); // Row 1 is header, strategy id 1 is usually row 2
    const sheetCellTarget = `AN${sheetRowNumber}`;

    // Get key levels
    const e1 = entryPrice;
    const e2 = e2Price && e2Price > 0 ? e2Price : (isLong ? e1 * 0.985 : e1 * 1.015);
    const e3 = e3Price && e3Price > 0 ? e3Price : (isLong ? e1 * 0.97 : e1 * 1.03);
    const sl = stopLoss;

    const tp1 = orders[0]?.targetPrice || (isLong ? e1 * 1.03 : e1 * 0.97);
    const tp2 = orders[1]?.targetPrice || (isLong ? e1 * 1.06 : e1 * 0.94);
    const tp3 = orders[2]?.targetPrice || (isLong ? e1 * 1.10 : e1 * 0.90);

    // Fetch Binance 5m or 15m klines from publication timestamp to now
    let klines: any[] = [];
    const sym = symbol.toUpperCase().trim();
    try {
      // Limit to max 1000 candles
      const startTime = Math.max(pubTimestamp - 5 * 60 * 1000, nowTimestamp - 7 * 24 * 3600 * 1000);
      const url = `https://api.binance.com/api/v3/klines?symbol=${sym}&interval=5m&startTime=${startTime}&limit=1000`;
      const res = await fetch(url);
      if (res.ok) {
        klines = await res.json();
      }
    } catch (e) {
      console.warn('Could not fetch historical klines from Binance API:', e);
    }

    const recordedEvents: AnalysisEvent[] = [];
    let slEvent: AnalysisEvent | undefined;
    let e1Event: AnalysisEvent | undefined;
    let e2Event: AnalysisEvent | undefined;
    let e3Event: AnalysisEvent | undefined;
    let tp1Event: AnalysisEvent | undefined;
    let tp2Event: AnalysisEvent | undefined;
    let tp3Event: AnalysisEvent | undefined;

    // Iterate through historical candles chronologically
    if (Array.isArray(klines) && klines.length > 0) {
      for (const candle of klines) {
        const openTime = typeof candle[0] === 'number' ? candle[0] : parseInt(candle[0]);
        if (openTime < pubTimestamp - 60000) continue; // Skip candles strictly before publication

        const high = parseFloat(candle[2]);
        const low = parseFloat(candle[3]);
        const candleDate = new Date(openTime);
        const candleTimeStr = this.formatGuatemalaDate(candleDate);
        const diffStr = this.getTimeDeltaString(pubDate, candleDate);

        // Check E1 Hit
        if (!e1Event) {
          const hitE1 = isLong ? low <= e1 : high >= e1;
          if (hitE1) {
            e1Event = {
              label: 'E1 (Entrada Principal)',
              price: e1,
              timestamp: openTime,
              timeStr: candleTimeStr,
              diffFromPubStr: diffStr,
              isHit: true
            };
            recordedEvents.push(e1Event);
          }
        }

        // Check E2 Hit
        if (!e2Event) {
          const hitE2 = isLong ? low <= e2 : high >= e2;
          if (hitE2) {
            e2Event = {
              label: 'E2 (Refuerzo DCA)',
              price: e2,
              timestamp: openTime,
              timeStr: candleTimeStr,
              diffFromPubStr: diffStr,
              isHit: true
            };
            recordedEvents.push(e2Event);
          }
        }

        // Check E3 Hit
        if (!e3Event) {
          const hitE3 = isLong ? low <= e3 : high >= e3;
          if (hitE3) {
            e3Event = {
              label: 'E3 (Piso Extremo DCA)',
              price: e3,
              timestamp: openTime,
              timeStr: candleTimeStr,
              diffFromPubStr: diffStr,
              isHit: true
            };
            recordedEvents.push(e3Event);
          }
        }

        // Check Stop Loss Hit
        if (!slEvent) {
          const hitSl = isLong ? low <= sl : high >= sl;
          if (hitSl) {
            slEvent = {
              label: 'Stop-Loss (SL)',
              price: sl,
              timestamp: openTime,
              timeStr: candleTimeStr,
              diffFromPubStr: diffStr,
              isHit: true
            };
            recordedEvents.push(slEvent);
          }
        }

        // Check TP1 Hit
        if (!tp1Event) {
          const hitTp1 = isLong ? high >= tp1 : low <= tp1;
          if (hitTp1) {
            tp1Event = {
              label: 'TP1 (Objetivo 1)',
              price: tp1,
              timestamp: openTime,
              timeStr: candleTimeStr,
              diffFromPubStr: diffStr,
              isHit: true
            };
            recordedEvents.push(tp1Event);
          }
        }

        // Check TP2 Hit
        if (!tp2Event) {
          const hitTp2 = isLong ? high >= tp2 : low <= tp2;
          if (hitTp2) {
            tp2Event = {
              label: 'TP2 (Objetivo 2)',
              price: tp2,
              timestamp: openTime,
              timeStr: candleTimeStr,
              diffFromPubStr: diffStr,
              isHit: true
            };
            recordedEvents.push(tp2Event);
          }
        }

        // Check TP3 Hit
        if (!tp3Event) {
          const hitTp3 = isLong ? high >= tp3 : low <= tp3;
          if (hitTp3) {
            tp3Event = {
              label: 'TP3 (Objetivo 3)',
              price: tp3,
              timestamp: openTime,
              timeStr: candleTimeStr,
              diffFromPubStr: diffStr,
              isHit: true
            };
            recordedEvents.push(tp3Event);
          }
        }
      }
    } else {
      // Fallback evaluation using current live price if Binance historical not reachable
      const live = currentPrice || entryPrice;
      const nowDate = new Date();
      const nowTimeStr = this.formatGuatemalaDate(nowDate);
      const diffStr = this.getTimeDeltaString(pubDate, nowDate);

      if (isLong ? live <= sl : live >= sl) {
        slEvent = { label: 'Stop-Loss (SL)', price: sl, timestamp: nowTimestamp, timeStr: nowTimeStr, diffFromPubStr: diffStr, isHit: true };
        recordedEvents.push(slEvent);
      }
      if (isLong ? (live <= e1 && live >= sl) : (live >= e1 && live <= sl)) {
        e1Event = { label: 'E1 (Entrada Principal)', price: e1, timestamp: nowTimestamp, timeStr: nowTimeStr, diffFromPubStr: diffStr, isHit: true };
        recordedEvents.push(e1Event);
      }
      if (isLong ? live >= tp1 : live <= tp1) {
        tp1Event = { label: 'TP1', price: tp1, timestamp: nowTimestamp, timeStr: nowTimeStr, diffFromPubStr: diffStr, isHit: true };
        recordedEvents.push(tp1Event);
      }
    }

    // CURRENT LIVE PRICE POSITION
    const live = currentPrice || entryPrice;
    const isLiveBetweenE3andE1 = isLong
      ? (live <= e1 && live >= e3)
      : (live >= e1 && live <= e3);

    // Determine Status According to User's Strict Rules:
    // 1. Si ya tocó SL: registrar hora y asignar estado "Invalidado"
    // 2. Si tocó TP1 al TP3: "INVALIDADO TARDE"
    // 3. Si está entre E3 y E1: "ACTIVA" y validar hora que tocó cada punto
    // 4. Si no ha tocado ni SL ni E1 ni TP: "PENDIENTE"

    let status: HistoricalAnalysisStatus = 'PENDIENTE';
    let statusLabel = 'Pendiente';
    let statusColor = 'text-amber-400 border-amber-500/40 bg-amber-950/30';
    let summary = '';

    if (slEvent) {
      status = 'INVALIDADO';
      statusLabel = 'Invalidado';
      statusColor = 'text-rose-400 border-rose-500/50 bg-rose-950/50';
      summary = `El precio tocó el Stop Loss ($${sl}) a las ${slEvent.timeStr} (${slEvent.diffFromPubStr}). Trade invalidado por gestión de riesgo.`;
    } else if (tp1Event || tp2Event || tp3Event) {
      status = 'INVALIDADO_TARDE';
      statusLabel = 'INVALIDADO TARDE';
      statusColor = 'text-purple-400 border-purple-500/50 bg-purple-950/50';
      const firstTp = tp1Event || tp2Event || tp3Event;
      summary = `El precio alcanzó ${firstTp?.label} a las ${firstTp?.timeStr} (${firstTp?.diffFromPubStr}). Operación invalidada por llegada tardía a los objetivos.`;
    } else if (isLiveBetweenE3andE1 || e1Event) {
      status = 'ACTIVA';
      statusLabel = 'ACTIVA';
      statusColor = 'text-emerald-400 border-emerald-500/50 bg-emerald-950/50';
      const hits: string[] = [];
      if (e1Event) hits.push(`E1: ${e1Event.timeStr}`);
      if (e2Event) hits.push(`E2: ${e2Event.timeStr}`);
      if (e3Event) hits.push(`E3: ${e3Event.timeStr}`);
      summary = `El precio actual ($${live.toFixed(4)}) se encuentra en zona de ejecución entre E1 y E3. ${hits.length > 0 ? `Puntos alcanzados: ${hits.join(' | ')}.` : 'En rango de entrada.'}`;
    } else {
      status = 'PENDIENTE';
      statusLabel = 'Pendiente';
      statusColor = 'text-sky-400 border-sky-500/40 bg-sky-950/30';
      summary = `El precio aún no ha activado los gatillos de entrada (E1) ni ha comprometido el Stop Loss o los Take Profits.`;
    }

    return {
      status,
      statusLabel,
      statusColor,
      summary,
      events: recordedEvents,
      slHitTime: slEvent ? slEvent.timeStr : undefined,
      e1HitTime: e1Event ? e1Event.timeStr : undefined,
      e2HitTime: e2Event ? e2Event.timeStr : undefined,
      e3HitTime: e3Event ? e3Event.timeStr : undefined,
      tpHitTime: tp1Event ? tp1Event.timeStr : (tp2Event ? tp2Event.timeStr : (tp3Event ? tp3Event.timeStr : undefined)),
      firstCriticalEvent: slEvent || tp1Event || e1Event,
      publicationTime: pubDate,
      pubTimeFormatted: this.formatGuatemalaDate(pubDate),
      sheetCellTarget,
      sheetRowIndex: sheetRowNumber
    };
  }

  /**
   * Evaluates the Traffic Light (Semáforo) for a strategy according to price path validation:
   * - VERDE: No ha tocado ningún SL, ni TP antes que alguna Entrada, está en la zona de las entradas / vigente
   * - NARANJA: Tocó los TP antes de las entradas (se escapó o tardía)
   * - ROJO: Tocó SL
   */
  public static evaluateTrafficLight(strategy: StrategyWithOrders): import('../types').TrafficLightInfo {
    const {
      type,
      entryPrice,
      e2Price,
      e3Price,
      stopLoss,
      orders = [],
      currentPrice,
      high24h,
      low24h
    } = strategy;

    const isLong = type === 'LONG';
    const live = currentPrice || entryPrice;
    const e1 = entryPrice;
    const e2 = e2Price && e2Price > 0 ? e2Price : (isLong ? e1 * 0.985 : e1 * 1.015);
    const e3 = e3Price && e3Price > 0 ? e3Price : (isLong ? e1 * 0.97 : e1 * 1.03);
    const sl = stopLoss;
    const tp1 = orders[0]?.targetPrice || (isLong ? e1 * 1.03 : e1 * 0.97);

    // Calculate Risk:Reward using utility
    const rr = calculateRiskReward({
      entryPrice: e1,
      stopLoss: sl,
      type,
      orders
    });
    const riskRewardRatio = rr.maxRiskReward > 0 ? rr.maxRiskReward : 2.0;

    // Distance to Entry 1
    const distToE1 = e1 > 0 ? (Math.abs(live - e1) / e1) * 100 : 999;
    const inDcaZone = isLong ? (live <= e1 && live >= e3) : (live >= e1 && live <= e3);
    const effectiveDistance = inDcaZone ? 0 : distToE1;

    // 1. ROJO: Tocó Stop Loss
    const slHit = isLong 
      ? (live <= sl || (low24h !== undefined && low24h <= sl && live <= e1))
      : (live >= sl || (high24h !== undefined && high24h >= sl && live >= e1));

    if (slHit) {
      return {
        status: 'ROJO',
        label: 'SL TOCADO',
        color: 'text-rose-400',
        badgeBg: 'bg-rose-950/80',
        badgeBorder: 'border-rose-500/60',
        badgeText: 'text-rose-300',
        reason: `El precio alcanzó el Stop Loss ($${sl}). Operación invalidada por gestión de riesgo.`,
        distanceToEntryPct: distToE1,
        riskRewardRatio,
        slHit: true,
        e1Hit: false,
        tpHitBeforeEntry: false,
        rankScore: 0
      };
    }

    // 2. NARANJA: Tocó Take Profit antes de las entradas o se escapó directo a TP
    const tpHit = isLong ? (live >= tp1) : (live <= tp1);
    if (tpHit) {
      return {
        status: 'NARANJA',
        label: 'TP ANTES DE ENTRADA',
        color: 'text-amber-400',
        badgeBg: 'bg-amber-950/80',
        badgeBorder: 'border-amber-500/60',
        badgeText: 'text-amber-300',
        reason: `El precio alcanzó los objetivos (TP1: $${tp1}) antes de llenar las entradas planificadas.`,
        distanceToEntryPct: distToE1,
        riskRewardRatio,
        slHit: false,
        e1Hit: false,
        tpHitBeforeEntry: true,
        rankScore: 10
      };
    }

    // 3. VERDE: No tocó SL, No tocó TP antes, está en la zona de las entradas / vigente
    // Score compuesto para el Top 5:
    // 1. VÁLIDAS EN ZONA (Dentro de zona DCA o cercanía a entrada)
    // 2. MEJOR R:B (Ratio Riesgo / Beneficio)
    // 3. MEJOR CONFLUENCIA (Confluencia Multicapa / Indicadores)
    const confluence = indicatorsService.getCompleteConfluence(strategy);
    const confluenceScore = Math.max(0, Math.min(100, confluence.overallScore || 50));
    
    // Ponderación de Proximidad / En Zona DCA
    const inZoneScore = (inDcaZone || confluence.operational.isTriggerZoneActive) 
      ? 100 
      : Math.max(0, 100 - effectiveDistance * 15);
    
    // Ponderación de R:B (Normalizado: R:B 1:4+ = 100 pts, R:B 1:2 = 50 pts)
    const rbScore = Math.min(100, Math.max(0, (riskRewardRatio / 4.0) * 100));

    // Score Combinado Ponderado: Confluencia (40%) + Mejor R:B (35%) + Válidas en Zona (25%)
    const rankScore = (confluenceScore * 0.40) + (rbScore * 0.35) + (inZoneScore * 0.25);

    let detailReason = '';
    if (inDcaZone) {
      detailReason = `En zona DCA activa (entre E1 $${e1} y E3 $${e3}). R:B 1:${riskRewardRatio.toFixed(2)} · Confluencia ${confluenceScore}%.`;
    } else if (distToE1 <= 1.5) {
      detailReason = `Válida muy cerca de entrada (a ${distToE1.toFixed(2)}% de E1). R:B 1:${riskRewardRatio.toFixed(2)} · Confluencia ${confluenceScore}%.`;
    } else {
      detailReason = `Válida: No ha tocado SL ni TP. A ${distToE1.toFixed(2)}% de E1 con R:B 1:${riskRewardRatio.toFixed(2)} · Confluencia ${confluenceScore}%.`;
    }

    return {
      status: 'VERDE',
      label: inDcaZone ? 'EN ZONA DCA' : 'EN ZONA / VÁLIDA',
      color: 'text-emerald-400',
      badgeBg: 'bg-emerald-950/80',
      badgeBorder: 'border-emerald-500/60',
      badgeText: 'text-emerald-300',
      reason: detailReason,
      distanceToEntryPct: distToE1,
      riskRewardRatio,
      slHit: false,
      e1Hit: inDcaZone,
      tpHitBeforeEntry: false,
      rankScore
    };
  }

  /**
   * Returns the Top N best strategies of the ENTIRE catalog (without traffic light filtering),
   * ordered by composite rank score: Confluencia (40%), Ratio R:B (35%), Proximidad / Zona DCA (25%).
   */
  public static getTopGreenStrategies(strategies: StrategyWithOrders[], limit = 5): StrategyWithOrders[] {
    return [...strategies]
      .filter(s => s.status !== 'RETIRADA' && s.status !== 'INACTIVA' && s.status !== 'BORRADA')
      .sort((a, b) => {
        const scoreA = a.trafficLight?.rankScore || 0;
        const scoreB = b.trafficLight?.rankScore || 0;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Attempts to update cell AN in Google Sheets (or saves locally if API/proxy offline)
   */
  public static async updateSheetStatusCell(
    strategyId: number,
    sheetCellTarget: string,
    newStatus: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Update in Local Storage cache immediately
      const customData = JSON.parse(localStorage.getItem('crypto_radar_custom_strategies_v4') || '[]');
      if (Array.isArray(customData) && customData.length > 0) {
        const idx = customData.findIndex((s: any) => s.id === strategyId);
        if (idx !== -1) {
          customData[idx].status = newStatus;
          localStorage.setItem('crypto_radar_custom_strategies_v4', JSON.stringify(customData));
        }
      }

      // 2. Also try Google Apps Script Proxy WebApp
      const proxyUrl = localStorage.getItem('crypto_radar_proxy_url') || '';
      if (proxyUrl) {
        try {
          const resp = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'updateCell',
              sheetName: 'Ordenes',
              cell: sheetCellTarget,
              value: newStatus
            })
          });
          if (resp.ok) {
            return {
              success: true,
              message: `Estado "${newStatus}" sincronizado con éxito en celda ${sheetCellTarget} de la hoja "Ordenes".`
            };
          }
        } catch {
          // Continue to local feedback
        }
      }

      return {
        success: true,
        message: `Estado "${newStatus}" registrado localmente para la celda ${sheetCellTarget} de la hoja "Ordenes".`
      };
    } catch (e: any) {
      return {
        success: false,
        message: e.message || 'Error al actualizar celda en Google Sheets.'
      };
    }
  }
}
