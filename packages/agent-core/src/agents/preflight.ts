import { PreflightSimulation, EconomicFeasibility, MevProbeResult } from '@aegis/audit-engine';
import { AegisConfig } from '../config/index.js';
import { MevPreflightProbe } from '../web3/mev-probe.js';

export interface PreflightInput {
  symbol: string;
  orderValueUsd: number;
  orderbookDepthUsd: number;
  expectedAlphaBps: number;
  currentBnbPriceUsd?: number;
  currentPrice?: number;
  minProfitThresholdUsd?: number;
  config: AegisConfig;
}

export interface PreflightSimulationResult {
  simulation: PreflightSimulation;
  economicFeasibility: EconomicFeasibility;
  mevProbe: MevProbeResult;
}

export class PreflightSimulationAgent {
  /**
   * Idea 3: Dual-System Neuro-Symbolic Arbiter & Net-Yield Gate.
   * Deterministically validates orderbook depth, slippage bounds, on-chain gas costs, MEV sandwich risk, and net dollar return.
   */
  public async simulate(input: PreflightInput): Promise<PreflightSimulation> {
    const result = await this.simulateWithFeasibility(input);
    return result.simulation;
  }

  /**
   * Evaluates trade execution costs, MEV risks, and returns simulation record, feasibility, and MEV probe.
   */
  public async simulateWithFeasibility(input: PreflightInput): Promise<PreflightSimulationResult> {
    const {
      symbol,
      orderValueUsd,
      orderbookDepthUsd,
      expectedAlphaBps,
      currentBnbPriceUsd = 600,
      currentPrice = 100,
      minProfitThresholdUsd = 0.25,
      config
    } = input;

    // Feature #2: Evaluate On-Chain MEV & Liquidity Probe
    const mevProbe = MevPreflightProbe.evaluate({
      symbol,
      orderValueUsd,
      orderbookDepthUsd,
      ammQuotedPrice: currentPrice,
      cexBenchmarkPrice: currentPrice,
      maxSlippageBps: config.maxSlippageBps
    });

    if (orderValueUsd <= 0) {
      return {
        simulation: {
          estimatedSlippageBps: 0,
          estimatedGasFeeBnb: 0,
          expectedNetAlphaBps: 0,
          simulationPassed: true
        },
        economicFeasibility: {
          expectedEdgeUsd: 0,
          estimatedGasUsd: 0,
          estimatedSlippageUsd: 0,
          netYieldUsd: 0,
          approved: true
        },
        mevProbe
      };
    }

    // 1. MEV Probe Abort Check
    if (mevProbe.routingAction === 'ABORT') {
      return {
        simulation: {
          estimatedSlippageBps: mevProbe.ammPoolImpactBps,
          estimatedGasFeeBnb: 0.00045,
          expectedNetAlphaBps: 0,
          simulationPassed: false,
          rejectionReason: `[PRE-FLIGHT MEV ABORT] High price impact (${mevProbe.ammPoolImpactBps.toFixed(1)} bps) or sandwich vulnerability detected.`
        },
        economicFeasibility: {
          expectedEdgeUsd: 0,
          estimatedGasUsd: 0.27,
          estimatedSlippageUsd: (mevProbe.ammPoolImpactBps / 10000) * orderValueUsd,
          netYieldUsd: -0.27,
          approved: false
        },
        mevProbe
      };
    }

    // 2. Orderbook Depth Check
    if (orderbookDepthUsd < config.minOrderbookDepthUsd) {
      const estimatedGasFeeBnb = 0.0004;
      const gasFeeUsd = estimatedGasFeeBnb * currentBnbPriceUsd;
      return {
        simulation: {
          estimatedSlippageBps: 50,
          estimatedGasFeeBnb,
          expectedNetAlphaBps: 0,
          simulationPassed: false,
          rejectionReason: `[PRE-FLIGHT FAIL] Insufficient liquidity: Depth $${orderbookDepthUsd.toLocaleString()} < $${config.minOrderbookDepthUsd.toLocaleString()}`
        },
        economicFeasibility: {
          expectedEdgeUsd: 0,
          estimatedGasUsd: gasFeeUsd,
          estimatedSlippageUsd: (50 / 10000) * orderValueUsd,
          netYieldUsd: -gasFeeUsd,
          approved: false
        },
        mevProbe
      };
    }

    // 3. Slippage Model
    const impactRatio = orderValueUsd / Math.max(1, orderbookDepthUsd);
    const estimatedSlippageBps = Math.max(2, Math.round(impactRatio * 1000));
    const estimatedSlippageUsd = (estimatedSlippageBps / 10000) * orderValueUsd;

    // 4. Gas Cost & Trading Fee in basis points and USD
    const estimatedGasFeeBnb = 0.00045;
    const gasFeeUsd = estimatedGasFeeBnb * currentBnbPriceUsd;
    const gasCostBps = Math.round((gasFeeUsd / orderValueUsd) * 10000);
    const tradingFeeBps = 10; // 0.10% bStock trading fee
    const tradingFeeUsd = (tradingFeeBps / 10000) * orderValueUsd;

    const totalCostBps = estimatedSlippageBps + gasCostBps + tradingFeeBps;
    const expectedNetAlphaBps = expectedAlphaBps - totalCostBps;

    // Dollar yield calculations
    const grossAlphaUsd = (expectedAlphaBps / 10000) * orderValueUsd;
    const totalCostUsd = gasFeeUsd + estimatedSlippageUsd + tradingFeeUsd;
    const netYieldUsd = Math.round((grossAlphaUsd - totalCostUsd) * 100) / 100;

    if (estimatedSlippageBps > config.maxSlippageBps) {
      return {
        simulation: {
          estimatedSlippageBps,
          estimatedGasFeeBnb,
          expectedNetAlphaBps: expectedAlphaBps - estimatedSlippageBps,
          simulationPassed: false,
          rejectionReason: `[PRE-FLIGHT FAIL] Slippage ${estimatedSlippageBps} bps exceeds max tolerance ${config.maxSlippageBps} bps`
        },
        economicFeasibility: {
          expectedEdgeUsd: grossAlphaUsd,
          estimatedGasUsd: gasFeeUsd,
          estimatedSlippageUsd,
          netYieldUsd,
          approved: false
        },
        mevProbe
      };
    }

    // 5. Strict Net-Yield Gatekeeper (netYieldUsd > minProfitThresholdUsd)
    if (netYieldUsd <= minProfitThresholdUsd) {
      return {
        simulation: {
          estimatedSlippageBps,
          estimatedGasFeeBnb,
          expectedNetAlphaBps,
          simulationPassed: false,
          rejectionReason: `[PRE-FLIGHT NET-YIELD GATE] Net yield $${netYieldUsd.toFixed(2)} <= threshold $${minProfitThresholdUsd.toFixed(2)}: Edge $${grossAlphaUsd.toFixed(2)} vs Total Costs $${totalCostUsd.toFixed(2)} (Gas: $${gasFeeUsd.toFixed(2)}, Slippage: $${estimatedSlippageUsd.toFixed(2)})`
        },
        economicFeasibility: {
          expectedEdgeUsd: grossAlphaUsd,
          estimatedGasUsd: gasFeeUsd,
          estimatedSlippageUsd,
          netYieldUsd,
          approved: false
        },
        mevProbe
      };
    }

    // 6. Net Alpha to Cost Ratio Check
    if (expectedNetAlphaBps <= 0 || (expectedAlphaBps / totalCostBps) < config.minNetAlphaToCostRatio) {
      return {
        simulation: {
          estimatedSlippageBps,
          estimatedGasFeeBnb,
          expectedNetAlphaBps,
          simulationPassed: false,
          rejectionReason: `[PRE-FLIGHT FAIL] Fee drag exceeds alpha: Gross Alpha ${expectedAlphaBps} bps vs Total Cost ${totalCostBps} bps (Ratio ${(expectedAlphaBps / totalCostBps).toFixed(2)} < ${config.minNetAlphaToCostRatio})`
        },
        economicFeasibility: {
          expectedEdgeUsd: grossAlphaUsd,
          estimatedGasUsd: gasFeeUsd,
          estimatedSlippageUsd,
          netYieldUsd,
          approved: false
        },
        mevProbe
      };
    }

    return {
      simulation: {
        estimatedSlippageBps,
        estimatedGasFeeBnb,
        expectedNetAlphaBps,
        simulationPassed: true
      },
      economicFeasibility: {
        expectedEdgeUsd: grossAlphaUsd,
        estimatedGasUsd: gasFeeUsd,
        estimatedSlippageUsd,
        netYieldUsd,
        approved: true
      },
      mevProbe
    };
  }
}
