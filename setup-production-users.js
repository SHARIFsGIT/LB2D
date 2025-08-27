const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load production environment
require('dotenv').config({ path: './backend/.env.production' });

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

async function setupProductionUsers() {
  try {
    console.log('🌍 Setting up LEARN BANGLA TO DEUTSCH production users...');
    
    // Connect to production MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to production MongoDB Atlas');

    // Create admin user
    const adminExists = await User.findOne({ email: 'admin@learnbanglatodeutsch.com' });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('SecureBanglaDeutsch@2024', 12);
      
      const adminUser = new User({
        firstName: 'German',
        lastName: 'Admin',
        email: 'admin@learnbanglatodeutsch.com',
        password: hashedPassword,
        role: 'Admin',
        isEmailVerified: true,
        phone: '+1234567890'
      });

      await adminUser.save();
      console.log('✅ Production admin user created');
      console.log('📧 Email: admin@learnbanglatodeutsch.com');
      console.log('🔑 Password: SecureBanglaDeutsch@2024');
    } else {
      console.log('✅ Production admin user already exists');
    }

    // Create demo student
    const studentExists = await User.findOne({ email: 'demo@learnbanglatodeutsch.com' });
    
    if (!studentExists) {
      const hashedPassword = await bcrypt.hash('DemoGerman@2024', 12);
      
      const studentUser = new User({
        firstName: 'Demo',
        lastName: 'Student',
        email: 'demo@learnbanglatodeutsch.com',
        password: hashedPassword,
        role: 'Student',
        isEmailVerified: true,
        phone: '+1234567891'
      });

      await studentUser.save();
      console.log('✅ Demo student user created');
      console.log('📧 Email: demo@learnbanglatodeutsch.com');
      console.log('🔑 Password: DemoGerman@2024');
    } else {
      console.log('✅ Demo student user already exists');
    }

    console.log('\n🎉 Production setup complete!');
    console.log('🌐 Your LEARN BANGLA TO DEUTSCH platform is ready!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up production:', error);
    process.exit(1);
  }
}

setupProductionUsers();