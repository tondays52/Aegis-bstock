import { CouncilReasoning } from '@aegis/audit-engine';
import { AegisConfig } from '../config/index.js';
import { RegimeAnalysisResult } from '../quant/regime.js';
import { FailureQueryResult } from '../memory/failure-memory.js';
import { KellyPositionSizer } from '../quant/kelly.js';
import { ContagionCheckResult, SystemicContagionDetector, AssetPriceDelta } from '../quant/contagion.js';

export interface RiskOfficerInput {
  symbol: string;
  currentPrice: number;
  currentPortfolioEquityUsd: number;
  peakPortfolioEquityUsd: number;
  currentHoldingsPct: number;
  regimeAnalysis: RegimeAnalysisResult;
  analystThesis: CouncilReasoning['analystThesis'];
  strategistProposal: CouncilReasoning['strategistProposal'];
  macroExposureCeilingPct?: number;
  failureMemoryResult?: FailureQueryResult;
  systemicContagionResult?: ContagionCheckResult;
  config: AegisConfig;
}

export class AdversarialRiskOfficerAgent {
  /**
   * Evaluates proposal against risk parameters, macro exposure ceilings, RAG failure memory, and HWM drawdown,
   * exercising CRO VETO when tail risk is unacceptable.
   */
  public async review(input: RiskOfficerInput): Promise<CouncilReasoning['riskOfficerReview']> {
    const {
      currentPrice,
      currentPortfolioEquityUsd,
      peakPortfolioEquityUsd,
      currentHoldingsPct,
      regimeAnalysis,
      strategistProposal,
      macroExposureCeilingPct,
      failureMemoryResult,
      systemicContagionResult,
      config
    } = input;

    const { action, targetAllocationPct, stopLoss, takeProfit } = strategistProposal;
    const { regime, realizedVolPct } = regimeAnalysis;

    // 0. Systemic Black Swan Contagion Check
    if (systemicContagionResult?.isBlackSwanContagion && action === 'BUY') {
      return {
        approved: false,
        vetoReason: `[CRO BLACK SWAN VETO] ${systemicContagionResult.rationale}`,
        riskScore: 100,
        adjustedAllocationPct: 0,
        maxDrawdownImpactBps: 0
      };
    }

    // 1. Calculate High-Water Mark Drawdown
    const currentDrawdownPct = peakPortfolioEquityUsd > 0
      ? ((peakPortfolioEquityUsd - currentPortfolioEquityUsd) / peakPortfolioEquityUsd) * 100
      : 0;

    // Circuit Breaker: If current drawdown approaches max budget (>= 85%), issue an absolute CRO VETO
    if (currentDrawdownPct >= config.maxDrawdownBudgetPct * 0.85 && action === 'BUY') {
      return {
        approved: false,
        vetoReason: `[CRO VETO] High-water mark drawdown ${currentDrawdownPct.toFixed(2)}% approaches max budget ${config.maxDrawdownBudgetPct}%. Absolute capital preservation active.`,
        riskScore: 95,
        adjustedAllocationPct: 0,
        maxDrawdownImpactBps: 0
      };
    }

    if (action === 'HOLD' || action === 'SELL') {
      return {
        approved: true,
        riskScore: action === 'SELL' ? 10 : 20,
        adjustedAllocationPct: targetAllocationPct,
        maxDrawdownImpactBps: 0
      };
    }

    // 2. Memory-of-Failures RAG Check (Feature #1)
    if (failureMemoryResult?.matched && failureMemoryResult.suggestedMitigation === 'ABSOLUTE_VETO') {
      return {
        approved: false,
        vetoReason: `[CRO VETO] ${failureMemoryResult.reason}`,
        riskScore: 92,
        adjustedAllocationPct: 0,
        maxDrawdownImpactBps: 0
      };
    }

    // 3. Macro Regime Exposure Ceiling Check (Idea 1)
    const effectiveCeiling = macroExposureCeilingPct !== undefined
      ? Math.min(config.maxSingleAssetAllocationPct, macroExposureCeilingPct)
      : config.maxSingleAssetAllocationPct;

    if (currentHoldingsPct >= effectiveCeiling && action === 'BUY') {
      return {
        approved: false,
        vetoReason: `[CRO VETO] Portfolio exposure ${currentHoldingsPct.toFixed(1)}% is already at or above macro regime ceiling ${effectiveCeiling}%.`,
        riskScore: 85,
        adjustedAllocationPct: 0,
        maxDrawdownImpactBps: 0
      };
    }

    // 4. Concentration Check
    if (targetAllocationPct > config.maxSingleAssetAllocationPct) {
      return {
        approved: false,
        vetoReason: `[CRO VETO] Target allocation ${targetAllocationPct}% exceeds single-asset cap ${config.maxSingleAssetAllocationPct}%.`,
        riskScore: 80,
        adjustedAllocationPct: config.maxSingleAssetAllocationPct,
        maxDrawdownImpactBps: 50
      };
    }

    // 5. Reward-to-Risk Ratio Check
    const riskPerShare = currentPrice - stopLoss;
    const rewardPerShare = takeProfit - currentPrice;
    if (riskPerShare <= 0 || (rewardPerShare / riskPerShare) < 1.8) {
      return {
        approved: false,
        vetoReason: `[CRO VETO] Sub-optimal Reward-to-Risk ratio (${(rewardPerShare / (riskPerShare || 0.01)).toFixed(2)}:1). Must exceed 1.8:1.`,
        riskScore: 75,
        adjustedAllocationPct: 0,
        maxDrawdownImpactBps: 40
      };
    }

    // 6. Volatility Penalty
    let riskScore = 20;
    if (regime === 'HIGH_VOLATILITY_BEAR') {
      riskScore += 50;
    } else if (regime === 'SIDEWAYS_CHOP') {
      riskScore += 20;
    }

    if (realizedVolPct > 0.40) {
      riskScore += Math.round((realizedVolPct - 0.40) * 50);
    }

    if (riskScore > 65) {
      return {
        approved: false,
        vetoReason: `[CRO VETO] High composite risk score (${riskScore}/100) due to elevated realized volatility (${(realizedVolPct * 100).toFixed(1)}%).`,
        riskScore,
        adjustedAllocationPct: 0,
        maxDrawdownImpactBps: 60
      };
    }

    // 7. Dynamic Kelly Criterion Sizing (Feature #3)
    const confidenceProbability = Math.max(0.55, (100 - riskScore) / 100);
    const stopLossPct = (riskPerShare / currentPrice) * 100;
    const takeProfitPct = (rewardPerShare / currentPrice) * 100;

    const kellyResult = KellyPositionSizer.calculate({
      confidenceProbability,
      stopLossPct,
      takeProfitPct,
      totalEquityUsd: currentPortfolioEquityUsd,
      maxAllocationCeilingPct: effectiveCeiling,
      safetyFactor: 0.25
    });

    let adjustedAllocationPct = Math.min(
      effectiveCeiling,
      kellyResult.recommendedAllocationPct > 0 ? kellyResult.recommendedAllocationPct : targetAllocationPct
    );

    // Apply 50% RAG reduction if memory indicates moderate risk
    if (failureMemoryResult?.matched && failureMemoryResult.suggestedMitigation === 'REDUCE_SIZE_50') {
      adjustedAllocationPct = Math.max(2.0, Math.round((adjustedAllocationPct * 0.5) * 10) / 10);
    }

    const maxDrawdownImpactBps = Math.round(((riskPerShare / currentPrice) * (adjustedAllocationPct / 100)) * 10000);

    return {
      approved: true,
      riskScore,
      adjustedAllocationPct,
      maxDrawdownImpactBps
    };
  }

  /**
   * Helper method to evaluate contagion from multi-asset price deltas
   */
  public static detectSystemicContagion(assets: AssetPriceDelta[]): ContagionCheckResult {
    return SystemicContagionDetector.evaluate(assets);
  }
}
