const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learn-bangla-to-deutsch-assessment', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const UserSchema = new mongoose.Schema({
  email: String,
  role: String,
  firstName: String,
  lastName: String
}, { collection: 'users' });

const User = mongoose.model('User', UserSchema);

async function cleanupUsers() {
  try {
    // console.log('Finding all users...');
    
    // Find all users
    const allUsers = await User.find({});
    console.log(`Found ${allUsers.length} total users`);
    
    // List all users
    console.log('\nCurrent users:');
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });
    
    // Delete all non-admin users
    const result = await User.deleteMany({
      email: { $ne: 'admin@example.com' }
    });
    
    // console.log(`\nDeleted ${result.deletedCount} non-admin users`);
    
    // Verify only admin remains
    const remainingUsers = await User.find({});
    console.log(`\n✅ Remaining users: ${remainingUsers.length}`);
    remainingUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });
    
    // Also clean up tests from non-admin users
    const TestSchema = new mongoose.Schema({
      userId: mongoose.Schema.Types.ObjectId
    }, { collection: 'tests' });
    
    const Test = mongoose.model('Test', TestSchema);
    
    // Get admin user ID
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    
    if (adminUser) {
      // Delete tests not belonging to admin
      const testResult = await Test.deleteMany({
        userId: { $ne: adminUser._id }
      });
      // console.log(`\nDeleted ${testResult.deletedCount} non-admin test records`);
    }
    
    // console.log('\nCleanup complete! Only admin@example.com remains.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanupUsers();