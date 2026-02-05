import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProvider, LLMOptions, LLMResponse, LLMProviderError } from './providers/llm-provider.interface';
import { GeminiProvider } from './providers/gemini.provider';

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private providers: LLMProvider[] = [];
  private primaryProvider: LLMProvider | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiProvider: GeminiProvider,
  ) {}

  onModuleInit() {
    this.providers.push(this.geminiProvider);
    this.primaryProvider = this.providers.find((p) => p.isAvailable()) || null;

    if (this.primaryProvider) {
      this.logger.log(`LLM Service initialized with primary provider: ${this.primaryProvider.name}`);
    } else {
      this.logger.error('No LLM providers available');
    }
  }

  private getProvider(preferredName?: string): LLMProvider {
    if (preferredName) {
      const preferred = this.providers.find((p) => p.name === preferredName && p.isAvailable());
      if (preferred) return preferred;
    }

    const provider = this.primaryProvider || this.providers.find((p) => p.isAvailable());
    if (!provider) {
      throw new LLMProviderError('No LLM providers available', 'llm-service', 'NO_PROVIDER', false);
    }
    return provider;
  }

  async *generateResponse(
    prompt: string,
    systemPrompt: string = '',
    options: LLMOptions = {},
  ): AsyncGenerator<string, void, unknown> {
    const provider = this.getProvider(options.model?.split('/')[0]);

    try {
      yield* provider.generateStream(prompt, systemPrompt, options);
    } catch (error) {
      if (error instanceof LLMProviderError && error.retryable) {
        const fallback = this.providers.find((p) => p.name !== provider.name && p.isAvailable());
        if (fallback) {
          this.logger.warn(`Retrying with fallback provider: ${fallback.name}`);
          yield* fallback.generateStream(prompt, systemPrompt, options);
          return;
        }
      }
      throw error;
    }
  }

  async generateResponseSync(
    prompt: string,
    systemPrompt: string = '',
    options: LLMOptions = {},
  ): Promise<LLMResponse> {
    const provider = this.getProvider(options.model?.split('/')[0]);

    try {
      return await provider.generate(prompt, systemPrompt, options);
    } catch (error) {
      if (error instanceof LLMProviderError && error.retryable) {
        const fallback = this.providers.find((p) => p.name !== provider.name && p.isAvailable());
        if (fallback) {
          this.logger.warn(`Retrying with fallback provider: ${fallback.name}`);
          return await fallback.generate(prompt, systemPrompt, options);
        }
      }
      throw error;
    }
  }

  countTokens(text: string): number {
    if (!text) return 0;
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const punctuation = (text.match(/[.,!?;:'"()\[\]{}]/g) || []).length;
    const longWords = words.filter((w) => w.length > 8).length;
    return Math.max(1, words.length + Math.ceil(longWords * 0.5) + punctuation);
  }

  getAvailableProviders(): string[] {
    return this.providers.filter((p) => p.isAvailable()).map((p) => p.name);
  }

  isAvailable(): boolean {
    return this.providers.some((p) => p.isAvailable());
  }
}
