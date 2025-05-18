const Web3 = require('web3');
const TronWeb = require('tronweb').default.TronWeb;
const tronWeb = new TronWeb({ fullHost: 'https://api.shasta.trongrid.io' });

function generateWallets() {
  // BEP20 Wallet (BSC uses same format as Ethereum)
  const web3 = new Web3('https://bsc-dataseed.binance.org/');
  const bep20Account = web3.eth.accounts.create();

  // TRC20 Wallet (TRON)
  const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
  });
  const trc20Account = tronWeb.utils.accounts.generateAccount();

  return {
    walletAddressBEP20: bep20Account.address,
    walletAddressTRC20: trc20Account.address.base58,
    privateKeyBEP20: bep20Account.privateKey,
    privateKeyTRC20: trc20Account.privateKey,
  };
}

module.exports = { generateWallets };
