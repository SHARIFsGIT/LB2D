const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Test = require('../src/models/Test.model').default;
const Payment = require('../src/models/Payment.model').default;
const Enrollment = require('../src/models/Enrollment.model').default;
const Video = require('../src/models/Video.model').default;
const User = require('../src/models/User.model').default;

async function clearAnalyticsData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learn-bangla-to-deutsch');
    console.log('🔗 Connected to MongoDB');

    console.log('🧹 Starting data clearance for fresh analytics...');

    // Clear Test data (Student Analysis)
    const testCount = await Test.countDocuments();
    console.log(`📊 Found ${testCount} test records`);
    if (testCount > 0) {
      await Test.deleteMany({});
      console.log('✅ Cleared all test/assessment data');
    }

    // Clear Payment data (Student Analysis - Revenue section)
    const paymentCount = await Payment.countDocuments();
    console.log(`💳 Found ${paymentCount} payment records`);
    if (paymentCount > 0) {
      await Payment.deleteMany({});
      console.log('✅ Cleared all payment data');
    }

    // Clear Enrollment data (affects course enrollment status)
    const enrollmentCount = await Enrollment.countDocuments();
    console.log(`📚 Found ${enrollmentCount} enrollment records`);
    if (enrollmentCount > 0) {
      await Enrollment.deleteMany({});
      console.log('✅ Cleared all enrollment data');
    }

    // Clear Video data (Supervisor Analysis)
    const videoCount = await Video.countDocuments();
    console.log(`📹 Found ${videoCount} video records`);
    if (videoCount > 0) {
      await Video.deleteMany({});
      console.log('✅ Cleared all video data');
    }

    // Reset course student counts to 0
    const Course = require('../src/models/Course.model').default;
    const courseUpdateResult = await Course.updateMany({}, { currentStudents: 0 });
    console.log(`📖 Reset student count for ${courseUpdateResult.modifiedCount} courses`);

    // Optional: Clear non-admin users (uncomment if you want a complete fresh start)
    // const userCount = await User.countDocuments({ role: { $ne: 'Admin' } });
    // console.log(`👥 Found ${userCount} non-admin user records`);
    // if (userCount > 0) {
    //   await User.deleteMany({ role: { $ne: 'Admin' } });
    //   console.log('✅ Cleared all non-admin users');
    // }

    console.log('🎉 Analytics data cleared successfully!');
    console.log('📊 Student Analysis sections will now show empty/zero data');
    console.log('👨‍🏫 Supervisor Analysis sections will now show empty/zero data');
    console.log('🔄 Ready for fresh data collection');

  } catch (error) {
    console.error('❌ Error clearing analytics data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the clearing function
clearAnalyticsData();