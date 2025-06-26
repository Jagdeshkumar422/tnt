const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const UserRoute = require("./routes/userRoute")
const depositRoute = require("./routes/deposit")
const WalletBindRoute = require("./routes/walletBindRoute")
const withdrawRoute = require("./routes/withdrawalRoute")
const reservationRoute = require("./routes/reservationRoute")
const nftRoute = require("./routes/nftRoute")
const bonusRoute = require("./routes/bonusRoute")
const adminRoute = require("./routes/adminRoute")
const adminAuthRoute = require("./routes/adminAuth")
const AreaRoute = require("./routes/StakeAreaRoute")
const FreeAreaRoute = require("./routes/StakeFreeZoneRoute")
const bannerRoute = require("./routes/bannerRoutes")

require("dotenv").config();

const app = express();
connectDB();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // Include all standard methods
    credentials: true, // Allow cookies and credentials
  })
);

app.use('/api/ipn', express.raw({ type: '*/*' }));

// app.use(cors());
app.use(express.json());
app.use("/api", UserRoute)
app.use('/api', depositRoute);
app.use('/api', WalletBindRoute);
app.use('/api', withdrawRoute);
app.use('/api', reservationRoute);
app.use('/api', nftRoute);
app.use('/api', bonusRoute);
app.use('/api', AreaRoute);
app.use('/api', FreeAreaRoute);
app.use('/api', bannerRoute);
app.use('/api/admin', adminRoute);
app.use('/api/admin', adminAuthRoute);






const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));