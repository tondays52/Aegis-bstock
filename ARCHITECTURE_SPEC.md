# Project Aegis-bStock: Technical Architecture Specification

## 1. Data Models & JSON Schemas

### 1.1 Decision Record Schema (`decision_receipt.json`)
Every trade executed on BNB Smart Chain must strictly correspond to an instance of this schema to satisfy the Binance Winner Audit.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "AegisDecisionReceipt",
  "type": "object",
  "properties": {
    "decision_id": { "type": "string", "format": "uuid" },
    "timestamp_utc": { "type": "string", "format": "date-time" },
    "agent_version": {
      "type": "object",
      "properties": {
        "git_commit_sha": { "type": "string" },
        "manifest_version": { "type": "string" },
        "model_id": { "type": "string" }
      },
      "required": ["git_commit_sha", "manifest_version", "model_id"]
    },
    "market_context_snapshot": {
      "type": "object",
      "properties": {
        "symbol": { "type": "string" },
        "current_price": { "type": "number" },
        "orderbook_depth_usd": { "type": "number" },
        "volatility_atr_14": { "type": "number" },
        "regime": { "type": "string", "enum": ["BULL_TREND", "SIDEWAYS_CHOP", "HIGH_VOLATILITY_BEAR"] },
        "news_sentiment_score": { "type": "number", "minimum": -1.0, "maximum": 1.0 }
      },
      "required": ["symbol", "current_price", "regime"]
    },
    "council_reasoning": {
      "type": "object",
      "properties": {
        "analyst_thesis": { "type": "string" },
        "strategist_proposal": {
          "type": "object",
          "properties": {
            "action": { "type": "string", "enum": ["BUY", "SELL", "HOLD"] },
            "target_allocation_pct": { "type": "number" },
            "entry_target": { "type": "number" },
            "stop_loss": { "type": "number" },
            "take_profit": { "type": "number" },
            "time_horizon_hours": { "type": "number" }
          },
          "required": ["action", "target_allocation_pct"]
        },
        "risk_officer_review": {
          "type": "object",
          "properties": {
            "approved": { "type": "boolean" },
            "veto_reason": { "type": "string" },
            "risk_score": { "type": "number", "minimum": 0, "maximum": 100 },
            "adjusted_allocation_pct": { "type": "number" }
          },
          "required": ["approved", "risk_score", "adjusted_allocation_pct"]
        }
      },
      "required": ["analyst_thesis", "strategist_proposal", "risk_officer_review"]
    },
    "preflight_simulation": {
      "type": "object",
      "properties": {
        "estimated_slippage_bps": { "type": "number" },
        "estimated_gas_fee_bnb": { "type": "number" },
        "expected_net_alpha_bps": { "type": "number" },
        "simulation_passed": { "type": "boolean" }
      },
      "required": ["estimated_slippage_bps", "estimated_gas_fee_bnb", "simulation_passed"]
    },
    "execution_record": {
      "type": "object",
      "properties": {
        "status": { "type": "string", "enum": ["EXECUTED", "REJECTED_BY_RISK", "SIMULATION_FAILED", "SKIPPED_HOLD"] },
        "tx_hash": { "type": "string" },
        "block_number": { "type": "integer" },
        "executed_price": { "type": "number" },
        "executed_amount": { "type": "number" },
        "gas_used_bnb": { "type": "number" }
      }
    }
  },
  "required": [
    "decision_id",
    "timestamp_utc",
    "agent_version",
    "market_context_snapshot",
    "council_reasoning",
    "preflight_simulation"
  ]
}
```

---

## 2. Autonomous State Machine Specification

The agent operates as a deterministic finite-state automaton (FSM):

```
       +---------------------------------------------+
       |                                             |
       v                                             |
+--------------+    Tick/Data     +--------------+   |
| 1. IDLE /    |----------------->| 2. REGIME &  |   |
| MONITORING   |                  | DATA SYNC    |   |
+--------------+                  +-------+------+   |
       ^                                  |          |
       |               Regime Trigger     v          |
       |              +--------------------------+   |
       |              | 3. MULTI-AGENT COUNCIL   |   |
       |              |    DEBATE & RISK VETO    |   |
       |              +-------------+------------+   |
       |                            |                |
       |       Veto / Hold / No-Op  | Approved Trade |
       +----------------------------+ Proposal       |
       |                            v                |
       |              +--------------------------+   |
       |              | 4. PRE-FLIGHT SIMULATION |   |
       |              |    & SLIPPAGE CHECK      |   |
       |              +-------------+------------+   |
       |                            |                |
       |    Sim Failed / High Cost  | Passed         |
       +----------------------------+                |
       |                            v                |
       |              +--------------------------+   |
       |              | 5. SIGN, BROADCAST &     |   |
       |              |    CONFIRM ON BNB CHAIN  |   |
       |              +-------------+------------+   |
       |                            |                |
       |                            v                |
       |              +--------------------------+   |
       |              | 6. WORM AUDIT LOG COMMIT |---+
       |              |    & TELEMETRY PUSH      |
       |              +--------------------------+
       |
+------+-------+
|  EMERGENCY   |  (Triggered by RPC drop, 429 rate limit, or balance mismatch)
|  FAILOVER    |
+--------------+
```

---

## 3. Epistemic Sizing & Veto Logic

### 3.1 Asymmetric Sizing Formula
To prevent equity decay while maximizing reward during strong catalysts:

$$\text{Position Size} = \text{Portfolio Equity} \times \min\left(C_{\max}, \frac{\text{Expected Alpha} - \text{Total Cost}}{\text{ATR}_{14} \times \sigma_{\text{market}}}\right) \times \left(1 - \frac{\text{Risk Score}}{100}\right)$$

Where:
- $C_{\max} = 0.25$ (Maximum 25% single-asset concentration).
- $\text{Total Cost} = \text{Gas Fee} + \text{Slippage} + \text{Trading Fee}$.
- $\text{Risk Score} \in [0, 100]$ as assessed independently by the Chief Risk Officer.
- If $\text{Risk Score} > 60$ or $\text{Expected Alpha} < 3 \times \text{Total Cost}$, trade is **aborted**.
