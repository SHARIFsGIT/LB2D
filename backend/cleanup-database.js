const mongoose = require('mongoose');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Define schemas
const userSchema = new mongoose.Schema({}, { strict: false });
const testSchema = new mongoose.Schema({}, { strict: false });
const questionSchema = new mongoose.Schema({}, { strict: false });

const User = mongoose.model('User', userSchema);
const Test = mongoose.model('Test', testSchema);
const Question = mongoose.model('Question', questionSchema);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

async function showCurrentStats() {
  try {
    const userCount = await User.countDocuments();
    const testCount = await Test.countDocuments();
    const questionCount = await Question.countDocuments();
    
    console.log(`\n${colors.blue}📊 Current Database Statistics:${colors.reset}`);
    console.log(`   👥 Users: ${colors.bold}${userCount}${colors.reset}`);
    console.log(`   📝 Tests: ${colors.bold}${testCount}${colors.reset}`);
    console.log(`   ❓ Questions: ${colors.bold}${questionCount}${colors.reset}`);
    
    // Show some sample data
    if (userCount > 0) {
      const sampleUsers = await User.find().limit(3).select('email firstName lastName role');
      console.log(`\n${colors.blue}Sample Users:${colors.reset}`);
      sampleUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.firstName} ${user.lastName}) - ${user.role}`);
      });
    }
    
    return { userCount, testCount, questionCount };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { userCount: 0, testCount: 0, questionCount: 0 };
  }
}

async function cleanupDatabase(keepAdmin = true) {
  console.log(`\n${colors.yellow}🧹 Starting database cleanup...${colors.reset}`);
  
  try {
    let deletedUsers = 0;
    let deletedTests = 0;
    let deletedQuestions = 0;
    
    if (keepAdmin) {
      // Keep admin account, delete everything else
      const adminEmail = 'admin@example.com';
      
      // Delete all non-admin users
      const userResult = await User.deleteMany({ 
        email: { $ne: adminEmail } 
      });
      deletedUsers = userResult.deletedCount;
      
      // Get admin user ID
      const adminUser = await User.findOne({ email: adminEmail });
      
      if (adminUser) {
        // Delete all tests except admin's (if any)
        const testResult = await Test.deleteMany({ 
          userId: { $ne: adminUser._id } 
        });
        deletedTests = testResult.deletedCount;
      } else {
        // No admin found, delete all tests
        const testResult = await Test.deleteMany({});
        deletedTests = testResult.deletedCount;
      }
    } else {
      // Delete everything
      const userResult = await User.deleteMany({});
      deletedUsers = userResult.deletedCount;
      
      const testResult = await Test.deleteMany({});
      deletedTests = testResult.deletedCount;
    }
    
    // Always keep questions (they're needed for the app to work)
    console.log(`\n${colors.yellow}ℹ️  Questions are preserved (required for assessments)${colors.reset}`);
    
    console.log(`\n${colors.green}✅ Cleanup Complete:${colors.reset}`);
    console.log(`   👥 Deleted ${colors.bold}${deletedUsers}${colors.reset} users`);
    console.log(`   📝 Deleted ${colors.bold}${deletedTests}${colors.reset} tests`);
    console.log(`   ❓ Kept all ${colors.bold}${await Question.countDocuments()}${colors.reset} questions`);
    
    if (keepAdmin) {
      console.log(`\n${colors.green}✅ Admin account preserved: admin@example.com${colors.reset}`);
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Cleanup failed:${colors.reset}`, error);
    return false;
  }
}

