import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmService } from './llm.service';
import { GeminiProvider } from './providers/gemini.provider';

@Module({
  imports: [ConfigModule],
  providers: [GeminiProvider, LlmService],
  exports: [LlmService],
})
export class LlmModule {}
