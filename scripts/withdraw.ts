import { FundMe } from '../typechain-types';
import { ethers, network } from 'hardhat';

// Functions
import { log } from '../helper-functions';

// Data
import jsonContracts from '../deployed-contracts.json';

// Types
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

// --------------

/**
 * Making Withdraw request from FundMe Contract
 */
async function withdraw(): Promise<void> | never {
  const [signer]: SignerWithAddress[] = await ethers.getSigners();
  const networkName: string = network.name;
  const contracts = Object(jsonContracts);

  // Throwing error if we did't find Contract Address
  if (!contracts?.[networkName]?.FundMe) {
    throw new Error('Contract is not deployed yet');
  }
  const fundMe: FundMe = await ethers.getContractAt(
    'FundMe',
    contracts[networkName].FundMe,
    signer
  );

  log('Withdrawing funds...', 'title');
  let contractBalance = await fundMe.provider.getBalance(fundMe.address);
  log(`Contract balance is: ${ethers.utils.formatEther(contractBalance)} ETH`);

  const fundTxReceipt = await fundMe.withdraw();
  await fundTxReceipt.wait(1);

  log('Withdrawed Successfully !');
  contractBalance = await fundMe.provider.getBalance(fundMe.address);
  log(`Contract balance is: ${ethers.utils.formatEther(contractBalance)} ETH`);
  log('', 'separator');
}

withdraw()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
