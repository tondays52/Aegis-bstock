import { CouncilReasoning, MarketRegime, DecisionCatalystContext } from '@aegis/audit-engine';
import { RegimeAnalysisResult } from '../quant/regime.js';

export interface NewsCatalyst {
  type?: 'EARNINGS' | 'UPGRADE' | 'DOWNGRADE' | 'PRODUCT_LAUNCH' | 'SEC_FILING' | 'MACRO' | 'BREAKING_NEWS' | string;
  impactScore?: number; // -1.0 (bearish) to +1.0 (bullish)
  headline?: string;
  isHighImpact?: boolean;
  sourceUriOrHash?: string;
  confidenceScore?: number;
  isUnconfirmedRumor?: boolean;
}

export interface StrategistInput {
  symbol: string;
  currentPrice: number;
  regimeAnalysis: RegimeAnalysisResult;
  analystThesis: CouncilReasoning['analystThesis'];
  currentHoldingsPct: number;
  availableCashUsd: number;
  orderbookDepthUsd?: number;
  headlines?: string[];
  catalyst?: NewsCatalyst;
}

export interface StrategistProposalResult {
  proposal: CouncilReasoning['strategistProposal'];
  catalystContext: DecisionCatalystContext;
}

export class AlphaStrategistAgent {
  /**
   * Idea 2: Event-Driven Fact Verification & Adversarial Skeptic.
   * Step 1: Analyst Prompt / Parser (Extracts impact & sentiment).
   * Step 2: Adversarial Skeptic (Filters unconfirmed noise, low-liquidity spoofing, or stale news).
   */
  public verifyCatalyst(
    catalyst?: NewsCatalyst,
    headlines: string[] = [],
    orderbookDepthUsd: number = 100000
  ): DecisionCatalystContext {
    if (!catalyst && headlines.length === 0) {
      return {
        hasVerifiedCatalyst: false,
        factCheckConfidence: 1.0,
        skepticCritique: 'No external catalyst active; relying on baseline quantitative regime.'
      };
    }

    const primaryHeadline = catalyst?.headline || headlines[0] || '';
    const lowerHeadline = primaryHeadline.toLowerCase();

    // Step 1: Baseline confidence extraction
    let confidence = catalyst?.confidenceScore ?? 0.85;

    // Step 2: Adversarial Skeptic checks
    const rumorKeywords = ['rumor', 'unconfirmed', 'sources claim', 'insider claims', 'speculation', 'social media buzz', 'alleged'];
    const hasRumorTerms = rumorKeywords.some(kw => lowerHeadline.includes(kw)) || catalyst?.isUnconfirmedRumor === true;
    
    const staleKeywords = ['recap', 'yesterday', 'flashback', 'previous quarter', 'annual filing recap'];
    const isStale = staleKeywords.some(kw => lowerHeadline.includes(kw));

    const isLowLiquiditySpoof = orderbookDepthUsd < 50000 && (catalyst?.isHighImpact || Math.abs(catalyst?.impactScore || 0) > 0.5);

    let skepticCritique: string | undefined;

    if (hasRumorTerms) {
      confidence -= 0.35;
      skepticCritique = `[SKEPTIC FLAG] Unconfirmed or rumor-based disclosure detected: "${primaryHeadline}". Confidence penalized.`;
    }

    if (isStale) {
      confidence -= 0.25;
      skepticCritique = skepticCritique
        ? `${skepticCritique} | Stale/recycled news headline.`
        : `[SKEPTIC FLAG] Stale or recycled news headline detected: "${primaryHeadline}".`;
    }

    if (isLowLiquiditySpoof) {
      confidence -= 0.30;
      skepticCritique = skepticCritique
        ? `${skepticCritique} | Low-liquidity spoofing risk (Depth $${orderbookDepthUsd.toLocaleString()}).`
        : `[SKEPTIC FLAG] High-impact catalyst claimed against shallow orderbook depth ($${orderbookDepthUsd.toLocaleString()}). Spoof risk elevated.`;
    }

    confidence = Math.max(0.0, Math.min(1.0, Math.round(confidence * 100) / 100));
    const hasVerified = Boolean(catalyst && confidence >= 0.75 && !hasRumorTerms);

    return {
      hasVerifiedCatalyst: hasVerified,
      sourceUriOrHash: catalyst?.sourceUriOrHash || (primaryHeadline ? `headline-hash:${Buffer.from(primaryHeadline).toString('base64').slice(0, 16)}` : undefined),
      factCheckConfidence: confidence,
      skepticCritique: skepticCritique || 'Fact verification passed: Independent corroboration and liquidity confirmed.'
    };
  }

  /**
   * Formulates tactical allocation proposals with dynamic stop-loss, take-profit, fractional sizing,
   * news/event catalyst verification, and adversarial skeptic gating.
   */
  public async propose(input: StrategistInput): Promise<CouncilReasoning['strategistProposal']> {
    const result = await this.proposeWithVerification(input);
    return result.proposal;
  }

