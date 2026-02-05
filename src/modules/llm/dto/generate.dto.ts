import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max, IsArray, MaxLength, MinLength } from 'class-validator';

export class GenerateDto {
  @ApiProperty({ description: 'User prompt', minLength: 1, maxLength: 10000 })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  prompt!: string;

  @ApiPropertyOptional({ description: 'System instructions', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  systemPrompt?: string;

  @ApiPropertyOptional({ description: 'Temperature (0.0-2.0)', minimum: 0, maximum: 2, default: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ description: 'Max tokens', minimum: 1, maximum: 8192, default: 1024 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8192)
  maxTokens?: number;

  @ApiPropertyOptional({ description: 'Model to use' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Stop sequences' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stopSequences?: string[];

  @ApiPropertyOptional({ description: 'Top-p sampling', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;
}

export class GenerateResponseDto {
  @ApiProperty({ description: 'Generated content' })
  content!: string;

  @ApiProperty({ description: 'Tokens used' })
  tokensUsed!: number;

  @ApiProperty({ description: 'Model used' })
  model!: string;

  @ApiProperty({ description: 'Latency in ms' })
  latencyMs!: number;

  @ApiPropertyOptional({ description: 'Finish reason' })
  finishReason?: string;
}
