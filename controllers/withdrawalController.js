const speakeasy = require("speakeasy");
const User = require("../models/User");
const WithdrawalRequest = require("../models/WithdrawalRequest");

exports.submitWithdrawalRequest = async (req, res) => {
  try {
    const { googleCode, emailCode, amount, address, network } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // ✅ Check email verification code
    if (user.emailCode !== emailCode || user.emailCodeExpires < Date.now()) {
      return res.status(400).json({ msg: "Invalid or expired email code" });
    }

    // ✅ Check Google Authenticator code
    const googleVerified = speakeasy.totp.verify({
      secret: user.google2faSecret,
      encoding: "base32",
      token: googleCode,
      window: 1
    });

    if (!googleVerified) {
      return res.status(400).json({ msg: "Invalid Google Authenticator code" });
    }

    // ✅ Check if user has sufficient balance
    if (user.balance < parseFloat(amount)) {
      return res.status(400).json({ msg: "Insufficient balance" });
    }

    // ✅ Create withdrawal request (do NOT deduct yet)
    const request = new WithdrawalRequest({
      userId,
      amount,
      address,
      network,
      status: "pending"
    });

    await request.save();

    res.json({ msg: "Withdrawal request submitted", request });

  } catch (err) {
    console.error("Withdrawal Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};


exports.getAllWithdrawals = async (req, res) => {
  const requests = await WithdrawalRequest.find().populate("userId", "email");
  res.json(requests);
};

exports.updateWithdrawalStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const request = await WithdrawalRequest.findById(id);
  if (!request) return res.status(404).json({ msg: "Request not found" });

  if (status === "approved") {
    const user = await User.findById(request.userId);
    if (user.balance < request.amount) {
      return res.status(400).json({ msg: "Insufficient user balance" });
    }
    user.balance -= request.amount;
    await user.save();
  }

  request.status = status;
  await request.save();

  res.json({ msg: "Status updated" });
};