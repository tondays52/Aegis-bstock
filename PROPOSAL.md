# 🛡️ Aegis-bStock: Official Binance Hackathon Submission Proposal

**Project Name:** Aegis-bStock: Autonomous Epistemic Agent with Adversarial Risk Council & Verifiable Decision Lineage on BNB Smart Chain  
**Target Hackathon:** Binance Autonomous Agentic AI Challenge  
**Network:** BNB Smart Chain (BSC)  
**Repository:** [https://github.com/tondays52/Aegis-bstock](https://github.com/tondays52/Aegis-bstock)  
**Live Cockpit Dashboard:** `http://localhost:3000/`

---

## 📋 Field 1: Your Proposal *

*(Submit a concise proposal covering: agent concept, high-level architecture, model approach, agent harness and tools, data strategy, risk design, team capability, and delivery plan.)*

### 1. Agent Concept & Architecture
Aegis-bStock replaces naive, single-prompt LLM wrappers with a dual-system neuro-symbolic architecture:
* **System 1 (Sub-Second Reflex):** Quantitative pre-filter computing auto-adaptive window ATR (5/14/28 periods), orderbook imbalance, and realized volatility.
* **System 2 (Adversarial Multi-Agent Council):** A 4-stage epistemic consensus loop consisting of:
  1. *Macro Analyst:* Dynamic regime classifier enforcing gross exposure ceilings (15% in high-vol chop, up to 75% in confirmed bull trends).
  2. *Alpha Strategist & Adversarial Skeptic:* News and catalyst verification engine that cross-references headlines against primary wires to discard rumors and spoofing.
  3. *Pre-Flight Simulator:* Calculates net yield over BSC gas, DEX slippage, and fees ($\ge 3.0\times$ alpha-to-friction gate) with private builder RPC routing (48 Club / NodeReal).
  4. *Chief Risk Officer (CRO):* Enforces absolute veto authority, vector-indexed Episodic Failure Memory (RAG), and Quarter-Kelly position sizing.

### 2. Model Approach & Harness
A multi-tier model router directs execution: lightweight distilled models (`TIER_1_FAST`, <50ms) manage routine tick evaluations, while frontier reasoning models (`TIER_2_FRONTIER`) trigger on high-impact catalysts. The harness operates on an autonomous self-healing FSM with deterministic RPC fallback, exponential backoffs, and fail-closed cash holding.

### 3. Data, Risk & Verification
Consumes legally authorized Binance REST/WebSocket L2 depth, live financial news APIs, and on-chain BSC mempool/pool metrics. Position sizing uses Fractional Quarter-Kelly ($0.25 \times f^*$) with an 85% High-Water Mark drawdown circuit breaker (defending the 5.0% tie-breaker limit). Every trade/veto emits an immutable SHA-256 chained WORM receipt with succinct ZK-SNARK policy proofs (`AegisPolicyProof_v1`) anchored to our deployed Solidity contract (`AegisAuditAnchor.sol`) on BSC.

---

## 🏛️ Field 2: System Architecture — How Does the Agent Perceive, Reason, Decide, Trade? *

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         PERCEPTION & INGESTION LAYER                             │
│   Binance L2 Depth Stream  •  Live Financial News Wire  •  BNB Smart Chain RPC   │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                    SYSTEM 1: QUANTITATIVE REGIME FILTER                          │
│   Auto-Adaptive ATR (5/14/28)  •  Realized Volatility  •  Orderbook Imbalance    │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                  SYSTEM 2: ADVERSARIAL MULTI-AGENT COUNCIL                       │
│                                                                                  │
│   [Stage 1: Macro Analyst]        ──► Macro Regime & Exposure Ceiling (0%-75%)   │
│              │                                                                   │
│              ▼                                                                   │
│   [Stage 2: Alpha Strategist]     ──► Wire Fact-Checking & Adversarial Skeptic   │
│              │                                                                   │
│              ▼                                                                   │
│   [Stage 3: Pre-Flight Simulator] ──► Net-Yield Feasibility (>=3.0x) & MEV Probe │
│              │                                                                   │
│              ▼                                                                   │
│   [Stage 4: Chief Risk Officer]   ──► RAG Failure Memory Veto & Quarter-Kelly    │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                       EXECUTION & CRYPTOGRAPHIC ANCHORING                        │
│   Private Builder RPC (48Club)  •  ZK-SNARK Policy Proof  •  On-Chain Anchor     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Field 3: Data / Tools Used — What Market Data, News, or Tools Do You Plan to Use? *

* **Market Data:** Binance Web3 Open APIs & Binance Public REST/WebSocket (real-time 1m/5m Klines, Level 2 orderbook depth, funding/spread data for eligible bStocks).
* **On-Chain & Execution Tools:** BNB Smart Chain JSON-RPC providers with multi-endpoint fallback (NodeReal, Ankr, QuickNode), simulated private builder routing (48 Club) to eliminate public mempool front-running, and PancakeSwap v3 bStock pool liquidity probes.
* **Catalyst & Macro Feeds:** Legally authorized financial news RSS/webhooks, Bloomberg Terminal API / Reuters wires, and SEC EDGAR public disclosure endpoints for underlying tokenized equities.
* **Agent Harness & Reasoning Stack:** TypeScript/Node.js monorepo (`@aegis`), custom FSM state engine, local embedding store for Episodic Failure Memory (vector cosine similarity RAG), and multi-tier LLM inference routing (`TIER_1_FAST` vs. `TIER_2_FRONTIER`).
* **Audit Tools:** `@aegis/audit-engine` for SHA-256 Merkle tree generation, ZK policy proof generation (`snarkjs`/Circom simulator), and the `AegisAuditAnchor.sol` smart contract on BSC.

---

## ⚖️ Field 4: Position & Risk Management — How Do You Size Entries, Control Drawdown? *

Our risk architecture is mathematically hardcoded to defend the challenge's primary tie-breaker: **lower maximum drawdown**.

1. **Fractional Quarter-Kelly Sizing ($0.25 \times f^*$):** Position sizes are not fixed. Sizing scales dynamically based on epistemic confidence $p \in [0, 1]$, reward-to-risk ratio $b$, and the Macro Analyst's exposure cap:
   $$f^* = \frac{p \cdot b - (1 - p)}{b} \times 0.25$$

2. **Dynamic Regime Exposure Ceilings:**
   * `BULL_TREND`: Max 70–75% gross bStock exposure.
   * `CHOP_HIGH_VOL`: Capped at 35% gross exposure; stops tightened to $1.5\times$ ATR.
   * `CAPITAL_PRESERVATION`: Capped at 15% maximum exposure; 85%+ reserved in stablecoins.

3. **High-Water Mark (HWM) Drawdown Circuit Breaker:** The Chief Risk Officer tracks peak portfolio equity continuously. If drawdown reaches 85% of our 5.0% maximum risk budget (at 4.25% drawdown), the system executes an absolute veto on all new buy orders.

4. **Black Swan Contagion Lock:** If $\ge 3$ correlated assets drop $> 2.5\times$ ATR within 30 minutes, the FSM trips into `DEFENSIVE_LOCK`, auto-liquidates open bStock positions to stablecoins, and halts trading for a cool-down period.

5. **Pre-Flight Net-Yield Gate:**
   $$\text{Net Yield USD} = \text{Gross Alpha USD} - (\text{BSC Gas} + \text{Slippage} + \text{Trading Fees}) > \$0.00$$
   Trades failing to clear $\ge 3.0\times$ estimated friction are aborted pre-flight to eliminate fee drag.

---

## 🛡️ Field 5: How Would You Prevent Future Leakage and Overfitting? *

1. **Strict Point-in-Time Data Pipelines:** The agent harness enforces temporal air-gapping. At timestamp $T$, the context window is injected strictly with data where $\text{event\_timestamp} \le T$. All news, depth snapshots, and indicator calculations run within forward-only rolling buffers with zero lookahead access.
2. **Epistemic Consensus over Raw Price Extrapolation:** Trade entries cannot be triggered by technical indicators alone. The Adversarial Skeptic requires verified fundamental or liquidity catalysts, preventing the agent from overfitting to synthetic market noise or historical backtest curves.
3. **Out-of-Distribution Monte-Carlo Stress Testing:** The system is backtested against our 14-day stochastic Jump-Diffusion market generator (`@aegis/simulation`), which randomly injects flash crashes, volatility regimes, and gas price spikes never seen in training sets.
4. **Episodic Failure Memory (RAG):** Rather than updating model weights or memorizing past price paths mid-run, the agent maintains an episodic failure database of trade post-mortems. It evaluates candidate setups against past mistakes using semantic similarity, adapting dynamically to changing regime dynamics without weight drift.

---

## 🔍 Field 6: Reproducibility Plan — How Can Your Run Be Rerun and Verified? *

1. **Deterministic Commit Manifest:** The entire codebase, dependencies (pinned `package-lock.json`), model configurations, and initial state are committed and tagged to a single Git SHA (`v1.0.0-hackathon`). No uncommitted scripts or remote unmanifested dependencies are used.
2. **WORM (Write-Once-Read-Many) Audit Trail:** Every cycle (executed trade, hold, or CRO veto) generates a deterministic `AegisDecisionReceipt` with a unique UUID, UTC timestamp, Git commit SHA, full council transcript, net-yield calculation, and SHA-256 hash chaining to the previous receipt.
3. **Stage 3 Automated Verification (`Stage3AuditValidator`):**
   * Samplers can recompute the Merkle root across all local receipts and compare it against the roots committed to `AegisAuditAnchor.sol` on BNB Smart Chain.
   * 100% of on-chain bStock transactions map 1:1 to a specific receipt UUID with zero unmapped trades or unexplained transfers.
4. **One-Click Audit Verification Tool:** Our React dashboard includes a built-in cryptographic proof inspector allowing auditors to select any historical trade, view the exact JSON-LD payload, and recalculate its Merkle path and ZK policy verification in-browser.

---

## 👥 Field 7: Team Capability + Intended Scope — Why Is Your Team the Right Fit, and What Do You Plan to Deliver? *

### Team Capability & Background
Our team combines full-stack systems engineering, quant algorithm development, and Web3 smart contract expertise:
* Strong background in TypeScript monorepos, distributed state machines (FSM), and resilient RPC infrastructure on EVM/BNB Smart Chain.
* Hands-on experience in quantitative risk modeling (Kelly sizing, ATR volatility calibration, orderbook liquidity analytics) and multi-agent LLM orchestration (adversarial consensus, tool calling, vector RAG).

### Current Delivery Status & Scope
Unlike early-stage conceptual proposals, Aegis-bStock is already constructed, tested, and operational:
* **Fully Functional Monorepo:** 4 discrete packages (`agent-core`, `audit-engine`, `simulation`, `dashboard`).
* **100% Test Coverage:** 26/26 unit and integration test suites passing across council consensus, MEV probes, and Web3 connectors.
* **14-Day Simulation Validated:** Successfully completed 1,680-tick Monte-Carlo benchmarks achieving 100% compliance under Stage 3 audit criteria.
* **Live Web3 Cockpit:** Operational React 19 + Tailwind dashboard featuring real-time BSC telemetry, council debate feeds, and Merkle audit inspectors.

### Commitment for Scored Run
We will deploy our containerized agent harness on redundant cloud infrastructure with multi-RPC failover, monitor the 14-day scored window 24/7 autonomously with zero manual intervention, and provide the designated Binance audit account with complete, transparent repository and log access.
