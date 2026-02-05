import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  GenerationConfig,
  HarmBlockThreshold,
  HarmCategory,
} from '@google/generative-ai';
import {
  LLMProvider,
  LLMOptions,
  LLMResponse,
  LLMProviderError,
  DEFAULT_LLM_OPTIONS,
} from './llm-provider.interface';

@Injectable()
export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private client: GoogleGenerativeAI | null = null;
  private readonly apiKey: string | undefined;
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');
    this.defaultModel = this.configService.get<string>(
      'GOOGLE_AI_MODEL',
      'gemini-1.5-flash',
    );

    if (this.apiKey) {
      this.client = new GoogleGenerativeAI(this.apiKey);
      this.logger.log(`Gemini provider initialized with model: ${this.defaultModel}`);
    } else {
      this.logger.warn('GOOGLE_AI_API_KEY not configured - Gemini provider unavailable');
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  private getModel(options?: LLMOptions): GenerativeModel {
    if (!this.client) {
      throw new LLMProviderError(
        'Gemini client not initialized - missing API key',
        this.name,
        'NOT_CONFIGURED',
        false,
      );
    }

    const modelName = options?.model || this.defaultModel;
    const generationConfig: GenerationConfig = {
      temperature: options?.temperature ?? DEFAULT_LLM_OPTIONS.temperature,
      maxOutputTokens: options?.maxTokens ?? DEFAULT_LLM_OPTIONS.maxTokens,
      topP: options?.topP,
      stopSequences: options?.stopSequences,
    };

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ];

    return this.client.getGenerativeModel({ model: modelName, generationConfig, safetySettings });
  }

  async *generateStream(
    prompt: string,
    systemPrompt: string,
    options?: LLMOptions,
  ): AsyncGenerator<string, void, unknown> {
    const model = this.getModel(options);

    try {
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser: ${prompt}` : prompt;
      const result = await model.generateContentStream(fullPrompt);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      this.handleError(error, 'generateStream');
    }
  }

  async generate(
    prompt: string,
    systemPrompt: string,
    options?: LLMOptions,
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    const modelName = options?.model || this.defaultModel;
    const model = this.getModel(options);

    try {
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser: ${prompt}` : prompt;
      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const text = response.text();
      const latencyMs = Date.now() - startTime;

      const usageMetadata = response.usageMetadata;
      const tokensUsed = (usageMetadata?.promptTokenCount || 0) + (usageMetadata?.candidatesTokenCount || 0);
      const finishReason = response.candidates?.[0]?.finishReason?.toString() || 'STOP';

      return { content: text, tokensUsed, model: modelName, latencyMs, finishReason };
    } catch (error) {
      this.handleError(error, 'generate');
    }
  }

  private handleError(error: unknown, operation: string): never {
    if (error instanceof LLMProviderError) throw error;

    if (error instanceof Error) {
      const message = error.message || 'Unknown error';

      if (message.includes('429') || message.toLowerCase().includes('rate limit')) {
        throw new LLMProviderError('Rate limit exceeded', this.name, 'RATE_LIMITED', true);
      }
      if (message.includes('403') || message.toLowerCase().includes('quota')) {
        throw new LLMProviderError('API quota exceeded', this.name, 'QUOTA_EXCEEDED', false);
      }
      if (message.includes('401') || message.toLowerCase().includes('api key')) {
        throw new LLMProviderError('Invalid API key', this.name, 'INVALID_KEY', false);
      }
      if (message.toLowerCase().includes('safety') || message.toLowerCase().includes('blocked')) {
        throw new LLMProviderError('Content was blocked by safety filters', this.name, 'CONTENT_BLOCKED', false);
      }
      if (message.toLowerCase().includes('timeout') || message.toLowerCase().includes('network')) {
        throw new LLMProviderError('Network error - please try again', this.name, 'NETWORK_ERROR', true);
      }

      this.logger.error(`Error during ${operation}: ${message}`, error.stack);
      throw new LLMProviderError(`Gemini API error: ${message}`, this.name, 'API_ERROR', false);
    }

    throw new LLMProviderError('An unexpected error occurred', this.name, 'UNKNOWN', false);
  }
}
