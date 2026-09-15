import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { EpisodicFailureMemory } from '../memory/failure-memory.js';
import { KellyPositionSizer } from '../quant/kelly.js';
import { MevPreflightProbe } from '../web3/mev-probe.js';
import { AdversarialRiskOfficerAgent } from '../agents/risk-officer.js';
import { DEFAULT_AEGIS_CONFIG } from '../config/index.js';

describe('Hackathon Edge Suite: Failure Memory RAG, Kelly Sizing, & MEV Probe', () => {
  test('EpisodicFailureMemory - records failure and retrieves matching context with high cosine similarity', () => {
    const memory = new EpisodicFailureMemory();

    // 1. Record a past failure: Whipsawed in high vol chop on bTSLA after an unconfirmed rumor
    const record = memory.recordFailure({
      symbol: 'bTSLA',
      regime: 'CHOP_HIGH_VOL',
      catalystType: 'UNCONFIRMED_RUMOR',
      volatilityAtr: 2.8,
      orderbookDepthUsd: 80000,
      lossBps: 240,
      postMortemReason: 'Whipsaw stop-out due to unconfirmed Twitter rumor in low depth chop.'
    });

    assert.ok(record.failureId.startsWith('fail-'));
    assert.strictEqual(memory.getFailuresCount(), 1);

    // 2. Query with an identical/near-identical setup
    const matchQuery = memory.querySimilarFailures({
      symbol: 'bTSLA',
      regime: 'CHOP_HIGH_VOL',
      catalystType: 'UNCONFIRMED_RUMOR',
      volatilityAtr: 2.7,
      orderbookDepthUsd: 82000
    });

    assert.strictEqual(matchQuery.matched, true);
    assert.ok(matchQuery.similarityScore >= 0.85);
    assert.strictEqual(matchQuery.suggestedMitigation, 'ABSOLUTE_VETO');
    assert.ok(matchQuery.reason?.includes('RAG VETO'));

    // 3. Query with a clean, different setup (Bull trend on BNB with official earnings)
    const cleanQuery = memory.querySimilarFailures({
      symbol: 'BNB',
      regime: 'BULL_TREND',
      catalystType: 'EARNINGS',
      volatilityAtr: 0.8,
      orderbookDepthUsd: 500000
    });

    assert.ok(cleanQuery.similarityScore < 0.70);
    assert.strictEqual(cleanQuery.suggestedMitigation, 'NONE');
  });

  test('AdversarialRiskOfficerAgent - enforces RAG Veto when memory matches past failure', async () => {
    const cro = new AdversarialRiskOfficerAgent();

    const review = await cro.review({
      symbol: 'bTSLA',
      currentPrice: 240,
      currentPortfolioEquityUsd: 10000,
      peakPortfolioEquityUsd: 10000,
      currentHoldingsPct: 0,
      regimeAnalysis: {
        regime: 'SIDEWAYS_CHOP',
        volatilityAtr: 2.5,
        realizedVolPct: 0.22,
        trendStrengthScore: 0,
        shortEma: 240,
        longEma: 240
      },
      analystThesis: {
        catalystSummary: 'Social rumor',
        sentimentScore: 0.3,
        macroOutlook: 'NEUTRAL'
      },
      strategistProposal: {
        action: 'BUY',
        targetAllocationPct: 15,
        entryTarget: 240,
        stopLoss: 232,
        takeProfit: 258,
        timeHorizonHours: 24,
        expectedAlphaBps: 50
      },
      failureMemoryResult: {
        checked: true,
        matched: true,
        similarityScore: 0.92,
        suggestedMitigation: 'ABSOLUTE_VETO',
        reason: 'RAG VETO: 92% match with past stop-out'
      },
      config: DEFAULT_AEGIS_CONFIG
    });

    assert.strictEqual(review.approved, false);
    assert.ok(review.vetoReason?.includes('RAG VETO'));
    assert.strictEqual(review.adjustedAllocationPct, 0);
  });

  test('KellyPositionSizer - scales position size dynamically based on win/loss payout and confidence', () => {
    // High conviction setup (75% confidence, 2.5:1 reward-to-risk)
    const highEdge = KellyPositionSizer.calculate({
      confidenceProbability: 0.75,
      stopLossPct: 3.0,
      takeProfitPct: 7.5,
      totalEquityUsd: 10000,
      maxAllocationCeilingPct: 25.0,
      safetyFactor: 0.25
    });

    assert.ok(highEdge.recommendedAllocationPct > 10);
    assert.ok(highEdge.recommendedOrderValueUsd > 1000);
    assert.strictEqual(highEdge.payoutRatio, 2.5);

    // Low conviction setup (< 50% probability) -> zero allocation
    const lowEdge = KellyPositionSizer.calculate({
      confidenceProbability: 0.45,
      stopLossPct: 4.0,
      takeProfitPct: 4.0,
      totalEquityUsd: 10000,
      maxAllocationCeilingPct: 25.0
    });

    assert.strictEqual(lowEdge.recommendedAllocationPct, 0);
    assert.strictEqual(lowEdge.recommendedOrderValueUsd, 0);
  });

  test('MevPreflightProbe - detects thin pool sandwich risk and flags TWAP / abort', () => {
    // Large order ($5,000) into thin pool ($20,000 depth) -> High impact
    const highRisk = MevPreflightProbe.evaluate({
      symbol: 'bCOIN',
      orderValueUsd: 5000,
      orderbookDepthUsd: 20000,
      ammQuotedPrice: 180,
      cexBenchmarkPrice: 180,
      maxSlippageBps: 25
    });

    assert.strictEqual(highRisk.frontrunRiskDetected, true);
    assert.strictEqual(highRisk.routingAction, 'ABORT');

    // Normal sized order into deep pool -> Direct execution
    const safeTrade = MevPreflightProbe.evaluate({
      symbol: 'BNB',
      orderValueUsd: 500,
      orderbookDepthUsd: 300000,
      ammQuotedPrice: 700,
      cexBenchmarkPrice: 700,
      maxSlippageBps: 25
    });

    assert.strictEqual(safeTrade.frontrunRiskDetected, false);
    assert.strictEqual(safeTrade.routingAction, 'DIRECT_EXECUTION');
  });
});
