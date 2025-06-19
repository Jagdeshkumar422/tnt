const User = require('../models/User');

const updateUserLevel = async (userId) => {
  if (!userId) return;

  const user = await User.findById(userId).populate('referrals');
  if (!user) return;

  const deposit = user.teamDeposits || 0;
  const refCount = user.referrals?.length || 0;

  if (deposit >= 50000 && refCount >= 100) user.level = 6;
  else if (deposit >= 10000 && refCount >= 70) user.level = 5;
  else if (deposit >= 5000 && refCount >= 40) user.level = 4;
  else if (deposit >= 1000 && refCount >= 20) user.level = 3;
  else if (deposit >= 500 && refCount >= 5) user.level = 2;
  else if (deposit >= 48) user.level = 1;

  await user.save();
};

module.exports = { updateUserLevel };
