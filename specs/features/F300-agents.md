# F300: Agentes IA

## Resumen
Sistema de agentes de IA conversacionales que asisten a los usuarios en la creación de contenido y gestión de marketing en redes sociales.

## Objetivo
Permitir a cada organización configurar un agente de IA personalizado que entienda su negocio, tono de voz, y genere contenido alineado con su marca.

## Arquitectura

> **Ver ADRs relacionados:**
> - [ADR-001: Multi-tenant Strategy](../architecture/adr/ADR-001-multi-tenant-strategy.md)
> - [ADR-002: Inter-service Authentication](../architecture/adr/ADR-002-inter-service-authentication.md)
> - [ADR-003: Agents Microservice](../architecture/adr/ADR-003-agents-microservice.md)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│   Agents    │
│  (Next.js)  │     │  (NestJS)   │     │  Service    │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                          ┌───────────────────┼───────────────────┐
                          ▼                   ▼                   ▼
                    ┌──────────┐       ┌──────────┐       ┌──────────┐
                    │  Gemini  │       │   GPT    │       │  Claude  │
                    │Flash-Lite│       │  5-mini  │       │ Haiku4.5 │
                    └──────────┘       └──────────┘       └──────────┘
```

## Repositorio

**Repo separado:** `github.com/[org]/spotli-agents`

Ver sección [Setup del Repositorio](#setup-del-repositorio) al final.

---

## Modelo de Datos

### Agent
```prisma
model Agent {
  id             String   @id @default(uuid())
  organizationId String
  name           String
  description    String?

  // Configuración de personalidad
  tone           AgentTone @default(FRIENDLY)
  language       String    @default("es")
  personality    Json?     // Configuración avanzada

  // Prompts
  systemPrompt   String?   // Prompt base del agente
  contextPrompt  String?   // Contexto del negocio

  // LLM Configuration
  primaryModel   LLMModel  @default(GEMINI_FLASH)
  fallbackModel  LLMModel?
  temperature    Float     @default(0.7)
  maxTokens      Int       @default(1000)

  // Estado
  status         AgentStatus @default(ACTIVE)

  // Relaciones
  organization   Organization @relation(fields: [organizationId], references: [id])
  conversations  Conversation[]

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId])
}

enum AgentTone {
  PROFESSIONAL
  FRIENDLY
  CASUAL
}

enum AgentStatus {
  ACTIVE
  INACTIVE
  ARCHIVED
}

enum LLMModel {
  GEMINI_FLASH      // Tier 1: Rápido, económico
  GPT_5_MINI        // Tier 2: Balance
  CLAUDE_HAIKU      // Tier 3: Calidad
}
```

### Conversation
```prisma
model Conversation {
  id             String   @id @default(uuid())
  agentId        String
  organizationId String
  title          String?

  // Metadata
  messageCount   Int      @default(0)
  tokenCount     Int      @default(0)

  // Estado
  status         ConversationStatus @default(ACTIVE)

  // Relaciones
  agent          Agent    @relation(fields: [agentId], references: [id])
  messages       Message[]

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([agentId])
  @@index([organizationId])
}

enum ConversationStatus {
  ACTIVE
  ARCHIVED
}
```

### Message
```prisma
model Message {
  id             String   @id @default(uuid())
  conversationId String

  role           MessageRole
  content        String

  // Metadata de LLM
  model          LLMModel?
  tokensUsed     Int?
  latencyMs      Int?

  // Para mensajes del asistente
  contentType    ContentType?
  generatedContent Json?   // Contenido estructurado generado

  conversation   Conversation @relation(fields: [conversationId], references: [id])

  createdAt      DateTime @default(now())

  @@index([conversationId])
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}

enum ContentType {
  TEXT
  POST_INSTAGRAM
  POST_FACEBOOK
  VIDEO_TIKTOK
  CAMPAIGN_IDEA
  HASHTAGS
}
```

---

## API Contract

### Base URL
- **Desarrollo:** `http://localhost:3002`
- **Staging:** `http://agents:3002` (interno Docker)

### Headers Requeridos
```
X-API-Key: {INTERNAL_API_KEY}
X-User-Id: {userId}
X-Org-Id: {organizationId}
Content-Type: application/json
```

### Endpoints

#### Agents

##### POST /agents
Crear un nuevo agente.

```json
// Request
{
  "name": "Asistente de Marketing",
  "description": "Agente para crear contenido de redes sociales",
  "tone": "FRIENDLY",
  "language": "es",
  "systemPrompt": "Eres un experto en marketing digital...",
  "primaryModel": "GEMINI_FLASH"
}

// Response 201
{
  "id": "uuid",
  "organizationId": "uuid",
  "name": "Asistente de Marketing",
  "tone": "FRIENDLY",
  "language": "es",
  "status": "ACTIVE",
  "createdAt": "2026-02-04T..."
}
```

