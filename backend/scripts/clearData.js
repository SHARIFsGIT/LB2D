const { MongoClient } = require('mongodb');
require('dotenv').config();

async function clearAnalyticsData() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DATABASE_NAME || 'learn-bangla-to-deutsch';
  
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('🔗 Connected to MongoDB');
    
    const db = client.db(dbName);

    console.log('🧹 Starting data clearance for fresh analytics...');

    // Clear Test collection (Student Analysis - Assessment data)
    const testCollection = db.collection('tests');
    const testCount = await testCollection.countDocuments();
    console.log(`📊 Found ${testCount} test records`);
    if (testCount > 0) {
      await testCollection.deleteMany({});
      console.log('✅ Cleared all test/assessment data');
    }

    // Clear Payment collection (Student Analysis - Revenue data)
    const paymentCollection = db.collection('payments');
    const paymentCount = await paymentCollection.countDocuments();
    console.log(`💳 Found ${paymentCount} payment records`);
    if (paymentCount > 0) {
      await paymentCollection.deleteMany({});
      console.log('✅ Cleared all payment data');
    }

    // Clear Enrollment collection (affects My Courses)
    const enrollmentCollection = db.collection('enrollments');
    const enrollmentCount = await enrollmentCollection.countDocuments();
    console.log(`📚 Found ${enrollmentCount} enrollment records`);
    if (enrollmentCount > 0) {
      await enrollmentCollection.deleteMany({});
      console.log('✅ Cleared all enrollment data');
    }

    // Clear Video collection (Supervisor Analysis)
    const videoCollection = db.collection('videos');
    const videoCount = await videoCollection.countDocuments();
    console.log(`📹 Found ${videoCount} video records`);
    if (videoCount > 0) {
      await videoCollection.deleteMany({});
      console.log('✅ Cleared all video data');
    }

    // Reset course student counts to 0
    const courseCollection = db.collection('courses');
    const courseUpdateResult = await courseCollection.updateMany({}, { $set: { currentStudents: 0 } });
    console.log(`📖 Reset student count for ${courseUpdateResult.modifiedCount} courses`);

    // Clear responses/question responses if any
    const responseCollection = db.collection('responses');
    const responseCount = await responseCollection.countDocuments();
    if (responseCount > 0) {
      await responseCollection.deleteMany({});
      console.log(`✅ Cleared ${responseCount} response records`);
    }

    console.log('\n🎉 Analytics data cleared successfully!');
    console.log('📊 Student Analysis sections will now show:');
    console.log('   • Empty test results table');
    console.log('   • $0.00 revenue and payment data');
    console.log('👨‍🏫 Supervisor Analysis sections will now show:');
    console.log('   • Zero video counts and durations');
    console.log('   • Empty salary/compensation data');
    console.log('📚 My Courses will be empty for all users');
    console.log('🔄 Ready for fresh data collection!');

  } catch (error) {
    console.error('❌ Error clearing analytics data:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the clearing function
clearAnalyticsData().then(() => process.exit(0));