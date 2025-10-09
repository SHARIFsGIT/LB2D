/**
 * Script to completely reset the database
 * WARNING: This will DELETE ALL DATA!
 * Usage: npm run reset-db
 */

import mongoose from 'mongoose';
import config from '../src/config/app.config';
import logger from '../src/utils/logger';

const resetDatabase = async () => {
  try {
    console.log('\n⚠️  WARNING: This will DELETE ALL DATA from the database!');
    console.log('⚠️  Database:', config.get('MONGODB_URI').split('@')[1]?.split('?')[0] || 'MongoDB');
    console.log('\n🔄 Starting database reset in 3 seconds...\n');

    // Wait 3 seconds to give user time to cancel
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Connect to MongoDB
    const mongoUri = config.get('MONGODB_URI');
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Get all collections
    const collections = await mongoose.connection.db.collections();

    console.log(`\n📦 Found ${collections.length} collections to drop:\n`);

    // Drop all collections
    for (const collection of collections) {
      console.log(`   🗑️  Dropping collection: ${collection.collectionName}`);
      await collection.drop();
    }

    console.log('\n✅ ===================================');
    console.log('✅  DATABASE RESET COMPLETE');
    console.log('✅ ===================================\n');
    console.log('📝 All collections have been dropped');
    console.log('📝 Database is now empty and ready for fresh start\n');
    console.log('🔄 Next steps:');
    console.log('   1. Run: npm run create-admin');
    console.log('   2. Login with admin credentials');
    console.log('   3. Start adding your data\n');

    logger.info('Database reset completed successfully');

  } catch (error: any) {
    logger.error('Error resetting database:', error);
    console.error('\n❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
resetDatabase();
