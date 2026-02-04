import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateAgentDto) {
    return this.prisma.agent.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        personality: dto.personality,
        tone: dto.tone,
        language: dto.language,
        systemPrompt: dto.systemPrompt,
      },
    });
  }

  async findAllByOrganization(organizationId: string) {
    return this.prisma.agent.findMany({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const agent = await this.prisma.agent.findFirst({
      where: { id, organizationId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return agent;
  }

  async update(id: string, organizationId: string, dto: UpdateAgentDto) {
    await this.findOne(id, organizationId); // Ensure agent exists and belongs to org

    return this.prisma.agent.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId); // Ensure agent exists and belongs to org

    return this.prisma.agent.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
