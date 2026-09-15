import * as fs from 'fs';
import * as path from 'path';
import { AegisDecisionReceipt } from './types.js';
import { sha256, MerkleTree } from './merkle.js';

export class WormAuditLogger {
  private logFilePath: string;
  private memoryReceipts: AegisDecisionReceipt[] = [];
  private lastHash: string = '0'.repeat(64);

  constructor(storageDir: string = './audit_logs') {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    this.logFilePath = path.join(storageDir, 'worm_audit_trail.jsonl');
    this.initializeFromExistingLog();
  }

  private initializeFromExistingLog() {
    if (fs.existsSync(this.logFilePath)) {
      const lines = fs.readFileSync(this.logFilePath, 'utf-8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const receipt: AegisDecisionReceipt = JSON.parse(line);
          this.memoryReceipts.push(receipt);
          this.lastHash = receipt.receiptHash;
        } catch {
          // ignore corrupted or trailing empty line
        }
      }
    }
  }

  public recordDecision(
    receiptDraft: Omit<AegisDecisionReceipt, 'previousReceiptHash' | 'receiptHash'>
  ): AegisDecisionReceipt {
    const previousReceiptHash = this.lastHash;
    
    // Compute deterministic payload hash
    const payloadToHash = {
      ...receiptDraft,
      previousReceiptHash
    };
    const receiptHash = sha256(payloadToHash);

    const fullReceipt: AegisDecisionReceipt = {
      ...receiptDraft,
      previousReceiptHash,
      receiptHash
    };

    // Append to file (Write-Once)
    fs.appendFileSync(this.logFilePath, JSON.stringify(fullReceipt) + '\n', 'utf-8');
    
    this.memoryReceipts.push(fullReceipt);
    this.lastHash = receiptHash;

    return fullReceipt;
  }

  public getAllReceipts(): AegisDecisionReceipt[] {
    return [...this.memoryReceipts];
  }

  public getReceiptByTxHash(txHash: string): AegisDecisionReceipt | undefined {
    return this.memoryReceipts.find(r => r.executionRecord.txHash === txHash);
  }

  public getMerkleRoot(): string {
    const hashes = this.memoryReceipts.map(r => r.receiptHash);
    const tree = new MerkleTree(hashes);
    return tree.getRoot();
  }
}
