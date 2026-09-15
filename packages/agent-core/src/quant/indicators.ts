export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderbookSnapshot {
  bids: [price: number, size: number][];
  asks: [price: number, size: number][];
}

/**
 * Calculates Simple Moving Average (SMA)
 */
export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((sum, p) => sum + p, 0) / period;
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

/**
 * Calculates Average True Range (ATR)
 */
export function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length < 2) return 0;
  const trueRanges: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close)
    );
    trueRanges.push(tr);
  }

  const slice = trueRanges.slice(-period);
  return slice.reduce((sum, tr) => sum + tr, 0) / slice.length;
}

/**
 * Calculates Realized Volatility (Annualized percentage)
 */
export function calculateRealizedVolatility(closes: number[], lookback: number = 20): number {
  if (closes.length < lookback) return 0.15; // default reasonable baseline
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  const slice = returns.slice(-lookback);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (slice.length - 1);
  const stdDev = Math.sqrt(variance);
  // Annualized volatility assuming 365 days / 24h market
  return stdDev * Math.sqrt(365 * 24);
}

/**
 * Calculates Orderbook Imbalance ratio: (Bid Vol - Ask Vol) / (Bid Vol + Ask Vol)
 * Output range: [-1.0, 1.0]
 */
export function calculateOrderbookImbalance(orderbook: OrderbookSnapshot, depthLevels: number = 5): number {
  const topBids = orderbook.bids.slice(0, depthLevels);
  const topAsks = orderbook.asks.slice(0, depthLevels);

  const totalBidVol = topBids.reduce((sum, [, size]) => sum + size, 0);
  const totalAskVol = topAsks.reduce((sum, [, size]) => sum + size, 0);

  const total = totalBidVol + totalAskVol;
  if (total === 0) return 0;

  return (totalBidVol - totalAskVol) / total;
}
