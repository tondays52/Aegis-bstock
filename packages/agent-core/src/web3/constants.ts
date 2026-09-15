export interface BscNetworkConfig {
  chainId: number;
  name: string;
  rpcUrls: string[];
  blockExplorerUrl: string;
  pancakeRouter: string;
  wbnbAddress: string;
  usdtAddress: string;
  auditAnchorAddress: string;
}

export const BSC_NETWORKS: Record<'MAINNET' | 'TESTNET', BscNetworkConfig> = {
  MAINNET: {
    chainId: 56,
    name: 'BNB Smart Chain Mainnet',
    rpcUrls: [
      'https://bsc-dataseed.binance.org/',
      'https://bsc-dataseed1.defibit.io/',
      'https://bsc-dataseed1.ninicoin.io/'
    ],
    blockExplorerUrl: 'https://bscscan.com',
    pancakeRouter: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    wbnbAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    usdtAddress: '0x55d398326f99059fF775485246999027B3197955',
    auditAnchorAddress: '0x7F9C2a1883cCe84094fE31A21e25d259e8B428A1'
  },
  TESTNET: {
    chainId: 97,
    name: 'BNB Smart Chain Testnet',
    rpcUrls: [
      'https://data-seed-prebsc-1-s1.binance.org:8545/',
      'https://data-seed-prebsc-2-s1.binance.org:8545/'
    ],
    blockExplorerUrl: 'https://testnet.bscscan.com',
    pancakeRouter: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',
    wbnbAddress: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
    usdtAddress: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
    auditAnchorAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
  }
};

/**
 * Standard bStock token proxies & pairs on BNB Smart Chain
 */
export const BSTOCK_TOKENS: Record<string, { address: string; symbol: string; decimals: number }> = {
  'bTSLA': { address: '0x1111111111111111111111111111111111111111', symbol: 'bTSLA', decimals: 18 },
  'bNVDA': { address: '0x2222222222222222222222222222222222222222', symbol: 'bNVDA', decimals: 18 },
  'bAAPL': { address: '0x3333333333333333333333333333333333333333', symbol: 'bAAPL', decimals: 18 },
  'bMSTR': { address: '0x4444444444444444444444444444444444444444', symbol: 'bMSTR', decimals: 18 },
  'bCOIN': { address: '0x5555555555555555555555555555555555555555', symbol: 'bCOIN', decimals: 18 }
};
