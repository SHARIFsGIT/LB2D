const { MongoClient } = require('mongodb');
require('dotenv').config();

async function showDataSummary() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DATABASE_NAME || 'learn-bangla-to-deutsch';
  
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    console.log('📊 Current Database Summary:');
    console.log('=' .repeat(50));

    // Get counts for all collections
    const collections = {
      'Users (Total)': await db.collection('users').countDocuments(),
      'Users (Admin)': await db.collection('users').countDocuments({ role: 'Admin' }),
      'Users (Student)': await db.collection('users').countDocuments({ role: 'Student' }),
      'Users (Supervisor)': await db.collection('users').countDocuments({ role: 'Supervisor' }),
      'Tests/Assessments': await db.collection('tests').countDocuments(),
      'Payments': await db.collection('payments').countDocuments(),
      'Enrollments': await db.collection('enrollments').countDocuments(),
      'Videos': await db.collection('videos').countDocuments(),
      'Courses': await db.collection('courses').countDocuments(),
      'Questions': await db.collection('questions').countDocuments(),
      'Responses': await db.collection('responses').countDocuments()
    };

    Object.entries(collections).forEach(([name, count]) => {
      console.log(`${name.padEnd(20)}: ${count}`);
    });

    await client.close();
    return collections;
  } catch (error) {
    console.error('❌ Error getting data summary:', error);
    await client.close();
    return null;
  }
}

async function clearAllAnalyticsData() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DATABASE_NAME || 'learn-bangla-to-deutsch';
  
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    console.log('\n🧹 Clearing analytics data...');

    // Clear analytics-related collections
    const clearOperations = [
      { name: 'Tests/Assessments', collection: 'tests' },
      { name: 'Payments', collection: 'payments' },
      { name: 'Enrollments', collection: 'enrollments' },
      { name: 'Videos', collection: 'videos' },
      { name: 'Responses', collection: 'responses' }
    ];

    for (const op of clearOperations) {
      const count = await db.collection(op.collection).countDocuments();
      if (count > 0) {
        await db.collection(op.collection).deleteMany({});
        console.log(`✅ Cleared ${count} ${op.name.toLowerCase()}`);
      } else {
        console.log(`ℹ️ No ${op.name.toLowerCase()} to clear`);
      }
    }

    // Reset course student counts
    const courseUpdateResult = await db.collection('courses').updateMany({}, { $set: { currentStudents: 0 } });
    console.log(`📖 Reset student count for ${courseUpdateResult.modifiedCount} courses`);

    await client.close();
    console.log('✅ Analytics data cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing analytics data:', error);
    await client.close();
  }
}

async function clearNonAdminUsers() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DATABASE_NAME || 'learn-bangla-to-deutsch';
  
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    const nonAdminCount = await db.collection('users').countDocuments({ role: { $ne: 'Admin' } });
    
    if (nonAdminCount > 0) {
      await db.collection('users').deleteMany({ role: { $ne: 'Admin' } });
      console.log(`✅ Cleared ${nonAdminCount} non-admin users`);
    } else {
      console.log('ℹ️ No non-admin users to clear');
    }

    await client.close();
  } catch (error) {
    console.error('❌ Error clearing users:', error);
    await client.close();
  }
}

async function main() {
  console.log('🚀 Learn Bangla to Deutsch - Fresh Start Tool');
  console.log('=' .repeat(50));

  // Show current data summary
  await showDataSummary();

  console.log('\nWhat would you like to clear?');
  console.log('1. Analytics data only (tests, payments, enrollments, videos)');
  console.log('2. Analytics data + non-admin users (complete fresh start)');
  console.log('3. Show data summary only (no changes)');
  console.log('4. Exit');

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\nEnter your choice (1-4): ', async (answer) => {
    switch (answer) {
      case '1':
        console.log('\n🧹 Clearing analytics data...');
        await clearAllAnalyticsData();
        console.log('\n🎉 Analytics sections are now empty!');
        console.log('📊 Student Analysis: No tests, no payments');
        console.log('👨‍🏫 Supervisor Analysis: No videos, no salary data');
        console.log('📚 My Courses: Empty for all users');
        break;
        
      case '2':
        console.log('\n🧹 Clearing ALL data for fresh start...');
        await clearAllAnalyticsData();
        await clearNonAdminUsers();
        console.log('\n🎉 Complete fresh start completed!');
        console.log('👑 Only admin users remain');
        console.log('📊 All analytics sections are empty');
        console.log('🔄 Ready for new registrations');
        break;
        
      case '3':
        console.log('\n✅ Data summary shown above. No changes made.');
        break;
        
      case '4':
        console.log('\n👋 Goodbye!');
        break;
        
      default:
        console.log('\n❌ Invalid choice. No changes made.');
    }
    
    rl.close();
    process.exit(0);
  });
}

main();