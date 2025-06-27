require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require("../models/Admin");

const createDefaultAdmin = async () => {
  try {
    const existingAdmin = await Admin.findOne({ email: 'admin@example.com' });
    if (!existingAdmin) {
      const newAdmin = new Admin({
        email: 'admin@example.com',
        password: 'secure123',
      });
      await newAdmin.save();
      console.log('✅ Default admin created: admin@example.com / secure123');
    } else {
      console.log('✅ Default admin already exists');
    }
  } catch (err) {
    console.error('❌ Error creating default admin:', err.message);
  }
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected');
    await createDefaultAdmin();
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
};

module.exports = connectDB;