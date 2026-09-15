export interface AegisConfig {
  gitCommitSha: string;
  manifestVersion: string;
  modelId: string;
  maxDrawdownBudgetPct: number; // e.g. 5.0%
  dailyLossLimitPct: number;    // e.g. 2.5%
  maxSingleAssetAllocationPct: number; // e.g. 25.0%
  minNetAlphaToCostRatio: number; // e.g. 3.0 (alpha must be 3x cost)
  minOrderbookDepthUsd: number;  // e.g. $50,000
  maxSlippageBps: number;        // e.g. 25 bps (0.25%)
  storageDir: string;
  bnbChainRpcUrl: string;
  enableLiveTrading: boolean;
}

export const DEFAULT_AEGIS_CONFIG: AegisConfig = {
  gitCommitSha: process.env.GIT_COMMIT_SHA || '7f9c2a1',
  manifestVersion: '1.0.0-rc1',
  modelId: 'gemini-2.5-pro',
  maxDrawdownBudgetPct: 5.0,
  dailyLossLimitPct: 2.5,
  maxSingleAssetAllocationPct: 25.0,
  minNetAlphaToCostRatio: 3.0,
  minOrderbookDepthUsd: 50000,
  maxSlippageBps: 25,
  storageDir: './audit_logs',
  bnbChainRpcUrl: 'https://bsc-dataseed.binance.org/',
  enableLiveTrading: false
};
