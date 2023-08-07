import { expect } from 'chai';
import { network, ethers } from 'hardhat';

// Data
import { developmentChains } from '../../helper-hardhat-config';
import deployedContracts from '../../deployed-contracts.json';

// Types
import { FundMe } from '../../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';

// -----------------

describe('FundMe', function () {
  let deployer: SignerWithAddress;
  let fundMe: FundMe;

  // Check that we are not in development network
  beforeEach(async () => {
    if (developmentChains.includes(network.name)) {
      throw new Error("You can't be in development chain when running staging tests");
    }
  });

  // Get our contract and connect to it with the deployer account
  // NOTE: You need to connect to it by the deployer to be able to withdraw funds
  beforeEach(async () => {
    deployer = (await ethers.getSigners())[0];
    fundMe = await ethers.getContractAt('FundMe', deployedContracts.sepolia.FundMe, deployer);
  });

  describe('FundMe Staging Test', () => {
    it('should take funds and withdraw them', async () => {
      console.log('funding 0.1 ETH');
      const fundTxReceipt = await fundMe
        .connect(deployer)
        .fund({ value: ethers.utils.parseEther('0.1') });
      await fundTxReceipt.wait(1);
      console.log('Withdrawing Funds');
      const withdrawTxReceipt = await fundMe.connect(deployer).withdraw();
      await withdrawTxReceipt.wait(1);

      const endingFundingBalance: BigNumber = await fundMe.provider.getBalance(fundMe.address);
      console.log(`Contract Balance: ${endingFundingBalance.toString()}`);
      expect(endingFundingBalance.toString() === '0');
    });
  });
});
