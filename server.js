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
const WithdrwalRoutes = require('./routes/withdrawal');
const bannerRoutes = require('./routes/bannerRoutes');
const nowPaymentsRoutes = require('./routes/nowPayment');
const historyRoutes = require('./routes/history');
const settingsRoutes = require('./routes/settingsRoute');
const depositRoutes = require('./routes/depositeRoute');

require('dotenv').config();

const app = express();
connectDB();

const allowedOrigins = [
  'https://admin.treasurenftx.xyz',
  'https://treasurenftx.xyz',
  'http://localhost:3000',
  'http://localhost:3004',
  'http://localhost:3005',
];

// ✅ CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`❌ CORS blocked request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// ✅ Routes
app.use('/api', authRoutes);
app.use('/api', nftRoutes);
app.use('/api', HighestBidRoutes);
app.use('/api', PopularSeriesRoutes);
app.use('/api', StakeAreaRoute);
app.use('/api', StakeFreeZoneRoute);
app.use('/api', ReservationRoute);
app.use('/api', WithdrwalRoutes);
app.use('/api', bannerRoutes);
app.use('/api', historyRoutes);
app.use('/api/settings', settingsRoutes); // ⚠️ This route must not conflict with `/api`
app.use('/api/deposits', depositRoutes);
app.use('/api/payments', nowPaymentsRoutes);

// ✅ Error handling for CORS
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS Error: This origin is not allowed.' });
  }
  next(err);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
