const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const UserRoute = require("./routes/userRoute")

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


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
