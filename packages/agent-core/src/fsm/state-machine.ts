import * as crypto from 'crypto';
import {
  AegisDecisionReceipt,
  WormAuditLogger,
  MarketRegime,
  ExecutionStatus,
  ZkProofSimulator,
  SystemicContagionStatus
} from '@aegis/audit-engine';
import { AegisConfig, DEFAULT_AEGIS_CONFIG } from '../config/index.js';
import { Candle, OrderbookSnapshot, calculateAdaptiveATR } from '../quant/indicators.js';
import { MarketRegimeClassifier } from '../quant/regime.js';
import { MacroSentimentAnalystAgent } from '../agents/analyst.js';
import { AlphaStrategistAgent, NewsCatalyst } from '../agents/strategist.js';
import { AdversarialRiskOfficerAgent } from '../agents/risk-officer.js';
import { PreflightSimulationAgent } from '../agents/preflight.js';
import { BnbWeb3Connector } from '../web3/bnb-connector.js';
import { EpisodicFailureMemory } from '../memory/failure-memory.js';
import { ModelTierRouter } from '../agents/model-router.js';
import { SystemicContagionDetector, AssetPriceDelta } from '../quant/contagion.js';

export interface MarketTickData {
  symbol: string;
  candles: Candle[];
  orderbook: OrderbookSnapshot;
  headlines: string[];
  orderbookDepthUsd: number;
  bnbPriceUsd?: number;
  catalyst?: NewsCatalyst;
  multiAssetPriceDeltas?: AssetPriceDelta[];
  usePrivateRpc?: boolean;
}

export interface PortfolioState {
  cashUsd: number;
  holdings: Record<string, { amount: number; avgCost: number; currentPrice: number }>;
  totalEquityUsd: number;
  peakEquityUsd: number;
  maxDrawdownPct: number;
  totalGasSpentBnb: number;
  totalTradingFeesUsd: number;
  tradesCount: number;
}

export class AegisAutonomousAgent {
  private config: AegisConfig;
  private logger: WormAuditLogger;
  private web3Connector: BnbWeb3Connector;
  private analyst: MacroSentimentAnalystAgent;
  private strategist: AlphaStrategistAgent;
  private riskOfficer: AdversarialRiskOfficerAgent;
  private preflight: PreflightSimulationAgent;
  private failureMemory: EpisodicFailureMemory;

  private portfolio: PortfolioState;
  private defensiveLockTicksRemaining: number = 0;

  constructor(initialCashUsd: number = 10000, config: Partial<AegisConfig> = {}) {
    this.config = { ...DEFAULT_AEGIS_CONFIG, ...config };
    this.logger = new WormAuditLogger(this.config.storageDir);
    this.web3Connector = new BnbWeb3Connector(this.config.bnbChainRpcUrl);

    this.analyst = new MacroSentimentAnalystAgent();
    this.strategist = new AlphaStrategistAgent();
    this.riskOfficer = new AdversarialRiskOfficerAgent();
    this.preflight = new PreflightSimulationAgent();
    this.failureMemory = new EpisodicFailureMemory();

    this.portfolio = {
      cashUsd: initialCashUsd,
      holdings: {},
      totalEquityUsd: initialCashUsd,
      peakEquityUsd: initialCashUsd,
      maxDrawdownPct: 0,
      totalGasSpentBnb: 0,
      totalTradingFeesUsd: 0,
      tradesCount: 0
    };
  }

  public getPortfolio(): PortfolioState {
    return JSON.parse(JSON.stringify(this.portfolio));
  }

  public getAuditLogger(): WormAuditLogger {
    return this.logger;
  }

  public getFailureMemory(): EpisodicFailureMemory {
    return this.failureMemory;
  }

  public isDefensiveLockActive(): boolean {
    return this.defensiveLockTicksRemaining > 0;
  }

