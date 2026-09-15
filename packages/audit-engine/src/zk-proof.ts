import { ZkAuditProof, AegisDecisionReceipt } from './types.js';
import { sha256 } from './merkle.js';

export class ZkProofSimulator {
  /**
   * Generates a deterministic succinct zk-SNARK / policy proof simulation.
   * Public Signals:
   * 1. exposureLimitPass: '0x1' if within macro exposure limit, else '0x0'
   * 2. netYieldPass: '0x1' if economic feasibility passes (alpha >= costs), else '0x0'
   * 3. noVetoPass: '0x1' if Chief Risk Officer did not trigger a veto, else '0x0'
   */
  public static generatePolicyProof(
    receiptDraft: Omit<AegisDecisionReceipt, 'previousReceiptHash' | 'receiptHash'>
  ): ZkAuditProof {
    const exposureLimitPass = receiptDraft.councilReasoning.riskOfficerReview.adjustedAllocationPct <= 
      receiptDraft.regime.maxAllowedExposurePct ? '0x1' : '0x0';
    
    const netYieldPass = receiptDraft.economicFeasibility.approved && 
      receiptDraft.economicFeasibility.netYieldUsd >= 0 ? '0x1' : '0x0';
    
    const noVetoPass = receiptDraft.councilReasoning.riskOfficerReview.approved ? '0x1' : '0x0';

    const publicSignals: [string, string, string] = [
      exposureLimitPass,
      netYieldPass,
      noVetoPass
    ];

    const proofSeed = {
      circuit: 'AegisPolicyProof_v1',
      decisionId: receiptDraft.decisionId,
      timestamp: receiptDraft.timestampUtc,
      publicSignals,
      councilHash: sha256(receiptDraft.councilReasoning)
    };

    const proofHash = `0xzk_${sha256(proofSeed)}`;
    const verifiedOnChain = (exposureLimitPass === '0x1' && netYieldPass === '0x1' && noVetoPass === '0x1') ||
      (!receiptDraft.councilReasoning.riskOfficerReview.approved); // Vetoes are also valid proofs of risk enforcement

    return {
      circuit: 'AegisPolicyProof_v1',
      proofHash,
      verifiedOnChain,
      publicSignals
    };
  }

  public static verifyProofSignals(proof: ZkAuditProof): boolean {
    return proof.circuit === 'AegisPolicyProof_v1' && 
           proof.proofHash.startsWith('0xzk_') &&
           proof.publicSignals.length === 3;
  }
}
