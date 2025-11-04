import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');

      // Log queries in development
      if (process.env.NODE_ENV === 'development') {
        // @ts-ignore
        this.$on('query', (e) => {
          // this.logger.debug(`Query: ${e.query}`);
          // this.logger.debug(`Duration: ${e.duration}ms`);
        });
      }

      // Log warnings
      // @ts-ignore
      this.$on('warn', (e) => {
        this.logger.warn(e);
      });

      // Log errors
      // @ts-ignore
      this.$on('error', (e) => {
        this.logger.error(e);
      });
    } catch (error) {
      this.logger.error('❌ Database connection failed', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  // Helper method for transactions
  async transaction<T>(fn: (prisma: any) => Promise<T>): Promise<T> {
    return this.$transaction(fn as any) as Promise<T>;
  }

  // Cleanup method (useful for testing)
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production!');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && key[0] !== '_',
    );

    return Promise.all(
      models.map((modelKey) => {
        // @ts-ignore
        return this[modelKey].deleteMany();
      }),
    );
  }
}
