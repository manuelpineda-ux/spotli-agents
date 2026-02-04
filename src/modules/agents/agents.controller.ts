import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AgentsService } from './agents.service';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';

@Controller('agents')
@UseGuards(InternalAuthGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  create(@Req() req: Request, @Body() createAgentDto: CreateAgentDto) {
    const { organizationId } = req.internalAuth!;
    return this.agentsService.create(organizationId, createAgentDto);
  }

  @Get()
  findAll(@Req() req: Request) {
    const { organizationId } = req.internalAuth!;
    return this.agentsService.findAllByOrganization(organizationId);
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    const { organizationId } = req.internalAuth!;
    return this.agentsService.findOne(id, organizationId);
  }

  @Put(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
  ) {
    const { organizationId } = req.internalAuth!;
    return this.agentsService.update(id, organizationId, updateAgentDto);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    const { organizationId } = req.internalAuth!;
    return this.agentsService.remove(id, organizationId);
  }
}
