import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { AegisAutonomousAgent, Candle } from '../index.js';
import * as fs from 'fs';

describe('Aegis Autonomous Agent System Tests', () => {
  function safeRmDir(dir: string) {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
      } catch {
        // ignore lock release delay on Windows
      }
    }
  }

  it('runs an autonomous tick and records an audited decision receipt', async () => {
    const testStorage = './test_agent_storage_1';
    safeRmDir(testStorage);

    const agent = new AegisAutonomousAgent(10000, { storageDir: testStorage });

    // Generate synthetic bull candles
    const candles: Candle[] = [];
    let price = 150;
    for (let i = 0; i < 30; i++) {
      price += 0.5 + Math.random() * 0.2;
      candles.push({
        timestamp: Date.now() - (30 - i) * 60000,
        open: price - 0.2,
        high: price + 0.5,
        low: price - 0.3,
        close: price,
        volume: 10000 + i * 500
      });
    }

    const receipt = await agent.processTick({
      symbol: 'bNVDA',
      candles,
      orderbook: {
        bids: [[price - 0.05, 100], [price - 0.1, 200]],
        asks: [[price + 0.05, 100], [price + 0.1, 200]]
      },
      headlines: ['Nvidia reports record data center revenue surge in Q3'],
      orderbookDepthUsd: 150000
    });

    assert.ok(receipt.decisionId.startsWith('dec-'));
    assert.strictEqual(receipt.marketContextSnapshot.symbol, 'bNVDA');
    assert.strictEqual(receipt.councilReasoning.analystThesis.macroOutlook, 'FAVORABLE');
    assert.strictEqual(receipt.councilReasoning.strategistProposal.action, 'BUY');
    assert.strictEqual(receipt.councilReasoning.riskOfficerReview.approved, true);
    assert.strictEqual(receipt.preflightSimulation.simulationPassed, true);
    assert.strictEqual(receipt.executionRecord.status, 'EXECUTED');
    assert.ok(receipt.executionRecord.txHash?.startsWith('0x'));

    const portfolio = agent.getPortfolio();
    assert.ok(portfolio.holdings['bNVDA'].amount > 0);
    assert.ok(portfolio.cashUsd < 10000);
    assert.strictEqual(portfolio.tradesCount, 1);

    safeRmDir(testStorage);
  });

  it('triggers Chief Risk Officer VETO during high volatility bear regime', async () => {
    const testStorage = './test_agent_storage_2';
    safeRmDir(testStorage);

    const agent = new AegisAutonomousAgent(10000, { storageDir: testStorage });

    // Generate synthetic crash candles
    const candles: Candle[] = [];
    let price = 200;
    for (let i = 0; i < 30; i++) {
      price -= (i > 15 ? 4.0 : 0.5);
      candles.push({
        timestamp: Date.now() - (30 - i) * 60000,
        open: price + 1.0,
        high: price + 1.5,
        low: price - 3.0,
        close: price,
        volume: 50000 + i * 2000
      });
    }

    const receipt = await agent.processTick({
      symbol: 'bTSLA',
      candles,
      orderbook: {
        bids: [[price - 0.5, 50]],
        asks: [[price + 0.5, 50]]
      },
      headlines: ['SEC opens investigation into accounting practices, stock plunges'],
      orderbookDepthUsd: 40000
    });

    assert.strictEqual(receipt.marketContextSnapshot.regime, 'HIGH_VOLATILITY_BEAR');
    assert.strictEqual(receipt.councilReasoning.analystThesis.macroOutlook, 'RISK_OFF');
    assert.notStrictEqual(receipt.executionRecord.status, 'EXECUTED');

    safeRmDir(testStorage);
  });

  it('incorporates positive high-impact news catalyst into strategist proposal', async () => {
    const testStorage = './test_agent_storage_3';
    safeRmDir(testStorage);

    const agent = new AegisAutonomousAgent(10000, { storageDir: testStorage });

    const candles: Candle[] = [];
    let price = 100;
    for (let i = 0; i < 30; i++) {
      price += 0.2;
      candles.push({
        timestamp: Date.now() - (30 - i) * 60000,
        open: price - 0.1,
        high: price + 0.3,
        low: price - 0.2,
        close: price,
        volume: 15000
      });
    }

    const receipt = await agent.processTick({
      symbol: 'bAAPL',
      candles,
      orderbook: {
        bids: [[price - 0.05, 500]],
        asks: [[price + 0.05, 500]]
      },
      headlines: ['Apple announces revolutionary AI integration with soaring subscription revenue'],
      orderbookDepthUsd: 200000,
      catalyst: {
        type: 'EARNINGS',
        impactScore: 0.85,
        headline: 'Apple Q3 Blowout Earnings',
        isHighImpact: true
      }
    });

    assert.strictEqual(receipt.councilReasoning.strategistProposal.action, 'BUY');
    assert.ok(receipt.councilReasoning.strategistProposal.targetAllocationPct >= 15);
    assert.strictEqual(receipt.councilReasoning.strategistProposal.timeHorizonHours, 72);
    assert.strictEqual(receipt.preflightSimulation.simulationPassed, true);

    safeRmDir(testStorage);
  });

  it('enforces strict netYieldUsd > 0 preflight check to reject unprofitable fee drag', async () => {
    const testStorage = './test_agent_storage_4';
    safeRmDir(testStorage);

    const agent = new AegisAutonomousAgent(10000, { storageDir: testStorage });

    const candles: Candle[] = [];
    let price = 50;
    for (let i = 0; i < 30; i++) {
      candles.push({
        timestamp: Date.now() - (30 - i) * 60000,
        open: price,
        high: price + 0.05,
        low: price - 0.05,
        close: price,
        volume: 5000
      });
    }

    // Direct check against PreflightSimulationAgent with a tiny order where gas > gross alpha
    const { PreflightSimulationAgent } = await import('../agents/preflight.js');
    const { DEFAULT_AEGIS_CONFIG } = await import('../config/index.js');
    const preflight = new PreflightSimulationAgent();
    
    // Order value: $15, Alpha: 10 bps ($0.015 yield), Gas fee BNB: 0.00045 @ $600 = $0.27
    const result = await preflight.simulate({
      symbol: 'bTEST',
      orderValueUsd: 15,
      orderbookDepthUsd: 100000,
      expectedAlphaBps: 10,
      currentBnbPriceUsd: 600,
      config: {
        ...DEFAULT_AEGIS_CONFIG,
        storageDir: testStorage
      }
    });

    assert.strictEqual(result.simulationPassed, false);
    assert.ok(result.rejectionReason?.includes('NET-YIELD GATE') || result.rejectionReason?.includes('Net yield'));

    safeRmDir(testStorage);
  });

  it('Idea 1: Macro Regime Controller dynamically calibrates portfolio exposure ceilings', async () => {
    const { MacroSentimentAnalystAgent } = await import('../agents/analyst.js');
    const analyst = new MacroSentimentAnalystAgent();

    // 1. Extreme Volatility
    const bearEvaluation = analyst.evaluateMacroRegime({
      currentPrice: 100,
      regimeAnalysis: {
        regime: 'HIGH_VOLATILITY_BEAR',
        trendStrengthScore: 10,
        volatilityAtr: 6.0,
        realizedVolPct: 0.55,
        shortEma: 90,
        longEma: 110
      }
    });
    assert.strictEqual(bearEvaluation.state, 'CAPITAL_PRESERVATION');
    assert.strictEqual(bearEvaluation.portfolioExposureCeilingPct, 15);

    // 2. Sideways Chop
    const chopEvaluation = analyst.evaluateMacroRegime({
      currentPrice: 100,
      regimeAnalysis: {
        regime: 'SIDEWAYS_CHOP',
        trendStrengthScore: 40,
        volatilityAtr: 2.5,
        realizedVolPct: 0.28,
        shortEma: 100,
        longEma: 100
      }
    });
    assert.strictEqual(chopEvaluation.state, 'CHOP_HIGH_VOL');
    assert.strictEqual(chopEvaluation.portfolioExposureCeilingPct, 35);

    // 3. Bull Trend
    const bullEvaluation = analyst.evaluateMacroRegime({
      currentPrice: 100,
      regimeAnalysis: {
        regime: 'BULL_TREND',
        trendStrengthScore: 80,
        volatilityAtr: 1.2,
        realizedVolPct: 0.15,
        shortEma: 105,
        longEma: 95
      }
    });
    assert.strictEqual(bullEvaluation.state, 'BULL_TREND');
    assert.ok(bullEvaluation.portfolioExposureCeilingPct >= 70);
  });

  it('Idea 2: Adversarial Skeptic rejects unconfirmed rumors and flags spoofing', async () => {
    const { AlphaStrategistAgent } = await import('../agents/strategist.js');
    const strategist = new AlphaStrategistAgent();

    // Unconfirmed rumor headline on high-impact catalyst
    const unconfirmedResult = await strategist.proposeWithVerification({
      symbol: 'bTEST',
      currentPrice: 100,
      regimeAnalysis: {
        regime: 'BULL_TREND',
        trendStrengthScore: 75,
        volatilityAtr: 1.5,
        realizedVolPct: 0.18,
        shortEma: 102,
        longEma: 98
      },
      analystThesis: {
        catalystSummary: 'Rumor of secret acquisition',
        sentimentScore: 0.7,
        macroOutlook: 'FAVORABLE'
      },
      currentHoldingsPct: 0,
      availableCashUsd: 10000,
      orderbookDepthUsd: 30000,
      catalyst: {
        type: 'BREAKING_NEWS',
        headline: 'Unconfirmed rumor: Company in talks for massive buyout',
        isHighImpact: true,
        impactScore: 0.8
      }
    });

    assert.strictEqual(unconfirmedResult.catalystContext.hasVerifiedCatalyst, false);
    assert.ok(unconfirmedResult.catalystContext.factCheckConfidence < 0.75);
    assert.ok(unconfirmedResult.catalystContext.skepticCritique?.includes('[SKEPTIC FLAG]'));
    assert.strictEqual(unconfirmedResult.proposal.action, 'HOLD');
  });

  it('Idea 3: CRO enforces High-Water Mark Drawdown absolute veto & macro exposure ceiling', async () => {
    const { AdversarialRiskOfficerAgent } = await import('../agents/risk-officer.js');
    const { DEFAULT_AEGIS_CONFIG } = await import('../config/index.js');
    const cro = new AdversarialRiskOfficerAgent();

    // 1. High-water mark drawdown breach (e.g. 4.5% drawdown on 5.0% max budget -> >= 85%)
    const hwmReview = await cro.review({
      symbol: 'bTEST',
      currentPrice: 100,
      currentPortfolioEquityUsd: 9550,
      peakPortfolioEquityUsd: 10000, // 4.5% drawdown
      currentHoldingsPct: 0,
      regimeAnalysis: {
        regime: 'BULL_TREND',
        trendStrengthScore: 70,
        volatilityAtr: 1.5,
        realizedVolPct: 0.18,
        shortEma: 102,
        longEma: 98
      },
      analystThesis: {
        catalystSummary: 'Favorable conditions',
        sentimentScore: 0.6,
        macroOutlook: 'FAVORABLE'
      },
      strategistProposal: {
        action: 'BUY',
        targetAllocationPct: 20,
        entryTarget: 100,
        stopLoss: 97,
        takeProfit: 108,
        timeHorizonHours: 24,
        expectedAlphaBps: 800
      },
      config: DEFAULT_AEGIS_CONFIG
    });

    assert.strictEqual(hwmReview.approved, false);
    assert.ok(hwmReview.vetoReason?.includes('High-water mark drawdown'));
    assert.strictEqual(hwmReview.adjustedAllocationPct, 0);

    // 2. Macro Regime Ceiling Breach
    const ceilingReview = await cro.review({
      symbol: 'bTEST',
      currentPrice: 100,
      currentPortfolioEquityUsd: 10000,
      peakPortfolioEquityUsd: 10000,
      currentHoldingsPct: 15, // Already at 15% during Capital Preservation (ceiling 15%)
      macroExposureCeilingPct: 15,
      regimeAnalysis: {
        regime: 'HIGH_VOLATILITY_BEAR',
        trendStrengthScore: 20,
        volatilityAtr: 4.0,
        realizedVolPct: 0.40,
        shortEma: 95,
        longEma: 105
      },
      analystThesis: {
        catalystSummary: 'Volatile conditions',
        sentimentScore: 0.1,
        macroOutlook: 'NEUTRAL'
      },
      strategistProposal: {
        action: 'BUY',
        targetAllocationPct: 10,
        entryTarget: 100,
        stopLoss: 95,
        takeProfit: 110,
        timeHorizonHours: 24,
        expectedAlphaBps: 1000
      },
      config: DEFAULT_AEGIS_CONFIG
    });

    assert.strictEqual(ceilingReview.approved, false);
    assert.ok(ceilingReview.vetoReason?.includes('macro regime ceiling'));
  });

  it('Decision Receipt populates regime, catalyst, and economic feasibility fields', async () => {
    const testStorage = './test_agent_storage_5';
    safeRmDir(testStorage);

    const agent = new AegisAutonomousAgent(10000, { storageDir: testStorage });

    const candles: Candle[] = [];
    let price = 100;
    for (let i = 0; i < 30; i++) {
      price += 0.3;
      candles.push({
        timestamp: Date.now() - (30 - i) * 60000,
        open: price - 0.1,
        high: price + 0.4,
        low: price - 0.2,
        close: price,
        volume: 20000
      });
    }

    const receipt = await agent.processTick({
      symbol: 'bGOOGL',
      candles,
      orderbook: {
        bids: [[price - 0.05, 500]],
        asks: [[price + 0.05, 500]]
      },
      headlines: ['Google Cloud reports accelerating enterprise AI contract wins'],
      orderbookDepthUsd: 300000
    });

    // Check Stage 3 required fields
    assert.ok(receipt.regime);
    assert.ok(['BULL_TREND', 'CHOP_HIGH_VOL', 'CAPITAL_PRESERVATION'].includes(receipt.regime.state));
    assert.ok(receipt.regime.maxAllowedExposurePct > 0);
    assert.ok(receipt.regime.rationale.length > 0);

    assert.ok(receipt.catalyst);
    assert.ok(typeof receipt.catalyst.hasVerifiedCatalyst === 'boolean');
    assert.ok(typeof receipt.catalyst.factCheckConfidence === 'number');

    assert.ok(receipt.economicFeasibility);
    assert.ok(typeof receipt.economicFeasibility.netYieldUsd === 'number');
    assert.ok(typeof receipt.economicFeasibility.approved === 'boolean');

    safeRmDir(testStorage);
  });
});
