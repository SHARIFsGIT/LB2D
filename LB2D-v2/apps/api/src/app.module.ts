import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module';
import { EmailModule } from './common/email/email.module';
import { StorageModule } from './common/storage/storage.module';
import { LoggerModule } from './common/logger/logger.module';
import { CacheModule } from './common/cache/cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CoursesModule } from './modules/courses/courses.module';
import { VideosModule } from './modules/videos/videos.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { DiscussionsModule } from './modules/discussions/discussions.module';
import { LearningPathsModule } from './modules/learning-paths/learning-paths.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module';
import { SocialModule } from './modules/social/social.module';
import { ContactModule } from './modules/contact/contact.module';
import { GatewaysModule } from './gateways/gateways.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3, // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20, // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Scheduled tasks
    ScheduleModule.forRoot(),

    // Global modules
    PrismaModule,
    EmailModule,
    StorageModule,
    LoggerModule,
    CacheModule,
    HealthModule,

    // Feature modules
    AuthModule,
    UsersModule,
    CoursesModule,
    VideosModule,
    ResourcesModule,
    QuizzesModule,
    PaymentsModule,
    CertificatesModule,
    NotificationsModule,
    AnalyticsModule,

    // NEW: Enterprise Features
    ReviewsModule,
    DiscussionsModule,
    LearningPathsModule,
    GamificationModule,
    BookmarksModule,
    SocialModule,
    ContactModule,

    // WebSocket
    GatewaysModule,
  ],
  controllers: [],
  providers: [
    // Global Exception Filter (comprehensive error handling)
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Global JWT Auth Guard (applies to all routes except @Public())
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global Roles Guard (checks @Roles() decorator)
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Global Response Interceptor (standardize API responses)
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
