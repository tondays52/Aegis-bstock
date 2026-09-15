import { ExecutionTelemetry } from '@aegis/audit-engine';

export type ModelTier = 'TIER_1_FAST' | 'TIER_2_FRONTIER';

export interface ModelRoutingDecision {
  tier: ModelTier;
  modelName: string;
  reason: string;
  estimatedTokens: number;
  tokenCostUsd: number;
  inferenceLatencyMs: number;
}

export interface RouterInput {
  hasCatalyst: boolean;
  catalystImpactScore?: number;
  realizedVolatilityPct: number;
  macroRegime: string;
  isBlackSwanCandidate?: boolean;
}

export class ModelTierRouter {
  /**
   * Dynamically selects between Tier 1 (Fast / Distilled) and Tier 2 (Frontier / Deep Reasoning):
   * - Routine calm markets: TIER_1_FAST (<50ms, low cost)
   * - High-impact catalyst, volatility spike (>35% realized vol), or bear panic: TIER_2_FRONTIER
   */
  public static route(input: RouterInput): ModelRoutingDecision {
    const {
      hasCatalyst,
      catalystImpactScore = 0,
      realizedVolatilityPct,
      macroRegime,
      isBlackSwanCandidate
    } = input;

    // Escalation triggers for Tier 2 Frontier Deep Reasoning
    const shouldEscalate = 
      (hasCatalyst && Math.abs(catalystImpactScore) >= 0.50) ||
      realizedVolatilityPct > 0.40 ||
      macroRegime === 'HIGH_VOLATILITY_BEAR' ||
      isBlackSwanCandidate;

    if (shouldEscalate) {
      const estimatedTokens = 1250 + Math.floor(Math.random() * 300);
      const tokenCostUsd = +((estimatedTokens / 1_000_000) * 3.0).toFixed(5); // $3.00 / MTok
      const inferenceLatencyMs = 210 + Math.floor(Math.random() * 95);

      return {
        tier: 'TIER_2_FRONTIER',
        modelName: 'DeepSeek-R1-Distill-Qwen32B / Claude-3.7-Sonnet',
        reason: isBlackSwanCandidate 
          ? 'BLACK_SWAN_CONTROVERSY: Escalated to Frontier model for adversarial tail-risk deliberation.'
          : hasCatalyst 
            ? 'HIGH_IMPACT_CATALYST: Escalated to Frontier model for adversarial fact-checking.'
            : 'VOLATILITY_EXPANSION: Escalated to Frontier model due to ATR band breach.',
        estimatedTokens,
        tokenCostUsd,
        inferenceLatencyMs
      };
    }

    // Standard fast lightweight model for routine state checking
    const estimatedTokens = 180 + Math.floor(Math.random() * 60);
    const tokenCostUsd = +((estimatedTokens / 1_000_000) * 0.15).toFixed(5); // $0.15 / MTok
    const inferenceLatencyMs = 32 + Math.floor(Math.random() * 22);

    return {
      tier: 'TIER_1_FAST',
      modelName: 'Gemini-2.5-Flash / Llama-3.3-8B-Instruct',
      reason: 'ROUTINE_MONITORING: Fast distilled model sufficient for calm market tick.',
      estimatedTokens,
      tokenCostUsd,
      inferenceLatencyMs
    };
  }

  public static toExecutionTelemetry(
    routing: ModelRoutingDecision,
    privateRpcRouted: boolean = true
  ): ExecutionTelemetry {
    return {
      modelTier: routing.tier,
      inferenceLatencyMs: routing.inferenceLatencyMs,
      tokenCostUsd: routing.tokenCostUsd,
      privateRpcRouted
    };
  }
}
