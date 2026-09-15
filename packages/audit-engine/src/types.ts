export type MarketRegime = 'BULL_TREND' | 'SIDEWAYS_CHOP' | 'HIGH_VOLATILITY_BEAR';

export type TradeAction = 'BUY' | 'SELL' | 'HOLD';

export type ExecutionStatus = 
  | 'EXECUTED' 
  | 'REJECTED_BY_RISK' 
  | 'SIMULATION_FAILED' 
  | 'SKIPPED_HOLD'
  | 'CIRCUIT_BREAKER_TRIGGERED';

export interface AgentVersionInfo {
  gitCommitSha: string;
  manifestVersion: string;
  modelId: string;
}

export interface MarketContextSnapshot {
  symbol: string;
  currentPrice: number;
  orderbookDepthUsd: number;
  volatilityAtr14: number;
  regime: MarketRegime;
  newsSentimentScore: number;
  timestamp: string;
}

export interface CouncilReasoning {
  analystThesis: {
    catalystSummary: string;
    sentimentScore: number;
    macroOutlook: 'FAVORABLE' | 'NEUTRAL' | 'RISK_OFF';
  };
  strategistProposal: {
    action: TradeAction;
    targetAllocationPct: number;
    entryTarget: number;
    stopLoss: number;
    takeProfit: number;
    timeHorizonHours: number;
    expectedAlphaBps: number;
  };
  riskOfficerReview: {
    approved: boolean;
    vetoReason?: string;
    riskScore: number; // 0 to 100
    adjustedAllocationPct: number;
    maxDrawdownImpactBps: number;
  };
}

export interface PreflightSimulation {
  estimatedSlippageBps: number;
  estimatedGasFeeBnb: number;
  expectedNetAlphaBps: number;
  simulationPassed: boolean;
  rejectionReason?: string;
}

export interface ExecutionRecord {
  status: ExecutionStatus;
  txHash?: string;
  blockNumber?: number;
  executedPrice?: number;
  executedAmount?: number;
  gasUsedBnb?: number;
  executionTimestamp?: string;
}

export type MacroRegimeState = 'BULL_TREND' | 'CHOP_HIGH_VOL' | 'CAPITAL_PRESERVATION';

export interface DecisionRegimeContext {
  state: MacroRegimeState;
  maxAllowedExposurePct: number;
  rationale: string;
}

export interface DecisionCatalystContext {
  hasVerifiedCatalyst: boolean;
  sourceUriOrHash?: string;
  factCheckConfidence: number; // 0.0 to 1.0
  skepticCritique?: string;
}

export interface EconomicFeasibility {
  expectedEdgeUsd: number;
  estimatedGasUsd: number;
  estimatedSlippageUsd: number;
  netYieldUsd: number;
  approved: boolean;
}

export interface FailureMemoryContext {
  checked: boolean;
  matchedPreviousFailure: boolean;
  similarityScore: number; // 0.0 to 1.0
  matchedFailureId?: string;
  mitigationApplied?: string;
}

export interface MevProbeResult {
  ammPoolImpactBps: number;
  cexDexDeviationBps: number;
  frontrunRiskDetected: boolean;
  routingAction: 'DIRECT_EXECUTION' | 'TWAP_SLICE' | 'ABORT';
}

export interface ZkAuditProof {
  circuit: 'AegisPolicyProof_v1';
  proofHash: string;      // Simulated succinct 256-byte proof hash
  verifiedOnChain: boolean;
  publicSignals: [string, string, string]; // [exposureLimitPass, netYieldPass, noVetoPass]
}

export interface ExecutionTelemetry {
  modelTier: 'TIER_1_FAST' | 'TIER_2_FRONTIER';
  inferenceLatencyMs: number;
  tokenCostUsd: number;
  privateRpcRouted: boolean;
}

export type SystemicContagionStatus = 'NORMAL' | 'ELEVATED' | 'BLACK_SWAN_LOCK';

export interface AegisDecisionReceipt {
  decisionId: string;
  timestampUtc: string;
  agentVersion: AgentVersionInfo;
  marketContextSnapshot: MarketContextSnapshot;
  councilReasoning: CouncilReasoning;
  preflightSimulation: PreflightSimulation;
  executionRecord: ExecutionRecord;
  regime: DecisionRegimeContext;
  catalyst: DecisionCatalystContext;
  economicFeasibility: EconomicFeasibility;
  failureMemory?: FailureMemoryContext;
  mevProbe?: MevProbeResult;
  zkProof?: ZkAuditProof;
  executionTelemetry?: ExecutionTelemetry;
  systemicStatus?: SystemicContagionStatus;
  previousReceiptHash: string;
  receiptHash: string;
}

export interface AuditVerificationResult {
  passed: boolean;
  totalDecisions: number;
  totalExecutedTrades: number;
  unmappedTradesCount: number;
  brokenHashLinks: number;
  unexplainedTransfers: number;
  versionGaps: number;
  errorLog: string[];
  merkleRoot: string;
}