  /**
   * Main Autonomous Decision & Execution Loop step
   */
  public async processTick(tick: MarketTickData): Promise<AegisDecisionReceipt> {
    const { 
      symbol, 
      candles, 
      headlines, 
      orderbookDepthUsd, 
      bnbPriceUsd = 600,
      usePrivateRpc = true
    } = tick;
    const currentPrice = candles[candles.length - 1]?.close || 100;

    // 1. Update Portfolio Valuation
    this.updateValuation(symbol, currentPrice);

    // 2. Black Swan Contagion Check & Defensive Lock Management
    const contagionResult = SystemicContagionDetector.evaluate(tick.multiAssetPriceDeltas || []);
    let systemicStatus: SystemicContagionStatus = contagionResult.status;

    if (contagionResult.isBlackSwanContagion) {
      this.defensiveLockTicksRemaining = 10; // 10 ticks cool-down
      // Auto-liquidate open holdings into stablecoins
      for (const holdingSymbol of Object.keys(this.portfolio.holdings)) {
        const h = this.portfolio.holdings[holdingSymbol];
        if (h && h.amount > 0) {
          const proceeds = h.amount * h.currentPrice * 0.999; // 0.1% swap fee
          this.portfolio.cashUsd += proceeds;
          delete this.portfolio.holdings[holdingSymbol];
          this.portfolio.tradesCount++;
        }
      }
      this.updateValuation(symbol, currentPrice);
    } else if (this.defensiveLockTicksRemaining > 0) {
      this.defensiveLockTicksRemaining--;
      systemicStatus = 'BLACK_SWAN_LOCK';
    }

    // 3. System 1: Auto-Adaptive Dynamic ATR Volatility Window
    const adaptiveAtr = calculateAdaptiveATR(candles);
    const regimeAnalysis = MarketRegimeClassifier.classify(candles);
    regimeAnalysis.volatilityAtr = adaptiveAtr.atr; // Set dynamically tuned ATR

    const macroRegime = this.analyst.evaluateMacroRegime({
      symbol,
      regimeAnalysis,
      currentPrice
    });

    // 4. Dynamic Model Tier Router & Token Cost Tracking
    const modelRouting = ModelTierRouter.route({
      hasCatalyst: Boolean(tick.catalyst),
      catalystImpactScore: tick.catalyst?.impactScore,
      realizedVolatilityPct: regimeAnalysis.realizedVolPct,
      macroRegime: macroRegime.state,
      isBlackSwanCandidate: contagionResult.isBlackSwanContagion || this.defensiveLockTicksRemaining > 0
    });

    // 5. System 2 Agent 1: Macro & Sentiment Analyst
    const analystThesis = await this.analyst.analyze({
      symbol,
      headlines
    });

    // 6. System 2 Agent 2: Alpha Strategist (Idea 2: Fact Verification & Adversarial Skeptic)
    const currentHolding = this.portfolio.holdings[symbol]?.amount || 0;
    const currentHoldingValue = currentHolding * currentPrice;
    const currentHoldingsPct = this.portfolio.totalEquityUsd > 0
      ? (currentHoldingValue / this.portfolio.totalEquityUsd) * 100
      : 0;

    const strategistResult = await this.strategist.proposeWithVerification({
      symbol,
      currentPrice,
      regimeAnalysis,
      analystThesis,
      currentHoldingsPct,
      availableCashUsd: this.portfolio.cashUsd,
      catalyst: tick.catalyst,
      headlines,
      orderbookDepthUsd
    });
    const strategistProposal = strategistResult.proposal;
    const catalystContext = strategistResult.catalystContext;

    // 7. Feature #1: "Memory-of-Failures" RAG Dynamic Retrieval
    const failureQuery = this.failureMemory.querySimilarFailures({
      symbol,
      regime: macroRegime.state,
      catalystType: tick.catalyst?.type || (tick.catalyst?.isUnconfirmedRumor ? 'UNCONFIRMED_RUMOR' : undefined),
      volatilityAtr: regimeAnalysis.volatilityAtr,
      orderbookDepthUsd
    });

    // 8. System 2 Agent 3: Adversarial Chief Risk Officer Review & Veto
    const riskOfficerReview = await this.riskOfficer.review({
      symbol,
      currentPrice,
      currentPortfolioEquityUsd: this.portfolio.totalEquityUsd,
      peakPortfolioEquityUsd: this.portfolio.peakEquityUsd,
      currentHoldingsPct,
      regimeAnalysis,
      analystThesis,
      strategistProposal,
      macroExposureCeilingPct: macroRegime.portfolioExposureCeilingPct,
      failureMemoryResult: failureQuery,
      systemicContagionResult: contagionResult,
      config: this.config
    });

    // Enforce lock if defensive lock active
    if (this.defensiveLockTicksRemaining > 0 && strategistProposal.action === 'BUY') {
      riskOfficerReview.approved = false;
      riskOfficerReview.vetoReason = `[CRO DEFENSIVE LOCK] Trading locked for ${this.defensiveLockTicksRemaining} remaining cool-down ticks post-Black Swan event.`;
      riskOfficerReview.adjustedAllocationPct = 0;
    }

    // Determine target order amount
    let targetOrderValueUsd = 0;
    if (riskOfficerReview.approved && strategistProposal.action === 'BUY') {
      const targetAllocationValue = (riskOfficerReview.adjustedAllocationPct / 100) * this.portfolio.totalEquityUsd;
      targetOrderValueUsd = Math.max(0, Math.min(this.portfolio.cashUsd, targetAllocationValue - currentHoldingValue));
    } else if (riskOfficerReview.approved && strategistProposal.action === 'SELL') {
      targetOrderValueUsd = currentHoldingValue;
    }

    // 9. System 2 Agent 4: Pre-Flight Simulation, Net-Yield Gate, & MEV Probe
    const preflightResult = await this.preflight.simulateWithFeasibility({
      symbol,
      orderValueUsd: targetOrderValueUsd,
      orderbookDepthUsd,
      expectedAlphaBps: strategistProposal.expectedAlphaBps,
      currentBnbPriceUsd: bnbPriceUsd,
      currentPrice,
      config: this.config
    });
    const preflightSimulation = preflightResult.simulation;
    const economicFeasibility = preflightResult.economicFeasibility;
    const mevProbe = preflightResult.mevProbe;

    // 10. Execution Logic with Private Builder RPC
    let executionRecord: any = {
      status: 'SKIPPED_HOLD' as ExecutionStatus
    };

    if (!riskOfficerReview.approved) {
      executionRecord.status = 'REJECTED_BY_RISK';
    } else if (targetOrderValueUsd > 10 && !preflightSimulation.simulationPassed) {
      executionRecord.status = 'SIMULATION_FAILED';
    } else if (targetOrderValueUsd > 10 && preflightSimulation.simulationPassed) {
      if (strategistProposal.action === 'BUY') {
        const orderAmount = targetOrderValueUsd / currentPrice;
        const result = await this.web3Connector.executeOrder({
          symbol,
          action: 'BUY',
          amount: orderAmount,
          expectedPrice: currentPrice,
          maxSlippageBps: this.config.maxSlippageBps,
          usePrivateRpc
        });

        const cost = result.executedPrice! * orderAmount;
        const fee = cost * 0.001; // 0.1% fee
        this.portfolio.cashUsd -= (cost + fee);
        this.portfolio.totalTradingFeesUsd += fee;
        this.portfolio.totalGasSpentBnb += result.gasUsedBnb || 0.0004;
        this.portfolio.tradesCount++;

        if (!this.portfolio.holdings[symbol]) {
          this.portfolio.holdings[symbol] = { amount: 0, avgCost: 0, currentPrice };
        }
        const existing = this.portfolio.holdings[symbol];
        const newTotalAmount = existing.amount + orderAmount;
        existing.avgCost = (existing.amount * existing.avgCost + cost) / newTotalAmount;
        existing.amount = newTotalAmount;
        existing.currentPrice = result.executedPrice!;

        executionRecord = result;
      } else if (strategistProposal.action === 'SELL' && currentHolding > 0) {
        const result = await this.web3Connector.executeOrder({
          symbol,
          action: 'SELL',
          amount: currentHolding,
          expectedPrice: currentPrice,
          maxSlippageBps: this.config.maxSlippageBps,
          usePrivateRpc
        });

        const proceeds = result.executedPrice! * currentHolding;
        const fee = proceeds * 0.001;
        const avgCost = this.portfolio.holdings[symbol]?.avgCost || currentPrice;
        const pnl = proceeds - (avgCost * currentHolding) - fee;

        this.portfolio.cashUsd += (proceeds - fee);
        this.portfolio.totalTradingFeesUsd += fee;
        this.portfolio.totalGasSpentBnb += result.gasUsedBnb || 0.0004;
        this.portfolio.tradesCount++;

        // If trade was closed at a loss, automatically record post-mortem into episodic memory
        if (pnl < 0) {
          const lossBps = Math.round((Math.abs(pnl) / (avgCost * currentHolding)) * 10000);
          this.failureMemory.recordFailure({
            symbol,
            regime: macroRegime.state,
            catalystType: tick.catalyst?.type || 'PROPOSAL_EXIT',
            volatilityAtr: regimeAnalysis.volatilityAtr,
            orderbookDepthUsd,
            lossBps,
            postMortemReason: `Closed ${symbol} at loss ($${pnl.toFixed(2)}, -${(lossBps / 100).toFixed(2)}%) during ${macroRegime.state} regime.`
          });
        }

        delete this.portfolio.holdings[symbol];
        executionRecord = result;
      }
    }

    // Re-evaluate equity and peak
    this.updateValuation(symbol, currentPrice);

    // 11. Prepare Draft for ZK Proof Generation and Immutable WORM Logging
    const executionTelemetry = ModelTierRouter.toExecutionTelemetry(modelRouting, usePrivateRpc);

    const draftWithoutZk = {
      decisionId: `dec-${crypto.randomUUID()}`,
      timestampUtc: new Date().toISOString(),
      agentVersion: {
        gitCommitSha: this.config.gitCommitSha,
        manifestVersion: this.config.manifestVersion,
        modelId: modelRouting.modelName
      },
      marketContextSnapshot: {
        symbol,
        currentPrice,
        orderbookDepthUsd,
        volatilityAtr14: regimeAnalysis.volatilityAtr,
        regime: regimeAnalysis.regime,
        newsSentimentScore: analystThesis.sentimentScore,
        timestamp: new Date().toISOString()
      },
      councilReasoning: {
        analystThesis,
        strategistProposal,
        riskOfficerReview
      },
      preflightSimulation,
      executionRecord,
      regime: {
        state: macroRegime.state,
        maxAllowedExposurePct: macroRegime.maxAllowedExposurePct,
        rationale: macroRegime.rationale
      },
      catalyst: catalystContext,
      economicFeasibility,
      failureMemory: {
        checked: failureQuery.checked,
        matchedPreviousFailure: failureQuery.matched,
        similarityScore: failureQuery.similarityScore,
        matchedFailureId: failureQuery.mostSimilarFailure?.failureId,
        mitigationApplied: failureQuery.suggestedMitigation
      },
      mevProbe,
      executionTelemetry,
      systemicStatus
    };

    // 12. Generate Succinct ZK-SNARK Policy Compliance Proof
    const zkProof = ZkProofSimulator.generatePolicyProof(draftWithoutZk as any);

    const fullReceiptDraft = {
      ...draftWithoutZk,
      zkProof
    };

    const finalReceipt = this.logger.recordDecision(fullReceiptDraft as any);
    return finalReceipt;
  }

  private updateValuation(symbol: string, currentPrice: number) {
    if (this.portfolio.holdings[symbol]) {
      this.portfolio.holdings[symbol].currentPrice = currentPrice;
    }

    let holdingsValue = 0;
    for (const s of Object.keys(this.portfolio.holdings)) {
      const h = this.portfolio.holdings[s];
      holdingsValue += h.amount * h.currentPrice;
    }

    this.portfolio.totalEquityUsd = Math.round((this.portfolio.cashUsd + holdingsValue) * 100) / 100;
    if (this.portfolio.totalEquityUsd > this.portfolio.peakEquityUsd) {
      this.portfolio.peakEquityUsd = this.portfolio.totalEquityUsd;
    }

    const dd = this.portfolio.peakEquityUsd > 0
      ? ((this.portfolio.peakEquityUsd - this.portfolio.totalEquityUsd) / this.portfolio.peakEquityUsd) * 100
      : 0;

    if (dd > this.portfolio.maxDrawdownPct) {
      this.portfolio.maxDrawdownPct = Math.round(dd * 100) / 100;
    }
  }
}
