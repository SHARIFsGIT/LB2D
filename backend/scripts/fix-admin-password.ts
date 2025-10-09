/**
 * Script to fix admin password
 * Usage: npm run fix-admin
 */

import mongoose from 'mongoose';
import User from '../src/models/User.model';
import config from '../src/config/app.config';
import logger from '../src/utils/logger';

const fixAdminPassword = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = config.get('MONGODB_URI');
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Find admin user
    const admin = await User.findOne({ email: 'admin@learnbangla2deutsch.com' });

    if (!admin) {
      console.log('\n❌ Admin user not found!');
      console.log('Run "npm run create-admin" to create an admin user.\n');
      process.exit(1);
    }

    console.log('\n✅ Admin user found!');
    console.log('📧 Email:', admin.email);

    // Update password (the pre-save hook will hash it)
    admin.password = 'Admin@123456';
    await admin.save();

    console.log('\n✅ ===================================');
    console.log('✅  ADMIN PASSWORD FIXED');
    console.log('✅ ===================================\n');
    console.log('📧 Email:    admin@learnbangla2deutsch.com');
    console.log('🔑 Password: Admin@123456');
    console.log('\n⚠️  Try logging in again!\n');

    logger.info('Admin password fixed successfully');

  } catch (error: any) {
    logger.error('Error fixing admin password:', error);
    console.error('\n❌ Error fixing admin password:', error.message);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
fixAdminPassword();
