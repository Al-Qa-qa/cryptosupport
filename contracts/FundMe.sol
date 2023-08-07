// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol';
import './PriceConverter.sol';

error FundMe__NotOwner();
error FundMe__NotEnoughtETH();
error FundMe__WithdrawFailed();

/**
 * @title A sample Funding Contract
 * @author Contractor Owner
 * @notice This contract is for creating a sample funding contract
 * @dev This implements price feeds as a library
 */
contract FundMe {
  // Type Declarations
  using PriceConverter for uint256;

  // State variables
  uint256 public constant MINIMUM_USD = 50 * 10 ** 18; // 50$
  address private immutable i_owner;
  address[] private s_funders;
  mapping(address => uint256) private s_addressToAmountFunded;
  AggregatorV3Interface private s_priceFeed;

  // Events
  event Funded(address indexed funder, uint256 indexed amount);
  event Withdrawed();

  // Modifiers
  modifier onlyOwner() {
    // require(msg.sender == i_owner);
    if (msg.sender != i_owner) revert FundMe__NotOwner();
    _;
  }

  /**
   * Contract constructor
   *
   * @param priceFeed Chainlink price feed (ETH/USD)
   */
  constructor(address priceFeed) {
    s_priceFeed = AggregatorV3Interface(priceFeed);
    i_owner = msg.sender;
  }

  /// @notice Funds our contract based on the ETH/USD price
  function fund() public payable {
    if (msg.value.getConversionRate(s_priceFeed) < MINIMUM_USD) revert FundMe__NotEnoughtETH();
    s_addressToAmountFunded[msg.sender] += msg.value;
    s_funders.push(msg.sender);
    emit Funded(msg.sender, msg.value);
  }

  /**
   * withdrawing funds, only the owner (deployer) of the contract can withdraw
   */
  function withdraw() public onlyOwner {
    address[] memory funders = s_funders;

    // Looping through our funders and reset there values to zero
    for (uint256 funderIndex = 0; funderIndex < funders.length; funderIndex++) {
      address funder = funders[funderIndex];
      s_addressToAmountFunded[funder] = 0;
    }

    // remove funders addresses
    s_funders = new address[](0);

    // Withdraw contract ethers
    (bool success, ) = i_owner.call{value: address(this).balance}('');
    if (!success) revert FundMe__WithdrawFailed();
    emit Withdrawed();
  }

  /** @notice Gets the amount that an address has funded
   *  @param fundingAddress the address of the funder
   *  @return amoutFunded amount funded by the user
   */
  function getAddressToAmountFunded(address fundingAddress) public view returns (uint256) {
    return s_addressToAmountFunded[fundingAddress];
  }

  /**
   * Chainlink pricefeed version
   */
  function getVersion() public view returns (uint256) {
    return s_priceFeed.version();
  }

  /**
   * Getting contract locked ETH
   */
  function getBalance() public view returns (uint256) {
    return address(this).balance;
  }

  /**
   * Getting the funder address in the index provided
   *
   * @param index the index of the funcder
   */
  function getFunder(uint256 index) public view returns (address) {
    return s_funders[index];
  }

  /**
   * Getting all funders (returns funders addresses array)
   */
  function getFunders() public view returns (address[] memory) {
    return s_funders;
  }

  /**
   * Returning the owner of the contract
   */
  function getOwner() public view returns (address) {
    return i_owner;
  }

  /**
   * Getting pricefeed address
   */
  function getPriceFeed() public view returns (AggregatorV3Interface) {
    return s_priceFeed;
  }
}
