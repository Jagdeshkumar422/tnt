const User = require('../models/User');

const updateUserLevel = async (userId) => {
  if (!userId) return;

  const user = await User.findById(userId).populate('referrals');
  if (!user) return;

  const deposit = user.teamDeposits || 0;
  const refCount = user.referrals?.length || 0;

  if (deposit >= 10001 && refCount >= 100) user.level = 7;
  else if (deposit >= 8001 && refCount >= 100) user.level = 6;
  else if (deposit >= 5001 && refCount >= 70) user.level = 5;
  else if (deposit >= 3001 && refCount >= 40) user.level = 4;
  else if (deposit >= 1001 && refCount >= 20) user.level = 3;
  else if (deposit >= 301 && refCount >= 5) user.level = 2;
  else if (deposit >= 47) user.level = 1;

  await user.save();
};

module.exports = { updateUserLevel };
