// utils/walletGenerator.js
const { createPayment } = require('../config/nowpayment');
const User = require('../models/User');

const generateWalletForUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Generate USDT-TRC20 wallet address if not already set
  if (!user.trc20Address) {
    const trc20 = await createPayment({
      price_amount: 50, // required to trigger address generation
      price_currency: "usd",
      pay_currency: "usdttrc20",
      ipn_callback_url: `http://localhost:5000/api/deposit/ipn`, // change to your public URL in production
      order_id: `init-trc20-${userId}-${Date.now()}`,
      is_fixed_rate: false // Optional but recommended
    });

    if (!trc20.pay_address) throw new Error("Failed to generate TRC20 wallet address");
    user.trc20Address = trc20.pay_address;
  }

  // Generate USDT-BEP20 wallet address if not already set
  if (!user.bep20Address) {
    const bep20 = await createPayment({
      price_amount: 50,
      price_currency: "usd",
      pay_currency: "usdtbsc",
      ipn_callback_url: `http://localhost:5000/api/deposit/ipn`,
      order_id: `init-bep20-${userId}-${Date.now()}`,
      is_fixed_rate: false
    });

    if (!bep20.pay_address) throw new Error("Failed to generate BEP20 wallet address");
    user.bep20Address = bep20.pay_address;
  }

  await user.save();
};

module.exports = { generateWalletForUser };
