import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedEnterpriseFeatures() {
  console.log('🌱 Seeding Enterprise Features...\n');

  // ============================================
  // DISCUSSION CATEGORIES
  // ============================================

  console.log('💬 Creating discussion categories...');

  await prisma.discussionCategory.upsert({
    where: { slug: 'general' },
    update: {},
    create: {
      name: 'General Discussion',
      description: 'General topics about learning German',
      slug: 'general',
      icon: '💬',
      order: 1,
      isActive: true,
    },
  });

  await prisma.discussionCategory.upsert({
    where: { slug: 'course-help' },
    update: {},
    create: {
      name: 'Course Help',
      description: 'Questions about specific courses',
      slug: 'course-help',
      icon: '❓',
      order: 2,
      isActive: true,
    },
  });

  await prisma.discussionCategory.upsert({
    where: { slug: 'german-language' },
    update: {},
    create: {
      name: 'German Language',
      description: 'Discuss German grammar, vocabulary, and culture',
      slug: 'german-language',
      icon: '🇩🇪',
      order: 3,
      isActive: true,
    },
  });

  await prisma.discussionCategory.upsert({
    where: { slug: 'study-tips' },
    update: {},
    create: {
      name: 'Study Tips',
      description: 'Share your study strategies and tips',
      slug: 'study-tips',
      icon: '📚',
      order: 4,
      isActive: true,
    },
  });

  console.log('  ✅ Created 4 discussion categories');

  // ============================================
  // ACHIEVEMENTS
  // ============================================

  console.log('\n🏆 Creating achievements...');

  const achievementsData = [
    {
      name: 'First Steps',
      description: 'Watch your first video',
      icon: '🎬',
      category: 'LEARNING',
      type: 'VIDEOS_WATCHED',
      requirement: 1,
      points: 10,
      rarity: 'COMMON',
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
    },
  ];

  // Check if achievements already exist
  const existingAchievements = await prisma.achievement.count();

  if (existingAchievements === 0) {
    await prisma.achievement.createMany({
      data: achievementsData.map((a, index) => ({
        name: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category as any,
        type: a.type as any,
        rarity: a.rarity as any,
        requirement: a.requirement,
        points: a.points,
        isActive: true,
        order: index + 1,
      })),
    });
    console.log('  ✅ Created 8 achievements');
  } else {
    console.log('  ℹ️  Achievements already exist');
  }

  // ============================================
  // TAGS
  // ============================================

  console.log('\n🏷️  Creating tags...');

  const tagsData = [
    { name: 'Beginner', slug: 'beginner' },
    { name: 'Grammar', slug: 'grammar' },
    { name: 'Vocabulary', slug: 'vocabulary' },
    { name: 'Conversation', slug: 'conversation' },
    { name: 'Pronunciation', slug: 'pronunciation' },
  ];

  for (const tag of tagsData) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: {
        ...tag,
        courseCount: 0,
      },
    });
  }

  console.log('  ✅ Created 5 tags');

  // ============================================
  // SAMPLE REVIEW
  // ============================================

  console.log('\n⭐ Creating sample review...');

  const student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
  const course = await prisma.course.findFirst();

  if (student && course) {
    const existingReview = await prisma.courseReview.findUnique({
      where: {
        courseId_userId: {
          courseId: course.id,
          userId: student.id,
        },
      },
    });

    if (!existingReview) {
      await prisma.courseReview.create({
        data: {
          userId: student.id,
          courseId: course.id,
          rating: 5,
          title: 'Excellent course for beginners!',
          content:
            'This course is perfect for absolute beginners. The instructor explains everything clearly and the pace is just right. I went from knowing nothing to being able to introduce myself in German in just 2 weeks!',
          status: 'APPROVED',
          isVerified: false,
          helpfulCount: 0,
        },
      });

      // Update course stats
      await prisma.course.update({
        where: { id: course.id },
        data: {
          averageRating: 5.0,
          totalRatings: 1,
        },
      });

      console.log('  ✅ Sample review created');
    } else {
      console.log('  ℹ️  Sample review already exists');
    }
  }

  // ============================================
  // LEARNING PATHS - Sample Path
  // ============================================

  console.log('\n🛤️  Creating sample learning path...');

  const courses = await prisma.course.findMany({ take: 2 });

  if (courses.length >= 2) {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    const pathSlug = 'german-beginner-to-intermediate';
    const existingPath = await prisma.learningPath.findUnique({
      where: { slug: pathSlug },
    });

    if (!existingPath && admin) {
      const learningPath = await prisma.learningPath.create({
        data: {
          title: 'German: Beginner to Intermediate',
          description: 'Complete journey from A1 to A2 German proficiency',
          slug: pathSlug,
          level: 'BEGINNER',
          estimatedHours: 120,
          isOfficial: true,
          isPublished: true,
          createdBy: admin.id,
          metaTitle: 'German A1-A2 Complete Learning Path',
          metaDescription: 'Master German from beginner to intermediate with our structured learning path',
          tags: ['german', 'beginner', 'a1', 'a2'],
        },
      });

      await prisma.learningPathStep.createMany({
        data: [
          {
            pathId: learningPath.id,
            courseId: courses[0].id,
            order: 1,
            isOptional: false,
            description: 'Start with the fundamentals',
            estimatedHours: 60,
          },
          {
            pathId: learningPath.id,
            courseId: courses[1].id,
            order: 2,
            isOptional: false,
            description: 'Build on your foundation',
            estimatedHours: 60,
          },
        ],
      });

      console.log('  ✅ Sample learning path created');
    } else {
      console.log('  ℹ️  Learning path already exists');
    }
  }

  console.log('\n✅ All enterprise features seeded successfully!\n');
}

seedEnterpriseFeatures()
  .catch((e) => {
    console.error('❌ Error seeding enterprise features:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
