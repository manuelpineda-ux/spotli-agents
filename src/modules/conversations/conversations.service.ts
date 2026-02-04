import { Injectable, NotFoundException } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AgentsService } from '../agents/agents.service';
import { CreateConversationDto, SendMessageDto } from './dto/conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentsService: AgentsService,
  ) {}

  async create(
    userId: string,
    organizationId: string,
    dto: CreateConversationDto,
  ) {
    // Verify agent exists and belongs to organization
    await this.agentsService.findOne(dto.agentId, organizationId);

    return this.prisma.conversation.create({
      data: {
        agentId: dto.agentId,
        userId,
        organizationId,
        title: dto.title,
      },
      include: {
        agent: true,
      },
    });
  }

  async findAllByUser(userId: string, organizationId: string) {
    return this.prisma.conversation.findMany({
      where: { userId, organizationId, status: 'active' },
      include: {
        agent: {
          select: { id: true, name: true },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, organizationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, userId, organizationId },
      include: {
        agent: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async getMessages(id: string, userId: string, organizationId: string) {
    await this.findOne(id, userId, organizationId); // Verify access

    return this.prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    organizationId: string,
    dto: SendMessageDto,
  ) {
    const conversation = await this.findOne(
      conversationId,
      userId,
      organizationId,
    );

    // Save user message
    const userMessage = await this.prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content: dto.content,
      },
    });

    // TODO: Call LLM service to generate response
    // For now, return a placeholder response
    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: `[LLM Integration Pending] Received: "${dto.content}"`,
        metadata: {
          model: 'placeholder',
          tokens: 0,
        },
      },
    });

    // Update conversation timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      userMessage,
      assistantMessage,
    };
  }

  /**
   * Stream response using SSE
   * TODO: Implement actual LLM streaming when integration is ready
   */
  streamResponse(
    conversationId: string,
    userId: string,
    organizationId: string,
  ): Observable<MessageEvent> {
    // Placeholder - will implement actual streaming later
    return of({
      data: JSON.stringify({
        type: 'info',
        message: 'Streaming not yet implemented',
      }),
    } as MessageEvent);
  }
}
