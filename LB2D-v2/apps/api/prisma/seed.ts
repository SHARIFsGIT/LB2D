import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ============================================
  // USERS
  // ============================================

  console.log('👤 Creating users...');

  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lb2d.com' },
    update: {},
    create: {
      email: 'admin@lb2d.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log('  ✅ Admin created:', admin.email);

  const supervisorPassword = await bcrypt.hash('Super123!', 10);
  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@lb2d.com' },
    update: {},
    create: {
      email: 'supervisor@lb2d.com',
      passwordHash: supervisorPassword,
      firstName: 'Hans',
      lastName: 'Schmidt',
      phone: '+49123456789',
      role: 'SUPERVISOR',
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log('  ✅ Supervisor created:', supervisor.email);

  const studentPassword = await bcrypt.hash('Student123!', 10);
  const student = await prisma.user.upsert({
    where: { email: 'student@lb2d.com' },
    update: {},
    create: {
      email: 'student@lb2d.com',
      passwordHash: studentPassword,
      firstName: 'Rahim',
      lastName: 'Ahmed',
      phone: '+8801712345678',
      role: 'STUDENT',
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log('  ✅ Student created:', student.email);

  // ============================================
  // COURSES
  // ============================================

  console.log('\n📚 Creating courses...');

  const courseA1 = await prisma.course.upsert({
    where: { slug: 'german-a1-beginner' },
    update: {},
    create: {
      title: 'German A1 - Beginner Level',
      description: `Master the fundamentals of German language with our comprehensive A1 level course.

      This course covers:
      - Basic grammar and sentence structure
      - Essential vocabulary for daily conversations
      - Pronunciation and listening comprehension
      - Reading and writing skills
      - Cultural insights about Germany

      Perfect for absolute beginners with no prior German knowledge.`,
      price: 99.99,
      discountPrice: 79.99,
      level: 'BEGINNER',
      language: 'en',
      supervisorId: supervisor.id,
      isActive: true,
      isPublished: true,
      slug: 'german-a1-beginner',
      metaTitle: 'German A1 Beginner Course - Learn German Online',
      metaDescription:
        'Start your German language journey with our comprehensive A1 beginner course. Interactive lessons, quizzes, and certificates.',
      metaKeywords: ['German A1', 'Beginner German', 'Learn German', 'German Course'],
      publishedAt: new Date(),
    },
  });
  console.log('  ✅ Course created:', courseA1.title);

  const courseA2 = await prisma.course.upsert({
    where: { slug: 'german-a2-elementary' },
    update: {},
    create: {
      title: 'German A2 - Elementary Level',
      description: `Build on your A1 foundation with our A2 level course.

      Topics include:
      - Past and future tenses
      - Modal verbs and complex sentences
      - Expanded vocabulary
      - Everyday situations and conversations
      - Writing emails and short texts

      Ideal for students who have completed A1 or have basic German knowledge.`,
      price: 129.99,
      discountPrice: 99.99,
      level: 'INTERMEDIATE',
      language: 'en',
      supervisorId: supervisor.id,
      isActive: true,
      isPublished: true,
      slug: 'german-a2-elementary',
      metaTitle: 'German A2 Elementary Course - Advance Your German',
      metaDescription:
        'Take your German to the next level with our A2 elementary course. Interactive lessons and practical exercises.',
      metaKeywords: ['German A2', 'Elementary German', 'German Intermediate', 'German Course'],
      publishedAt: new Date(),
    },
  });
  console.log('  ✅ Course created:', courseA2.title);

  // ============================================
  // VIDEOS (Sample)
  // ============================================

  console.log('\n🎥 Creating sample videos...');

  const video1 = await prisma.video.create({
    data: {
      courseId: courseA1.id,
      title: 'Introduction to German Alphabet',
      description: 'Learn the German alphabet and pronunciation basics.',
      videoUrl: 'https://sample-videos.com/german-alphabet.mp4',
      thumbnailUrl: 'https://sample-videos.com/thumbnails/alphabet.jpg',
      duration: 600, // 10 minutes
      order: 1,
      status: 'APPROVED',
      approvedAt: new Date(),
      format: 'mp4',
      resolution: '1080p',
    },
  });
  console.log('  ✅ Video created:', video1.title);

  const video2 = await prisma.video.create({
    data: {
      courseId: courseA1.id,
      title: 'Basic Greetings and Introductions',
      description: 'Learn how to greet people and introduce yourself in German.',
      videoUrl: 'https://sample-videos.com/greetings.mp4',
      thumbnailUrl: 'https://sample-videos.com/thumbnails/greetings.jpg',
      duration: 900, // 15 minutes
      order: 2,
      status: 'APPROVED',
      approvedAt: new Date(),
      format: 'mp4',
      resolution: '1080p',
    },
  });
  console.log('  ✅ Video created:', video2.title);

  // ============================================
  // ENROLLMENT (Sample)
  // ============================================

  console.log('\n📝 Creating enrollment...');

  const enrollment = await prisma.enrollment.create({
    data: {
      userId: student.id,
      courseId: courseA1.id,
      status: 'ACTIVE',
      progress: 25.5,
      enrolledAt: new Date(),
    },
  });
  console.log('  ✅ Student enrolled in:', courseA1.title);

  // ============================================
  // VIDEO PROGRESS (Sample)
  // ============================================

  const progress1 = await prisma.videoProgress.create({
    data: {
      userId: student.id,
      videoId: video1.id,
      progress: 100,
      currentTime: 600,
      completed: true,
      completedAt: new Date(),
    },
  });
  console.log('  ✅ Video progress tracked');

  // ============================================
  // QUIZ (Sample)
  // ============================================

  console.log('\n📝 Creating quiz...');

  const quiz = await prisma.quiz.create({
    data: {
      courseId: courseA1.id,
      title: 'A1 Grammar Quiz - Lesson 1',
      description: 'Test your understanding of basic German grammar.',
      duration: 30,
      passingScore: 70,
      maxAttempts: 3,
      order: 1,
      isActive: true,
      questions: {
        create: [
          {
            question: 'What is the German word for "Hello"?',
            type: 'MULTIPLE_CHOICE',
            options: JSON.stringify(['Hallo', 'Tschüss', 'Danke', 'Bitte']),
            correctAnswer: JSON.stringify('Hallo'),
            explanation: 'Hallo is the German word for Hello.',
            points: 1,
            order: 1,
          },
          {
            question: 'German is a difficult language.',
            type: 'TRUE_FALSE',
            options: JSON.stringify(['True', 'False']),
            correctAnswer: JSON.stringify('True'),
            explanation: 'This is subjective, but generally considered true for English speakers.',
            points: 1,
            order: 2,
          },
        ],
      },
    },
  });
  console.log('  ✅ Quiz created:', quiz.title);

  // ============================================
  // NOTIFICATION (Sample)
  // ============================================

  console.log('\n🔔 Creating notification...');

  const notification = await prisma.notification.create({
    data: {
      userId: student.id,
      type: 'COURSE_ENROLLMENT',
      title: 'Course Enrollment Successful',
      message: `You have successfully enrolled in "${courseA1.title}". Start learning now!`,
      data: JSON.stringify({ courseId: courseA1.id }),
      read: false,
    },
  });
  console.log('  ✅ Notification created');

  // ============================================
  // ENTERPRISE FEATURES - DISCUSSION CATEGORIES
  // ============================================

  console.log('\n💬 Creating discussion categories...');

  const categories = await prisma.discussionCategory.createMany({
    data: [
      {
        name: 'General Discussion',
        description: 'General topics about learning German',
        slug: 'general',
        icon: '💬',
        order: 1,
        isActive: true,
      },
      {
        name: 'Course Help',
        description: 'Questions about specific courses',
        slug: 'course-help',
        icon: '❓',
        order: 2,
        isActive: true,
      },
      {
        name: 'German Language',
        description: 'Discuss German grammar, vocabulary, and culture',
        slug: 'german-language',
        icon: '🇩🇪',
        order: 3,
        isActive: true,
      },
      {
        name: 'Study Tips',
        description: 'Share your study strategies and tips',
        slug: 'study-tips',
        icon: '📚',
        order: 4,
        isActive: true,
      },
    ],
  });
  console.log('  ✅ Created 4 discussion categories');

  // ============================================
  // ENTERPRISE FEATURES - ACHIEVEMENTS
  // ============================================

  console.log('\n🏆 Creating achievements...');

  const achievements = await prisma.achievement.createMany({
    data: [
      {
        name: 'First Steps',
        description: 'Watch your first video',
        icon: '🎬',
        category: 'LEARNING',
        type: 'VIDEOS_WATCHED',
        requirement: 1,
        points: 10,
        rarity: 'COMMON',
        isActive: true,
        order: 1,
      },
      {
        name: 'Video Enthusiast',
        description: 'Watch 10 videos',
        icon: '📺',
        category: 'LEARNING',
        type: 'VIDEOS_WATCHED',
        requirement: 10,
        points: 50,
        rarity: 'UNCOMMON',
        isActive: true,
        order: 2,
      },
      {
        name: 'Course Beginner',
        description: 'Complete your first course',
        icon: '🎓',
        category: 'MILESTONE',
        type: 'COURSES_COMPLETED',
        requirement: 1,
        points: 100,
        rarity: 'UNCOMMON',
        isActive: true,
        order: 3,
      },
      {
        name: 'Course Master',
        description: 'Complete 5 courses',
        icon: '🏅',
        category: 'MILESTONE',
        type: 'COURSES_COMPLETED',
        requirement: 5,
        points: 500,
        rarity: 'RARE',
        isActive: true,
        order: 4,
      },
      {
        name: 'Quiz Expert',
        description: 'Pass 10 quizzes',
        icon: '📝',
        category: 'LEARNING',
        type: 'QUIZZES_PASSED',
        requirement: 10,
        points: 250,
        rarity: 'RARE',
        isActive: true,
        order: 5,
      },
      {
        name: '7 Day Streak',
        description: 'Learn for 7 consecutive days',
        icon: '🔥',
        category: 'ENGAGEMENT',
        type: 'DAYS_STREAK',
        requirement: 7,
        points: 150,
        rarity: 'RARE',
        isActive: true,
        order: 6,
      },
      {
        name: 'Community Helper',
        description: 'Post 5 helpful answers in discussions',
        icon: '💡',
        category: 'SOCIAL',
        type: 'HELPFUL_ANSWERS',
        requirement: 5,
        points: 200,
        rarity: 'UNCOMMON',
        isActive: true,
        order: 7,
      },
      {
        name: 'Reviewer',
        description: 'Write your first course review',
        icon: '⭐',
        category: 'ENGAGEMENT',
        type: 'COURSE_REVIEWS',
        requirement: 1,
        points: 50,
        rarity: 'COMMON',
        isActive: true,
        order: 8,
      },
    ],
  });
  console.log('  ✅ Created 8 achievements');

  // ============================================
  // ENTERPRISE FEATURES - COURSE REVIEWS
  // ============================================

  console.log('\n⭐ Creating sample reviews...');

  const review1 = await prisma.courseReview.create({
    data: {
      userId: student.id,
      courseId: courseA1.id,
      rating: 5,
      title: 'Excellent course for beginners!',
      content: 'This course is perfect for absolute beginners. The instructor explains everything clearly and the pace is just right. I went from knowing nothing to being able to introduce myself in German in just 2 weeks!',
      status: 'APPROVED',
      isVerified: false,
      helpfulCount: 0,
    },
  });
  console.log('  ✅ Sample review created');

  // Update course stats
  await prisma.course.update({
    where: { id: courseA1.id },
    data: {
      averageRating: 5.0,
      totalRatings: 1,
    },
  });

  // ============================================
  // ENTERPRISE FEATURES - TAGS
  // ============================================

  console.log('\n🏷️  Creating tags...');

  const tags = await prisma.tag.createMany({
    data: [
      { name: 'Beginner', slug: 'beginner', courseCount: 1 },
      { name: 'Grammar', slug: 'grammar', courseCount: 1 },
      { name: 'Vocabulary', slug: 'vocabulary', courseCount: 1 },
      { name: 'Conversation', slug: 'conversation', courseCount: 0 },
      { name: 'Pronunciation', slug: 'pronunciation', courseCount: 0 },
    ],
  });
  console.log('  ✅ Created 5 tags');

  // ============================================
  // SUMMARY
  // ============================================

  console.log('\n📊 Seed Summary:');
  console.log('  👥 Users: 3 (1 Admin, 1 Supervisor, 1 Student)');
  console.log('  📚 Courses: 2');
  console.log('  🎥 Videos: 2');
  console.log('  📝 Quizzes: 1');
  console.log('  📋 Enrollments: 1');
  console.log('  🔔 Notifications: 1');
  console.log('  ⭐ Reviews: 1');
  console.log('  💬 Discussion Categories: 4');
  console.log('  🏆 Achievements: 8');
  console.log('  🏷️  Tags: 5');

  console.log('\n✅ Seeding completed successfully!\n');

  console.log('🔐 Test Credentials:');
  console.log('  Admin:      admin@lb2d.com / Admin123!');
  console.log('  Supervisor: supervisor@lb2d.com / Super123!');
  console.log('  Student:    student@lb2d.com / Student123!');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
