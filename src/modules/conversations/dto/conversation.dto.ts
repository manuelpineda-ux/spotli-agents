import { IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  agentId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;
}
