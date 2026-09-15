import { NewsCatalyst } from '../agents/strategist.js';

export interface CatalystItem {
  id: string;
  timestamp: string;
  headline: string;
  source: string;
  symbol?: string;
  claimedImpactBps?: number;
  isUrgent?: boolean;
}

/**
 * Live News & Catalyst Ingestion Provider
 * Aggregates real-time market catalysts and feeds them to the Multi-Agent Council
 */
export class LiveCatalystProvider {
  private customCatalysts: Map<string, NewsCatalyst> = new Map();
  private headlineBuffer: string[] = [];

  constructor() {
    // Initialize with standard macroeconomic baseline context
    this.headlineBuffer = [
      'Global liquidity conditions remain accommodative across major central banks.',
      'BNB Smart Chain daily transaction volume reaches multi-month highs.',
      'Tokenized Real-World Assets (RWA) and bStocks see increased institutional adoption on-chain.'
    ];
  }

  /**
   * Ingest a live news catalyst event (e.g. from breaking news webhook or RSS feed)
   */
  public pushCatalyst(symbol: string, catalyst: NewsCatalyst): void {
    this.customCatalysts.set(symbol.toUpperCase(), catalyst);
    if (catalyst.headline) {
      this.headlineBuffer.unshift(catalyst.headline);
      if (this.headlineBuffer.length > 20) {
        this.headlineBuffer.pop();
      }
    }
  }

  /**
   * Ingest a breaking headline
   */
  public pushHeadline(headline: string): void {
    this.headlineBuffer.unshift(headline);
    if (this.headlineBuffer.length > 20) {
      this.headlineBuffer.pop();
    }
  }

  /**
   * Retrieve active headlines for a given symbol
   */
  public getHeadlinesForSymbol(symbol: string): string[] {
    const symbolClean = symbol.replace(/USDT$/i, '').toUpperCase();
    const relevant = this.headlineBuffer.filter((h) => 
      h.toUpperCase().includes(symbolClean) || h.toUpperCase().includes('BNB') || h.toUpperCase().includes('MARKET')
    );
    return relevant.length > 0 ? relevant : this.headlineBuffer.slice(0, 5);
  }

  /**
   * Consume and retrieve any pending active catalyst for a symbol
   */
  public popCatalystForSymbol(symbol: string): NewsCatalyst | undefined {
    const sym = symbol.toUpperCase();
    const catalyst = this.customCatalysts.get(sym);
    if (catalyst) {
      this.customCatalysts.delete(sym); // Consume one-time event
      return catalyst;
    }
    return undefined;
  }
}
