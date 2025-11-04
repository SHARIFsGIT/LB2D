-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "TopicType" AS ENUM ('DISCUSSION', 'QUESTION', 'ANNOUNCEMENT', 'POLL');

-- CreateEnum
CREATE TYPE "TopicStatus" AS ENUM ('ACTIVE', 'CLOSED', 'DELETED', 'SPAM');

-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('LEARNING', 'ENGAGEMENT', 'SOCIAL', 'MILESTONE', 'SPECIAL');

-- CreateEnum
CREATE TYPE "AchievementType" AS ENUM ('COURSES_COMPLETED', 'VIDEOS_WATCHED', 'QUIZZES_PASSED', 'DAYS_STREAK', 'HOURS_LEARNED', 'CERTIFICATES_EARNED', 'DISCUSSIONS_POSTED', 'HELPFUL_ANSWERS', 'COURSE_REVIEWS', 'PERFECT_SCORES');

-- CreateEnum
CREATE TYPE "AchievementRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "LeaderboardPeriod" AS ENUM ('ALL_TIME', 'MONTHLY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('COURSE_ENROLLED', 'COURSE_COMPLETED', 'VIDEO_WATCHED', 'QUIZ_COMPLETED', 'ACHIEVEMENT_EARNED', 'REVIEW_POSTED', 'DISCUSSION_STARTED', 'ANSWER_POSTED', 'LEVEL_UP');

