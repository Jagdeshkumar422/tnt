const speakeasy = require("speakeasy");
const User = require("../models/User");
const WithdrawalRequest = require("../models/WithdrawalRequest");

exports.submitWithdrawalRequest = async (req, res) => {
  try {
    const { googleCode, emailCode, amount, address, network } = req.body;
    const userId = req.user.id;
    const withdrawalAmount = parseFloat(amount);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // ✅ Minimum withdrawal check
    if (withdrawalAmount < 30) {
      return res.status(400).json({ msg: "Minimum withdrawal amount is 30" });
    }

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
    if (user.balance < withdrawalAmount) {
      return res.status(400).json({ msg: "Insufficient balance" });
    }

    // ✅ Check if user already made a withdrawal today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingRequest = await WithdrawalRequest.findOne({
      userId,
      createdAt: { $gte: today }
    });

    if (existingRequest) {
      return res.status(400).json({ msg: "You can only make one withdrawal per day" });
    }

    // ✅ Deduct balance immediately
    user.balance -= withdrawalAmount;
    await user.save();

    // ✅ Create withdrawal request in "pending"
    const request = new WithdrawalRequest({
      userId,
      amount: withdrawalAmount,
      address,
      network,
      status: "pending"
    });

    await request.save();

    res.json({ msg: "Withdrawal request submitted and balance deducted", request });

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
  try {
    const { id } = req.params;
    const { status } = req.body;

    const request = await WithdrawalRequest.findById(id);
    if (!request) return res.status(404).json({ msg: "Request not found" });

    // 🚫 No balance deduction needed here
    // ✅ Simply update the status
    request.status = status;
    await request.save();

    res.json({ msg: `Withdrawal ${status} successfully` });

  } catch (err) {
    console.error("Update Withdrawal Status Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};


exports.bindAddress = async (req, res) => {
  try {
    const { email, address, network, otp, userId } = req.body;
    console.log(req.body)

    if (!email || !address || !network || !otp || !userId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await User.findById(userId).select("email emailCode emailCodeExpires walletAddressBEP20");
    if (!user || user.email !== email) {
      return res.status(404).json({ message: "User not found or email mismatch" });
    }

    // ✅ Verify OTP
    if (user.emailCode !== otp || user.emailCodeExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired email code" });
    }

    // ✅ Only allow BEP20 updates
    if (network !== 'BEP20') {
      return res.status(400).json({ message: "Only BEP20 network is supported" });
    }

    // ✅ Update only the BEP20 address without affecting other fields
    await User.updateOne(
      { _id: userId },
      { $set: { address: address } }
    );

    return res.json({ message: "BEP20 address bound successfully" });

  } catch (err) {
    console.error("Bind Address Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};