import React, { useState, useEffect } from 'react';

interface CouncilMember {
  role: string;
  name: string;
  badgeColor: string;
  status: 'APPROVED' | 'VETOED' | 'STANDBY' | 'EVALUATING';
  thesis: string;
  latencyMs: number;
  stage: string;
  gateLabel: string;
  gateValue: string;
}

interface AuditReceipt {
  id: string;
  time: string;
  symbol: string;
  regime: string;
  modelTier: 'TIER_1_FAST' | 'TIER_2_FRONTIER';
  action: 'BUY' | 'SELL' | 'HOLD';
  croStatus: 'PASSED' | 'VETOED';
  netYield: number;
  hash: string;
  zkCircuit: string;
  zkProofHash: string;
  zkVerified: boolean;
  zkSignals: [string, string, string];
  failureMemoryMatch?: string;
  mevRisk?: string;
  computeCostUsd: number;
  privateRpc: boolean;
  txHash?: string;
}

export default function App() {
  const [isRunning, setIsRunning] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'VETOED' | 'EXECUTED'>('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState<AuditReceipt | null>(null);
  const [blackSwanActive, setBlackSwanActive] = useState(false);
  const [activeModelTier, setActiveModelTier] = useState<'TIER_1_FAST' | 'TIER_2_FRONTIER'>('TIER_1_FAST');
  const [atrLookbackMode, setAtrLookbackMode] = useState<string>('ATR-14 [Auto-tuned]');

  // Mock initial streaming telemetry data
  const [receipts, setReceipts] = useState<AuditReceipt[]>([
    {
      id: "REC-9482",
      time: "21:52:14",
      symbol: "bTSLA/USDT",
      regime: "BULL_TREND",
      modelTier: "TIER_1_FAST",
      action: "BUY",
      croStatus: "PASSED",
      netYield: 14.82,
      hash: "0x7f9c2a1883cce84094fe31a21e25d259e8b428a1",
      zkCircuit: "AegisPolicyProof_v1",
      zkProofHash: "0xzk_8b9f1a23e59048c17b43a921d09e8471b3e940182",
      zkVerified: true,
      zkSignals: ["0x1", "0x1", "0x1"],
      failureMemoryMatch: "RAG Clear: No similar failure in 72h (<12% similarity)",
      mevRisk: "Private 48Club Route: 0 mempool leak, 0 sandwich risk",
      computeCostUsd: 0.00018,
      privateRpc: true,
      txHash: "0x4f81c9a78104d53890214c71829104fa2891bbd1290348719283719283749182"
    },
    {
      id: "REC-9481",
      time: "21:49:03",
      symbol: "bNVDA/USDT",
      regime: "CHOP_HIGH_VOL",
      modelTier: "TIER_2_FRONTIER",
      action: "HOLD",
      croStatus: "VETOED",
      netYield: -1.45,
      hash: "0xa381ef0178392014819034871928371928374918",
      zkCircuit: "AegisPolicyProof_v1",
      zkProofHash: "0xzk_4a1801f92e847b290194821a8f9024c189b418290",
      zkVerified: true,
      zkSignals: ["0x0", "0x0", "0x0"],
      failureMemoryMatch: "RAG VETO: 91% similarity with fail-9381 (Whipsaw in low liquidity)",
      mevRisk: "Abort: Pool impact 48 bps > 25 bps tolerance",
      computeCostUsd: 0.00340,
      privateRpc: true,
      txHash: undefined
    }
  ]);

  const [council, setCouncil] = useState<CouncilMember[]>([
    {
      role: "Idea 1: Macro Controller",
      name: "Macro Analyst",
      badgeColor: "bg-blue-500/15 border-blue-500/30 text-blue-300",
      status: "APPROVED",
      thesis: "ATR index compressed at 1.42 (Adaptive 14-period lookback). BSC Gas stable (3 Gwei). Macro regime classified as BULL_TREND. Exposure ceiling set to 75%.",
      latencyMs: 38,
      stage: "STAGE 1",
      gateLabel: "EXPOSURE GATE",
      gateValue: "PASSED (75% CAP)"
    },
    {
      role: "Idea 2: Fact-Check Skeptic",
      name: "Alpha Strategist",
      badgeColor: "bg-purple-500/15 border-purple-500/30 text-purple-300",
      status: "APPROVED",
      thesis: "Valid catalyst confirmed via primary wire (Bloomberg API). Headline impact +85%. Adversarial spoof probability < 0.08. Rumor noise rejected.",
      latencyMs: 240,
      stage: "STAGE 2",
      gateLabel: "FACT-CHECK CONFIDENCE",
      gateValue: "0.92 VERIFIED"
    },
    {
      role: "Idea 3: Net-Yield Gate",
      name: "Pre-Flight Simulator",
      badgeColor: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
      status: "APPROVED",
      thesis: "Gross Edge: $18.40. Costs: $3.58 (Gas: $0.18 + Slippage: $3.40). Alpha/Cost ratio 5.14x clears 3.0x requirement. Private 48Club RPC route active.",
      latencyMs: 22,
      stage: "STAGE 3",
      gateLabel: "NET YIELD PROJECTED",
      gateValue: "+$14.82 USD"
    },
    {
      role: "Idea 3: Risk Arbiter & Kelly",
      name: "Chief Risk Officer",
      badgeColor: "bg-amber-500/15 border-amber-500/30 text-amber-300",
      status: "APPROVED",
      thesis: "Quarter-Kelly allocation: 14.8% ($1,480). Drawdown 0.00% / 5.00% tie-breaker cap. RAG failure similarity 0.04 (Clear). ZK policy proof generated.",
      latencyMs: 14,
      stage: "STAGE 4",
      gateLabel: "VETO ARBITER GATE",
      gateValue: "UNRESTRICTED"
    }
  ]);

  // Streaming ticker simulation
  useEffect(() => {
    let interval: any = null;
    if (isRunning && !blackSwanActive) {
      interval = setInterval(() => {
        const symbols = ['bTSLA/USDT', 'bNVDA/USDT', 'bAAPL/USDT', 'BNB/USDT'];
        const sym = symbols[Math.floor(Math.random() * symbols.length)];
        const isBuy = Math.random() > 0.4;
        const passed = Math.random() > 0.25;
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];

        const isFrontier = Math.random() > 0.65;
        setActiveModelTier(isFrontier ? 'TIER_2_FRONTIER' : 'TIER_1_FAST');

        const newRec: AuditReceipt = {
          id: `REC-${Math.floor(1000 + Math.random() * 9000)}`,
          time: timeStr,
          symbol: sym,
          regime: isBuy ? 'BULL_TREND' : 'CHOP_HIGH_VOL',
          modelTier: isFrontier ? 'TIER_2_FRONTIER' : 'TIER_1_FAST',
          action: isBuy ? 'BUY' : 'HOLD',
          croStatus: passed ? 'PASSED' : 'VETOED',
          netYield: passed ? +(Math.random() * 25 + 5).toFixed(2) : -(+(Math.random() * 4).toFixed(2)),
          hash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
          zkCircuit: "AegisPolicyProof_v1",
          zkProofHash: `0xzk_${Math.random().toString(16).substring(2, 14)}${Math.random().toString(16).substring(2, 14)}`,
          zkVerified: true,
          zkSignals: passed ? ["0x1", "0x1", "0x1"] : ["0x0", "0x0", "0x0"],
          failureMemoryMatch: passed ? 'RAG Clear: Similarity < 15%' : 'RAG VETO: 88% Match with past slippage trap',
          mevRisk: 'Private 48Club Route: 0 mempool leakage',
          computeCostUsd: isFrontier ? 0.0032 : 0.00015,
          privateRpc: true,
          txHash: passed ? `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}` : undefined
        };

        setReceipts((prev) => [newRec, ...prev.slice(0, 30)]);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, blackSwanActive]);

  const handleTriggerCatalyst = (safe: boolean, title: string, src: string) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setActiveModelTier('TIER_2_FRONTIER'); // High impact triggers Tier 2
    setAtrLookbackMode('ATR-5 [Spike-Tuned]');
    
    if (safe) {
      setCouncil([
        {
          role: "Idea 1: Macro Controller",
          name: "Macro Analyst",
          badgeColor: "bg-blue-500/15 border-blue-500/30 text-blue-300",
          status: "APPROVED",
          thesis: `Catalyst ingested: "${title}". Adaptive ATR compressed to 5 periods. Regime classified as BULL_TREND.`,
          latencyMs: 42,
          stage: "STAGE 1",
          gateLabel: "EXPOSURE GATE",
          gateValue: "PASSED (75% CAP)"
        },
        {
          role: "Idea 2: Fact-Check Skeptic",
          name: "Alpha Strategist",
          badgeColor: "bg-purple-500/15 border-purple-500/30 text-purple-300",
          status: "APPROVED",
          thesis: `Frontier Deep Reasoning: Authentic primary release confirmed via ${src}. Impact score +85 bps. RAG Failure similarity: 0.04 (Clear).`,
          latencyMs: 235,
          stage: "STAGE 2",
          gateLabel: "FACT-CHECK CONFIDENCE",
          gateValue: "0.95 VERIFIED"
        },
        {
          role: "Idea 3: Net-Yield Gate",
          name: "Pre-Flight Simulator",
          badgeColor: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
          status: "APPROVED",
          thesis: "Expected edge $24.50 > Gas & DEX fees $2.80. Net yield +$21.70. Private 48Club RPC route armed.",
          latencyMs: 28,
          stage: "STAGE 3",
          gateLabel: "NET YIELD PROJECTED",
          gateValue: "+$21.70 USD"
        },
        {
          role: "Idea 3: Risk Arbiter & Kelly",
          name: "Chief Risk Officer",
          badgeColor: "bg-amber-500/15 border-amber-500/30 text-amber-300",
          status: "APPROVED",
          thesis: "Quarter-Kelly allocation: 18.5% ($1,850). Drawdown within limits (0.00% / 5.00%). ZK policy proof generated.",
          latencyMs: 16,
          stage: "STAGE 4",
          gateLabel: "VETO ARBITER GATE",
          gateValue: "UNRESTRICTED"
        }
      ]);

      const newRec: AuditReceipt = {
        id: `REC-${Math.floor(1000 + Math.random() * 9000)}`,
        time: timeStr,
        symbol: "BNB/USDT",
        regime: "BULL_TREND",
        modelTier: "TIER_2_FRONTIER",
        action: "BUY",
        croStatus: "PASSED",
        netYield: 21.70,
        hash: `0x7f9c2a1883cce84094fe31a21e25d259e8b428a1${Math.random().toString(16).substring(2, 6)}`,
        zkCircuit: "AegisPolicyProof_v1",
        zkProofHash: `0xzk_${Math.random().toString(16).substring(2, 14)}${Math.random().toString(16).substring(2, 14)}`,
        zkVerified: true,
        zkSignals: ["0x1", "0x1", "0x1"],
        failureMemoryMatch: "RAG Clear: Similarity 0.04",
        mevRisk: "Private 48Club Route: 0 mempool leak",
        computeCostUsd: 0.00360,
        privateRpc: true,
        txHash: "0x3918401824109841298412098412098412098412098412098412098412098412"
      };
      setReceipts((prev) => [newRec, ...prev]);
    } else {
      setCouncil([
        {
          role: "Idea 1: Macro Controller",
          name: "Macro Analyst",
          badgeColor: "bg-blue-500/15 border-blue-500/30 text-blue-300",
          status: "EVALUATING",
          thesis: `High volatility detected from unconfirmed headline "${title}". Regime shifted to CHOP_HIGH_VOL.`,
          latencyMs: 50,
          stage: "STAGE 1",
          gateLabel: "EXPOSURE GATE",
          gateValue: "RESTRICTED (0%)"
        },
        {
          role: "Idea 2: Fact-Check Skeptic",
          name: "Alpha Strategist",
          badgeColor: "bg-purple-500/15 border-purple-500/30 text-purple-300",
          status: "VETOED",
          thesis: `Skeptic Flagged: Unconfirmed social rumor from ${src}. Zero SEC/on-chain proof found. Spoofing probability 0.92.`,
          latencyMs: 290,
          stage: "STAGE 2",
          gateLabel: "FACT-CHECK CONFIDENCE",
          gateValue: "0.08 (REJECTED)"
        },
        {
          role: "Idea 3: Net-Yield Gate",
          name: "Pre-Flight Simulator",
          badgeColor: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
          status: "STANDBY",
          thesis: "Execution halted by upstream Adversarial Skeptic veto. Zero capital risked.",
          latencyMs: 4,
          stage: "STAGE 3",
          gateLabel: "NET YIELD PROJECTED",
          gateValue: "$0.00 USD"
        },
        {
          role: "Idea 3: Risk Arbiter & Kelly",
          name: "Chief Risk Officer",
          badgeColor: "bg-rose-500/15 border-rose-500/30 text-rose-300",
          status: "VETOED",
          thesis: "CRO Absolute Veto: RAG Match 92% similarity with previous rumor loss + zero primary verification.",
          latencyMs: 12,
          stage: "STAGE 4",
          gateLabel: "VETO ARBITER GATE",
          gateValue: "VETO TRIGGERED"
        }
      ]);

      const newRec: AuditReceipt = {
        id: `REC-${Math.floor(1000 + Math.random() * 9000)}`,
        time: timeStr,
        symbol: "bNVDA/USDT",
        regime: "CHOP_HIGH_VOL",
        modelTier: "TIER_2_FRONTIER",
        action: "HOLD",
        croStatus: "VETOED",
        netYield: 0.00,
        hash: `0xa381ef0178392014819034871928371928374918${Math.random().toString(16).substring(2, 6)}`,
        zkCircuit: "AegisPolicyProof_v1",
        zkProofHash: `0xzk_${Math.random().toString(16).substring(2, 14)}${Math.random().toString(16).substring(2, 14)}`,
        zkVerified: true,
        zkSignals: ["0x0", "0x0", "0x0"],
        failureMemoryMatch: "RAG VETO: 92% match with past rumor stop-out",
        mevRisk: "Abort: Trade blocked before chain submission",
        computeCostUsd: 0.00340,
        privateRpc: true,
        txHash: undefined
      };
      setReceipts((prev) => [newRec, ...prev]);
    }
  };

  const handleTriggerBlackSwan = () => {
    setBlackSwanActive(true);
    setActiveModelTier('TIER_2_FRONTIER');
    setAtrLookbackMode('ATR-5 [PANIC COMPRESSION]');
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    setCouncil([
      {
        role: "Idea 1: Macro Controller",
        name: "Macro Analyst",
        badgeColor: "bg-rose-500/15 border-rose-500/30 text-rose-300",
        status: "VETOED",
        thesis: "CRITICAL: BTC (-4.0x ATR), ETH (-3.3x ATR), bTSLA (-3.3x ATR) dropping simultaneously. Systemic Contagion confirmed.",
        latencyMs: 65,
        stage: "STAGE 1",
        gateLabel: "EXPOSURE GATE",
        gateValue: "LOCKDOWN (0%)"
      },
      {
        role: "Idea 2: Fact-Check Skeptic",
        name: "Alpha Strategist",
        badgeColor: "bg-rose-500/15 border-rose-500/30 text-rose-300",
        status: "VETOED",
        thesis: "Frontier Deep Reasoning: Global liquidity contagion active. Liquidating all bStock positions to USDT/USDC.",
        latencyMs: 310,
        stage: "STAGE 2",
        gateLabel: "TACTICAL ACTION",
        gateValue: "AUTO-LIQUIDATE"
      },
      {
        role: "Idea 3: Net-Yield Gate",
        name: "Pre-Flight Simulator",
        badgeColor: "bg-rose-500/15 border-rose-500/30 text-rose-300",
        status: "STANDBY",
        thesis: "Trading engine locked. Open orders cancelled. Capital sheltered in stablecoins.",
        latencyMs: 6,
        stage: "STAGE 3",
        gateLabel: "CIRCUIT BREAKER",
        gateValue: "HALTED"
      },
      {
        role: "Idea 3: Risk Arbiter & Kelly",
        name: "Chief Risk Officer",
        badgeColor: "bg-rose-500/15 border-rose-500/30 text-rose-300",
        status: "VETOED",
        thesis: "BLACK SWAN DEFENSIVE LOCK ACTIVATED. Mandating 10-tick cool-down period. 0 capital exposed to tail risk.",
        latencyMs: 15,
        stage: "STAGE 4",
        gateLabel: "VETO ARBITER GATE",
        gateValue: "DEFENSIVE_LOCK"
      }
    ]);

    const newRec: AuditReceipt = {
      id: `REC-${Math.floor(1000 + Math.random() * 9000)}`,
      time: timeStr,
      symbol: "ALL_BSTOCKS",
      regime: "BLACK_SWAN_LOCK",
      modelTier: "TIER_2_FRONTIER",
      action: "HOLD",
      croStatus: "VETOED",
      netYield: 0.00,
      hash: `0xblackswan${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
      zkCircuit: "AegisPolicyProof_v1",
      zkProofHash: `0xzk_blackswan_${Math.random().toString(16).substring(2, 14)}`,
      zkVerified: true,
      zkSignals: ["0x0", "0x0", "0x0"],
      failureMemoryMatch: "Contagion Tripped: 3 assets dropped >2.5x daily ATR",
      mevRisk: "All trades halted. Safe stablecoin shelter.",
      computeCostUsd: 0.00410,
      privateRpc: true,
      txHash: undefined
    };
    setReceipts((prev) => [newRec, ...prev]);
  };

  const handleInspectReceipt = (r: AuditReceipt) => {
    setSelectedReceipt(r);
  };

  const filteredReceipts = receipts.filter((r) => {
    if (activeTab === 'VETOED') return r.croStatus === 'VETOED';
    if (activeTab === 'EXECUTED') return r.croStatus === 'PASSED' && r.action === 'BUY';
    return true;
  });

  return (
    <div className="h-screen w-screen bg-[#0a0d14] text-slate-100 flex flex-col font-sans overflow-hidden select-none">
      {/* Black Swan Emergency Alert Banner */}
      {blackSwanActive && (
        <div className="bg-rose-950/90 border-b border-rose-500/50 px-6 py-2 flex items-center justify-between animate-pulse shrink-0">
          <div className="flex items-center gap-2.5 text-xs font-mono text-rose-300 font-bold">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <span>⚠️ BLACK SWAN DEFENSIVE LOCK ACTIVE: 3+ Assets dropped &gt; 2.5x daily ATR. Capital Sheltered in Stablecoins.</span>
          </div>
          <button
            onClick={() => {
              setBlackSwanActive(false);
              setAtrLookbackMode('ATR-14 [Auto-tuned]');
            }}
            className="px-2.5 py-0.5 rounded bg-rose-800 hover:bg-rose-700 text-[10px] font-mono font-bold text-white cursor-pointer"
          >
            DISARM LOCKDOWN
          </button>
        </div>
      )}

      {/* Institutional Top Control Bar */}
      <header className="h-14 border-b border-slate-800/80 bg-[#0d111c] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-lg bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 flex items-center justify-center font-bold text-sm shadow-[0_0_12px_rgba(234,179,8,0.2)]">
              🛡️
            </span>
            <span className="font-black tracking-tight text-lg text-white">
              AEGIS<span className="text-yellow-400">-bStock</span>
            </span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-yellow-400/90 border border-slate-700">
              MAINNET ENGINE
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            {/* Model Tier Badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80">
              <span className={`h-1.5 w-1.5 rounded-full ${activeModelTier === 'TIER_2_FRONTIER' ? 'bg-purple-400 animate-ping' : 'bg-blue-400'}`} />
              <span className="text-[11px] text-slate-300 font-semibold">
                Tier: <strong className={activeModelTier === 'TIER_2_FRONTIER' ? 'text-purple-400' : 'text-blue-400'}>{activeModelTier}</strong>
              </span>
            </div>

            {/* Private RPC Badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Private RPC: <strong>48Club</strong></span>
            </div>

            {/* Systemic Status Badge */}
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] ${
              blackSwanActive ? 'bg-rose-950/40 border-rose-500/40 text-rose-400' : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}>
              <span>Systemic: <strong className={blackSwanActive ? 'text-rose-400' : 'text-emerald-400'}>{blackSwanActive ? 'DEFENSIVE_LOCK' : 'NORMAL'}</strong></span>
            </div>

            {/* ZK Proof Badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-400 text-[11px]">
              <span>ZK: <strong>Plonk Policy Verified</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsRunning(!isRunning)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-mono font-bold tracking-wide transition border shadow-sm cursor-pointer ${
              isRunning 
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 hover:bg-rose-500/20' 
                : 'bg-yellow-500 border-yellow-400 text-slate-950 hover:bg-yellow-400 shadow-yellow-500/20'
            }`}
          >
            {isRunning ? '◼ PAUSE STREAM' : '▶ RESUME 14-DAY RUN'}
          </button>
        </div>
      </header>

      {/* KPI Metric Strip */}
      <section className="h-20 border-b border-slate-800/80 bg-[#0c101a] px-6 py-2 grid grid-cols-4 gap-4 shrink-0">
        {/* Metric 1: Equity */}
        <div className="flex flex-col justify-center border-r border-slate-800/60 pr-4">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
            <span>Wallet Equity (Scored)</span>
            <span className="text-emerald-400 font-bold">+0.15%</span>
          </div>
          <div className="text-xl font-mono font-bold text-white tracking-tight mt-0.5">
            $10,014.82 <span className="text-xs font-normal text-slate-500">USDC</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Net PnL: +$14.82 USD</div>
        </div>

        {/* Metric 2: Drawdown (Tie Breaker) */}
        <div className="flex flex-col justify-center border-r border-slate-800/60 pr-4">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
            <span>Max Drawdown (Tie-Breaker)</span>
            <span className="text-yellow-400 font-bold">0.00%</span>
          </div>
          <div className="w-full bg-slate-800/80 rounded-full h-2 mt-2 overflow-hidden border border-slate-700/40">
            <div className="bg-emerald-400 h-full w-[0%]" />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>Peak: $10,014.82</span>
            <span>Budget: 5.00% Max</span>
          </div>
        </div>

        {/* Metric 3: Active Macro Regime (Idea 1 & Adaptive Lookback) */}
        <div className="flex flex-col justify-center border-r border-slate-800/60 pr-4">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
            <span>Macro Regime (Adaptive Window)</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-sm font-mono font-black px-2 py-0.5 rounded border ${
              blackSwanActive ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
            }`}>
              {blackSwanActive ? 'BLACK_SWAN_LOCK' : 'BULL_TREND'}
            </span>
            <span className="text-[11px] font-mono text-slate-300"><strong>{atrLookbackMode}</strong></span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Cap: {blackSwanActive ? '0.0%' : '75.0%'} | RAG: Clear</div>
        </div>

        {/* Metric 4: Net-Yield Gatekeeper & Compute Drag */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
            <span>Pre-Flight Gate & Compute Drag</span>
            <span className="text-emerald-400 font-bold">ARMED</span>
          </div>
          <div className="text-xl font-mono font-bold text-white tracking-tight mt-0.5">
            $0.18 <span className="text-xs font-normal text-slate-500">Gas + $0.00018 Token</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Kelly (0.25x) &bull; ZK-Proof Active</div>
        </div>
      </section>

      {/* Main Grid Viewport */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0 overflow-hidden bg-[#090c13]">
        {/* Left Column: Markets & Interactive Catalyst/Black Swan Injector */}
        <div className="col-span-4 flex flex-col gap-4 min-h-0">
          {/* Market Watch */}
          <div className="border border-slate-800/80 rounded-xl bg-[#0e1320] p-4 flex flex-col shrink-0 shadow-sm">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-3 flex items-center justify-between">
              <span>Tokenized bStock Feeds</span>
              <span className="text-[10px] text-slate-500">BINANCE L2 DEPTH</span>
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { s: "bTSLA/USDT", p: "$242.80", c: "+1.85%", up: true, d: "$125k" },
                { s: "bNVDA/USDT", p: "$135.40", c: "-0.95%", up: false, d: "$210k" },
                { s: "bAAPL/USDT", p: "$224.50", c: "+0.45%", up: true, d: "$340k" },
                { s: "BNB/USDT", p: "$718.95", c: "+3.42%", up: true, d: "$580k" }
              ].map((m) => (
                <div key={m.s} className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5 font-mono hover:border-slate-700 transition">
                  <div className="flex justify-between text-xs font-semibold text-slate-200">
                    <span>{m.s}</span>
                    <span className={m.up ? "text-emerald-400" : "text-rose-400"}>{m.c}</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-1 text-[11px] text-slate-400">
                    <span className="text-white font-bold">{m.p}</span>
                    <span className="text-[10px] text-slate-500">Depth: {m.d}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Catalyst & Black Swan Injector */}
          <div className="border border-slate-800/80 rounded-xl bg-[#0e1320] p-4 flex-1 flex flex-col min-h-0 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                <span>⚡</span> Adversarial Testing Deck
              </span>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">
                TIER ROUTER &amp; ZK
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Trigger event headlines or systemic market stress to test multi-tier reasoning &amp; defensive locks:
            </p>
            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {[
                { title: "BNB Chain Announces Zero-Fee Real-World Asset Tokenization Standard", src: "Official Press Release", conf: "+85%", safe: true },
                { title: "Unverified Telegram Rumor: Major Token Delisting and Regulatory Audit", src: "Twitter / Telegram Noise", conf: "-90%", safe: false },
                { title: "Federal Reserve Signals Interest Rate Cut & Global Liquidity Expansion", src: "Reuters Macro", conf: "+65%", safe: true }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTriggerCatalyst(item.safe, item.title, item.src)}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/70 transition flex flex-col gap-1 cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200 group-hover:text-white">
                    <span>{item.title}</span>
                    <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                      item.safe ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {item.conf}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Source: {item.src}</span>
                </button>
              ))}

              {/* Black Swan Contagion Trigger Button */}
              <button
                onClick={handleTriggerBlackSwan}
                className="w-full text-left p-2.5 rounded-lg border border-rose-500/40 bg-rose-950/30 hover:bg-rose-900/40 transition flex items-center justify-between cursor-pointer group mt-2"
              >
                <div>
                  <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <span>🚨</span> TRIGGER BLACK SWAN CONTAGION
                  </div>
                  <span className="text-[10px] text-rose-400/80 font-mono">Simulate 3+ Assets dropping &gt; 2.5x ATR</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  TEST VETO
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Agent Council & Cryptographic WORM Audit Trail */}
        <div className="col-span-8 flex flex-col gap-4 min-h-0">
          {/* System 2: Multi-Agent Epistemic Council */}
          <div className="border border-slate-800/90 rounded-2xl bg-gradient-to-b from-[#111726] to-[#0b0e17] p-4 flex-1 flex flex-col min-h-0 shadow-2xl relative overflow-hidden">
            {/* Ambient Backlight Glow */}
            <div className="absolute -top-12 right-1/4 w-72 h-16 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-md bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xs shadow-sm">
                  🏛️
                </div>
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-200 font-extrabold flex items-center gap-2">
                    System 2: Multi-Agent Epistemic Council
                    <span className="text-[10px] text-slate-400 font-normal px-2 py-0.2 rounded-full bg-slate-800/80 border border-slate-700">
                      Adversarial Consensus
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                <span>Consensus: QUORUM REACHED</span>
              </div>
            </div>

            {/* Council Cards Grid */}
            <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1 flex-1">
              {council.map((agent, idx) => (
                <div 
                  key={idx} 
                  className={`group rounded-xl border p-3.5 flex flex-col justify-between transition-all shadow-md relative overflow-hidden ${
                    idx === 0 ? 'border-blue-500/25 bg-[#0e1424]/90 hover:border-blue-500/50' :
                    idx === 1 ? 'border-purple-500/25 bg-[#120f26]/90 hover:border-purple-500/50' :
                    idx === 2 ? 'border-emerald-500/25 bg-[#0b1717]/90 hover:border-emerald-500/50' :
                    'border-amber-500/25 bg-[#1c140d]/90 hover:border-amber-500/50'
                  }`}
                >
                  <div className={`absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r ${
                    idx === 0 ? 'from-blue-500' : idx === 1 ? 'from-purple-500' : idx === 2 ? 'from-emerald-500' : 'from-amber-500'
                  } to-transparent`} />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-6 px-2.5 rounded-md border font-mono text-[11px] font-bold flex items-center gap-1.5 shadow-sm ${agent.badgeColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            idx === 0 ? 'bg-blue-400 animate-ping' : idx === 1 ? 'bg-purple-400' : idx === 2 ? 'bg-emerald-400' : 'bg-amber-400'
                          }`} />
                          {agent.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">{agent.stage}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/90 text-slate-400 border border-slate-800">
                        {agent.latencyMs}ms
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 tracking-wider uppercase font-semibold mb-1.5">
                      {agent.role}
                    </div>
                    <p className="text-[12px] text-slate-300 font-sans leading-relaxed">
                      {agent.thesis}
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-slate-500">{agent.gateLabel}</span>
                    <span className={`px-2 py-0.5 rounded border font-bold tracking-wider ${
                      agent.status === 'APPROVED' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    }`}>
                      {agent.gateValue}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cryptographic WORM Audit Trail & ZK Proofs */}
          <div className="h-56 border border-slate-800/80 rounded-xl bg-[#0e1320] p-4 flex flex-col shrink-0 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
                <span>📜</span> WORM Audit Trail &bull; ZK-SNARK Policy Proofs
              </span>
              <div className="flex gap-2">
                {(['ALL', 'EXECUTED', 'VETOED'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border transition cursor-pointer ${
                      activeTab === tab 
                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' 
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto flex-1 border border-slate-800/60 rounded-lg">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                    <th className="py-2 px-3">Receipt ID</th>
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Symbol</th>
                    <th className="py-2 px-3">Model Tier</th>
                    <th className="py-2 px-3">Action</th>
                    <th className="py-2 px-3">Net Yield</th>
                    <th className="py-2 px-3">ZK Verified</th>
                    <th className="py-2 px-3 text-right">Stage 3 Inspection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-[11px] text-slate-300">
                  {filteredReceipts.map((r) => (
                    <tr 
                      key={r.id} 
                      onClick={() => handleInspectReceipt(r)}
                      className="hover:bg-slate-800/40 transition cursor-pointer group"
                    >
                      <td className="py-2 px-3 font-bold text-yellow-400">{r.id}</td>
                      <td className="py-2 px-3 text-slate-400">{r.time}</td>
                      <td className="py-2 px-3 text-white font-semibold">{r.symbol}</td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          r.modelTier === 'TIER_2_FRONTIER' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        }`}>
                          {r.modelTier}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          r.action === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {r.action}
                        </span>
                      </td>
                      <td className={`py-2 px-3 font-semibold ${r.netYield >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {r.netYield >= 0 ? '+' : ''}${r.netYield.toFixed(2)}
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <span>✓</span> <span className="text-[10px]">AegisPolicyProof</span>
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-yellow-400 border border-slate-700 group-hover:bg-yellow-500/20 transition">
                          🔍 Verify Proof
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Stage 3 One-Click Winner Audit Verification Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1320] border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl font-mono text-xs">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-base">🛡️</span>
                <div>
                  <h3 className="font-bold text-sm text-white">Stage 3 Winner Decision Audit Inspector</h3>
                  <span className="text-[11px] text-slate-400 font-normal">Deterministic Lineage Proof &bull; {selectedReceipt.id}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 text-xs cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3.5">
              {/* Live Hash Verification Check */}
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-300 font-bold text-xs">100% Cryptographic Lineage Match &bull; ZK Verified</span>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded font-bold">
                  STAGE 3 AUDIT PASSED
                </span>
              </div>

              {/* ZK-SNARK Proof Circuit & Signals */}
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-500 uppercase font-bold">Zero-Knowledge Policy Circuit</span>
                  <span className="text-amber-400 font-mono font-bold">{selectedReceipt.zkCircuit}</span>
                </div>
                <div className="text-[11px] text-amber-300 break-all font-mono">Proof Hash: {selectedReceipt.zkProofHash}</div>
                <div className="pt-2 border-t border-slate-800/80 flex gap-4 text-[10px] text-slate-400">
                  <span>Exposure Limit Pass: <strong className="text-emerald-400">{selectedReceipt.zkSignals[0]}</strong></span>
                  <span>Net Yield Pass: <strong className="text-emerald-400">{selectedReceipt.zkSignals[1]}</strong></span>
                  <span>CRO No-Veto Pass: <strong className="text-emerald-400">{selectedReceipt.zkSignals[2]}</strong></span>
                </div>
              </div>

              {/* RAG Memory & Private RPC Telemetry */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Memory-of-Failures (RAG)</div>
                  <div className="text-slate-300 mt-1">{selectedReceipt.failureMemoryMatch || 'RAG Checked: 0 Collisions'}</div>
                </div>
                <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Private Builder RPC Route</div>
                  <div className="text-slate-300 mt-1">{selectedReceipt.mevRisk || '48Club Private Route (0 Leakage)'}</div>
                </div>
              </div>

              {/* SHA-256 Leaf & Merkle Root */}
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-1.5">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Leaf Hash (SHA-256)</div>
                <div className="text-yellow-400 font-bold break-all text-[11px]">{selectedReceipt.hash}</div>
                
                {selectedReceipt.txHash && (
                  <div className="pt-2 border-t border-slate-800 mt-2 flex items-center justify-between">
                    <span className="text-slate-400">BSC Transaction:</span>
                    <a
                      href={`https://bscscan.com/tx/${selectedReceipt.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-yellow-400 hover:underline flex items-center gap-1"
                    >
                      <span>View on BscScan ↗</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Full JSON Receipt */}
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Full Immutable Receipt Payload</div>
                <pre className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-300 text-[10px] leading-relaxed overflow-x-auto max-h-48">
                  {JSON.stringify(selectedReceipt, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
