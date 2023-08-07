import { ethers, network } from 'hardhat';

// Funtions
import { log } from '../helper-functions';

// Data
import jsonContracts from '../deployed-contracts.json';

// Types
import { FundMe } from '../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';

// --------------

const FUNDED_ETH = ethers.utils.parseEther('0.1');

/**
 * Making Funding Request to FundMe Contract
 */
async function fund(): Promise<void> | never {
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

  log('Funding [0.1 ETH]...', 'title');
  const fundTxReceipt = await fundMe.fund({ value: FUNDED_ETH });
  await fundTxReceipt.wait(1);

  log('funded Successfully !');
  let contractBalance: BigNumber = await fundMe.provider.getBalance(fundMe.address);
  log(`Contract balance is: ${ethers.utils.formatEther(contractBalance)} ETH`);
  log('', 'separator');
}

fund()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
