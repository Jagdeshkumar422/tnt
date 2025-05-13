const Web3 = require('web3').default;
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const web3 = new Web3("https://mainnet.infura.io/v3/a5312d18722743c1805a5d06eff75db8");
const USDT_CONTRACT = '0x55d398326f99059fF775485246999027B3197955'; // USDT on BSC
const ABI = [ // minimal ABI to check transfers
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
];

const contract = new web3.eth.Contract(ABI, USDT_CONTRACT);

const monitorDeposits = async () => {
  const users = await User.find();

  for (const user of users) {
    const events = await contract.getPastEvents('Transfer', {
      filter: { to: user.bscAddress },
      fromBlock: 'latest',
    });

    for (let event of events) {
      const { value } = event.returnValues;
      const amount = web3.utils.fromWei(value, 'ether');

      // Check if already recorded
      const exists = await Transaction.findOne({ txHash: event.transactionHash });
      if (!exists) {
        await Transaction.create({
          userId: user._id,
          amount,
          network: 'BEP20',
          txHash: event.transactionHash,
        });

        // Update user balance
        user.balance += parseFloat(amount);
        await user.save();
      }
    }
  }
};

module.exports = monitorDeposits;