##### GET /agents
Listar agentes de la organización.

```json
// Response 200
{
  "agents": [
    {
      "id": "uuid",
      "name": "Asistente de Marketing",
      "tone": "FRIENDLY",
      "status": "ACTIVE",
      "conversationCount": 15,
      "createdAt": "2026-02-04T..."
    }
  ],
  "total": 1
}
```

##### GET /agents/:id
Obtener detalle de un agente.

```json
// Response 200
{
  "id": "uuid",
  "name": "Asistente de Marketing",
  "description": "...",
  "tone": "FRIENDLY",
  "language": "es",
  "systemPrompt": "...",
  "contextPrompt": "...",
  "primaryModel": "GEMINI_FLASH",
  "temperature": 0.7,
  "status": "ACTIVE",
  "stats": {
    "totalConversations": 15,
    "totalMessages": 234,
    "totalTokens": 45000
  }
}
```

##### PATCH /agents/:id
Actualizar agente.

```json
// Request
{
  "name": "Nuevo nombre",
  "tone": "PROFESSIONAL",
  "systemPrompt": "Nuevo prompt..."
}

// Response 200
{ ...agent actualizado }
```

##### DELETE /agents/:id
Archivar agente (soft delete).

```json
// Response 200
{ "message": "Agent archived successfully" }
```

---

#### Conversations

##### POST /agents/:agentId/conversations
Crear nueva conversación.

```json
// Request
{
  "title": "Campaña de verano"  // opcional
}

// Response 201
{
  "id": "uuid",
  "agentId": "uuid",
  "title": "Campaña de verano",
  "status": "ACTIVE",
  "createdAt": "2026-02-04T..."
}
```

##### GET /agents/:agentId/conversations
Listar conversaciones.

```json
// Response 200
{
  "conversations": [
    {
      "id": "uuid",
      "title": "Campaña de verano",
      "messageCount": 12,
      "status": "ACTIVE",
      "updatedAt": "2026-02-04T..."
    }
  ],
  "total": 5
}
```

##### GET /conversations/:id
Obtener conversación con mensajes recientes.

```json
// Response 200
{
  "id": "uuid",
  "title": "Campaña de verano",
  "agent": {
    "id": "uuid",
    "name": "Asistente de Marketing"
  },
  "messages": [
    {
      "id": "uuid",
      "role": "USER",
      "content": "Necesito ideas para posts de verano",
      "createdAt": "..."
    },
    {
      "id": "uuid",
      "role": "ASSISTANT",
      "content": "¡Claro! Aquí tienes 5 ideas...",
      "contentType": "POST_INSTAGRAM",
      "generatedContent": { ... },
      "createdAt": "..."
    }
  ]
}
```

---

#### Chat (Streaming)

##### POST /agents/:agentId/chat
Enviar mensaje y recibir respuesta (streaming).

```json
// Request
{
  "conversationId": "uuid",  // opcional, crea nueva si no existe
  "message": "Genera 3 ideas de posts para Instagram sobre café",
  "contentType": "POST_INSTAGRAM"  // opcional, hint para el tipo de contenido
}
```

```
// Response: Server-Sent Events (SSE)
event: start
data: {"conversationId": "uuid", "messageId": "uuid"}

event: token
data: {"content": "¡"}

event: token
data: {"content": "Claro"}

event: token
data: {"content": "!"}

... más tokens ...

event: done
data: {"tokensUsed": 150, "model": "GEMINI_FLASH", "latencyMs": 1234}
```

##### GET /conversations/:id/messages
Obtener historial completo de mensajes.

```json
// Query params: ?limit=50&before=messageId

// Response 200
{
  "messages": [...],
  "hasMore": true,
  "nextCursor": "messageId"
}
```

---

## Integración LLM Multi-tier

### Estrategia de Selección

```typescript
// Tier 1: Gemini Flash-Lite (default)
// - Uso: Respuestas rápidas, alto volumen
// - Costo: ~$0.0001/1K tokens

// Tier 2: GPT-5-mini
// - Uso: Contenido que requiere más creatividad
// - Costo: ~$0.0005/1K tokens

// Tier 3: Claude Haiku 4.5
// - Uso: Contenido premium, análisis complejo
// - Costo: ~$0.001/1K tokens
```

### Fallback Automático

