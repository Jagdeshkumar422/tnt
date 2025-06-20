const mongoose = require('mongoose');
const Admin = require("../models/Admin")
const createDefaultAdmin = async () => {
  try {
    const existingAdmin = await Admin.findOne({ email: 'admin@example.com' });
    if (!existingAdmin) {
      const newAdmin = new Admin({
        email: 'admin@gmail.com',
        password: 'secure123', // This will be hashed automatically
      });
      await newAdmin.save();
      console.log('✅ Default admin created: admin@example.com / admin1234');
    } else {
      console.log('✅ Default admin already exists');
    }
  } catch (err) {
    console.error('❌ Error creating default admin:', err.message);
  }
};
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://treasusrexnft:admin@cluster0.j1yqv8y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    console.log('✅ MongoDB connected');
     await createDefaultAdmin()
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
