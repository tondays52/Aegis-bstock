import { SystemicContagionStatus } from '@aegis/audit-engine';

export interface AssetPriceDelta {
  symbol: string;
  priceStart: number;
  priceCurrent: number;
  dailyAtr: number;
}

export interface ContagionCheckResult {
  isBlackSwanContagion: boolean;
  status: SystemicContagionStatus;
  breachedAssetsCount: number;
  breachedAssets: string[];
  maxAtrMultiple: number;
  rationale: string;
}

export class SystemicContagionDetector {
  /**
   * Detects multi-asset systemic contagion / Black Swan market panic:
   * Condition: >= 3 tracked assets drop > 2.5x their daily ATR within the evaluation window.
   */
  public static evaluate(assets: AssetPriceDelta[]): ContagionCheckResult {
    if (assets.length === 0) {
      return {
        isBlackSwanContagion: false,
        status: 'NORMAL',
        breachedAssetsCount: 0,
        breachedAssets: [],
        maxAtrMultiple: 0,
        rationale: 'No asset deltas provided for contagion evaluation.'
      };
    }

    const breachedAssets: string[] = [];
    let maxAtrMultiple = 0;

    for (const asset of assets) {
      const drop = asset.priceStart - asset.priceCurrent;
      if (drop > 0 && asset.dailyAtr > 0) {
        const atrMultiple = drop / asset.dailyAtr;
        if (atrMultiple > maxAtrMultiple) {
          maxAtrMultiple = atrMultiple;
        }
        if (atrMultiple >= 2.5) {
          breachedAssets.push(`${asset.symbol} (-${atrMultiple.toFixed(2)}x ATR)`);
        }
      }
    }

    const breachedAssetsCount = breachedAssets.length;

    if (breachedAssetsCount >= 3) {
      return {
        isBlackSwanContagion: true,
        status: 'BLACK_SWAN_LOCK',
        breachedAssetsCount,
        breachedAssets,
        maxAtrMultiple: +maxAtrMultiple.toFixed(2),
        rationale: `CRITICAL: Black Swan Contagion triggered. ${breachedAssetsCount} assets dropped >2.5x daily ATR (${breachedAssets.join(', ')}). DEFENSIVE_LOCK activated.`
      };
    } else if (breachedAssetsCount >= 1 || maxAtrMultiple >= 1.8) {
      return {
        isBlackSwanContagion: false,
        status: 'ELEVATED',
        breachedAssetsCount,
        breachedAssets,
        maxAtrMultiple: +maxAtrMultiple.toFixed(2),
        rationale: `WARNING: Elevated systemic volatility detected (${breachedAssets.join(', ') || maxAtrMultiple.toFixed(2) + 'x ATR'}). Tightening risk parameters.`
      };
    }

    return {
      isBlackSwanContagion: false,
      status: 'NORMAL',
      breachedAssetsCount: 0,
      breachedAssets: [],
      maxAtrMultiple: +maxAtrMultiple.toFixed(2),
      rationale: 'Systemic contagion indicators normal. All asset volatility within bounds.'
    };
  }
}
