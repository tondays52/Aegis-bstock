import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { BscJsonRpcClient } from '../web3/rpc-client.js';
import { BnbWeb3Connector } from '../web3/bnb-connector.js';
import { BSC_NETWORKS, BSTOCK_TOKENS } from '../web3/constants.js';

describe('BNB Smart Chain Web3 Suite', () => {
  test('BSC_NETWORKS & BSTOCK_TOKENS - verifies valid contract addresses and chain IDs', () => {
    assert.strictEqual(BSC_NETWORKS.MAINNET.chainId, 56);
    assert.strictEqual(BSC_NETWORKS.TESTNET.chainId, 97);
    assert.ok(BSC_NETWORKS.MAINNET.pancakeRouter.startsWith('0x'));
    assert.ok(BSC_NETWORKS.TESTNET.pancakeRouter.startsWith('0x'));
    assert.ok(BSC_NETWORKS.MAINNET.auditAnchorAddress.startsWith('0x'));

    assert.ok(BSTOCK_TOKENS['bTSLA']);
    assert.strictEqual(BSTOCK_TOKENS['bTSLA'].decimals, 18);
  });

  test('BscJsonRpcClient - queries block number, gas price in Gwei, and native balance', async () => {
    const client = new BscJsonRpcClient(BSC_NETWORKS.MAINNET.rpcUrls);
    const blockNum = await client.getBlockNumber();
    assert.ok(typeof blockNum === 'number');
    assert.ok(blockNum > 0);

    const gasPriceGwei = await client.getGasPriceGwei();
    assert.ok(gasPriceGwei > 0);

    const balance = await client.getBalance('0x10ED43C718714eb63d5aA57B78B54704E256024E');
    assert.ok(parseFloat(balance) >= 0);
  });

  test('BnbWeb3Connector - executes order with realistic slippage and gas on BSC', async () => {
    const connector = new BnbWeb3Connector();
    const initialBlock = connector.getCurrentBlockNumber();

    const record = await connector.executeOrder({
      symbol: 'bTSLA',
      action: 'BUY',
      amount: 5,
      expectedPrice: 240,
      maxSlippageBps: 20
    });

    assert.strictEqual(record.status, 'EXECUTED');
    assert.ok(record.txHash && record.txHash.startsWith('0x'));
    assert.strictEqual(record.txHash.length, 66); // 0x + 64 hex chars
    assert.ok(record.blockNumber! >= initialBlock);
    assert.ok(record.gasUsedBnb! > 0);
    assert.ok(record.executedPrice! > 0);
    assert.strictEqual(record.executedAmount, 5);
  });

  test('BnbWeb3Connector - commits on-chain Merkle root anchor to AegisAuditAnchor contract', async () => {
    const connector = new BnbWeb3Connector(undefined, 'TESTNET');
    const merkleRoot = '0x8f4c2e1883cce84094fe31a21e25d259e8b428a17f9c2a1883cce84094fe31a2';

    const result = await connector.commitAuditAnchor(merkleRoot, 50, '7f9c2a1-hackathon-final');

    assert.strictEqual(result.status, 'COMMITTED_ON_CHAIN');
    assert.ok(result.txHash.startsWith('0x'));
    assert.strictEqual(result.merkleRoot, merkleRoot);
    assert.strictEqual(result.totalDecisions, 50);
    assert.strictEqual(result.contractAddress, BSC_NETWORKS.TESTNET.auditAnchorAddress);
    assert.strictEqual(result.agentCommitSha, '7f9c2a1-hackathon-final');
  });
});
