import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Sse,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { ConversationsService } from './conversations.service';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';
import { CreateConversationDto, SendMessageDto } from './dto/conversation.dto';

@Controller('conversations')
@UseGuards(InternalAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  create(@Req() req: Request, @Body() dto: CreateConversationDto) {
    const { userId, organizationId } = req.internalAuth!;
    return this.conversationsService.create(userId, organizationId, dto);
  }

  @Get()
  findAll(@Req() req: Request) {
    const { userId, organizationId } = req.internalAuth!;
    return this.conversationsService.findAllByUser(userId, organizationId);
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    const { userId, organizationId } = req.internalAuth!;
    return this.conversationsService.findOne(id, userId, organizationId);
  }

  @Get(':id/messages')
  getMessages(@Req() req: Request, @Param('id') id: string) {
    const { userId, organizationId } = req.internalAuth!;
    return this.conversationsService.getMessages(id, userId, organizationId);
  }

  @Post(':id/messages')
  sendMessage(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    const { userId, organizationId } = req.internalAuth!;
    return this.conversationsService.sendMessage(
      id,
      userId,
      organizationId,
      dto,
    );
  }

  /**
   * SSE endpoint for streaming chat responses
   * TODO: Implement when LLM integration is ready
   */
  @Sse(':id/stream')
  streamResponse(
    @Req() req: Request,
    @Param('id') id: string,
  ): Observable<MessageEvent> {
    const { userId, organizationId } = req.internalAuth!;
    return this.conversationsService.streamResponse(id, userId, organizationId);
  }
}