```typescript
async function generateResponse(prompt: string, config: AgentConfig) {
  try {
    return await callLLM(config.primaryModel, prompt);
  } catch (error) {
    if (config.fallbackModel) {
      return await callLLM(config.fallbackModel, prompt);
    }
    throw error;
  }
}
```

### Rate Limiting

- Por organización: 100 requests/minuto
- Por usuario: 20 requests/minuto
- Burst: 10 requests simultáneos

---

## Acceptance Criteria

### MVP (F300)

- [ ] CRUD completo de agentes
- [ ] Crear y listar conversaciones
- [ ] Chat con streaming (SSE)
- [ ] Integración con al menos 1 LLM (Gemini)
- [ ] Historial de mensajes persistente
- [ ] Rate limiting básico

### Post-MVP

- [ ] Multi-LLM con fallback
- [ ] Generación de contenido estructurado
- [ ] Templates de prompts
- [ ] Analytics de uso por agente
- [ ] Fine-tuning de prompts por industria

---

## Setup del Repositorio

### Estructura spotli-agents

```
spotli-agents/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   │   └── configuration.ts
│   ├── common/
│   │   ├── guards/
│   │   │   └── internal-auth.guard.ts
│   │   ├── interceptors/
│   │   └── filters/
│   ├── agents/
│   │   ├── agents.module.ts
│   │   ├── agents.controller.ts
│   │   ├── agents.service.ts
│   │   └── dto/
│   ├── conversations/
│   │   ├── conversations.module.ts
│   │   ├── conversations.controller.ts
│   │   └── conversations.service.ts
│   ├── chat/
│   │   ├── chat.module.ts
│   │   ├── chat.controller.ts
│   │   ├── chat.service.ts
│   │   └── chat.gateway.ts  // SSE
│   ├── llm/
│   │   ├── llm.module.ts
│   │   ├── llm.service.ts
│   │   ├── providers/
│   │   │   ├── gemini.provider.ts
│   │   │   ├── openai.provider.ts
│   │   │   └── anthropic.provider.ts
│   │   └── interfaces/
│   └── prisma/
│       └── prisma.service.ts
├── prisma/
│   └── schema.prisma
├── test/
├── Dockerfile
├── docker-compose.yml      # Para desarrollo standalone
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

### Variables de Entorno

```bash
# .env.example
NODE_ENV=development
PORT=3002

# Database (misma que spotli-mvp)
DATABASE_URL=postgresql://user:pass@localhost:5432/spotli

# Redis
REDIS_URL=redis://localhost:6379

# Internal Auth
INTERNAL_API_KEY=your-internal-api-key

# LLM Providers
GOOGLE_AI_API_KEY=your-google-ai-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Rate Limiting
RATE_LIMIT_ORG_PER_MIN=100
RATE_LIMIT_USER_PER_MIN=20
```

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

EXPOSE 3002

CMD ["node", "dist/main.js"]
```

---

## Integración con spotli-mvp

### Actualizar docker-compose.staging.yml

```yaml
services:
  # ... servicios existentes ...

  agents:
    image: ghcr.io/[org]/spotli-agents:${AGENTS_VERSION:-latest}
    environment:
      NODE_ENV: staging
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: redis://redis:6379
      INTERNAL_API_KEY: ${INTERNAL_API_KEY}
      GOOGLE_AI_API_KEY: ${GOOGLE_AI_API_KEY}
    networks:
      - internal
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
```

### Cliente en Backend

```typescript
// apps/backend/src/modules/agents-client/agents-client.service.ts
@Injectable()
export class AgentsClientService {
  constructor(private readonly httpService: HttpService) {}

  private getHeaders(userId: string, orgId: string) {
    return {
      'X-API-Key': process.env.INTERNAL_API_KEY,
      'X-User-Id': userId,
      'X-Org-Id': orgId,
      'Content-Type': 'application/json',
    };
  }

  async createAgent(userId: string, orgId: string, data: CreateAgentDto) {
    const response = await this.httpService.axiosRef.post(
      `${process.env.AGENTS_SERVICE_URL}/agents`,
      data,
      { headers: this.getHeaders(userId, orgId) }
    );
    return response.data;
  }

  // ... más métodos
}
```

---

## Referencias

- [ADR-001: Multi-tenant Strategy](../architecture/adr/ADR-001-multi-tenant-strategy.md)
- [ADR-002: Inter-service Authentication](../architecture/adr/ADR-002-inter-service-authentication.md)
- [ADR-003: Agents Microservice](../architecture/adr/ADR-003-agents-microservice.md)
- [Google AI (Gemini) Documentation](https://ai.google.dev/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Anthropic API Reference](https://docs.anthropic.com/)
