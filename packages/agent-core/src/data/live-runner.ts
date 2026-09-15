import { AegisAutonomousAgent } from '../fsm/state-machine.js';
import { LiveFeedManager } from './live-feed-manager.js';
import { Stage3AuditValidator } from '@aegis/audit-engine';

export interface LiveRunnerOptions {
  ticksCount?: number;
  intervalMs?: number;
  storageDir?: string;
  symbols?: string[];
  injectSampleCatalyst?: boolean;
}

/**
 * Executes the Aegis Autonomous Agent against live Binance market data feeds
 */
export async function runLiveAgent(options: LiveRunnerOptions = {}) {
  const {
    ticksCount = 5,
    intervalMs = 2000,
    storageDir = './live_audit_logs',
    symbols = ['BNBUSDT', 'BTCUSDT', 'ETHUSDT'],
    injectSampleCatalyst = true
  } = options;

  console.log('='.repeat(70));
  console.log('⚡ STARTING AEGIS-BSTOCK LIVE BINANCE DATA AGENT');
  console.log(`Connecting to Binance Public REST API | Storage: ${storageDir}`);
  console.log(`Symbols: ${symbols.join(', ')} | Iterations: ${ticksCount}`);
  console.log('='.repeat(70));

  const agent = new AegisAutonomousAgent(10000, {
    storageDir,
    gitCommitSha: 'live-feed-v1'
  });

  const feedManager = new LiveFeedManager({
    defaultSymbols: symbols,
    klineLimit: 30
  });

  // Optional: Inject a live catalyst to demonstrate the Adversarial Skeptic under live conditions
  if (injectSampleCatalyst) {
    feedManager.getCatalystProvider().pushCatalyst('BNBUSDT', {
      headline: 'BNB Chain Announces Zero-Fee Real World Asset Tokenization Protocol with Tier-1 Custodian',
      sourceUriOrHash: 'official-binance-press-release',
      impactScore: 0.85,
      isHighImpact: true,
      confidenceScore: 0.95
    });
  }

  const sampleOnChainTxs: any[] = [];

  for (let i = 1; i <= ticksCount; i++) {
    console.log(`\n--- [Live Tick ${i}/${ticksCount}] Fetching real-time Binance orderbook & klines ---`);

    for (const symbol of symbols) {
      try {
        const tick = await feedManager.fetchTickForSymbol(symbol);
        const lastPrice = tick.candles[tick.candles.length - 1]?.close || 0;

        console.log(`[Market Feed] ${symbol} | Price: $${lastPrice.toFixed(2)} | Depth: $${tick.orderbookDepthUsd.toLocaleString()} | Candles: ${tick.candles.length}`);

        const receipt = await agent.processTick(tick);

        const action = receipt.councilReasoning.strategistProposal.action;
        const approved = receipt.councilReasoning.riskOfficerReview.approved;
        const status = receipt.executionRecord.status;
        const hashShort = receipt.receiptHash.slice(0, 12) + '...';

        console.log(
          `  └─ Council: ${action} | CRO Approved: ${approved ? '✅' : '❌'} | Status: ${status} | Receipt Hash: ${hashShort}`
        );

        if (receipt.catalyst) {
          console.log(
            `     └─ Catalyst Verification: Confidence=${receipt.catalyst.factCheckConfidence.toFixed(2)} | Verified=${receipt.catalyst.hasVerifiedCatalyst}`
          );
        }

        if (receipt.economicFeasibility) {
          console.log(
            `     └─ Net-Yield Feasibility: ExpectedEdge=$${receipt.economicFeasibility.expectedEdgeUsd.toFixed(2)} | NetYield=$${receipt.economicFeasibility.netYieldUsd.toFixed(2)} | Approved=${receipt.economicFeasibility.approved}`
          );
        }

        if (receipt.executionRecord.status === 'EXECUTED') {
          sampleOnChainTxs.push({
            txHash: receipt.executionRecord.txHash!,
            blockNumber: receipt.executionRecord.blockNumber!,
            timestamp: receipt.executionRecord.executionTimestamp!,
            symbol: receipt.marketContextSnapshot.symbol,
            action: receipt.councilReasoning.strategistProposal.action,
            amount: receipt.executionRecord.executedAmount!,
            price: receipt.executionRecord.executedPrice!
          });
        }
      } catch (err: any) {
        console.error(`Error processing live tick for ${symbol}:`, err.message);
      }
    }

    const p = agent.getPortfolio();
    console.log(
      `[Portfolio] Equity: $${p.totalEquityUsd.toFixed(2)} | Cash: $${p.cashUsd.toFixed(2)} | Trades: ${p.tradesCount} | Gas: ${p.totalGasSpentBnb.toFixed(5)} BNB`
    );

    if (i < ticksCount && intervalMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  const allReceipts = agent.getAuditLogger().getAllReceipts();
  console.log('\n' + '='.repeat(70));
  console.log('🔒 VERIFYING CRYPTOGRAPHIC AUDIT INTEGRITY OF LIVE RUN:');
  console.log('='.repeat(70));

  const auditResult = Stage3AuditValidator.verifyAuditTrail(
    allReceipts,
    sampleOnChainTxs,
    'live-feed-v1'
  );

  console.log(`Audit Passed:             ${auditResult.passed ? '✅ 100% VERIFIED' : '❌ FAILED'}`);
  console.log(`Total Live Receipts:      ${auditResult.totalDecisions}`);
  console.log(`Merkle Root Hash:         ${auditResult.merkleRoot}`);
  console.log('='.repeat(70) + '\n');

  return {
    portfolio: agent.getPortfolio(),
    auditResult
  };
}

if (process.argv[1]?.endsWith('live-runner.js') || process.argv[1]?.endsWith('live-runner.ts')) {
  runLiveAgent({ ticksCount: 3, intervalMs: 1000 }).catch(console.error);
}
