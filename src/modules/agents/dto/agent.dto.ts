import {
  IsString,
  IsOptional,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateAgentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['professional', 'friendly', 'casual', 'formal'])
  personality?: string;

  @IsOptional()
  @IsString()
  @IsIn(['friendly', 'neutral', 'enthusiastic', 'empathetic'])
  tone?: string;

  @IsOptional()
  @IsString()
  @IsIn(['es', 'en', 'pt'])
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  systemPrompt?: string;
}

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['professional', 'friendly', 'casual', 'formal'])
  personality?: string;

  @IsOptional()
  @IsString()
  @IsIn(['friendly', 'neutral', 'enthusiastic', 'empathetic'])
  tone?: string;

  @IsOptional()
  @IsString()
  @IsIn(['es', 'en', 'pt'])
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  systemPrompt?: string;
}
