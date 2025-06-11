const express = require('express');
const router = express.Router();
const { getDepositHistory } = require('../config/binance');
const Deposit = require('../models/Deposit');
const mongoose = require("mongoose")

// router.post('/', async (req, res) => {
//     try {
//         // Extract data from the request body
//         const { userId, paymentId, amount, currency, address, status, timestamp } = req.body;

//         // Basic validation: Check for required fields
//         if (!userId || !amount || !currency || !address) {
//             return res.status(400).json({ message: 'Missing required fields: userId, amount, currency, address.' });
//         }

//         // Optional: Ensure paymentId is unique or generate one if not provided
//         // This helps prevent duplicate deposits for the same transaction
//         let finalPaymentId = paymentId;
//         if (!finalPaymentId) {
//             finalPaymentId = new mongoose.Types.ObjectId().toString(); // Generate a unique string ID
//         } else {
//             // Check if provided paymentId already exists
//             const existingDeposit = await Deposit.findOne({ paymentId: finalPaymentId });
//             if (existingDeposit) {
//                 return res.status(409).json({ message: `Deposit with paymentId '${finalPaymentId}' already exists.` });
//             }
//         }

//         // Create a new Deposit instance
//         const newDeposit = new Deposit({
//             userId: userId,
//             paymentId: finalPaymentId,
//             amount: amount,
//             currency: currency,
//             address: address,
//             status: status || 'Pending', // Default status if not provided
//             timestamp: timestamp ? new Date(timestamp) : new Date(), // Use provided timestamp or current date/time
//         });

//         // Save the new deposit to the database
//         const savedDeposit = await newDeposit.save();

//         // Respond with the created deposit and 201 status (Created)
//         res.status(201).json(savedDeposit);

//     } catch (error) {
//         console.error('Error creating deposit:', error);
//         // Handle Mongoose duplicate key error (e.g., if paymentId was set as unique in schema)
//         if (error.code === 11000) {
//             return res.status(409).json({ message: 'A deposit with the provided unique ID already exists.', error: error.message });
//         }
//         // General server error
//         res.status(500).json({ message: 'Server error while creating deposit.', error: error.message });
//     }
// });

router.get('/check-deposits', async (req, res) => {
  try {
    const deposits = await getDepositHistory();
    const confirmed = deposits.filter(d => d.status === 1); // status 1 = successful

    for (const d of confirmed) {
      const exists = await Deposit.findOne({ txId: d.txId });
      if (!exists) {
        await Deposit.create({
          userId: "user123", 
          address: d.address,
          amount: d.amount,
          currency: d.coin,
          txId: d.txId,
          network: d.network,
          status: "confirmed",
        });
      }
    }

    res.json({ message: "Deposits synced successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error syncing deposits");
  }
});

// GET /api/user-deposits/:userId
router.get('/user-deposits', async (req, res) => {
  try {
    const deposits = await Deposit.find().sort({ createdAt: -1 });
    res.json(deposits);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching user deposits");
  }
});


router.get('/user-balance/:userId', async (req, res) => {
  const deposits = await Deposit.find({ userId: req.params.userId, status: "confirmed" });
  const total = deposits.reduce((sum, d) => sum + d.amount, 0);
  res.json({ balance: total });
});

module.exports = router;
