import { MacroRegimeState } from '@aegis/audit-engine';

export interface FailureRecord {
  failureId: string;
  timestamp: string;
  symbol: string;
  regime: MacroRegimeState;
  catalystType: string;
  volatilityAtr: number;
  orderbookDepthUsd: number;
  lossBps: number;
  postMortemReason: string;
  featureVector: number[];
}

export interface FailureQueryInput {
  symbol: string;
  regime: MacroRegimeState;
  catalystType?: string;
  volatilityAtr: number;
  orderbookDepthUsd: number;
}

export interface FailureQueryResult {
  checked: boolean;
  matched: boolean;
  similarityScore: number; // 0.0 to 1.0
  mostSimilarFailure?: FailureRecord;
  suggestedMitigation: 'NONE' | 'REDUCE_SIZE_50' | 'ABSOLUTE_VETO';
  reason?: string;
}

/**
 * "Memory-of-Failures" Episodic Vector Retrieval Engine (RAG over Past Trading Mistakes)
 * Indexes post-mortems of stopped-out trades, slippage traps, and whipsaws across the 14-day autonomous run.
 */
export class EpisodicFailureMemory {
  private failures: FailureRecord[] = [];
  private maxCapacity: number;
  private similarityVetoThreshold: number;
  private similarityThrottleThreshold: number;

  constructor(
    maxCapacity: number = 200,
    similarityVetoThreshold: number = 0.85,
    similarityThrottleThreshold: number = 0.70
  ) {
    this.maxCapacity = maxCapacity;
    this.similarityVetoThreshold = similarityVetoThreshold;
    this.similarityThrottleThreshold = similarityThrottleThreshold;
  }

  /**
   * Encodes market, catalyst, and liquidity setup into a normalized multi-dimensional feature vector
   */
  public encodeFeatureVector(input: {
    symbol: string;
    regime: MacroRegimeState;
    catalystType?: string;
    volatilityAtr: number;
    orderbookDepthUsd: number;
    lossBps?: number;
  }): number[] {
    // Dimension 0-2: One-hot / scalar encoding for Macro Regime
    const regimeVal = input.regime === 'BULL_TREND' ? 1.0 : input.regime === 'CHOP_HIGH_VOL' ? 0.5 : 0.0;
    
    // Dimension 3: Normalized Volatility ATR (0 to 10 scale normalized)
    const atrNorm = Math.min(1.0, input.volatilityAtr / 5.0);
    
    // Dimension 4: Normalized Orderbook Liquidity Depth ($10k to $1M logarithmic scale)
    const depthNorm = Math.min(1.0, Math.log10(Math.max(10000, input.orderbookDepthUsd)) / 6.0);
    
    // Dimension 5: Catalyst sensitivity / severity
    const catVal = input.catalystType?.includes('RUMOR')
      ? -0.9
      : input.catalystType?.includes('EARNINGS')
      ? 0.8
      : input.catalystType?.includes('SEC')
      ? 0.7
      : 0.1;

    // Dimension 6: Asset class identity hash component
    const symbolHash = ((input.symbol.charCodeAt(0) * 31 + input.symbol.charCodeAt(input.symbol.length - 1)) % 100) / 100;

    const raw = [regimeVal, atrNorm, depthNorm, catVal, symbolHash];
    
    // L2 Vector Normalization
    const norm = Math.sqrt(raw.reduce((sum, v) => sum + v * v, 0)) || 1.0;
    return raw.map((v) => v / norm);
  }

  /**
   * Computes Cosine Similarity between two L2-normalized feature vectors
   */
  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
    }
    return Math.max(0, Math.min(1.0, dot));
  }

  /**
   * Records a trade failure / stop-out / slippage post-mortem into episodic memory
   */
  public recordFailure(params: {
    symbol: string;
    regime: MacroRegimeState;
    catalystType?: string;
    volatilityAtr: number;
    orderbookDepthUsd: number;
    lossBps: number;
    postMortemReason: string;
  }): FailureRecord {
    const featureVector = this.encodeFeatureVector({
      symbol: params.symbol,
      regime: params.regime,
      catalystType: params.catalystType,
      volatilityAtr: params.volatilityAtr,
      orderbookDepthUsd: params.orderbookDepthUsd,
      lossBps: params.lossBps
    });

    const record: FailureRecord = {
      failureId: `fail-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      symbol: params.symbol,
      regime: params.regime,
      catalystType: params.catalystType || 'GENERAL_SETUP',
      volatilityAtr: params.volatilityAtr,
      orderbookDepthUsd: params.orderbookDepthUsd,
      lossBps: params.lossBps,
      postMortemReason: params.postMortemReason,
      featureVector
    };

    this.failures.unshift(record);
    if (this.failures.length > this.maxCapacity) {
      this.failures.pop();
    }

    return record;
  }

  /**
   * Queries episodic memory for past failures matching the current candidate setup
   */
  public querySimilarFailures(candidate: FailureQueryInput): FailureQueryResult {
    if (this.failures.length === 0) {
      return {
        checked: true,
        matched: false,
        similarityScore: 0.0,
        suggestedMitigation: 'NONE'
      };
    }

    const candidateVector = this.encodeFeatureVector({
      symbol: candidate.symbol,
      regime: candidate.regime,
      catalystType: candidate.catalystType,
      volatilityAtr: candidate.volatilityAtr,
      orderbookDepthUsd: candidate.orderbookDepthUsd
    });

    let maxSim = 0;
    let mostSimilar: FailureRecord | undefined = undefined;

    for (const failure of this.failures) {
      const sim = this.cosineSimilarity(candidateVector, failure.featureVector);
      if (sim > maxSim) {
        maxSim = sim;
        mostSimilar = failure;
      }
    }

    const roundedSim = Math.round(maxSim * 1000) / 1000;

    if (roundedSim >= this.similarityVetoThreshold && mostSimilar) {
      return {
        checked: true,
        matched: true,
        similarityScore: roundedSim,
        mostSimilarFailure: mostSimilar,
        suggestedMitigation: 'ABSOLUTE_VETO',
        reason: `RAG VETO: Matched past failure [${mostSimilar.failureId}] with ${(roundedSim * 100).toFixed(1)}% similarity. Reason: ${mostSimilar.postMortemReason}`
      };
    } else if (roundedSim >= this.similarityThrottleThreshold && mostSimilar) {
      return {
        checked: true,
        matched: true,
        similarityScore: roundedSim,
        mostSimilarFailure: mostSimilar,
        suggestedMitigation: 'REDUCE_SIZE_50',
        reason: `RAG THROTTLE: Similar adverse conditions found in [${mostSimilar.failureId}] (${(roundedSim * 100).toFixed(1)}% sim). Sizing reduced by 50%.`
      };
    }

    return {
      checked: true,
      matched: false,
      similarityScore: roundedSim,
      suggestedMitigation: 'NONE'
    };
  }

  public getFailuresCount(): number {
    return this.failures.length;
  }

  public getAllFailures(): FailureRecord[] {
    return [...this.failures];
  }
}
