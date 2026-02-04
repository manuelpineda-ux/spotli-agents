import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly isDummyMode = process.env.DUMMY_MODE === 'true';

  async onModuleInit() {
    if (this.isDummyMode) {
      this.logger.warn('🎭 DUMMY MODE - Skipping database connection');
      return;
    }
    await this.$connect();
  }

  async onModuleDestroy() {
    if (this.isDummyMode) {
      return;
    }
    await this.$disconnect();
  }
}
