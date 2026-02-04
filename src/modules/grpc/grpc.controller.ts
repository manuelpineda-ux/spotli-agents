import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { Observable, Subject } from 'rxjs';
import { AgentsService } from '../agents/agents.service';
import { ConversationsService } from '../conversations/conversations.service';
import { getMockResponse } from '../../common/mocks/mock-data';

// Type definitions matching the proto file
interface RequestContext {
  userId: string;
  organizationId: string;
}

interface CreateAgentRequest {
  context: RequestContext;
  name: string;
  description?: string;
  personality?: string;
  tone?: string;
  language?: string;
  systemPrompt?: string;
}

interface GetAgentRequest {
  context: RequestContext;
  id: string;
}

interface UpdateAgentRequest {
  context: RequestContext;
  id: string;
  name?: string;
  description?: string;
  personality?: string;
  tone?: string;
  language?: string;
  systemPrompt?: string;
}

interface DeleteAgentRequest {
  context: RequestContext;
  id: string;
}

interface ListAgentsRequest {
  context: RequestContext;
}

interface CreateConversationRequest {
  context: RequestContext;
  agentId: string;
  title?: string;
}

interface GetConversationRequest {
  context: RequestContext;
  id: string;
}

interface ListConversationsRequest {
  context: RequestContext;
}

interface GetMessagesRequest {
  context: RequestContext;
  conversationId: string;
  limit?: number;
  beforeId?: string;
}

interface SendMessageRequest {
  context: RequestContext;
  conversationId: string;
  content: string;
}

interface ChatStreamRequest {
  context: RequestContext;
  conversationId: string;
  content: string;
}

interface ChatStreamResponse {
  start?: { conversationId: string; messageId: string };
  token?: { content: string };
  done?: { model: string; tokensUsed: number; latencyMs: number; fullMessage: unknown };
  error?: { code: string; message: string };
}

@Controller()
export class GrpcController {
  private readonly logger = new Logger(GrpcController.name);
  private readonly isDummyMode = process.env.DUMMY_MODE === 'true';

  constructor(
    private readonly agentsService: AgentsService,
    private readonly conversationsService: ConversationsService,
  ) {
    if (this.isDummyMode) {
      this.logger.warn('🎭 gRPC DUMMY MODE ENABLED');
    }
  }

  // ============================================
  // AGENTS
  // ============================================

  @GrpcMethod('AgentsService', 'CreateAgent')
  async createAgent(request: CreateAgentRequest) {
    this.logger.debug(`gRPC CreateAgent: ${request.name}`);

    if (this.isDummyMode) {
      return getMockResponse('POST', '/v1/agents', {
        name: request.name,
        description: request.description,
        personality: request.personality,
        tone: request.tone,
        language: request.language,
        systemPrompt: request.systemPrompt,
      });
    }

    return this.agentsService.create(request.context.organizationId, {
      name: request.name,
      description: request.description,
      personality: request.personality,
      tone: request.tone,
      language: request.language,
      systemPrompt: request.systemPrompt,
    });
  }

  @GrpcMethod('AgentsService', 'GetAgent')
  async getAgent(request: GetAgentRequest) {
    this.logger.debug(`gRPC GetAgent: ${request.id}`);

    if (this.isDummyMode) {
      return getMockResponse('GET', `/v1/agents/${request.id}`);
    }

    return this.agentsService.findOne(request.id, request.context.organizationId);
  }

  @GrpcMethod('AgentsService', 'UpdateAgent')
  async updateAgent(request: UpdateAgentRequest) {
    this.logger.debug(`gRPC UpdateAgent: ${request.id}`);

    if (this.isDummyMode) {
      return getMockResponse('PUT', `/v1/agents/${request.id}`, {
        name: request.name,
        description: request.description,
        personality: request.personality,
        tone: request.tone,
        language: request.language,
        systemPrompt: request.systemPrompt,
      });
    }

    return this.agentsService.update(request.id, request.context.organizationId, {
      name: request.name,
      description: request.description,
      personality: request.personality,
      tone: request.tone,
      language: request.language,
      systemPrompt: request.systemPrompt,
    });
  }

  @GrpcMethod('AgentsService', 'DeleteAgent')
  async deleteAgent(request: DeleteAgentRequest) {
    this.logger.debug(`gRPC DeleteAgent: ${request.id}`);

    if (this.isDummyMode) {
      return getMockResponse('DELETE', `/v1/agents/${request.id}`);
    }

    return this.agentsService.remove(request.id, request.context.organizationId);
  }

