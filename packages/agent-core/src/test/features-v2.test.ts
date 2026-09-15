import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import {
  AegisAutonomousAgent,
  MarketTickData,
  calculateAdaptiveATR,
  getAdaptiveLookback,
  SystemicContagionDetector,
  ModelTierRouter,
  BnbWeb3Connector
} from '../index.js';
import { ZkProofSimulator, Stage3AuditValidator } from '@aegis/audit-engine';

const TEST_STORAGE = path.join(process.cwd(), 'test_agent_storage_v2');

function safeRmDir(dir: string, retries = 5, delayMs = 100) {
  if (!fs.existsSync(dir)) return;
  for (let i = 0; i < retries; i++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
    }
  }
}

describe('Institutional 5-Feature Upgrade Suite', () => {
  before(() => safeRmDir(TEST_STORAGE));
  after(() => safeRmDir(TEST_STORAGE));

  it('1. Auto-Adaptive ATR Window compresses under high velocity and expands under chop', () => {
    // High-momentum candles: 20 calm candles + 5 large expansion spike candles
    const momentumCandles = [
      ...Array.from({ length: 20 }, (_, i) => ({
        timestamp: Date.now() + i * 60000,
        open: 100 + i * 0.2,
        high: 100.5 + i * 0.2,
        low: 99.8 + i * 0.2,
        close: 100.2 + i * 0.2,
        volume: 1000
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        timestamp: Date.now() + (20 + i) * 60000,
        open: 104 + i * 5,
        high: 112 + i * 5,
        low: 103 + i * 5,
        close: 110 + i * 5,
        volume: 25000
      }))
    ];

    const momentumLookback = getAdaptiveLookback(momentumCandles);
    assert.strictEqual(momentumLookback.mode, 'COMPRESSED_5');
    assert.strictEqual(momentumLookback.lookback, 5);

    // Low-velocity sideways chop candles
    const chopCandles = Array.from({ length: 30 }, (_, i) => ({
      timestamp: Date.now() + i * 60000,
      open: 100 + (i % 2 === 0 ? 0.02 : -0.02),
      high: 100.03,
      low: 99.97,
      close: 100 + (i % 2 === 0 ? 0.01 : -0.01),
      volume: 500
    }));

    const chopLookback = getAdaptiveLookback(chopCandles);
    assert.strictEqual(chopLookback.mode, 'EXPANDED_28');
    assert.strictEqual(chopLookback.lookback, 28);

    const adaptiveAtr = calculateAdaptiveATR(momentumCandles);
    assert.ok(adaptiveAtr.atr > 0);
    assert.strictEqual(adaptiveAtr.lookback, 5);
  });

  it('2. Black Swan Contagion triggers DEFENSIVE_LOCK and auto-liquidates open positions', async () => {
    const agent = new AegisAutonomousAgent(10000, { storageDir: TEST_STORAGE });

    // 1. Enter an initial position in calm market
    const calmCandles = Array.from({ length: 25 }, (_, i) => ({
      timestamp: Date.now() + i * 60000,
      open: 100 + i * 0.5,
      high: 101 + i * 0.5,
      low: 99.5 + i * 0.5,
      close: 100.8 + i * 0.5,
      volume: 2000
    }));

    const normalTick: MarketTickData = {
      symbol: 'bTSLA/USDT',
      candles: calmCandles,
      orderbook: { bids: [[113, 200]], asks: [[113.1, 200]] },
      headlines: ['bTSLA momentum remains constructive'],
      orderbookDepthUsd: 150000,
      bnbPriceUsd: 600
    };

    await agent.processTick(normalTick);

    // 2. Trigger Systemic Contagion: BTC, ETH, bTSLA all drop > 2.5x daily ATR
    const blackSwanTick: MarketTickData = {
      symbol: 'bTSLA/USDT',
      candles: calmCandles,
      orderbook: { bids: [[113, 200]], asks: [[113.1, 200]] },
      headlines: ['BREAKING: Systemic liquidity crisis reported across major exchanges'],
      orderbookDepthUsd: 150000,
      bnbPriceUsd: 600,
      multiAssetPriceDeltas: [
        { symbol: 'BTCUSDT', priceStart: 95000, priceCurrent: 85000, dailyAtr: 2500 }, // drop 10000 / 2500 = 4.0x ATR
        { symbol: 'ETHUSDT', priceStart: 3400, priceCurrent: 2900, dailyAtr: 150 },    // drop 500 / 150 = 3.33x ATR
        { symbol: 'bTSLA/USDT', priceStart: 250, priceCurrent: 210, dailyAtr: 12 }      // drop 40 / 12 = 3.33x ATR
      ]
    };

    const receipt = await agent.processTick(blackSwanTick);

    assert.strictEqual(receipt.systemicStatus, 'BLACK_SWAN_LOCK');
    assert.strictEqual(agent.isDefensiveLockActive(), true);
    // Holdings should be auto-liquidated to stablecoins (0 holding for bTSLA)
    const portfolio = agent.getPortfolio();
    assert.strictEqual(portfolio.holdings['bTSLA/USDT'], undefined);
    assert.ok(portfolio.cashUsd > 9500);
  });

  it('3. Private Builder RPC routes zero mempool leakage with 48 Club simulation', async () => {
    const connector = new BnbWeb3Connector();

    // Private Route
    const privateExec = await connector.executeOrder({
      symbol: 'BNBUSDT',
      action: 'BUY',
      amount: 10,
      expectedPrice: 700,
      maxSlippageBps: 20,
      usePrivateRpc: true
    });

    assert.strictEqual(privateExec.privateRpcRouted, true);
    assert.strictEqual(privateExec.mempoolLeakageRiskPct, 0.00);
    assert.strictEqual(privateExec.builderEndpointUsed, 'https://bsc-private.48.club');

    // Public Route Fallback
    const publicExec = await connector.executeOrder({
      symbol: 'BNBUSDT',
      action: 'BUY',
      amount: 10,
      expectedPrice: 700,
      maxSlippageBps: 50,
      usePrivateRpc: false
    });

    assert.strictEqual(publicExec.privateRpcRouted, false);
    assert.strictEqual(publicExec.mempoolLeakageRiskPct, 25.0);
  });

  it('4. Multi-Tier Model Router escalates to TIER_2_FRONTIER during high-impact catalysts', () => {
    // Routine Calm Tick -> TIER_1_FAST
    const routineRoute = ModelTierRouter.route({
      hasCatalyst: false,
      realizedVolatilityPct: 0.18,
      macroRegime: 'BULL_TREND'
    });

    assert.strictEqual(routineRoute.tier, 'TIER_1_FAST');
    assert.ok(routineRoute.inferenceLatencyMs < 100);
    assert.ok(routineRoute.tokenCostUsd < 0.001);

    // High Impact Catalyst -> TIER_2_FRONTIER
    const catalystRoute = ModelTierRouter.route({
      hasCatalyst: true,
      catalystImpactScore: 0.85,
      realizedVolatilityPct: 0.35,
      macroRegime: 'BULL_TREND'
    });

    assert.strictEqual(catalystRoute.tier, 'TIER_2_FRONTIER');
    assert.ok(catalystRoute.inferenceLatencyMs >= 200);
    assert.ok(catalystRoute.estimatedTokens >= 1000);
  });

  it('5. ZkProofSimulator generates succinct policy compliance proof and passes Stage 3 audit', async () => {
    const agent = new AegisAutonomousAgent(10000, { storageDir: TEST_STORAGE });

    const candles = Array.from({ length: 25 }, (_, i) => ({
      timestamp: Date.now() + i * 60000,
      open: 200 + i,
      high: 202 + i,
      low: 199 + i,
      close: 201 + i,
      volume: 5000
    }));

    const receipt = await agent.processTick({
      symbol: 'bAAPL/USDT',
      candles,
      orderbook: { bids: [[225, 500]], asks: [[225.1, 500]] },
      headlines: ['Apple announces tokenized dividend on BNB Chain'],
      orderbookDepthUsd: 250000,
      bnbPriceUsd: 650,
      catalyst: {
        headline: 'Apple announces tokenized dividend on BNB Chain',
        sourceUriOrHash: 'https://news.apple.com/wire/bnb',
        confidenceScore: 0.90,
        impactScore: 0.85,
        type: 'BREAKING_NEWS'
      }
    });

    assert.ok(receipt.zkProof);
    assert.strictEqual(receipt.zkProof.circuit, 'AegisPolicyProof_v1');
    assert.ok(receipt.zkProof.proofHash.startsWith('0xzk_'));
    assert.strictEqual(receipt.zkProof.publicSignals.length, 3);
    assert.strictEqual(ZkProofSimulator.verifyProofSignals(receipt.zkProof), true);

    // Verify receipt hash chaining and Stage 3 audit
    const allReceipts = agent.getAuditLogger().getAllReceipts();
    const audit = Stage3AuditValidator.verifyAuditTrail(allReceipts);
    assert.strictEqual(audit.passed, true);
    assert.ok(audit.merkleRoot.length > 0);
  });
});
