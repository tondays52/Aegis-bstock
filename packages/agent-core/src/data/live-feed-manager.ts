import { BinanceDataClient } from './binance-client.js';
import { LiveCatalystProvider } from './catalyst-feed.js';
import { MarketTickData } from '../fsm/state-machine.js';

export interface LiveFeedOptions {
  restApiUrl?: string;
  defaultSymbols?: string[];
  klineLimit?: number;
}

/**
 * Live Feed Manager
 * Coordinates Binance Live REST/WS data streams and catalyst feeds into unified MarketTickData payloads
 */
export class LiveFeedManager {
  private binanceClient: BinanceDataClient;
  private catalystProvider: LiveCatalystProvider;
  private symbols: string[];
  private klineLimit: number;

  constructor(options: LiveFeedOptions = {}) {
    this.binanceClient = new BinanceDataClient(options.restApiUrl);
    this.catalystProvider = new LiveCatalystProvider();
    this.symbols = options.defaultSymbols || ['BNBUSDT', 'BTCUSDT', 'ETHUSDT', 'bTSLA', 'bNVDA'];
    this.klineLimit = options.klineLimit || 50;
  }

  public getCatalystProvider(): LiveCatalystProvider {
    return this.catalystProvider;
  }

  public getBinanceClient(): BinanceDataClient {
    return this.binanceClient;
  }

  public getSymbols(): string[] {
    return [...this.symbols];
  }

  /**
   * Fetch a complete live market tick for a specific symbol
   */
  public async fetchTickForSymbol(symbol: string): Promise<MarketTickData> {
    const [candles, depthResult, bnbPriceUsd] = await Promise.all([
      this.binanceClient.fetchKlines({ symbol, limit: this.klineLimit }),
      this.binanceClient.fetchOrderbookDepth(symbol, 20),
      this.binanceClient.fetchBnbPriceUsd()
    ]);

    const headlines = this.catalystProvider.getHeadlinesForSymbol(symbol);
    const catalyst = this.catalystProvider.popCatalystForSymbol(symbol);

    return {
      symbol,
      candles,
      orderbook: depthResult.orderbook,
      orderbookDepthUsd: depthResult.orderbookDepthUsd,
      headlines,
      bnbPriceUsd,
      catalyst
    };
  }

  /**
   * Fetch ticks for all configured active symbols
   */
  public async fetchAllTicks(): Promise<MarketTickData[]> {
    const ticks: MarketTickData[] = [];
    for (const symbol of this.symbols) {
      const tick = await this.fetchTickForSymbol(symbol);
      ticks.push(tick);
    }
    return ticks;
  }
}
