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

// app.use(cors());
app.use(express.json());
app.use("/api", UserRoute)
app.use('/api', depositRoute);
app.use('/api', WalletBindRoute);
app.use('/api', withdrawRoute);
app.use('/api', reservationRoute);
app.use('/api', nftRoute);
app.use('/api', bonusRoute);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
