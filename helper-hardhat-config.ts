import { BigNumber } from 'ethers';

type NetworkConfigItem = {
  name: string;
  fundAmount?: BigNumber;
  ethUsdPriceFeed?: string;
};

type NetworkConfigMap = {
  [chainId: string]: NetworkConfigItem;
};

export const networkConfig: NetworkConfigMap = {
  default: {
    name: 'hardhat',
  },
  31337: {
    name: 'localhost',
    ethUsdPriceFeed: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  },
  1: {
    name: 'mainnet',
  },
  11155111: {
    name: 'sepolia',
    ethUsdPriceFeed: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
  },
  137: {
    name: 'polygon',
    ethUsdPriceFeed: '0xF9680D99D6C9589e2a93a78A04A279e509205945',
  },
};

export const developmentChains: string[] = ['hardhat', 'localhost'];
export const VERIFICATION_BLOCK_CONFIRMATIONS = 3;
export const frontEndContractsFile = '../front-end/constants/contractAddresses.json';
export const frontEndAbiFile = '../front-end/constants/APIs.json';
