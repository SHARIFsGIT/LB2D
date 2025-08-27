const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Get User model
    const User = mongoose.model('User', {
      email: String,
      isEmailVerified: Boolean,
      role: String
    });
    
    // Update all admin users to be verified
    const result = await User.updateMany(
      { role: 'Admin' },
      { $set: { isEmailVerified: true } }
    );
    
    // console.log(`Updated ${result.modifiedCount} admin user(s) to verified status`);
    
    // Also verify the demo and test users for easier testing
    const demoResult = await User.updateMany(
      { email: { $in: ['demo1@example.com', 'demo2@example.com', 'demo3@example.com'] } },
      { $set: { isEmailVerified: true } }
    );
    
    // console.log(`Updated ${demoResult.modifiedCount} demo/test user(s) to verified status`);
    
    // List all users
    const users = await User.find({}, 'email role isEmailVerified').sort('role');
    console.log('\nAll users:');
    users.forEach(user => {
      // console.log(`- ${user.email} (${user.role}) - Verified: ${user.isEmailVerified ? 'Yes' : 'No'}`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });