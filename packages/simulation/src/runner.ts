import { AegisAutonomousAgent } from '@aegis/agent-core';
import { Stage3AuditValidator } from '@aegis/audit-engine';
import { HistoricalMarketGenerator } from './market-generator.js';
import * as fs from 'fs';

export async function run14DaySimulation() {
  console.log('='.repeat(70));
  console.log('🚀 STARTING 14-DAY AUTONOMOUS AEGIS-BSTOCK BENCHMARK RUN');
  console.log('Target: Binance Agentic AI Challenge (BNB Smart Chain)');
  console.log('='.repeat(70));

  const simStorageDir = './sim_audit_logs';
  if (fs.existsSync(simStorageDir)) {
    fs.rmSync(simStorageDir, { recursive: true, force: true });
  }

  const openingEquity = 10000; // $10,000 starting capital
  const agent = new AegisAutonomousAgent(openingEquity, {
    storageDir: simStorageDir,
    gitCommitSha: '7f9c2a1-hackathon-final'
  });

  const generator = new HistoricalMarketGenerator();
  const ticks = generator.generate14DayStream();

  console.log(`\n[Data Engine] Ingesting 14 days of streaming bStocks market ticks (${ticks.length} ticks across 5 bStocks)...`);

  let dayCounter = 1;
  const sampleOnChainTxs: any[] = [];

  for (let i = 0; i < ticks.length; i++) {
    const tick = ticks[i];
    const currentDay = Math.floor(i / (5 * 24)) + 1;

    if (currentDay > dayCounter) {
      dayCounter = currentDay;
      const p = agent.getPortfolio();
      console.log(
        `[Day ${dayCounter - 1} Summary] Equity: $${p.totalEquityUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })} | ` +
        `Cash: $${p.cashUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })} | ` +
        `Max DD: ${p.maxDrawdownPct.toFixed(2)}% | Trades: ${p.tradesCount}`
      );
    }

    const receipt = await agent.processTick(tick);

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
  }

  const finalPortfolio = agent.getPortfolio();
  const finalScorePct = ((finalPortfolio.totalEquityUsd - openingEquity) / openingEquity) * 100;
  const allReceipts = agent.getAuditLogger().getAllReceipts();

  console.log('\n' + '='.repeat(70));
  console.log('📊 14-DAY BENCHMARK RUN RESULTS:');
  console.log('='.repeat(70));
  console.log(`Opening Wallet Equity:    $${openingEquity.toFixed(2)}`);
  console.log(`Final Wallet Equity:      $${finalPortfolio.totalEquityUsd.toFixed(2)}`);
  console.log(`Proposed FinalScore (%):  ${finalScorePct >= 0 ? '+' : ''}${finalScorePct.toFixed(2)}%`);
  console.log(`Maximum Drawdown (MDD):   ${finalPortfolio.maxDrawdownPct.toFixed(2)}%`);
  console.log(`Total Executed Trades:    ${finalPortfolio.tradesCount}`);
  console.log(`Total Trading Fees:       $${finalPortfolio.totalTradingFeesUsd.toFixed(2)}`);
  console.log(`Total Gas Spent on BNB:   ${finalPortfolio.totalGasSpentBnb.toFixed(5)} BNB`);
  console.log(`Total Decision Receipts:  ${allReceipts.length}`);

  console.log('\n' + '='.repeat(70));
  console.log('🔍 RUNNING STAGE 3 WINNER AUDIT VERIFICATION:');
  console.log('='.repeat(70));

  const auditResult = Stage3AuditValidator.verifyAuditTrail(
    allReceipts,
    sampleOnChainTxs,
    '7f9c2a1-hackathon-final'
  );

  console.log(`Audit Status:             ${auditResult.passed ? '✅ PASSED (100% COMPLIANT)' : '❌ FAILED'}`);
  console.log(`Total Decisions Audited:  ${auditResult.totalDecisions}`);
  console.log(`Unmapped Trades Count:    ${auditResult.unmappedTradesCount} (Target: 0)`);
  console.log(`Broken Hash Links:        ${auditResult.brokenHashLinks} (Target: 0)`);
  console.log(`Version Gaps:             ${auditResult.versionGaps} (Target: 0)`);
  console.log(`Merkle Root Hash:         ${auditResult.merkleRoot}`);
  console.log('='.repeat(70) + '\n');

  return {
    finalPortfolio,
    finalScorePct,
    auditResult
  };
}

if (process.argv[1]?.endsWith('runner.js') || process.argv[1]?.endsWith('runner.ts')) {
  run14DaySimulation().catch(console.error);
}
