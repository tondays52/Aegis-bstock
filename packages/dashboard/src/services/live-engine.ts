import { DecisionReceiptView, DashboardPortfolio, LiveMarketQuote, MacroRegimeState } from '../types';

/**
 * SHA-256 helper for client-side cryptographic lineage
 */
export async function sha256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface CatalystEvent {
  title: string;
  source: string;
  impactScore: number;
  isUnconfirmedRumor?: boolean;
}

export const PRESET_CATALYSTS: CatalystEvent[] = [
  {
    title: 'BNB Chain Announces Zero-Fee Real-World Asset Tokenization Standard',
    source: 'Official Press Release',
    impactScore: 0.85,
    isUnconfirmedRumor: false
  },
  {
    title: 'Unverified Telegram Rumor: Major Token Delisting and Regulatory Audit',
    source: 'Telegram Channel / Twitter Noise',
    impactScore: -0.90,
    isUnconfirmedRumor: true
  },
  {
    title: 'Binance Smart Chain Liquidity Inflow Exceeds $2.5B in 24 Hours',
    source: 'Bloomberg Terminal',
    impactScore: 0.70,
    isUnconfirmedRumor: false
  },
  {
    title: 'Federal Reserve Signals Interest Rate Cut & Global Liquidity Expansion',
    source: 'Reuters Macro',
    impactScore: 0.65,
    isUnconfirmedRumor: false
  }
];

export const INITIAL_MARKETS: LiveMarketQuote[] = [
  {
    symbol: 'BNB/USDT',
    price: 718.95,
    change24hPct: 3.42,
    volumeUsd: 1420500000,
    orderbookDepthUsd: 185000,
    bids: [[718.90, 45], [718.70, 80], [718.50, 120], [718.00, 250]],
    asks: [[719.10, 50], [719.30, 95], [719.60, 140], [720.00, 310]]
  },
  {
    symbol: 'bTSLA/USDT',
    price: 242.80,
    change24hPct: 1.85,
    volumeUsd: 480200000,
    orderbookDepthUsd: 125000,
    bids: [[242.70, 80], [242.50, 150], [242.20, 300]],
    asks: [[242.90, 75], [243.20, 160], [243.50, 280]]
  },
  {
    symbol: 'bNVDA/USDT',
    price: 135.40,
    change24hPct: -0.95,
    volumeUsd: 890100000,
    orderbookDepthUsd: 210000,
    bids: [[135.30, 200], [135.00, 450], [134.80, 800]],
    asks: [[135.55, 180], [135.80, 400], [136.00, 750]]
  },
  {
    symbol: 'BTC/USDT',
    price: 76480.00,
    change24hPct: 2.15,
    volumeUsd: 28400000000,
    orderbookDepthUsd: 850000,
    bids: [[76470, 2.5], [76450, 5.0], [76400, 12.0]],
    asks: [[76495, 3.1], [76520, 6.2], [76550, 15.0]]
  },
  {
    symbol: 'ETH/USDT',
    price: 2428.50,
    change24hPct: -0.45,
    volumeUsd: 12500000000,
    orderbookDepthUsd: 420000,
    bids: [[2428.0, 35], [2426.5, 70], [2425.0, 150]],
    asks: [[2429.2, 40], [2431.0, 85], [2433.0, 160]]
  }
];

export const INITIAL_PORTFOLIO: DashboardPortfolio = {
  cashUsd: 10000,
  totalEquityUsd: 10000,
  openingEquityUsd: 10000,
  peakEquityUsd: 10000,
  maxDrawdownPct: 0.00,
  totalGasSpentBnb: 0.00000,
  totalTradingFeesUsd: 0.00,
  tradesCount: 0,
  holdings: {}
};
