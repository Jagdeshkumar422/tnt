// utils/calculateProfit.js
function calculateProfit(balance, nftPrice) {
  let percent = 2;
  if (balance >= 5000) percent = 8;
  else if (balance >= 2500) percent = 6;
  else if (balance >= 1000) percent = 5;
  else if (balance >= 500) percent = 3.5;

  const amount = parseFloat(((nftPrice * percent) / 100).toFixed(2));
  return { percent, amount };
}

module.exports = calculateProfit;
