/**
 * LLM Provider Interface
 */

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  stopSequences?: string[];
  topP?: number;
}

export interface LLMResponse {
  content: string;
  tokensUsed: number;
  model: string;
  latencyMs: number;
  finishReason?: string;
}

export class LLMProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'LLMProviderError';
  }
}

export interface LLMProvider {
  readonly name: string;
  isAvailable(): boolean;
  generateStream(
    prompt: string,
    systemPrompt: string,
    options?: LLMOptions,
  ): AsyncGenerator<string, void, unknown>;
  generate(
    prompt: string,
    systemPrompt: string,
    options?: LLMOptions,
  ): Promise<LLMResponse>;
}

export const DEFAULT_LLM_OPTIONS: Required<
  Pick<LLMOptions, 'temperature' | 'maxTokens'>
> = {
  temperature: 0.7,
  maxTokens: 1024,
};
