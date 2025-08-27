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

async function createTestUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create Admin user
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    
    if (!existingAdmin) {
      const hashedPasswordAdmin = await bcrypt.hash('Admin@1234', 10);
      
      const adminUser = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: hashedPasswordAdmin,
        role: 'Admin',
        isEmailVerified: true,
        phone: '+1234567890'
      });

      await adminUser.save();
      console.log('✅ Admin user created!');
      console.log('   Email: admin@example.com');
      console.log('   Password: Admin@1234');
    } else {
      console.log('✅ Admin user already exists');
    }

    // Create Student user
    const existingStudent = await User.findOne({ email: 'student@example.com' });
    
    if (!existingStudent) {
      const hashedPasswordStudent = await bcrypt.hash('Student@1234', 10);
      
      const studentUser = new User({
        firstName: 'Test',
        lastName: 'Student',
        email: 'student@example.com',
        password: hashedPasswordStudent,
        role: 'Student',
        isEmailVerified: true,
        phone: '+1234567891'
      });

      await studentUser.save();
      console.log('✅ Student user created!');
      console.log('   Email: student@example.com');
      console.log('   Password: Student@1234');
    } else {
      console.log('✅ Student user already exists');
    }

    console.log('\n🎉 Test users are ready!');
    console.log('\nAdmin Login (should redirect to /admin):');
    console.log('   Email: admin@example.com');
    console.log('   Password: Admin@1234');
    console.log('\nStudent Login (should redirect to /dashboard):');
    console.log('   Email: student@example.com');
    console.log('   Password: Student@1234');
    console.log('\n🌐 Visit: http://localhost:3000/login');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test users:', error);
    process.exit(1);
  }
}

createTestUsers();