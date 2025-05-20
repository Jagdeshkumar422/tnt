// routes/withdrawal.js
const express = require("express");
const router = express.Router();
const { submitWithdrawalRequest, getAllWithdrawals, updateWithdrawalStatus } = require("../controllers/withdrawalController");
const authMiddleware = require("../middleware/auth");

router.post("/withdraw", authMiddleware, submitWithdrawalRequest);
router.get("/withdrawals", getAllWithdrawals);
router.put("/withdrawals/:id/status", updateWithdrawalStatus);

module.exports = router;
