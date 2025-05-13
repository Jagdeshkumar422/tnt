const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const nftRoutes = require('./routes/nftRoutes');
const HighestBidRoutes = require('./routes/HighestBidRoute');
const PopularSeriesRoutes = require('./routes/popularSeriesRoute');
const StakeAreaRoute = require('./routes/StakeAreaRoute');
const StakeFreeZoneRoute = require('./routes/StakeFreeZoneRoute');
const ReservationRoute = require('./routes/reservationRoute');

require("dotenv").config();
const depositRoutes = require("./routes/depositeRoute")

const app = express();
connectDB();
const monitorDeposits = require('./services/monitorBSC');
setInterval(monitorDeposits, 30000);

const { Wallet } = require('ethers');

// Generate a new valid mnemonic
// app.get("/", ()=> {
//     const wallet = Wallet.createRandom();
//     const mnemonic = wallet.mnemonic.phrase;
//     console.log('Generated Mnemonic:', mnemonic);
    
// })
app.use(cors());
app.use(express.json());
app.use('/api', authRoutes);
app.use('/api', nftRoutes);
app.use('/api', HighestBidRoutes);
app.use('/api', PopularSeriesRoutes);
app.use('/api', StakeAreaRoute);
app.use('/api', StakeFreeZoneRoute);
app.use('/api', ReservationRoute);
app.use('/api/deposits', depositRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