  @GrpcMethod('AgentsService', 'ListAgents')
  async listAgents(request: ListAgentsRequest) {
    this.logger.debug(`gRPC ListAgents for org: ${request.context.organizationId}`);

    if (this.isDummyMode) {
      const agents = getMockResponse('GET', '/v1/agents');
      return { agents };
    }

    const agents = await this.agentsService.findAllByOrganization(
      request.context.organizationId,
    );
    return { agents };
  }

  // ============================================
  // CONVERSATIONS
  // ============================================

  @GrpcMethod('AgentsService', 'CreateConversation')
  async createConversation(request: CreateConversationRequest) {
    this.logger.debug(`gRPC CreateConversation for agent: ${request.agentId}`);

    if (this.isDummyMode) {
      return getMockResponse('POST', '/v1/conversations', {
        agentId: request.agentId,
        title: request.title,
      });
    }

    return this.conversationsService.create(
      request.context.userId,
      request.context.organizationId,
      { agentId: request.agentId, title: request.title },
    );
  }

  @GrpcMethod('AgentsService', 'GetConversation')
  async getConversation(request: GetConversationRequest) {
    this.logger.debug(`gRPC GetConversation: ${request.id}`);

    if (this.isDummyMode) {
      return getMockResponse('GET', `/v1/conversations/${request.id}`);
    }

    return this.conversationsService.findOne(
      request.id,
      request.context.userId,
      request.context.organizationId,
    );
  }

  @GrpcMethod('AgentsService', 'ListConversations')
  async listConversations(request: ListConversationsRequest) {
    this.logger.debug(`gRPC ListConversations for user: ${request.context.userId}`);

    if (this.isDummyMode) {
      const conversations = getMockResponse('GET', '/v1/conversations');
      return { conversations };
    }

    const conversations = await this.conversationsService.findAllByUser(
      request.context.userId,
      request.context.organizationId,
    );
    return { conversations };
  }

  // ============================================
  // MESSAGES
  // ============================================

  @GrpcMethod('AgentsService', 'GetMessages')
  async getMessages(request: GetMessagesRequest) {
    this.logger.debug(`gRPC GetMessages for conversation: ${request.conversationId}`);

    if (this.isDummyMode) {
      const messages = getMockResponse(
        'GET',
        `/v1/conversations/${request.conversationId}/messages`,
      );
      return { messages, hasMore: false };
    }

    const messages = await this.conversationsService.getMessages(
      request.conversationId,
      request.context.userId,
      request.context.organizationId,
    );
    return { messages, hasMore: false };
  }

  @GrpcMethod('AgentsService', 'SendMessage')
  async sendMessage(request: SendMessageRequest) {
    this.logger.debug(`gRPC SendMessage to conversation: ${request.conversationId}`);

    if (this.isDummyMode) {
      return getMockResponse(
        'POST',
        `/v1/conversations/${request.conversationId}/messages`,
        { content: request.content },
      );
    }

    return this.conversationsService.sendMessage(
      request.conversationId,
      request.context.userId,
      request.context.organizationId,
      { content: request.content },
    );
  }

  // ============================================
  // STREAMING CHAT
  // ============================================

  @GrpcMethod('AgentsService', 'StreamChat')
  streamChat(request: ChatStreamRequest): Observable<ChatStreamResponse> {
    this.logger.debug(`gRPC StreamChat for conversation: ${request.conversationId}`);

    const subject = new Subject<ChatStreamResponse>();

    // Simulate streaming response
    (async () => {
      try {
        const messageId = `msg-${Date.now()}`;

        // Send start event
        subject.next({
          start: {
            conversationId: request.conversationId,
            messageId,
          },
        });

        if (this.isDummyMode) {
          // Mock streaming response
          const mockResponse =
            '¡Hola! Soy tu asistente de marketing. Puedo ayudarte a crear contenido para redes sociales.';
          const words = mockResponse.split(' ');

          for (const word of words) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            subject.next({
              token: { content: word + ' ' },
            });
          }

          // Send done event
          subject.next({
            done: {
              model: 'GEMINI_FLASH',
              tokensUsed: 45,
              latencyMs: words.length * 50,
              fullMessage: {
                id: messageId,
                conversationId: request.conversationId,
                role: 'assistant',
                content: mockResponse,
                createdAt: new Date().toISOString(),
              },
            },
          });
        } else {
          // TODO: Implement real LLM streaming
          subject.next({
            error: {
              code: 'NOT_IMPLEMENTED',
              message: 'Real LLM streaming not yet implemented',
            },
          });
        }

        subject.complete();
      } catch (error) {
        subject.next({
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        });
        subject.complete();
      }
    })();

    return subject.asObservable();
  }
}
