const { MongoClient } = require('mongodb');
require('dotenv').config();

async function clearNonAdminUsers() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DATABASE_NAME || 'learn-bangla-to-deutsch';
  
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('🔗 Connected to MongoDB');
    
    const db = client.db(dbName);

    console.log('🧹 Clearing non-admin users for fresh start...');

    // Get user counts first
    const userCollection = db.collection('users');
    const totalUsers = await userCollection.countDocuments();
    const adminUsers = await userCollection.countDocuments({ role: 'Admin' });
    const nonAdminUsers = totalUsers - adminUsers;

    console.log(`👥 Found ${totalUsers} total users (${adminUsers} admins, ${nonAdminUsers} non-admins)`);

    if (nonAdminUsers > 0) {
      // Clear all non-admin users (Students, Supervisors, etc.)
      const deleteResult = await userCollection.deleteMany({ 
        role: { $ne: 'Admin' } 
      });
      console.log(`✅ Cleared ${deleteResult.deletedCount} non-admin users`);
    } else {
      console.log('ℹ️ No non-admin users to clear');
    }

    // Verify remaining users
    const remainingUsers = await userCollection.find({ role: 'Admin' }, { projection: { firstName: 1, lastName: 1, email: 1, role: 1 } }).toArray();
    console.log(`👑 Remaining admin users (${remainingUsers.length}):`);
    remainingUsers.forEach(user => {
      console.log(`   • ${user.firstName} ${user.lastName} (${user.email})`);
    });

    console.log('\n🎉 User cleanup completed!');
    console.log('📊 Analytics Dashboard will now show:');
    console.log('   • No student test results');
    console.log('   • No payment/revenue data');
    console.log('   • No supervisor video data');
    console.log('🔄 Ready for new user registrations and fresh analytics!');

  } catch (error) {
    console.error('❌ Error clearing users:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Ask for confirmation before clearing users
console.log('⚠️  This will DELETE all non-admin users (Students, Supervisors)');
console.log('⚠️  Admin users will be preserved');
console.log('⚠️  This action cannot be undone');
console.log('\nDo you want to continue? (y/N)');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    clearNonAdminUsers().then(() => {
      rl.close();
      process.exit(0);
    });
  } else {
    console.log('❌ Operation cancelled');
    rl.close();
    process.exit(0);
  }
});