-- CreateTable
CREATE TABLE "course_reviews" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "moderatedBy" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "moderationNote" TEXT,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "notHelpfulCount" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_helpfulness" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isHelpful" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_helpfulness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "topicCount" INTEGER NOT NULL DEFAULT 0,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discussion_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_topics" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "courseId" TEXT,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "TopicType" NOT NULL DEFAULT 'DISCUSSION',
    "status" "TopicStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "bestAnswerId" TEXT,
    "metaDescription" TEXT,
    "tags" TEXT[],
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discussion_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_posts" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discussion_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "topicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_paths" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "level" "CourseLevel" NOT NULL,
    "estimatedHours" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "enrollmentCount" INTEGER NOT NULL DEFAULT 0,
    "completionCount" INTEGER NOT NULL DEFAULT 0,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_path_steps" (
    "id" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "estimatedHours" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_path_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "path_enrollments" (
    "id" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentStepIndex" INTEGER NOT NULL DEFAULT 0,
    "status" "EnrollmentStatus" NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "path_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "badgeUrl" TEXT,
    "category" "AchievementCategory" NOT NULL,
    "type" "AchievementType" NOT NULL,
    "requirement" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "rarity" "AchievementRarity" NOT NULL DEFAULT 'COMMON',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_points" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "pointsToNextLevel" INTEGER NOT NULL DEFAULT 100,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" "LeaderboardPeriod" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "coursesCompleted" INTEGER NOT NULL DEFAULT 0,
    "hoursLearned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaderboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "videoId" TEXT,
    "topicId" TEXT,
    "note" TEXT,
    "collection" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_notes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "courseCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_feeds" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_feeds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_reviews_courseId_idx" ON "course_reviews"("courseId");

-- CreateIndex
CREATE INDEX "course_reviews_userId_idx" ON "course_reviews"("userId");

-- CreateIndex
CREATE INDEX "course_reviews_rating_idx" ON "course_reviews"("rating");

-- CreateIndex
CREATE INDEX "course_reviews_status_idx" ON "course_reviews"("status");

-- CreateIndex
CREATE INDEX "course_reviews_createdAt_idx" ON "course_reviews"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "course_reviews_courseId_userId_key" ON "course_reviews"("courseId", "userId");

-- CreateIndex
CREATE INDEX "review_helpfulness_reviewId_idx" ON "review_helpfulness"("reviewId");

-- CreateIndex
CREATE INDEX "review_helpfulness_userId_idx" ON "review_helpfulness"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "review_helpfulness_reviewId_userId_key" ON "review_helpfulness"("reviewId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_categories_slug_key" ON "discussion_categories"("slug");

-- CreateIndex
CREATE INDEX "discussion_categories_slug_idx" ON "discussion_categories"("slug");

-- CreateIndex
CREATE INDEX "discussion_categories_order_idx" ON "discussion_categories"("order");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_topics_slug_key" ON "discussion_topics"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_topics_bestAnswerId_key" ON "discussion_topics"("bestAnswerId");

-- CreateIndex
CREATE INDEX "discussion_topics_categoryId_idx" ON "discussion_topics"("categoryId");

-- CreateIndex
CREATE INDEX "discussion_topics_courseId_idx" ON "discussion_topics"("courseId");

-- CreateIndex
CREATE INDEX "discussion_topics_userId_idx" ON "discussion_topics"("userId");

-- CreateIndex
CREATE INDEX "discussion_topics_slug_idx" ON "discussion_topics"("slug");

-- CreateIndex
CREATE INDEX "discussion_topics_type_idx" ON "discussion_topics"("type");

-- CreateIndex
CREATE INDEX "discussion_topics_status_idx" ON "discussion_topics"("status");

-- CreateIndex
CREATE INDEX "discussion_topics_isPinned_idx" ON "discussion_topics"("isPinned");

-- CreateIndex
CREATE INDEX "discussion_topics_lastActivityAt_idx" ON "discussion_topics"("lastActivityAt");

-- CreateIndex
CREATE INDEX "discussion_topics_tags_idx" ON "discussion_topics"("tags");

-- CreateIndex
CREATE INDEX "discussion_posts_topicId_idx" ON "discussion_posts"("topicId");

-- CreateIndex
CREATE INDEX "discussion_posts_userId_idx" ON "discussion_posts"("userId");

-- CreateIndex
CREATE INDEX "discussion_posts_parentId_idx" ON "discussion_posts"("parentId");

-- CreateIndex
CREATE INDEX "discussion_posts_createdAt_idx" ON "discussion_posts"("createdAt");

-- CreateIndex
CREATE INDEX "discussion_likes_userId_idx" ON "discussion_likes"("userId");

-- CreateIndex
CREATE INDEX "discussion_likes_postId_idx" ON "discussion_likes"("postId");

-- CreateIndex
CREATE INDEX "discussion_likes_topicId_idx" ON "discussion_likes"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_likes_userId_postId_key" ON "discussion_likes"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_likes_userId_topicId_key" ON "discussion_likes"("userId", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "learning_paths_slug_key" ON "learning_paths"("slug");

-- CreateIndex
CREATE INDEX "learning_paths_slug_idx" ON "learning_paths"("slug");

-- CreateIndex
CREATE INDEX "learning_paths_isPublished_idx" ON "learning_paths"("isPublished");

-- CreateIndex
CREATE INDEX "learning_paths_level_idx" ON "learning_paths"("level");

-- CreateIndex
CREATE INDEX "learning_paths_tags_idx" ON "learning_paths"("tags");

-- CreateIndex
CREATE INDEX "learning_path_steps_pathId_idx" ON "learning_path_steps"("pathId");

-- CreateIndex
CREATE INDEX "learning_path_steps_courseId_idx" ON "learning_path_steps"("courseId");

-- CreateIndex
CREATE INDEX "learning_path_steps_order_idx" ON "learning_path_steps"("order");

-- CreateIndex
CREATE UNIQUE INDEX "learning_path_steps_pathId_courseId_key" ON "learning_path_steps"("pathId", "courseId");

-- CreateIndex
CREATE INDEX "path_enrollments_pathId_idx" ON "path_enrollments"("pathId");

-- CreateIndex
CREATE INDEX "path_enrollments_userId_idx" ON "path_enrollments"("userId");

-- CreateIndex
CREATE INDEX "path_enrollments_status_idx" ON "path_enrollments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "path_enrollments_pathId_userId_key" ON "path_enrollments"("pathId", "userId");

-- CreateIndex
CREATE INDEX "achievements_category_idx" ON "achievements"("category");

-- CreateIndex
CREATE INDEX "achievements_type_idx" ON "achievements"("type");

-- CreateIndex
CREATE INDEX "achievements_isActive_idx" ON "achievements"("isActive");

-- CreateIndex
CREATE INDEX "user_achievements_userId_idx" ON "user_achievements"("userId");

-- CreateIndex
CREATE INDEX "user_achievements_achievementId_idx" ON "user_achievements"("achievementId");

-- CreateIndex
CREATE INDEX "user_achievements_isCompleted_idx" ON "user_achievements"("isCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_userId_achievementId_key" ON "user_achievements"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "user_points_userId_key" ON "user_points"("userId");

-- CreateIndex
CREATE INDEX "user_points_totalPoints_idx" ON "user_points"("totalPoints");

-- CreateIndex
CREATE INDEX "user_points_currentLevel_idx" ON "user_points"("currentLevel");

-- CreateIndex
CREATE INDEX "leaderboards_period_idx" ON "leaderboards"("period");

-- CreateIndex
CREATE INDEX "leaderboards_periodKey_idx" ON "leaderboards"("periodKey");

-- CreateIndex
CREATE INDEX "leaderboards_rank_idx" ON "leaderboards"("rank");

-- CreateIndex
CREATE INDEX "leaderboards_points_idx" ON "leaderboards"("points");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboards_userId_period_periodKey_key" ON "leaderboards"("userId", "period", "periodKey");

-- CreateIndex
CREATE INDEX "bookmarks_userId_idx" ON "bookmarks"("userId");

-- CreateIndex
CREATE INDEX "bookmarks_collection_idx" ON "bookmarks"("collection");

-- CreateIndex
CREATE INDEX "bookmarks_tags_idx" ON "bookmarks"("tags");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_userId_courseId_key" ON "bookmarks"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_userId_videoId_key" ON "bookmarks"("userId", "videoId");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_userId_topicId_key" ON "bookmarks"("userId", "topicId");

-- CreateIndex
CREATE INDEX "video_notes_userId_idx" ON "video_notes"("userId");

-- CreateIndex
CREATE INDEX "video_notes_videoId_idx" ON "video_notes"("videoId");

-- CreateIndex
CREATE INDEX "video_notes_timestamp_idx" ON "video_notes"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tags_slug_idx" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tags_courseCount_idx" ON "tags"("courseCount");

-- CreateIndex
CREATE INDEX "user_follows_followerId_idx" ON "user_follows"("followerId");

-- CreateIndex
CREATE INDEX "user_follows_followingId_idx" ON "user_follows"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "user_follows_followerId_followingId_key" ON "user_follows"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "activity_feeds_userId_idx" ON "activity_feeds"("userId");

-- CreateIndex
CREATE INDEX "activity_feeds_activityType_idx" ON "activity_feeds"("activityType");

-- CreateIndex
CREATE INDEX "activity_feeds_createdAt_idx" ON "activity_feeds"("createdAt");

-- CreateIndex
CREATE INDEX "activity_feeds_isPublic_idx" ON "activity_feeds"("isPublic");

-- AddForeignKey
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_topics" ADD CONSTRAINT "discussion_topics_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "discussion_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_topics" ADD CONSTRAINT "discussion_topics_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_topics" ADD CONSTRAINT "discussion_topics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_topics" ADD CONSTRAINT "discussion_topics_bestAnswerId_fkey" FOREIGN KEY ("bestAnswerId") REFERENCES "discussion_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "discussion_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "discussion_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_steps" ADD CONSTRAINT "learning_path_steps_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_steps" ADD CONSTRAINT "learning_path_steps_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "path_enrollments" ADD CONSTRAINT "path_enrollments_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "path_enrollments" ADD CONSTRAINT "path_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_points" ADD CONSTRAINT "user_points_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboards" ADD CONSTRAINT "leaderboards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "discussion_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_notes" ADD CONSTRAINT "video_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_notes" ADD CONSTRAINT "video_notes_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_feeds" ADD CONSTRAINT "activity_feeds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
