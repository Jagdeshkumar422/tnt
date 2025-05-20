const User = require('../models/User');

const LEVELS = [
  { level: 1, deposit: 50, teamA: 3, teamB: 3, teamC: 3, commission: 1.8, daily: false },
  { level: 2, deposit: 500, teamA: 10, teamB: 10, teamC: 10, commission: 2.2, daily: true },
  { level: 3, deposit: 1000, teamA: 30, teamB: 30, teamC: 30, commission: 2.8, daily: true },
  { level: 4, deposit: 5000, teamA: 50, teamB: 50, teamC: 50, commission: 3.2, daily: true },
  { level: 5, deposit: 10000, teamA: 100, teamB: 100, teamC: 100, commission: 3.6, daily: true },
  { level: 6, deposit: 50000, teamA: 200, teamB: 200, teamC: 200, commission: 4.0, daily: true },
];

const updateUserLevel = async (user) => {
  await user.populate(['teamA', 'teamB', 'teamC']);
  const totalDeposit = user.deposits.reduce((sum, d) => sum + (d.confirmed ? d.amount : 0), 0);

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    const lvl = LEVELS[i];
    if (
      totalDeposit >= lvl.deposit &&
      user.teamA.length >= lvl.teamA &&
      user.teamB.length >= lvl.teamB &&
      user.teamC.length >= lvl.teamC
    ) {
      if (user.level !== lvl.level) {
        user.level = lvl.level;
        await user.save();
        console.log(`Upgraded ${user.username} to level ${lvl.level}`);
      }
      break;
    }
  }
};

module.exports = { updateUserLevel, LEVELS };
