import { Module } from '@nestjs/common';
import { GrpcController } from './grpc.controller';
import { AgentsModule } from '../agents/agents.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [AgentsModule, ConversationsModule],
  controllers: [GrpcController],
})
export class GrpcModule {}
