import fs from 'fs';
import { ethers, network } from 'hardhat';

// Funtions
import { log } from '../../helper-functions';

// Data
import jsonContracts from '../../deployed-contracts.json';

// Types
import { FundMe } from '../../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';
import { frontEndAbiFile, frontEndContractsFile } from '../../helper-hardhat-config';

// --------------

const FUNDED_ETH = ethers.utils.parseEther('0.1');

/**
 * Making Funding Request to FundMe Contract
 */
async function updateFrontEnd(): Promise<void> | never {
  const [signer]: SignerWithAddress[] = await ethers.getSigners();
  const networkName: string = network.name;
  const contracts = Object(jsonContracts);
  console.log('*******************');
  console.log(contracts);
  console.log('*******************');
  // Throwing error if we did't find Contract Address
  if (!contracts?.[networkName]?.FundMe) {
    throw new Error('Contract is not deployed yet');
  }
  const fundMe: FundMe = await ethers.getContractAt(
    'FundMe',
    contracts[networkName].FundMe,
    signer
  );

  const apis = {
    FundMe: JSON.parse(fundMe.interface.format(ethers.utils.FormatTypes.json).toString()),
  };
  log('Changing front-end files');
  fs.writeFileSync(frontEndAbiFile, JSON.stringify(apis));
  fs.writeFileSync(frontEndContractsFile, JSON.stringify(contracts));
}

export default updateFrontEnd;
