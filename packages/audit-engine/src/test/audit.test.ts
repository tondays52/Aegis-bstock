import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { WormAuditLogger } from '../logger.js';
import { Stage3AuditValidator } from '../validator.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Audit Engine & WORM Log Tests', () => {
  const testDir = './test_audit_logs';

  it('records decisions and maintains cryptographic hash links', () => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }

    const logger = new WormAuditLogger(testDir);

    const receipt1 = logger.recordDecision({
      decisionId: 'dec-001',
      timestampUtc: new Date().toISOString(),
      agentVersion: {
        gitCommitSha: 'abc1234',
        manifestVersion: '1.0.0',
        modelId: 'gemini-2.5-pro'
      },
      marketContextSnapshot: {
        symbol: 'bAAPL',
        currentPrice: 220.5,
        orderbookDepthUsd: 500000,
        volatilityAtr14: 1.8,
        regime: 'BULL_TREND',
        newsSentimentScore: 0.75,
        timestamp: new Date().toISOString()
      },
      councilReasoning: {
        analystThesis: {
          catalystSummary: 'Strong Q3 earnings beat expected',
          sentimentScore: 0.8,
          macroOutlook: 'FAVORABLE'
        },
        strategistProposal: {
          action: 'BUY',
          targetAllocationPct: 15,
          entryTarget: 220.5,
          stopLoss: 215.0,
          takeProfit: 232.0,
          timeHorizonHours: 24,
          expectedAlphaBps: 150
        },
        riskOfficerReview: {
          approved: true,
          riskScore: 25,
          adjustedAllocationPct: 12,
          maxDrawdownImpactBps: 30
        }
      },
      preflightSimulation: {
        estimatedSlippageBps: 5,
        estimatedGasFeeBnb: 0.0004,
        expectedNetAlphaBps: 140,
        simulationPassed: true
      },
      executionRecord: {
        status: 'EXECUTED',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        blockNumber: 42000000,
        executedPrice: 220.55,
        executedAmount: 50,
        gasUsedBnb: 0.00038,
        executionTimestamp: new Date().toISOString()
      },
      regime: {
        state: 'BULL_TREND',
        maxAllowedExposurePct: 75,
        rationale: 'Confirmed bull trend with low volatility'
      },
      catalyst: {
        hasVerifiedCatalyst: true,
        sourceUriOrHash: 'sec:aapl-10q-q3',
        factCheckConfidence: 0.95,
        skepticCritique: 'Fact verification passed: Form 10-Q filing confirmed.'
      },
      economicFeasibility: {
        expectedEdgeUsd: 165.0,
        estimatedGasUsd: 0.24,
        estimatedSlippageUsd: 0.55,
        netYieldUsd: 164.21,
        approved: true
      }
    });

    assert.strictEqual(receipt1.previousReceiptHash, '0'.repeat(64));
    assert.ok(receipt1.receiptHash.length === 64);

    const receipts = logger.getAllReceipts();
    assert.strictEqual(receipts.length, 1);

    const auditResult = Stage3AuditValidator.verifyAuditTrail(receipts, [
      {
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        blockNumber: 42000000,
        timestamp: new Date().toISOString(),
        symbol: 'bAAPL',
        action: 'BUY',
        amount: 50,
        price: 220.55
      }
    ], 'abc1234');

    assert.strictEqual(auditResult.passed, true);
    assert.strictEqual(auditResult.unmappedTradesCount, 0);
    assert.strictEqual(auditResult.brokenHashLinks, 0);

    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
});
