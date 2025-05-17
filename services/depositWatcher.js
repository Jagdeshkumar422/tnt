const { ethers } = require("ethers");
// Use a dynamic import, and handle it correctly.
let TronWeb;

async function initializeTronWeb() {
  try {
    const tronWebModule = await import('tronweb');
    TronWeb = tronWebModule; //  Use the entire module directly
    console.log("TronWeb initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize TronWeb:", error);
    // IMPORTANT: Handle this error.  The rest of your code depends on TronWeb.
    //  You might want to throw an error, exit the process, or use a fallback.
    process.exit(1); // Exit, because the app cannot run without TronWeb
  }
}
const User = require("../models/User");
const Transaction = require("../models/Transaction");

const provider = new ethers.JsonRpcProvider("https://data-seed-prebsc-1-s1.binance.org:8545/");
const USDT_ADDRESS_BEP20 = "0x55d398326f99059fF775485246999027B3197955"; // BEP20 USDT
const USDT_ABI = [
  "event Transfer(address indexed from, address indexed to, uint value)",
  "function balanceOf(address) view returns (uint256)"
];
const usdtContract = new ethers.Contract(USDT_ADDRESS_BEP20, USDT_ABI, provider);

// TRC20 USDT contract address (mainnet)
const USDT_ADDRESS_TRC20 = "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj";



// Persistent tracking variables (you should store these persistently)
let lastScannedBlockBEP20 = 0;
let lastScannedTimestampTRC20 = 0;  // store last checked timestamp for TRC20

// Reuse your existing fetchLogsWithRetry function here for BEP20

async function fetchLogsWithRetry(filter, fromBlock, toBlock, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await usdtContract.queryFilter(filter, fromBlock, toBlock);
    } catch (error) {
      console.warn(`Retry ${i + 1}/${retries} for blocks ${fromBlock}-${toBlock} failed: ${error.message}`);
      if (error.code === 'BAD_DATA' && error.message.includes('rate limit')) {
        // Handle rate limit error specifically
        console.warn("Rate limit hit.  Retrying after delay.");
        if (i < retries - 1) {
          await new Promise(res => setTimeout(res, delay));
          delay *= 2; // Increase delay
        } else {
          throw new Error("Rate limit exceeded after multiple retries.");
        }
      }
      else {
        throw error;
      }
    }
  }
}

async function fetchLogsInChunks(filter, fromBlock, toBlock, chunkSize = 50) {
  let allEvents = [];
  let start = fromBlock;

  while (start <= toBlock) {
    const end = Math.min(start + chunkSize - 1, toBlock);

    try {
      const events = await fetchLogsWithRetry(filter, start, end);
      allEvents = allEvents.concat(events);
    } catch (error) {
      console.error(`❌ Failed to fetch logs for blocks ${start} to ${end}:`, error);
      throw error;
    }

    start = end + 1;
    await new Promise(res => setTimeout(res, 800)); // Prevent rate limiting
  }

  return allEvents;
}

async function checkBEP20Deposits() {
  try {
    const users = await User.find();
    // Use BEP20 wallet addresses here
    const userWallets = users
      .map(user => user.walletAddressBEP20)
      .filter(Boolean)
      .map(addr => addr.toLowerCase());

    const currentBlock = await provider.getBlockNumber();

    if (lastScannedBlockBEP20 === 0) {
      lastScannedBlockBEP20 = currentBlock - 1000;
      if (lastScannedBlockBEP20 < 0) lastScannedBlockBEP20 = 0;
    }

    const filter = usdtContract.filters.Transfer(null, null);

    const events = await fetchLogsInChunks(filter, lastScannedBlockBEP20 + 1, currentBlock);
    console.log(`🔎 [BEP20] Scanned ${events.length} events from blocks ${lastScannedBlockBEP20 + 1} to ${currentBlock}`);

    for (const event of events) {
      if (!event.args || !event.args.from || !event.args.to || !event.args.value) {
        console.warn("⚠️ Skipping event with missing args");
        continue;
      }

      const to = event.args.to.toLowerCase();
      const from = event.args.from.toLowerCase();
      const value = event.args.value;

      if (!userWallets.includes(to)) continue;

      const txHash = event.transactionHash;
      const amount = ethers.utils.formatUnits(value, 6); // USDT has 6 decimals

      // Find user by BEP20 wallet address
      const user = users.find(u => u.walletAddressBEP20 && u.walletAddressBEP20.toLowerCase() === to);
      if (!user) continue;

      const exists = await Transaction.findOne({ txHash });
      if (!exists) {
        await Transaction.create({
          txHash,
          from,
          to,
          amount,
          status: 'confirmed',
          user: user._id,
          network: 'BEP20',
          timestamp: new Date()
        });

        console.log(`✅ [BEP20] New deposit: ${amount} USDT from ${from} to ${to}`);
      }
    }

    lastScannedBlockBEP20 = currentBlock;
  } catch (error) {
    console.error("❌ [BEP20] Error checking deposits:", error);
  }
}

async function checkTRC20Deposits() {
  if (!TronWeb) {
    console.error("TronWeb is not initialized. Cannot check TRC20 deposits.");
    return;
  }
  try {
    const users = await User.find();
    // Use TRC20 wallet addresses here
    const userWallets = users
      .map(user => user.walletAddressTRC20)
      .filter(Boolean)
      .map(addr => addr.toLowerCase());

    const currentTimestamp = Date.now();

    if (!lastScannedTimestampTRC20) {
      lastScannedTimestampTRC20 = currentTimestamp - 24 * 60 * 60 * 1000; // last 24 hours
    }

    const events = await TronWeb.getEventResult({
      fromTimestamp: lastScannedTimestampTRC20,  // Changed param name to fromTimestamp
      toTimestamp: currentTimestamp,
      contractAddress: USDT_ADDRESS_TRC20,
      eventName: 'Transfer',
    });

    console.log(`🔎 [TRC20] Scanned ${events.length} Transfer events since timestamp ${lastScannedTimestampTRC20}`);

    for (const event of events) {
      const to = event.result.to.toLowerCase();
      const from = event.result.from.toLowerCase();
      const value = event.result.value;

      if (!userWallets.includes(to)) continue;

      const txHash = event.transaction;
      const amount = value / 1e6; // USDT decimals

      // Find user by TRC20 wallet address
      const user = users.find(u => u.walletAddressTRC20 && u.walletAddressTRC20.toLowerCase() === to);
      if (!user) continue;

      const exists = await Transaction.findOne({ txHash });
      if (!exists) {
        await Transaction.create({
          txHash,
          from,
          to,
          amount,
          status: 'confirmed',
          user: user._id,
          network: 'TRC20',
          timestamp: new Date(event.block_timestamp)
        });

        console.log(`✅ [TRC20] New deposit: ${amount} USDT from ${from} to ${to}`);
      }
    }

    lastScannedTimestampTRC20 = currentTimestamp;
  } catch (error) {
    console.error("❌ [TRC20] Error checking deposits:", error);
  }
}


async function checkDeposits() {
  if (!TronWeb) {
    console.error("TronWeb is not initialized.  Deposits check aborted.");
    return;
  }
  await checkBEP20Deposits();
  await checkTRC20Deposits();
}
// Initialize TronWeb *before* calling checkDeposits
(async () => {
  await initializeTronWeb();
  checkDeposits(); // Start checking deposits
})();

module.exports = checkDeposits;
