const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// User schema
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  role: String,
  isEmailVerified: Boolean,
  phone: String
});

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email: admin@example.com');
      console.log('You can update the password if needed.');
      
      // Optional: Update password
      const hashedPassword = await bcrypt.hash('Admin@1234', 10);
      existingAdmin.password = hashedPassword;
      existingAdmin.isEmailVerified = true;
      await existingAdmin.save();
      console.log('Admin password has been reset to: Admin@1234');
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash('Admin@1234', 10);
      
      const adminUser = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'Admin',
        isEmailVerified: true,
        phone: '+1234567890'
      });

      await adminUser.save();
      console.log('Admin user created successfully!');
      console.log('Email: admin@example.com');
      console.log('Password: Admin@1234');
    }

    console.log('\nYou can now login with these credentials at http://localhost:3000/login');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();