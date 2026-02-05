import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { AgentsModule } from '../agents/agents.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [AgentsModule, LlmModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
