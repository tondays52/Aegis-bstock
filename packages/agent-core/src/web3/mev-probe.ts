import { MevProbeResult } from '@aegis/audit-engine';

export interface MevProbeInput {
  symbol: string;
  orderValueUsd: number;
  orderbookDepthUsd: number;
  ammQuotedPrice: number;
  cexBenchmarkPrice: number;
  maxSlippageBps: number;
}

/**
 * On-Chain bStock Liquidity & Sandwich / MEV Pre-Flight Probe
 * Simulates pool impact and detects adverse sandwiching or CEX-DEX dislocations before submitting transactions to BNB Smart Chain.
 */
export class MevPreflightProbe {
  public static evaluate(input: MevProbeInput): MevProbeResult {
    const {
      orderValueUsd,
      orderbookDepthUsd,
      ammQuotedPrice,
      cexBenchmarkPrice,
      maxSlippageBps
    } = input;

    if (orderValueUsd === 0) {
      return {
        ammPoolImpactBps: 0,
        cexDexDeviationBps: 0,
        frontrunRiskDetected: false,
        routingAction: 'DIRECT_EXECUTION'
      };
    }

    // 1. Calculate AMM Pool Price Impact (bps): 1% pool depth order ~= 10 bps impact
    const depth = Math.max(10000, orderbookDepthUsd);
    const ammPoolImpactBps = Math.round(((orderValueUsd / depth) * 1000) * 100) / 100;

    // 2. Calculate CEX-DEX Price Deviation (bps)
    const deviationBps = Math.round(
      (Math.abs(ammQuotedPrice - cexBenchmarkPrice) / cexBenchmarkPrice) * 10000 * 100
    ) / 100;

    // 3. Detect Sandwich / Front-Run Vulnerability:
    // If order impact > 35 bps or deviation exceeds 20 bps
    const frontrunRiskDetected = ammPoolImpactBps > 35 || deviationBps > 20;

    let routingAction: MevProbeResult['routingAction'] = 'DIRECT_EXECUTION';

    if (ammPoolImpactBps > maxSlippageBps || deviationBps > 50) {
      routingAction = 'ABORT';
    } else if (frontrunRiskDetected || orderValueUsd > 3500) {
      routingAction = 'TWAP_SLICE';
    }

    return {
      ammPoolImpactBps,
      cexDexDeviationBps: deviationBps,
      frontrunRiskDetected,
      routingAction
    };
  }
}
