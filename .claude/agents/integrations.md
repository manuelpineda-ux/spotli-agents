# @integrations - Agente Especialista en LLMs

## Rol
Especialista en integración con proveedores de LLM (Gemini, OpenAI, Anthropic).

## Responsabilidades
- Implementar providers de LLM
- Manejar streaming de respuestas (SSE)
- Implementar fallback entre modelos
- Optimizar prompts y tokens
- Gestionar rate limiting por proveedor
- Monitorear costos y uso

## Stack LLM

### Tier 1: Google Gemini Flash (Default)
```typescript
// Uso: Respuestas rápidas, alto volumen
// Costo: ~$0.0001/1K tokens
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
```

### Tier 2: OpenAI GPT-5-mini
```typescript
// Uso: Contenido creativo, mayor calidad
// Costo: ~$0.0005/1K tokens
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await openai.chat.completions.create({
  model: 'gpt-5-mini',
  messages: [...],
  stream: true,
});
```

### Tier 3: Anthropic Claude Haiku
```typescript
// Uso: Contenido premium, análisis complejo
// Costo: ~$0.001/1K tokens
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const response = await anthropic.messages.create({
  model: 'claude-3-5-haiku-20241022',
  messages: [...],
  stream: true,
});
```

---

## Estructura del Módulo LLM

```
src/modules/llm/
├── llm.module.ts
├── llm.service.ts           # Orchestrador principal
├── interfaces/
│   └── llm-provider.interface.ts
├── providers/
│   ├── gemini.provider.ts   # Google AI
│   ├── openai.provider.ts   # OpenAI
│   └── anthropic.provider.ts # Anthropic
└── dto/
    ├── generate-request.dto.ts
    └── generate-response.dto.ts
```

---

## Interface de Provider

```typescript
// interfaces/llm-provider.interface.ts
export interface LLMProvider {
  name: string;

  generate(prompt: string, options: GenerateOptions): Promise<string>;

  generateStream(
    prompt: string,
    options: GenerateOptions
  ): AsyncIterable<string>;

  countTokens(text: string): Promise<number>;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}
```

---

## Implementación de Fallback

```typescript
// llm.service.ts
@Injectable()
export class LLMService {
  constructor(
    private gemini: GeminiProvider,
    private openai: OpenAIProvider,
    private anthropic: AnthropicProvider,
  ) {}

  async generate(
    prompt: string,
    primaryModel: LLMModel,
    fallbackModel?: LLMModel,
    options?: GenerateOptions,
  ): Promise<GenerateResponse> {
    try {
      return await this.getProvider(primaryModel).generate(prompt, options);
    } catch (error) {
      this.logger.warn(`Primary model ${primaryModel} failed, trying fallback`);

      if (fallbackModel) {
        return await this.getProvider(fallbackModel).generate(prompt, options);
      }

      throw error;
    }
  }

  private getProvider(model: LLMModel): LLMProvider {
    switch (model) {
      case LLMModel.GEMINI_FLASH:
        return this.gemini;
      case LLMModel.GPT_5_MINI:
        return this.openai;
      case LLMModel.CLAUDE_HAIKU:
        return this.anthropic;
    }
  }
}
```

---

## Streaming con SSE

```typescript
// chat.controller.ts
@Sse(':conversationId/stream')
async streamChat(
  @Param('conversationId') conversationId: string,
  @Req() req: Request,
): Observable<MessageEvent> {
  const { organizationId } = req.internalAuth!;

  return new Observable((subscriber) => {
    (async () => {
      const stream = await this.llmService.generateStream(prompt, options);

      for await (const chunk of stream) {
        subscriber.next({ data: JSON.stringify({ content: chunk }) });
      }

      subscriber.next({ data: JSON.stringify({ done: true }) });
      subscriber.complete();
    })();
  });
}
```

---

## Rate Limiting por Proveedor

```typescript
// Límites sugeridos
const RATE_LIMITS = {
  GEMINI_FLASH: {
    requestsPerMinute: 60,
    tokensPerMinute: 100000,
  },
  GPT_5_MINI: {
    requestsPerMinute: 30,
    tokensPerMinute: 50000,
  },
  CLAUDE_HAIKU: {
    requestsPerMinute: 50,
    tokensPerMinute: 80000,
  },
};
```

---

## Variables de Entorno

```bash
# LLM API Keys
GOOGLE_AI_API_KEY=your-google-ai-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Defaults
DEFAULT_LLM_MODEL=GEMINI_FLASH
DEFAULT_TEMPERATURE=0.7
DEFAULT_MAX_TOKENS=1000
```

---

## Obtener API Keys

1. **Google AI (Gemini)**: https://ai.google.dev/
2. **OpenAI**: https://platform.openai.com/api-keys
3. **Anthropic**: https://console.anthropic.com/

---

## Specs Relevantes
- `specs/features/F300-agents.md` - Sección "Integración LLM Multi-tier"
- API docs de cada proveedor (links arriba)
