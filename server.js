const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const nftRoutes = require('./routes/nftRoutes');
const HighestBidRoutes = require('./routes/HighestBidRoute');
const PopularSeriesRoutes = require('./routes/popularSeriesRoute');
const StakeAreaRoute = require('./routes/StakeAreaRoute');
const StakeFreeZoneRoute = require('./routes/StakeFreeZoneRoute');
require("dotenv").config();

const app = express();
connectDB();

app.use(cors());
app.use(express.json());
app.use('/api', authRoutes);
app.use('/api', nftRoutes);
app.use('/api', HighestBidRoutes);
app.use('/api', PopularSeriesRoutes);
app.use('/api', StakeAreaRoute);
app.use('/api', StakeFreeZoneRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
