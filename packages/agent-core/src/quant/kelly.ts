export interface KellySizingInput {
  confidenceProbability: number; // p in [0.0, 1.0]
  stopLossPct: number;          // e.g. 4.0%
  takeProfitPct: number;        // e.g. 8.0%
  totalEquityUsd: number;
  maxAllocationCeilingPct: number; // e.g. 25% or 75%
  safetyFactor?: number;        // Default 0.25 (Quarter-Kelly for extreme draw-down protection)
}

export interface KellySizingResult {
  kellyFraction: number;        // Uncapped Kelly fraction
  fractionalKellyPct: number;   // Quarter-Kelly scaled percentage
  recommendedAllocationPct: number;
  recommendedOrderValueUsd: number;
  payoutRatio: number;          // b = reward / risk
  rationale: string;
}

/**
 * Epistemic Fractional Kelly Criterion Position Sizer
 * Dynamically sizes trades according to agent council conviction, reward-to-risk ratio, and drawdown boundaries.
 */
export class KellyPositionSizer {
  public static calculate(input: KellySizingInput): KellySizingResult {
    const {
      confidenceProbability: p,
      stopLossPct,
      takeProfitPct,
      totalEquityUsd,
      maxAllocationCeilingPct,
      safetyFactor = 0.25
    } = input;

    // Payout ratio b = TakeProfit / StopLoss
    const risk = Math.max(0.005, stopLossPct);
    const reward = Math.max(0.005, takeProfitPct);
    const b = reward / risk;

    // Full Kelly: f* = (p * b - (1 - p)) / b
    const q = 1 - p;
    const numerator = p * b - q;
    const fullKelly = numerator / b;

    if (fullKelly <= 0 || p < 0.50) {
      return {
        kellyFraction: 0,
        fractionalKellyPct: 0,
        recommendedAllocationPct: 0,
        recommendedOrderValueUsd: 0,
        payoutRatio: Math.round(b * 100) / 100,
        rationale: `Sub-optimal edge (p=${(p * 100).toFixed(1)}%, b=${b.toFixed(2)}x). Kelly suggests zero allocation.`
      };
    }

    // Apply Fractional Kelly (Quarter-Kelly by default)
    const scaledKellyPct = fullKelly * safetyFactor * 100;
    
    // Clamp to Risk Ceiling and Max Bounds
    const finalAllocPct = Math.min(
      maxAllocationCeilingPct,
      Math.max(1.0, Math.round(scaledKellyPct * 100) / 100)
    );

    const orderValueUsd = Math.round(((finalAllocPct / 100) * totalEquityUsd) * 100) / 100;

    return {
      kellyFraction: Math.round(fullKelly * 1000) / 1000,
      fractionalKellyPct: Math.round(scaledKellyPct * 100) / 100,
      recommendedAllocationPct: finalAllocPct,
      recommendedOrderValueUsd: orderValueUsd,
      payoutRatio: Math.round(b * 100) / 100,
      rationale: `Quarter-Kelly sizing: Conviction ${(p * 100).toFixed(0)}%, Win/Loss ${b.toFixed(2)}x -> Alloc ${finalAllocPct.toFixed(1)}% ($${orderValueUsd.toFixed(2)})`
    };
  }
}
