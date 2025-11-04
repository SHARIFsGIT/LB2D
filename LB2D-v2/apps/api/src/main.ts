import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // CORS configuration
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Security
  app.use(helmet());
  app.use(compression());

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger API Documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('LB2D API')
      .setDescription('Learn Bangla to Deutsch - E-Learning Platform API')
      .setVersion('2.0')
      .addBearerAuth()
      .addTag('Authentication', 'Authentication endpoints')
      .addTag('Users', 'User management')
      .addTag('Courses', 'Course management')
      .addTag('Videos', 'Video management')
      .addTag('Resources', 'Resource management')
      .addTag('Quizzes', 'Quiz management')
      .addTag('Tests', 'Test management')
      .addTag('Payments', 'Payment processing')
      .addTag('Certificates', 'Certificate generation')
      .addTag('Notifications', 'Notification system')
      .addTag('Analytics', 'Analytics and reporting')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'LB2D API Documentation',
      customfavIcon: 'https://lb2d.com/favicon.ico',
      customCss: '.swagger-ui .topbar { display: none }',
    });
  }

  const port = configService.get('PORT', 3001);
  await app.listen(port);

  console.log(`
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║   🚀 LB2D API Server v2.0                                ║
    ║                                                           ║
    ║   📡 Server running on: http://localhost:${port}          ║
    ║   📚 API Docs: http://localhost:${port}/api/docs         ║
    ║   🌍 Environment: ${configService.get('NODE_ENV')}       ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