async function resetToProduction() {
  console.log(`\n${colors.blue}🚀 Setting up for production...${colors.reset}`);
  
  try {
    // Ensure admin account exists with default password
    const adminEmail = 'admin@example.com';
    let adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      console.log(`${colors.yellow}Creating admin account...${colors.reset}`);
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('Admin@1234', 10);
      
      adminUser = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: adminEmail,
        password: hashedPassword,
        role: 'Admin',
        isEmailVerified: true,
        isActive: true,
        phone: '+1234567890',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await adminUser.save();
      console.log(`${colors.green}✅ Admin account created${colors.reset}`);
    } else {
      // Reset admin password to default
      const bcrypt = require('bcryptjs');
      adminUser.password = await bcrypt.hash('Admin@1234', 10);
      adminUser.isEmailVerified = true;
      adminUser.isActive = true;
      await adminUser.save();
      console.log(`${colors.green}✅ Admin account reset${colors.reset}`);
    }
    
    // Ensure questions exist
    const questionCount = await Question.countDocuments();
    if (questionCount === 0) {
      console.log(`${colors.red}⚠️  Warning: No questions found in database!${colors.reset}`);
      console.log(`${colors.yellow}   Please import questions for the assessment to work.${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ ${questionCount} questions available${colors.reset}`);
    }
    
    console.log(`\n${colors.green}${colors.bold}🎉 Production Setup Complete!${colors.reset}`);
    console.log(`\n${colors.blue}📋 Production Credentials:${colors.reset}`);
    console.log(`   Email: ${colors.bold}admin@example.com${colors.reset}`);
    console.log(`   Password: ${colors.bold}Admin@1234${colors.reset}`);
    console.log(`\n${colors.yellow}⚠️  Important: Change the admin password after first login!${colors.reset}`);
    
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Production setup failed:${colors.reset}`, error);
    return false;
  }
}

async function main() {
  console.log(`${colors.bold}${colors.blue}
╔════════════════════════════════════════════╗
║     DATABASE CLEANUP & PRODUCTION SETUP    ║
╚════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // Connect to MongoDB
    console.log(`${colors.yellow}📡 Connecting to MongoDB...${colors.reset}`);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`${colors.green}✅ Connected to MongoDB${colors.reset}`);
    
    // Show current stats
    const stats = await showCurrentStats();
    
    // Ask user what they want to do
    console.log(`\n${colors.bold}Choose an option:${colors.reset}`);
    console.log('1. Clean test data (keep admin account)');
    console.log('2. Full cleanup (delete everything)');
    console.log('3. Production setup (clean + setup admin)');
    console.log('4. Show stats only');
    console.log('5. Exit');
    
    rl.question('\nEnter your choice (1-5): ', async (answer) => {
      switch(answer) {
        case '1':
          // Confirm before cleaning
          rl.question(`\n${colors.yellow}⚠️  This will delete all test data except admin account. Continue? (yes/no): ${colors.reset}`, async (confirm) => {
            if (confirm.toLowerCase() === 'yes') {
              await cleanupDatabase(true);
              await showCurrentStats();
            } else {
              console.log(`${colors.yellow}Cleanup cancelled.${colors.reset}`);
            }
            await cleanup();
          });
          break;
          
        case '2':
          // Confirm before full cleanup
          rl.question(`\n${colors.red}⚠️  WARNING: This will delete ALL data including admin! Continue? (yes/no): ${colors.reset}`, async (confirm) => {
            if (confirm.toLowerCase() === 'yes') {
              await cleanupDatabase(false);
              await showCurrentStats();
            } else {
              console.log(`${colors.yellow}Cleanup cancelled.${colors.reset}`);
            }
            await cleanup();
          });
          break;
          
        case '3':
          // Production setup
          rl.question(`\n${colors.yellow}⚠️  This will clean all test data and set up production admin. Continue? (yes/no): ${colors.reset}`, async (confirm) => {
            if (confirm.toLowerCase() === 'yes') {
              await cleanupDatabase(false); // Clean everything first
              await resetToProduction(); // Then set up production
              await showCurrentStats();
            } else {
              console.log(`${colors.yellow}Setup cancelled.${colors.reset}`);
            }
            await cleanup();
          });
          break;
          
        case '4':
          // Just show stats and exit
          await cleanup();
          break;
          
        case '5':
          await cleanup();
          break;
          
        default:
          console.log(`${colors.red}Invalid option!${colors.reset}`);
          await cleanup();
      }
    });
    
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error);
    await cleanup();
  }
}

async function cleanup() {
  rl.close();
  await mongoose.connection.close();
  console.log(`\n${colors.blue}👋 Goodbye!${colors.reset}`);
  process.exit(0);
}

// Handle interruption
process.on('SIGINT', async () => {
  console.log(`\n${colors.yellow}Interrupted!${colors.reset}`);
  await cleanup();
});

// Run the script
main();