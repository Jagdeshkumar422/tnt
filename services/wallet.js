const bip39 = require('bip39');
const hdkey = require('ethereumjs-wallet/hdkey');

const mnemonic = "shove carpet gown track drift hamster gossip assume project erode fancy give";
const seed = bip39.mnemonicToSeedSync(mnemonic);
const hdWallet = hdkey.fromMasterSeed(seed);

const generateAddress = (index) => {
  const wallet = hdWallet.derivePath(`m/44'/60'/0'/0/${index}`).getWallet();
  const address = '0x' + wallet.getAddress().toString('hex');
  const privateKey = wallet.getPrivateKey().toString('hex');
  return { address, privateKey };
};

module.exports = { generateAddress };
