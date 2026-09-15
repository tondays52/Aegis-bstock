import { Candle, MarketTickData } from '@aegis/agent-core';

export interface SimulationEvent {
  day: number;
  hour: number;
  symbol: string;
  headline: string;
  sentimentImpact: number; // -1 to 1
  priceShockPct: number;   // e.g. -0.05 (-5%)
}

export class HistoricalMarketGenerator {
  private symbols: string[] = ['bNVDA', 'bAAPL', 'bTSLA', 'bMSFT', 'bAMZN'];
  private currentPrices: Record<string, number> = {
    bNVDA: 130.0,
    bAAPL: 225.0,
    bTSLA: 240.0,
    bMSFT: 420.0,
    bAMZN: 185.0
  };

  private scheduledEvents: SimulationEvent[] = [
    { day: 2, hour: 10, symbol: 'bNVDA', headline: 'Nvidia announces next-gen AI superchip with 3x efficiency', sentimentImpact: 0.8, priceShockPct: 0.04 },
    { day: 4, hour: 14, symbol: 'bAAPL', headline: 'Apple reports stellar iPhone 16 sales in Asian markets', sentimentImpact: 0.6, priceShockPct: 0.025 },
    { day: 6, hour: 9, symbol: 'bTSLA', headline: 'Regulatory probe into autonomous driving safety initiated', sentimentImpact: -0.85, priceShockPct: -0.07 },
    { day: 8, hour: 11, symbol: 'bMSFT', headline: 'Azure cloud growth accelerates past consensus estimates', sentimentImpact: 0.7, priceShockPct: 0.03 },
    { day: 10, hour: 15, symbol: 'bAMZN', headline: 'AWS signs multi-billion dollar enterprise generative AI deals', sentimentImpact: 0.75, priceShockPct: 0.035 },
    { day: 12, hour: 13, symbol: 'bNVDA', headline: 'Chip supply chain constraints prompt temporary broker downgrade', sentimentImpact: -0.6, priceShockPct: -0.03 }
  ];

  /**
   * Generates a realistic 14-day stream of hourly ticks across all assets
   */
  public generate14DayStream(): MarketTickData[] {
    const ticks: MarketTickData[] = [];
    const totalHours = 14 * 24;

    // Maintain rolling 30-candle history per symbol
    const candleHistory: Record<string, Candle[]> = {};
    for (const s of this.symbols) {
      candleHistory[s] = [];
      let p = this.currentPrices[s];
      for (let i = 0; i < 25; i++) {
        p += (Math.random() - 0.48) * (p * 0.005);
        candleHistory[s].push({
          timestamp: Date.now() - (25 - i) * 3600000,
          open: p - 0.2,
          high: p + 0.4,
          low: p - 0.3,
          close: p,
          volume: 20000 + Math.random() * 10000
        });
      }
      this.currentPrices[s] = p;
    }

    for (let hourIndex = 0; hourIndex < totalHours; hourIndex++) {
      const currentDay = Math.floor(hourIndex / 24) + 1;
      const currentHour = hourIndex % 24;

      for (const symbol of this.symbols) {
        let basePrice = this.currentPrices[symbol];
        
        // Check for scheduled event
        const event = this.scheduledEvents.find(
          e => e.day === currentDay && e.hour === currentHour && e.symbol === symbol
        );

        let headline = `Routine regular trading session digest for ${symbol}`;
        if (event) {
          headline = event.headline;
          basePrice *= (1 + event.priceShockPct);
        } else {
          // Standard market drift & volatility
          const randomChange = (Math.random() - 0.49) * 0.008;
          basePrice *= (1 + randomChange);
        }

        this.currentPrices[symbol] = Math.round(basePrice * 100) / 100;

        const newCandle: Candle = {
          timestamp: Date.now() + hourIndex * 3600000,
          open: basePrice * (1 - 0.002),
          high: basePrice * (1 + 0.004),
          low: basePrice * (1 - 0.004),
          close: basePrice,
          volume: 15000 + Math.random() * 25000
        };

        candleHistory[symbol].push(newCandle);
        if (candleHistory[symbol].length > 30) {
          candleHistory[symbol].shift();
        }

        const depthUsd = 120000 + Math.random() * 80000;
        const tick: MarketTickData = {
          symbol,
          candles: [...candleHistory[symbol]],
          orderbook: {
            bids: [[basePrice * 0.999, 150], [basePrice * 0.998, 300]],
            asks: [[basePrice * 1.001, 150], [basePrice * 1.002, 300]]
          },
          headlines: [headline],
          orderbookDepthUsd: Math.round(depthUsd),
          bnbPriceUsd: 595 + Math.sin(hourIndex / 10) * 15
        };

        ticks.push(tick);
      }
    }

    return ticks;
  }
}
