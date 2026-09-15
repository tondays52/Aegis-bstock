import { CouncilReasoning, MacroRegimeState, DecisionRegimeContext } from '@aegis/audit-engine';
import { RegimeAnalysisResult } from '../quant/regime.js';

export interface AnalystInput {
  symbol: string;
  headlines: string[];
  earningsSentiment?: number; // -1 to 1
  macroIndicators?: {
    cpiSurprise?: number;
    interestRateOutlook?: 'HAWKISH' | 'NEUTRAL' | 'DOVISH';
  };
}

export interface MacroRegimeInput {
  symbol?: string;
  regimeAnalysis: RegimeAnalysisResult;
  currentPrice: number;
  chainStatus?: {
    isRpcHealthy?: boolean;
    gasPriceGwei?: number;
    latencyMs?: number;
  };
}

export interface MacroRegimeEvaluation extends DecisionRegimeContext {
  portfolioExposureCeilingPct: number;
  volatilityAtr: number;
  chainHealth: 'OPTIMAL' | 'CONGESTED' | 'DEGRADED';
}

export class MacroSentimentAnalystAgent {
  /**
   * Idea 1: Regime-Adaptive Meta-Controller.
   * Evaluates macro market regime, volatility, ATR, and chain health to dynamically calibrate exposure ceilings.
   */
  public evaluateMacroRegime(input: MacroRegimeInput): MacroRegimeEvaluation {
    const { regimeAnalysis, currentPrice, chainStatus } = input;
    const { regime, volatilityAtr, realizedVolPct, trendStrengthScore } = regimeAnalysis;

    const isRpcDegraded = chainStatus?.isRpcHealthy === false || (chainStatus?.latencyMs && chainStatus.latencyMs > 2000);
    const isGasCongested = chainStatus?.gasPriceGwei !== undefined && chainStatus.gasPriceGwei > 15;
    const chainHealth: 'OPTIMAL' | 'CONGESTED' | 'DEGRADED' = isRpcDegraded
      ? 'DEGRADED'
      : isGasCongested
      ? 'CONGESTED'
      : 'OPTIMAL';

    const atrRatio = currentPrice > 0 ? volatilityAtr / currentPrice : 0;

    // Extreme Volatility / Bear Trend / Chain Breakdown -> CAPITAL_PRESERVATION (10-20% exposure)
    if (regime === 'HIGH_VOLATILITY_BEAR' || realizedVolPct > 0.45 || atrRatio > 0.04 || isRpcDegraded) {
      const rationale = isRpcDegraded
        ? 'Chain RPC latency or degraded node status detected. Failsafe Capital Preservation active (max 15% exposure).'
        : `Extreme tail risk (Realized Vol ${(realizedVolPct * 100).toFixed(1)}%, ATR ${(atrRatio * 100).toFixed(2)}%). Capital Preservation active (max 15% exposure).`;
      
      return {
        state: 'CAPITAL_PRESERVATION',
        maxAllowedExposurePct: 15,
        portfolioExposureCeilingPct: 15,
        rationale,
        volatilityAtr,
        chainHealth
      };
    }

    // Chop / High Volatility / Congestion -> CHOP_HIGH_VOL (30-40% exposure)
    if (regime === 'SIDEWAYS_CHOP' || realizedVolPct > 0.25 || atrRatio > 0.02 || isGasCongested) {
      return {
        state: 'CHOP_HIGH_VOL',
        maxAllowedExposurePct: 35,
        portfolioExposureCeilingPct: 35,
        rationale: `Sideways chop / elevated noise (Vol ${(realizedVolPct * 100).toFixed(1)}%). Sizing capped at 35% with tighter bounds.`,
        volatilityAtr,
        chainHealth
      };
    }

    // Confirmed Bull Trend -> BULL_TREND (up to 70-80% exposure)
    const exposureCeiling = Math.min(80, Math.max(70, Math.round(65 + (trendStrengthScore / 10))));
    return {
      state: 'BULL_TREND',
      maxAllowedExposurePct: exposureCeiling,
      portfolioExposureCeilingPct: exposureCeiling,
      rationale: `Confirmed trending structure (Score ${trendStrengthScore}/100, Vol ${(realizedVolPct * 100).toFixed(1)}%). High-capacity bull trend up to ${exposureCeiling}% exposure.`,
      volatilityAtr,
      chainHealth
    };
  }

  /**
   * Evaluates fundamental, corporate news, and macroeconomic context for a bStock
   */
  public async analyze(input: AnalystInput): Promise<CouncilReasoning['analystThesis']> {
    const { symbol, headlines, earningsSentiment = 0, macroIndicators } = input;

    let sentimentSum = earningsSentiment * 1.5;
    let positiveKeywords = ['beat', 'surge', 'growth', 'record', 'upgrade', 'bullish', 'outperform', 'profit', 'expansion'];
    let negativeKeywords = ['miss', 'plunge', 'probe', 'lawsuit', 'downgrade', 'bearish', 'cut', 'loss', 'warning', 'tariffs'];

    for (const headline of headlines) {
      const lower = headline.toLowerCase();
      for (const kw of positiveKeywords) {
        if (lower.includes(kw)) sentimentSum += 0.3;
      }
      for (const kw of negativeKeywords) {
        if (lower.includes(kw)) sentimentSum -= 0.4;
      }
    }

    if (macroIndicators?.interestRateOutlook === 'DOVISH') {
      sentimentSum += 0.2;
    } else if (macroIndicators?.interestRateOutlook === 'HAWKISH') {
      sentimentSum -= 0.3;
    }

    const sentimentScore = Math.max(-1.0, Math.min(1.0, sentimentSum / Math.max(1, headlines.length)));

    let macroOutlook: 'FAVORABLE' | 'NEUTRAL' | 'RISK_OFF' = 'NEUTRAL';
    if (sentimentScore > 0.25) {
      macroOutlook = 'FAVORABLE';
    } else if (sentimentScore < -0.2) {
      macroOutlook = 'RISK_OFF';
    }

    const catalystSummary = headlines.length > 0
      ? `${headlines[0]} (Analyzed ${headlines.length} live feeds; sentiment score ${sentimentScore.toFixed(2)})`
      : `Neutral baseline market news digest for ${symbol}`;

    return {
      catalystSummary,
      sentimentScore,
      macroOutlook
    };
  }
}
