import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';

const prisma = new PrismaClient();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify readline question
function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function resetDatabase() {
  console.log('🔄 Database Reset Script\n');
  console.log('⚠️  WARNING: This will DELETE ALL DATA from your database!\n');

  // Confirm deletion
  const confirm = await question('Are you sure you want to continue? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    console.log('❌ Operation cancelled.');
    rl.close();
    process.exit(0);
  }

  console.log('\n🗑️  Deleting all data from database...\n');

  try {
    // Delete all data in the correct order (respecting foreign key constraints)
    await prisma.$transaction(async (tx) => {
      // Delete in reverse order of dependencies
      console.log('  Deleting activity feeds...');
      await tx.activityFeed.deleteMany();

      console.log('  Deleting user follows...');
      await tx.userFollow.deleteMany();

      console.log('  Deleting video notes...');
      await tx.videoNote.deleteMany();

      console.log('  Deleting bookmarks...');
      await tx.bookmark.deleteMany();

      console.log('  Deleting leaderboards...');
      await tx.leaderboard.deleteMany();

      console.log('  Deleting user points...');
      await tx.userPoints.deleteMany();

      console.log('  Deleting user achievements...');
      await tx.userAchievement.deleteMany();

      console.log('  Deleting achievements...');
      await tx.achievement.deleteMany();

      console.log('  Deleting path enrollments...');
      await tx.pathEnrollment.deleteMany();

      console.log('  Deleting learning path steps...');
      await tx.learningPathStep.deleteMany();

      console.log('  Deleting learning paths...');
      await tx.learningPath.deleteMany();

      console.log('  Deleting discussion likes...');
      await tx.discussionLike.deleteMany();

      console.log('  Deleting discussion posts...');
      await tx.discussionPost.deleteMany();

      console.log('  Deleting discussion topics...');
      await tx.discussionTopic.deleteMany();

      console.log('  Deleting discussion categories...');
      await tx.discussionCategory.deleteMany();

      console.log('  Deleting review helpfulness...');
      await tx.reviewHelpfulness.deleteMany();

      console.log('  Deleting course reviews...');
      await tx.courseReview.deleteMany();

      console.log('  Deleting audit logs...');
      await tx.auditLog.deleteMany();

      console.log('  Deleting contact messages...');
      await tx.contactMessage.deleteMany();

      console.log('  Deleting supervisor salaries...');
      await tx.supervisorSalary.deleteMany();

      console.log('  Deleting notifications...');
      await tx.notification.deleteMany();

      console.log('  Deleting certificates...');
      await tx.certificate.deleteMany();

      console.log('  Deleting payments...');
      await tx.payment.deleteMany();

      console.log('  Deleting enrollments...');
      await tx.enrollment.deleteMany();

      console.log('  Deleting test attempts...');
      await tx.testAttempt.deleteMany();

      console.log('  Deleting test questions...');
      await tx.testQuestion.deleteMany();

      console.log('  Deleting tests...');
      await tx.test.deleteMany();

      console.log('  Deleting quiz attempts...');
      await tx.quizAttempt.deleteMany();

      console.log('  Deleting quiz questions...');
      await tx.quizQuestion.deleteMany();

      console.log('  Deleting quizzes...');
      await tx.quiz.deleteMany();

      console.log('  Deleting resource progress...');
      await tx.resourceProgress.deleteMany();

      console.log('  Deleting course resources...');
      await tx.courseResource.deleteMany();

      console.log('  Deleting video comments...');
      await tx.videoComment.deleteMany();

      console.log('  Deleting video progress...');
      await tx.videoProgress.deleteMany();

      console.log('  Deleting videos...');
      await tx.video.deleteMany();

      console.log('  Deleting courses...');
      await tx.course.deleteMany();

      console.log('  Deleting tags...');
      await tx.tag.deleteMany();

      console.log('  Deleting device sessions...');
      await tx.deviceSession.deleteMany();

      console.log('  Deleting users...');
      await tx.user.deleteMany();
    });

    console.log('\n✅ All data deleted successfully!\n');

    // Get admin credentials from environment variables or prompt
    let adminEmail = process.env.ADMIN_EMAIL;
    let adminPassword = process.env.ADMIN_PASSWORD;
    let adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
    let adminLastName = process.env.ADMIN_LAST_NAME || 'User';

    // If not set in environment, prompt for input
    if (!adminEmail) {
      adminEmail = await question('Enter admin email: ');
    } else {
      console.log(`Using admin email from environment: ${adminEmail}`);
    }

    if (!adminPassword) {
      adminPassword = await question('Enter admin password: ');
    } else {
      console.log('Using admin password from environment.');
    }

    // Validate inputs
    if (!adminEmail || !adminPassword) {
      throw new Error('Admin email and password are required!');
    }

    if (adminPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long!');
    }

    // Create the admin user
    console.log('\n👤 Creating admin user...');

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
        firstName: adminFirstName,
        lastName: adminLastName,
        role: 'ADMIN',
        isEmailVerified: true,
        isActive: true,
      },
    });

    console.log('\n✅ Database reset completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`  👤 Admin User Created:`);
    console.log(`     Email: ${admin.email}`);
    console.log(`     Name: ${admin.firstName} ${admin.lastName}`);
    console.log(`     Role: ${admin.role}`);
    console.log(`     ID: ${admin.id}\n`);

    console.log('🔐 You can now login with:');
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Password: [the password you entered]\n`);
  } catch (error) {
    console.error('\n❌ Error resetting database:', error);
    throw error;
  } finally {
    rl.close();
  }
}

// Run the reset
resetDatabase()
  .catch((e) => {
    console.error('❌ Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
