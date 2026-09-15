import React from 'react';
import { Newspaper, BrainCircuit, ShieldAlert, Cpu, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { DecisionReceiptView } from '../types.js';

interface CouncilDebateProps {
  latestDecision?: DecisionReceiptView;
}

export const CouncilDebateView: React.FC<CouncilDebateProps> = ({ latestDecision }) => {
  if (!latestDecision) {
    return (
      <div className="glass-panel p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
        <BrainCircuit className="w-12 h-12 text-[#94A3B8] mb-3 animate-pulse" />
        <h3 className="text-lg font-semibold text-white">System 2 Council Idle</h3>
        <p className="text-xs text-[#94A3B8] max-w-sm mt-1">
          Start the simulation or process a tick to observe real-time multi-agent reasoning, thesis formulation, and adversarial CRO vetoes.
        </p>
      </div>
    );
  }

  const {
    symbol,
    currentPrice,
    regime,
    analystThesis,
    strategistProposal,
    riskOfficerReview,
    preflightSimulation,
    executionRecord
  } = latestDecision;

  return (
    <div className="glass-panel p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <BrainCircuit className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              System 2: Cognitive Multi-Agent Council Debate
            </h2>
            <p className="text-xs text-[#94A3B8]">
              Autonomous 4-Stage Deliberation DAG for <span className="text-white font-mono font-bold">{symbol}</span> @ ${currentPrice.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
            executionRecord.status === 'EXECUTED'
              ? 'badge-green'
              : executionRecord.status === 'REJECTED_BY_RISK'
              ? 'badge-red'
              : 'badge-yellow'
          }`}>
            {executionRecord.status === 'EXECUTED' && <CheckCircle2 className="w-3.5 h-3.5" />}
            {executionRecord.status === 'REJECTED_BY_RISK' && <XCircle className="w-3.5 h-3.5" />}
            {executionRecord.status}
          </span>
        </div>
      </div>

      {/* 4 Multi-Agent Council Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* Agent 1: Macro & News Analyst */}
        <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <Newspaper className="w-4 h-4" /> 1. Macro Analyst
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300">
                Sentiment: {(analystThesis.sentimentScore * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed italic">
              "{analystThesis.catalystSummary}"
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-[#94A3B8]">Macro Outlook:</span>
            <span className={`font-mono font-bold ${
              analystThesis.macroOutlook === 'FAVORABLE' ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {analystThesis.macroOutlook}
            </span>
          </div>
        </div>

        {/* Agent 2: Alpha Strategist */}
        <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Cpu className="w-4 h-4" /> 2. Alpha Strategist
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                strategistProposal.action === 'BUY'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : strategistProposal.action === 'SELL'
                  ? 'bg-rose-500/10 text-rose-400'
                  : 'bg-slate-500/10 text-slate-300'
              }`}>
                {strategistProposal.action} ({strategistProposal.targetAllocationPct}%)
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#94A3B8]">
                <span>Stop Loss:</span>
                <span className="text-rose-400 font-mono font-semibold">${strategistProposal.stopLoss.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>Take Profit:</span>
                <span className="text-emerald-400 font-mono font-semibold">${strategistProposal.takeProfit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>Expected Alpha:</span>
                <span className="text-amber-300 font-mono font-semibold">+{strategistProposal.expectedAlphaBps} bps</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-[#94A3B8]">
            Fractional Kelly Target: <span className="text-white font-mono">{strategistProposal.targetAllocationPct}%</span>
          </div>
        </div>

        {/* Agent 3: Adversarial CRO Veto */}
        <div className={`rounded-xl p-4 flex flex-col justify-between border ${
          riskOfficerReview.approved
            ? 'bg-emerald-950/20 border-emerald-500/20'
            : 'bg-rose-950/20 border-rose-500/20'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-bold flex items-center gap-1.5 ${
                riskOfficerReview.approved ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                <ShieldAlert className="w-4 h-4" /> 3. Adversarial CRO
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                riskOfficerReview.approved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}>
                Risk: {riskOfficerReview.riskScore}/100
              </span>
            </div>
            {riskOfficerReview.approved ? (
              <p className="text-xs text-emerald-300 leading-relaxed">
                Passed risk threshold. Tail risk contained. Allocation scaled to{' '}
                <span className="font-bold font-mono text-white">{riskOfficerReview.adjustedAllocationPct}%</span>.
              </p>
            ) : (
              <p className="text-xs text-rose-300 leading-relaxed font-mono">
                {riskOfficerReview.vetoReason || 'VETO EXERCISED: Proposal breached safety boundary.'}
              </p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-[#94A3B8]">Veto Status:</span>
            <span className={`font-mono font-bold ${
              riskOfficerReview.approved ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {riskOfficerReview.approved ? 'AUTHORIZED' : 'HARD VETO'}
            </span>
          </div>
        </div>

        {/* Agent 4: Preflight Simulation */}
        <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> 4. Pre-Flight Sim
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                preflightSimulation.simulationPassed
                  ? 'bg-purple-500/10 text-purple-300'
                  : 'bg-rose-500/10 text-rose-400'
              }`}>
                {preflightSimulation.simulationPassed ? 'PASSED' : 'REJECTED'}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#94A3B8]">
                <span>Pool Slippage:</span>
                <span className="text-white font-mono">{preflightSimulation.estimatedSlippageBps} bps</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>Est. BNB Gas:</span>
                <span className="text-amber-300 font-mono">{preflightSimulation.estimatedGasFeeBnb} BNB</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>Net Alpha:</span>
                <span className="text-emerald-400 font-mono font-bold">+{preflightSimulation.expectedNetAlphaBps} bps</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-[#94A3B8] flex items-center justify-between">
            <span>TX Routing:</span>
            <span className="text-purple-300 font-mono">Binance Web3 API</span>
          </div>
        </div>

      </div>
    </div>
  );
};
