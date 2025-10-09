/**
 * Script to create an admin user
 * Usage: npm run create-admin
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.model';
import config from '../src/config/app.config';
import logger from '../src/utils/logger';

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = config.get('MONGODB_URI');
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'Admin' });

    if (existingAdmin) {
      logger.warn('Admin user already exists!');
      logger.info(`Existing admin email: ${existingAdmin.email}`);

      // Ask if user wants to create another admin
      console.log('\nDo you want to create another admin? (y/n)');

      // For now, we'll just exit. In production, you could add readline for interactive input
      logger.info('Exiting... If you need another admin, modify the script or delete existing admin first.');
      process.exit(0);
    }

    // Admin user details
    const adminData = {
      email: process.env.ADMIN_EMAIL || 'admin@learnbangla2deutsch.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'Admin',
      isEmailVerified: true,
      isActive: true,
      phone: '+8801700000000'
    };

    // Create admin user (password will be hashed automatically by pre-save hook)
    const admin = new User(adminData);

    await admin.save();

    console.log('\n✅ ===================================');
    console.log('✅  ADMIN USER CREATED SUCCESSFULLY');
    console.log('✅ ===================================\n');
    console.log('📧 Email:    ', adminData.email);
    console.log('🔑 Password: ', adminData.password);
    console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');
    console.log('🌐 Login at: http://localhost:3000/login\n');

    logger.info('Admin user created successfully');

  } catch (error: any) {
    logger.error('Error creating admin user:', error);
    console.error('\n❌ Error creating admin:', error.message);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
createAdmin();
