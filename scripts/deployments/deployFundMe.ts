// Packages
import * as fs from 'fs';
import * as path from 'path';
import { ethers, network } from 'hardhat';

// Functions
import { log, verify } from '../../helper-functions';

// Data
import {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
  frontEndContractsFile,
  frontEndAbiFile,
} from '../../helper-hardhat-config';

// Types
import {
  FundMe,
  FundMe__factory,
  MockV3Aggregator,
  MockV3Aggregator__factory,
} from '../../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

/**
 * Type of the deployed contract that will be stored in deployed-contracts.json file
 *
 * example:
 *  {
 *    "hardhat": {
 *      "contractName": "contractAddress"
 *    }
 *  }
 */
type DeployedContracts = {
  [key: string]: {
    [key: string]: string;
  };
};

const parentDir: string = path.resolve(__dirname, '../../');
const deployedContractsPath: string = path.join(parentDir, 'deployed-contracts.json');
const oldContracts: DeployedContracts = JSON.parse(fs.readFileSync(deployedContractsPath, 'utf8'));

/**
 * Deploy FundMe Contract
 *
 * @param chainId the Id of the network we will deploy on it
 * NOTE: 'default' key is the key of the hardhat network
 * @return the deployed contract/contracts
 */
async function deployFundMe(chainId: number | 'default'): Promise<FundMe> {
  // Gets the first account as the deployer
  const [deployer]: SignerWithAddress[] = await ethers.getSigners();

  let priceFeedAddress: string;

  // Development Chain modifications
  if (developmentChains.includes(network.name)) {
    // Deploy MockV3Aggregator to get test priceFeed address
    const DECIMALS: string = '18';
    const INITIAL_PRICE: string = '2000000000000000000000'; // 2000$

    // Deploy MOCKS
    log(`Deploing MOCKS (MockV3Aggregator)`, 'title');
    const mockV3AggregatorFactory: MockV3Aggregator__factory = await ethers.getContractFactory(
      'MockV3Aggregator'
    );
    const mockV3Aggregator: MockV3Aggregator = await mockV3AggregatorFactory.deploy(
      DECIMALS,
      INITIAL_PRICE
    );

    priceFeedAddress = mockV3Aggregator.address;
    log('MockV3Aggregator deployed successfully');
    log('', 'separator');

    // Save Contract to our file
    if (oldContracts[network.name]) {
      oldContracts[network.name].MockV3Aggregator = mockV3Aggregator.address;
    } else {
      oldContracts[network.name] = {};
      oldContracts[network.name].MockV3Aggregator = mockV3Aggregator.address;
    }
  } else {
    // Use the priceFeed address we want to use in our project (ETH/USD)
    // If we are not in a development chain
    priceFeedAddress = networkConfig[chainId].ethUsdPriceFeed!;
  }

  // Deploying FundMe Contract
  log(`Deploying FundMe with the account: ${deployer.address}`, 'title');
  const fundMeFactory: FundMe__factory = await ethers.getContractFactory('FundMe', deployer);
  log('Deploying the contract...');
  const fundMe: FundMe = await fundMeFactory.deploy(priceFeedAddress!);
  await fundMe.deployed();

  log(`FundMe Contract deployed to: ${fundMe.address}`);
  log('', 'separator');

  // Verify Contract if it isnt in a development chain
  if (!developmentChains.includes(network.name)) {
    log('Verifying Contract', 'title');
    await fundMe.deployTransaction.wait(VERIFICATION_BLOCK_CONFIRMATIONS);
    await verify(fundMe.address, [priceFeedAddress]);
    log('verified successfully');
    log('', 'separator');
  }

  // Storing contract address to connect to it later
  log('Storing contract address');
  if (oldContracts[network.name]) {
    oldContracts[network.name].FundMe = fundMe.address;
  } else {
    oldContracts[network.name] = {};
    oldContracts[network.name].FundMe = fundMe.address;
  }

  fs.writeFileSync(deployedContractsPath, JSON.stringify(oldContracts, null, 2));

  // Update front-end files
  if (process.env.UPDATE_FRONT_END) {
    log('Storing contracts to our front-end folder');
    fs.writeFileSync(frontEndContractsFile, JSON.stringify(oldContracts, null, 2));
    const apis = {
      FundMe: JSON.parse(fundMe.interface.format(ethers.utils.FormatTypes.json).toString()),
    };

    fs.writeFileSync(frontEndAbiFile, JSON.stringify(apis));
  }
  log('Stored Succesfully');
  log('', 'separator');
  return fundMe;
}

export default deployFundMe;