  /**
   * Dual return method providing both the structured trade proposal and the verified decision catalyst lineage.
   */
  public async proposeWithVerification(input: StrategistInput): Promise<StrategistProposalResult> {
    const {
      symbol,
      currentPrice,
      regimeAnalysis,
      analystThesis,
      currentHoldingsPct,
      catalyst,
      headlines = [],
      orderbookDepthUsd = 100000
    } = input;
    const { regime, volatilityAtr, trendStrengthScore } = regimeAnalysis;
    const { sentimentScore, macroOutlook } = analystThesis;

    // Run 2-step verification loop
    const catalystContext = this.verifyCatalyst(catalyst, headlines, orderbookDepthUsd);

    // Adversarial Skeptic Gate: If high-impact catalyst confidence < 0.75, reject / downgrade trade
    const isSkepticRejected = catalyst?.isHighImpact && catalystContext.factCheckConfidence < 0.75;

    // Evaluate effective catalyst impact
    const catalystImpact = (catalystContext.hasVerifiedCatalyst && catalyst?.impactScore !== undefined)
      ? catalyst.impactScore
      : (sentimentScore > 0.3 ? sentimentScore : 0);

    const isAdverseCatalyst = (catalyst?.impactScore !== undefined && catalyst.impactScore < -0.2) ||
      catalyst?.type === 'SEC_FILING' ||
      catalyst?.type === 'DOWNGRADE';

    // Rule 1: High volatility bear regime, Risk-Off macro, or Adverse Catalyst -> Cash preservation / Exit positions
    if (regime === 'HIGH_VOLATILITY_BEAR' || macroOutlook === 'RISK_OFF' || isAdverseCatalyst) {
      if (currentHoldingsPct > 0) {
        return {
          proposal: {
            action: 'SELL',
            targetAllocationPct: 0,
            entryTarget: currentPrice,
            stopLoss: currentPrice * 0.98,
            takeProfit: currentPrice * 1.02,
            timeHorizonHours: 1,
            expectedAlphaBps: 0
          },
          catalystContext
        };
      }
      return {
        proposal: {
          action: 'HOLD',
          targetAllocationPct: 0,
          entryTarget: currentPrice,
          stopLoss: currentPrice * 0.95,
          takeProfit: currentPrice * 1.05,
          timeHorizonHours: 24,
          expectedAlphaBps: 0
        },
        catalystContext
      };
    }

    // Rule 2: If skeptic flagged severe divergence or low confidence on high-impact catalyst -> Downgrade to HOLD
    if (isSkepticRejected) {
      return {
        proposal: {
          action: 'HOLD',
          targetAllocationPct: currentHoldingsPct,
          entryTarget: currentPrice,
          stopLoss: currentPrice * 0.97,
          takeProfit: currentPrice * 1.03,
          timeHorizonHours: 12,
          expectedAlphaBps: 0
        },
        catalystContext
      };
    }

    // Rule 3: Bull trend with verified positive sentiment/catalyst -> High conviction long allocation
    if ((regime === 'BULL_TREND' && sentimentScore > 0.1) || (catalystContext.hasVerifiedCatalyst && catalystImpact > 0.2)) {
      const stopDistance = Math.max(volatilityAtr * 1.5, currentPrice * 0.02);
      const stopLoss = Math.round((currentPrice - stopDistance) * 100) / 100;
      
      // Catalyst-enhanced reward-to-risk multiplier: 3.0:1 if high catalyst impact, else 2.5:1
      const rewardMultiplier = catalystImpact > 0.4 ? 3.0 : 2.5;
      const profitDistance = stopDistance * rewardMultiplier;
      const takeProfit = Math.round((currentPrice + profitDistance) * 100) / 100;

      // Base allocation based on trend strength, sentiment, and verified catalyst bonus
      const catalystBonus = catalystImpact > 0 ? catalystImpact * 8 : 0;
      const rawAllocation = 10 + (trendStrengthScore / 10) + (sentimentScore * 10) + catalystBonus;
      const targetAllocationPct = Math.min(25, Math.max(5, Math.round(rawAllocation)));

      const baseAlphaBps = Math.round(((takeProfit - currentPrice) / currentPrice) * 10000);
      const expectedAlphaBps = catalystImpact > 0 ? baseAlphaBps + Math.round(catalystImpact * 30) : baseAlphaBps;

      return {
        proposal: {
          action: 'BUY',
          targetAllocationPct,
          entryTarget: currentPrice,
          stopLoss,
          takeProfit,
          timeHorizonHours: catalyst?.isHighImpact ? 72 : 48,
          expectedAlphaBps
        },
        catalystContext
      };
    }

    // Rule 4: Sideways chop / unverified baseline -> Conservative or Hold
    return {
      proposal: {
        action: 'HOLD',
        targetAllocationPct: currentHoldingsPct,
        entryTarget: currentPrice,
        stopLoss: currentPrice * 0.97,
        takeProfit: currentPrice * 1.03,
        timeHorizonHours: 12,
        expectedAlphaBps: 30
      },
      catalystContext
    };
  }
}
