import { MarketRegime } from '@aegis/audit-engine';
import { Candle, calculateATR, calculateEMA, calculateRealizedVolatility } from './indicators.js';

export interface RegimeAnalysisResult {
  regime: MarketRegime;
  volatilityAtr: number;
  realizedVolPct: number;
  trendStrengthScore: number; // -100 to +100
  shortEma: number;
  longEma: number;
}

export class MarketRegimeClassifier {
  /**
   * Evaluates price action to classify market regime
   */
  public static classify(candles: Candle[]): RegimeAnalysisResult {
    if (candles.length < 20) {
      return {
        regime: 'SIDEWAYS_CHOP',
        volatilityAtr: 1.0,
        realizedVolPct: 0.20,
        trendStrengthScore: 0,
        shortEma: candles[candles.length - 1]?.close || 100,
        longEma: candles[candles.length - 1]?.close || 100
      };
    }

    const closes = candles.map(c => c.close);
    const shortEma = calculateEMA(closes, 9);
    const longEma = calculateEMA(closes, 21);
    const volatilityAtr = calculateATR(candles, 14);
    const realizedVolPct = calculateRealizedVolatility(closes, 20);

    const currentClose = closes[closes.length - 1];
    const pctDiff = ((shortEma - longEma) / longEma) * 100;
    const trendStrengthScore = Math.max(-100, Math.min(100, pctDiff * 20));

    let regime: MarketRegime = 'SIDEWAYS_CHOP';

    // High volatility panic / sudden sharp drop
    if (realizedVolPct > 0.65 || (currentClose < longEma && pctDiff < -2.0)) {
      regime = 'HIGH_VOLATILITY_BEAR';
    } else if (currentClose > shortEma && shortEma > longEma && pctDiff > 0.5) {
      regime = 'BULL_TREND';
    } else {
      regime = 'SIDEWAYS_CHOP';
    }

    return {
      regime,
      volatilityAtr,
      realizedVolPct,
      trendStrengthScore,
      shortEma,
      longEma
    };
  }
}
