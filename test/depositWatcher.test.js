// ✅ Import the real BigNumber BEFORE mocking ethers
const { BigNumber: RealBigNumber } = require('ethers');

// ✅ Mock ethers AFTER importing the real BigNumber
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  const mockQueryFilter = jest.fn();

  return {
    ...original,
    Contract: jest.fn().mockImplementation(() => ({
      filters: {
        Transfer: jest.fn(() => ({})),
      },
      queryFilter: mockQueryFilter,
    })),
    JsonRpcProvider: jest.fn().mockImplementation(() => ({
      getBlockNumber: jest.fn().mockResolvedValue(100),
    })),
    formatUnits: jest.fn((value, decimals) => {
      // Simulate formatUnits by dividing value by 10^decimals
      return (parseFloat(value.toString()) / Math.pow(10, decimals)).toString();
    }),
    __mockQueryFilter: mockQueryFilter, // expose for test
  };
});

// ✅ Import services and models AFTER mocks
const checkDeposits = require('../services/depositWatcher');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// ✅ Mock your models
jest.mock('../models/User');
jest.mock('../models/Transaction');

describe('checkDeposits', () => {
  it('should find new deposits and save transactions', async () => {
    const { __mockQueryFilter } = require('ethers');

    // Mock user in DB
    const wallet = '0x8DeC2931480158dB6e786571E5c189d30Df38276';
    const lowerCaseWallet = wallet.toLowerCase();

    User.find.mockResolvedValue([
      {
        _id: '6828838024f2a630a0dab55f',
        walletAddress: wallet
      }
    ]);

    // Mock USDT transfer logs (to and from same address for test)
    __mockQueryFilter.mockResolvedValue([
      {
        args: {
          from: wallet,
          to: wallet,
          value: RealBigNumber.from('1000000') // 1 USDT with 6 decimals
        },
        transactionHash: '0xTxHash1'
      }
    ]);

    Transaction.findOne.mockResolvedValue(null);
    Transaction.create.mockResolvedValue({});

    // Run checkDeposits
    await checkDeposits();

    // ✅ Expect transaction to be saved correctly
    expect(Transaction.create).toHaveBeenCalledWith(expect.objectContaining({
      txHash: '0xTxHash1',
      from: wallet,
      to: lowerCaseWallet,
      amount: '1', // because we formatted 1000000 as USDT (6 decimals)
      status: 'confirmed',
      user: '6828838024f2a630a0dab55f',
      timestamp: expect.any(Date),
    }));
  });
});
