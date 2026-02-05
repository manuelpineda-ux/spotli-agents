import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AgentsService } from '../agents/agents.service';
import { LlmService } from '../llm/llm.service';
import { CreateConversationDto, SendMessageDto } from './dto/conversation.dto';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentsService: AgentsService,
    private readonly llmService: LlmService,
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

    // Build conversation history for context
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const conversationHistory = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    // Build system prompt from agent configuration
    const systemPrompt = this.buildSystemPrompt(conversation.agent);

    // Generate LLM response
    let llmResponse;
    try {
      llmResponse = await this.llmService.generateResponseSync(
        conversationHistory,
        systemPrompt,
        { temperature: 0.7, maxTokens: 1024 },
      );
    } catch (error) {
      this.logger.error('LLM generation failed', error);
      llmResponse = {
        content: 'I apologize, but I am temporarily unable to respond. Please try again.',
        tokensUsed: 0,
        model: 'fallback',
        latencyMs: 0,
      };
    }

    // Save assistant message
    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: llmResponse.content,
        metadata: {
          model: llmResponse.model,
          tokens: llmResponse.tokensUsed,
          latencyMs: llmResponse.latencyMs,
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

  private buildSystemPrompt(agent: {
    name: string;
    personality?: string | null;
    systemPrompt?: string | null;
  }): string {
    const parts: string[] = [];
    parts.push(`You are ${agent.name}, an AI assistant for marketing and customer engagement.`);
    if (agent.personality) parts.push(`Your personality: ${agent.personality}`);
    if (agent.systemPrompt) parts.push(`Instructions: ${agent.systemPrompt}`);
    parts.push('Be helpful, professional, and friendly. Keep responses concise but informative.');
    return parts.join('\n\n');
  }

  /**
   * Stream response using SSE
   */
  streamResponse(
    conversationId: string,
    userId: string,
    organizationId: string,
  ): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    this.executeStreamResponse(conversationId, userId, organizationId, subject);
    return subject.asObservable();
  }

  private async executeStreamResponse(
    conversationId: string,
    userId: string,
    organizationId: string,
    subject: Subject<MessageEvent>,
  ): Promise<void> {
    try {
      const conversation = await this.findOne(conversationId, userId, organizationId);

      const latestMessage = await this.prisma.message.findFirst({
        where: { conversationId, role: 'user' },
        orderBy: { createdAt: 'desc' },
      });

      if (!latestMessage) {
        subject.next({ data: JSON.stringify({ type: 'error', message: 'No message to respond to' }) } as MessageEvent);
        subject.complete();
        return;
      }

      const messages = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });

      const conversationHistory = messages
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

      const systemPrompt = this.buildSystemPrompt(conversation.agent);

      // Send start event
      subject.next({ data: JSON.stringify({ type: 'start', conversationId }) } as MessageEvent);

      let fullContent = '';
      const startTime = Date.now();

      for await (const chunk of this.llmService.generateResponse(
        conversationHistory,
        systemPrompt,
        { temperature: 0.7, maxTokens: 1024 },
      )) {
        fullContent += chunk;
        subject.next({ data: JSON.stringify({ type: 'token', content: chunk }) } as MessageEvent);
      }

      const latencyMs = Date.now() - startTime;

      // Save assistant message
      const assistantMessage = await this.prisma.message.create({
        data: {
          conversationId,
          role: 'assistant',
          content: fullContent,
          metadata: {
            model: 'gemini-1.5-flash',
            tokens: this.llmService.countTokens(fullContent),
            latencyMs,
            streamed: true,
          },
        },
      });

      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      subject.next({
        data: JSON.stringify({
          type: 'done',
          messageId: assistantMessage.id,
          tokensUsed: this.llmService.countTokens(fullContent),
          latencyMs,
        }),
      } as MessageEvent);

      subject.complete();
    } catch (error) {
      this.logger.error('Streaming response failed', error);
      subject.next({ data: JSON.stringify({ type: 'error', message: 'Failed to generate response' }) } as MessageEvent);
      subject.complete();
    }
  }
}
