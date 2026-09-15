import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import { BinanceDataClient } from '../data/binance-client.js';
import { LiveCatalystProvider } from '../data/catalyst-feed.js';
import { LiveFeedManager } from '../data/live-feed-manager.js';
import { runLiveAgent } from '../data/live-runner.js';

describe('Live Data Feeds & Binance Ingestion Suite', () => {
  const testStorageDir = './test_live_storage';

  test('BinanceDataClient - fetches or generates normalized kline candles and depth', async () => {
    const client = new BinanceDataClient();
    assert.strictEqual(client.normalizeSymbol('BTC/USDT'), 'BTCUSDT');
    assert.strictEqual(client.normalizeSymbol('bTSLA'), 'BNBUSDT');

    const klines = await client.fetchKlines({ symbol: 'BNBUSDT', limit: 20 });
    assert.ok(Array.isArray(klines));
    assert.strictEqual(klines.length, 20);
    assert.ok(klines[0].close > 0);
    assert.ok(klines[0].volume >= 0);

    const depth = await client.fetchOrderbookDepth('BNBUSDT', 10);
    assert.ok(depth.orderbook.bids.length > 0);
    assert.ok(depth.orderbook.asks.length > 0);
    assert.ok(depth.orderbookDepthUsd > 0);

    const bnbPrice = await client.fetchBnbPriceUsd();
    assert.ok(bnbPrice > 0);
  });

  test('LiveCatalystProvider - pushes and consumes catalysts and symbol-filtered headlines', () => {
    const provider = new LiveCatalystProvider();

    provider.pushCatalyst('BNBUSDT', {
      headline: 'Major BNB Ecosystem Grant Announced',
      sourceUriOrHash: 'binance-blog-uri',
      impactScore: 0.60,
      isHighImpact: true,
      confidenceScore: 0.90
    });

    const headlines = provider.getHeadlinesForSymbol('BNBUSDT');
    assert.ok(headlines.some(h => h.includes('BNB')));

    const popped = provider.popCatalystForSymbol('BNBUSDT');
    assert.ok(popped);
    assert.strictEqual(popped.impactScore, 0.60);

    // Subsequent pop returns undefined (consumed)
    assert.strictEqual(provider.popCatalystForSymbol('BNBUSDT'), undefined);
  });

  test('LiveFeedManager - aggregates candles, depth, headlines, and catalysts into MarketTickData', async () => {
    const manager = new LiveFeedManager({
      defaultSymbols: ['BNBUSDT', 'BTCUSDT'],
      klineLimit: 15
    });

    manager.getCatalystProvider().pushCatalyst('BNBUSDT', {
      headline: 'Test Institutional Inflow',
      sourceUriOrHash: 'bloomberg-terminal',
      impactScore: 0.45
    });

    const tick = await manager.fetchTickForSymbol('BNBUSDT');
    assert.strictEqual(tick.symbol, 'BNBUSDT');
    assert.strictEqual(tick.candles.length, 15);
    assert.ok(tick.orderbookDepthUsd > 0);
    assert.ok(tick.headlines.length > 0);
    assert.ok(tick.catalyst);
    assert.strictEqual(tick.catalyst.sourceUriOrHash, 'bloomberg-terminal');
  });

  test('runLiveAgent - processes live ticks, generates WORM receipts, and passes Stage 3 verification', async () => {
    if (fs.existsSync(testStorageDir)) {
      try {
        fs.rmSync(testStorageDir, { recursive: true, force: true });
      } catch {}
    }

    const result = await runLiveAgent({
      ticksCount: 2,
      intervalMs: 100,
      storageDir: testStorageDir,
      symbols: ['BNBUSDT'],
      injectSampleCatalyst: true
    });

    assert.ok(result.portfolio);
    assert.ok(result.portfolio.totalEquityUsd > 0);
    assert.ok(result.auditResult.passed, 'Live run audit trail should pass Stage 3 validation');
    assert.strictEqual(result.auditResult.brokenHashLinks, 0);

    if (fs.existsSync(testStorageDir)) {
      try {
        fs.rmSync(testStorageDir, { recursive: true, force: true });
      } catch {}
    }
  });
});
