import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module';
import { AgentsModule } from './modules/agents/agents.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { GrpcModule } from './modules/grpc/grpc.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { LlmModule } from './modules/llm/llm.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    HealthModule,
    AgentsModule,
    ConversationsModule,
    GrpcModule,
    LlmModule,
  ],
})
export class AppModule {}
