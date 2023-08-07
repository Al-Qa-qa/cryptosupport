import { assert, expect } from 'chai';
import { network, ethers } from 'hardhat';

// Function
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

// Data
import { developmentChains } from '../../helper-hardhat-config';

// Types
import {
  FundMe,
  FundMe__factory,
  MockV3Aggregator,
  MockV3Aggregator__factory,
} from '../../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';

// -----------------

describe('FundMe', function () {
  beforeEach(async () => {
    if (!developmentChains.includes(network.name)) {
      throw new Error('You need to be on a development chain to run unit tests');
    }
  });

  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  type DeployFixture = {
    deployer: SignerWithAddress;
    fundMe: FundMe;
    mockV3Aggregator: MockV3Aggregator;
  };
  async function deployFundMeFixture(): Promise<DeployFixture> {
    const [deployer]: SignerWithAddress[] = await ethers.getSigners();

    const DECIMALS = '18';
    const INITIAL_PRICE = '2000000000000000000000'; // 2000$

    const mockV3AggregatorFactory: MockV3Aggregator__factory = await ethers.getContractFactory(
      'MockV3Aggregator'
    );
    const mockV3Aggregator: MockV3Aggregator = await mockV3AggregatorFactory
      .connect(deployer)
      .deploy(DECIMALS, INITIAL_PRICE);

    const fundMeFactory: FundMe__factory = await ethers.getContractFactory('FundMe');
    const fundMe: FundMe = await fundMeFactory.connect(deployer).deploy(mockV3Aggregator.address!);

    return { deployer, fundMe, mockV3Aggregator };
  }

  describe('deployment', () => {
    describe('success', async () => {
      it('should set the aggregator addresses correctly', async () => {
        const { fundMe, mockV3Aggregator } = await loadFixture(deployFundMeFixture);
        const response: string = await fundMe.getPriceFeed();
        assert.equal(response, mockV3Aggregator.address);
      });

      it('should make the owner of the contract is the deployer', async () => {
        const { deployer, fundMe } = await loadFixture(deployFundMeFixture);
        const owner: string = await fundMe.getOwner();
        assert.equal(owner, deployer.address);
      });

      // This function {getVersion()} is not important at all
      // You don't need to write it in the contract nor test it
      it('should return the version of the Aggregator', async () => {
        const { fundMe } = await loadFixture(deployFundMeFixture);
        expect(await fundMe.getVersion()).not.to.be.reverted;
      });
    });
  });

  // constructor test is the same as deployment test
  describe('constructor', () => {
    it('sets the aggregator addresses correctly', async () => {
      const { fundMe, mockV3Aggregator } = await loadFixture(deployFundMeFixture);

      const response: string = await fundMe.getPriceFeed();
      assert.equal(response, mockV3Aggregator.address);
    });
  });

  describe('fund', () => {
    it("Fails if you don't send enough ETH", async () => {
      const { fundMe } = await loadFixture(deployFundMeFixture);
      await expect(fundMe.fund()).to.be.revertedWithCustomError(fundMe, 'FundMe__NotEnoughtETH');
    });

    it('Updates the amount funded data structure', async () => {
      const { deployer, fundMe } = await loadFixture(deployFundMeFixture);

      await fundMe.fund({ value: ethers.utils.parseEther('1') });
      const response: BigNumber = await fundMe.getAddressToAmountFunded(deployer.address);
      assert.equal(response.toString(), ethers.utils.parseEther('1').toString());
    });

    it('Add the funder to the funders array', async () => {
      const { deployer, fundMe } = await loadFixture(deployFundMeFixture);
      await fundMe.connect(deployer).fund({ value: ethers.utils.parseEther('1') });
      const funder: string = await fundMe.getFunder(0);
      assert.equal(funder, deployer.address);
    });

    it('increases funders array by 1', async () => {
      const { deployer, fundMe } = await loadFixture(deployFundMeFixture);
      const fundersLengthBeforeFund: number = (await fundMe.getFunders()).length;
      await fundMe.connect(deployer).fund({ value: ethers.utils.parseEther('1') });
      const fundersLengthAfterFund: number = (await fundMe.getFunders()).length;
      assert.equal(fundersLengthBeforeFund + 1, fundersLengthAfterFund);
    });

    it('emits funded event', async () => {
      const { deployer, fundMe } = await loadFixture(deployFundMeFixture);
      await expect(fundMe.connect(deployer).fund({ value: ethers.utils.parseEther('1') })).to.emit(
        fundMe,
        'Funded'
      );
    });
  });

  describe('withdraw', () => {
    beforeEach(async () => {
      const { fundMe } = await loadFixture(deployFundMeFixture);

      await fundMe.fund({ value: ethers.utils.parseEther('1') });
    });
    it('reverts if the withdrawal is not the owner', async () => {
      const { fundMe } = await loadFixture(deployFundMeFixture);
      const [, hacker]: SignerWithAddress[] = await ethers.getSigners(); // 2nd account
      expect(fundMe.connect(hacker).withdraw()).to.be.revertedWithCustomError(
        fundMe,
        'FundMe__NotOwner'
      );
    });

    it('gives a single funder all their ETH back', async () => {
      const { deployer, fundMe } = await loadFixture(deployFundMeFixture);

      // Arrange
      const startingFundMeBalance: BigNumber = await fundMe.provider.getBalance(fundMe.address);
      const startingDeployerBalance: BigNumber = await fundMe.provider.getBalance(deployer.address);

      // Act
      const txResponse = await fundMe.withdraw();
      const txReceipt = await txResponse.wait(1);
      const { gasUsed, effectiveGasPrice } = txReceipt;
      const gasCost: BigNumber = gasUsed.mul(effectiveGasPrice);

      const endingFundMeBalance: BigNumber = await fundMe.provider.getBalance(fundMe.address);
      const endingDeployerBalance: BigNumber = await fundMe.provider.getBalance(deployer.address);

      // Assert
      assert.equal(endingFundMeBalance.toString(), '0');
      assert.equal(
        startingFundMeBalance.add(startingDeployerBalance).toString(),
        endingDeployerBalance.add(gasCost).toString()
      );
    });

    it('emits Withdrawed event', async () => {
      const { fundMe, deployer } = await loadFixture(deployFundMeFixture);
      expect(await fundMe.connect(deployer).withdraw()).to.emit(fundMe, 'Withdrawed');
    });
    // this test is overloaded. Ideally we'd split it into multiple tests
    // but for simplicity we left it as one
    it('is allows us to withdraw with multiple funders', async () => {
      const { deployer, fundMe } = await loadFixture(deployFundMeFixture);

      // Funding
      const accounts = await ethers.getSigners();
      await fundMe.connect(accounts[1]).fund({ value: ethers.utils.parseEther('1') });
      await fundMe.connect(accounts[2]).fund({ value: ethers.utils.parseEther('1') });
      await fundMe.connect(accounts[3]).fund({ value: ethers.utils.parseEther('1') });
      await fundMe.connect(accounts[4]).fund({ value: ethers.utils.parseEther('1') });
      await fundMe.connect(accounts[5]).fund({ value: ethers.utils.parseEther('1') });

      // Act
      const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
      const startingDeployerBalance = await fundMe.provider.getBalance(deployer.address);
      const txResponse = await fundMe.withdraw();
      // Let's comapre gas costs :)
      // const transactionResponse = await fundMe.withdraw()
      const txReceipt = await txResponse.wait(1);
      const { gasUsed, effectiveGasPrice } = txReceipt;
      const withdrawGasCost: BigNumber = gasUsed.mul(effectiveGasPrice);
      console.log(`GasCost: ${withdrawGasCost}`);
      console.log(`GasUsed: ${gasUsed}`);
      console.log(`GasPrice: ${effectiveGasPrice}`);
      const endingDeployerBalance: BigNumber = await fundMe.provider.getBalance(deployer.address);
      // Assert (Checl that: )
      // 1- The deployer takes all the contract money
      assert.equal(
        startingFundMeBalance.add(startingDeployerBalance).toString(),
        endingDeployerBalance.add(withdrawGasCost).toString()
      );
      // 2- There are no funders any more
      await expect(fundMe.getFunder(0)).to.be.reverted;

      // 3- Mapping to funders will get [0 ETH]
      assert.equal((await fundMe.getAddressToAmountFunded(accounts[1].address)).toString(), '0');
      assert.equal((await fundMe.getAddressToAmountFunded(accounts[2].address)).toString(), '0');
      assert.equal((await fundMe.getAddressToAmountFunded(accounts[3].address)).toString(), '0');
      assert.equal((await fundMe.getAddressToAmountFunded(accounts[4].address)).toString(), '0');
      assert.equal((await fundMe.getAddressToAmountFunded(accounts[5].address)).toString(), '0');
    });
  });
});
