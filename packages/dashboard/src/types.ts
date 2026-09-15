export type MacroRegimeState = 'BULL_TREND' | 'CHOP_HIGH_VOL' | 'CAPITAL_PRESERVATION';

export interface DecisionCatalystContext {
  hasVerifiedCatalyst: boolean;
  sourceUriOrHash?: string;
  factCheckConfidence: number;
  skepticCritique?: string;
}

export interface EconomicFeasibility {
  expectedEdgeUsd: number;
  estimatedGasUsd: number;
  estimatedSlippageUsd: number;
  netYieldUsd: number;
  approved: boolean;
}

export interface DecisionReceiptView {
  decisionId: string;
  timestampUtc: string;
  symbol: string;
  currentPrice: number;
  orderbookDepthUsd: number;
  regime: {
    state: MacroRegimeState;
    maxAllowedExposurePct: number;
    rationale: string;
  };
  analystThesis: {
    catalystSummary: string;
    sentimentScore: number;
    macroOutlook: string;
  };
  strategistProposal: {
    action: 'BUY' | 'SELL' | 'HOLD';
    targetAllocationPct: number;
    stopLoss: number;
    takeProfit: number;
    expectedAlphaBps: number;
  };
  riskOfficerReview: {
    approved: boolean;
    vetoReason?: string;
    riskScore: number;
    adjustedAllocationPct: number;
  };
  preflightSimulation: {
    estimatedSlippageBps: number;
    estimatedGasFeeBnb: number;
    expectedNetAlphaBps: number;
    simulationPassed: boolean;
    rejectionReason?: string;
  };
  catalyst?: DecisionCatalystContext;
  economicFeasibility?: EconomicFeasibility;
  executionRecord: {
    status: 'EXECUTED' | 'REJECTED_BY_RISK' | 'SIMULATION_FAILED' | 'SKIPPED_HOLD';
    txHash?: string;
    blockNumber?: number;
    executedPrice?: number;
    executedAmount?: number;
    gasUsedBnb?: number;
  };
  previousReceiptHash: string;
  receiptHash: string;
}

export interface DashboardPortfolio {
  cashUsd: number;
  totalEquityUsd: number;
  openingEquityUsd: number;
  peakEquityUsd: number;
  maxDrawdownPct: number;
  totalGasSpentBnb: number;
  totalTradingFeesUsd: number;
  tradesCount: number;
  holdings: Record<string, { amount: number; avgCost: number; currentPrice: number }>;
}

export interface LiveMarketQuote {
  symbol: string;
  price: number;
  change24hPct: number;
  volumeUsd: number;
  orderbookDepthUsd: number;
  bids: [number, number][];
  asks: [number, number][];
}
