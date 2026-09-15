# 🛡️ Security Policy & Threat Model: Aegis-bStock

Project **Aegis-bStock** is built with an institutional security-first architecture designed for autonomous operation on BNB Smart Chain (BSC). This document outlines our vulnerability disclosure policy, threat model, cryptographic verification guarantees, and automated defense mechanisms.

---

## 📋 Table of Contents
1. [Reporting a Vulnerability](#-reporting-a-vulnerability)
2. [Threat Model & Attack Surface](#-threat-model--attack-surface)
3. [Autonomous Risk Controls & Circuit Breakers](#-autonomous-risk-controls--circuit-breakers)
4. [Smart Contract Security (`AegisAuditAnchor.sol`)](#-smart-contract-security)
5. [Adversarial News & Prompt Injection Defense](#-adversarial-news--prompt-injection-defense)
6. [MEV & Mempool Leakage Protection](#-mev--mempool-leakage-protection)
7. [Cryptographic Lineage & Zero-Knowledge Verification](#-cryptographic-lineage--zk-verification)
8. [Key Management & Secrets Handling](#-key-management--secrets-handling)

---

## 🔒 Reporting a Vulnerability

We take the security of Aegis-bStock and the integrity of user funds on BNB Smart Chain seriously.

If you discover a potential vulnerability, please **do not open a public GitHub issue**. Instead, follow responsible disclosure:

- **Email**: `security@aegis-bstock.io` (or reach out via encrypted communication to the repository maintainers)
- **Response SLA**: Initial triage within **24 hours**; patch deployment timeline provided within **48 hours**.
- **Scope**:
  - `@aegis/agent-core` (State Machine FSM, Kelly Sizing, RAG Failure Memory, Risk Officer)
  - `@aegis/audit-engine` (WORM Log Chaining, Merkle Root Proofs, ZK Circuit Signals)
  - `AegisAuditAnchor.sol` (BNB Smart Chain Anchor Contract)

---

## 🎯 Threat Model & Attack Surface

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL THREATS                                │
├────────────────────────┬─────────────────────────┬───────────────────────────┤
│ Market Manipulation    │ Adversarial Rumors /    │ Mempool MEV &             │
│ & Flash Crashes        │ Prompt Injection        │ Sandwich Attacks          │
└───────────┬────────────┴────────────┬────────────┴─────────────┬─────────────┘
            ▼                         ▼                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         AEGIS DEFENSE IN DEPTH                               │
├────────────────────────┬─────────────────────────┬───────────────────────────┤
│ Systemic Contagion &   │ 2-Stage Adversarial     │ Private Builder RPC       │
│ Black Swan Lock (2.5x) │ Fact-Checker (Wire SDK) │ (48Club / NodeReal)       │
├────────────────────────┼─────────────────────────┼───────────────────────────┤
│ HWM Drawdown (5.0%) &  │ Episodic Memory RAG     │ ZK-SNARK Policy Proofs    │
│ Quarter-Kelly Sizer    │ (Cosine Veto >= 0.85)   │ & WORM Cryptographic Tree │
└────────────────────────┴─────────────────────────┴───────────────────────────┘
```

---

## 🚨 Autonomous Risk Controls & Circuit Breakers

Aegis-bStock enforces hard, deterministic limits that cannot be overridden by LLM reasoning:

1. **High-Water Mark (HWM) Drawdown Circuit Breaker**:
   - Hard budget cap at **5.00% maximum drawdown** from peak equity.
   - At $\ge 85\%$ budget consumption ($4.25\%$ drawdown), the Chief Risk Officer issues an **unconditional BUY veto**.
2. **Systemic Contagion / Black Swan Lock (`DEFENSIVE_LOCK`)**:
   - If $\ge 3$ tracked assets drop $> 2.5\times$ their daily ATR in a rolling evaluation window, the state machine triggers `BLACK_SWAN_LOCK`.
   - Action: Auto-liquidates all bStock exposure into stablecoins, cancels open orders, and mandates a **10-tick cool-down period**.
3. **Single-Asset Exposure Ceiling**:
   - Maximum single-asset concentration is capped at **25.0%** of total equity.
   - Dynamic macro regime controller can further compress this ceiling to **0.0%** during high-volatility bear markets.

---

## 📜 Smart Contract Security (`AegisAuditAnchor.sol`)

The `AegisAuditAnchor.sol` contract deployed on BNB Smart Chain provides immutable lineage without exposing capital:

- **Non-Custodial Design**: The contract holds **zero user funds, tokens, or liquidity**. It acts strictly as a cryptographic notary.
- **Append-Only Merkle Roots**: Batch decision Merkle roots are committed to storage with caller authentication, timestamp, and Git commit SHA.
- **Zero External Calls / Zero Reentrancy**: State transitions contain no external token transfers or delegate calls, eliminating standard EVM exploit vectors.

---

## 🛡️ Adversarial News & Prompt Injection Defense

1. **Dual-Stage Fact-Checking**:
   - News headlines and catalysts are parsed through a dedicated **Adversarial Skeptic Filter**.
   - Headlines containing rumor keywords (`"alleged"`, `"sources claim"`, `"unconfirmed"`) receive an automated **35% confidence penalty**.
2. **Low-Liquidity Spoofing Detection**:
   - High-impact catalysts paired with shallow order books ($<\$50,000$ depth) are penalized by **30%** to prevent whale spoofing traps.
3. **Episodic Failure Memory (RAG)**:
   - Trade losses are vectorized into a cosine similarity store.
   - Any new catalyst/setup with $\ge 85\%$ similarity to a previously failed trade triggers an **automatic CRO Veto**.

---

## ⚡ MEV & Mempool Leakage Protection

- **Private Builder Routing**: Orders are routed through private builder endpoints (e.g. `48 Club` / NodeReal private BSC RPC) with **0.00% mempool leakage**.
- **Pre-Flight MEV Probe**:
  - Simulates AMM pool impact vs. CEX benchmarks.
  - Automatically splits large orders into TWAP slices or aborts execution if expected price impact exceeds the allowable slippage budget.
- **Public Fallback Clamping**: In the event of a private RPC disconnect, maximum slippage is strictly clamped to **0.15% (15 bps)**.

---

## 🔐 Cryptographic Lineage & ZK Verification

- **Write-Once-Read-Many (WORM) Log**: Every tick decision is recorded in an immutable append-only JSON-LD ledger with continuous SHA-256 hash chaining.
- **Succinct ZK Policy Proofs (`AegisPolicyProof_v1`)**: Every decision generates a succinct proof verifying:
  - `exposureLimitPass`: Allocation $\le$ macro ceiling ($1$ or $0$).
  - `netYieldPass`: Expected alpha $\ge 3.0\times$ fee drag ($1$ or $0$).
  - `noVetoPass`: Chief Risk Officer approval ($1$ or $0$).

---

## 🔑 Key Management & Secrets Handling

- **No Hardcoded Keys**: Private keys, API secrets, and RPC credentials must only be injected via environment variables (`.env`).
- **Git Hygiene**: `.gitignore` is configured to prevent committing `.env`, build artifacts (`dist/`), runtime logs, or local vector stores.
- **Signer Isolation**: Web3 execution modules accept standard `EIP-1193` signers or private RPC connectors without persisting raw private keys in memory.
