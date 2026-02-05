# CLAUDE.md - Spotli Agents Service

## Proyecto
Microservicio de agentes IA conversacionales para Spotli.ai.
Maneja configuración de agentes, conversaciones, y generación de contenido con LLMs.

**Repositorio principal**: `github.com/manuelpineda-ux/spotli-mvp` (referencia para specs)

## Arquitectura

```
                    ┌────────────────────────────────────────┐
                    │           spotli-agents                 │
                    │                                        │
   gRPC :50051 ─────┤  ┌──────────────────────────────────┐  │
                    │  │        GrpcController             │  │
                    │  │  - Agent CRUD                     │  │
                    │  │  - Conversations                  │  │
                    │  │  - StreamChat (server streaming)  │  │
                    │  └──────────────┬───────────────────┘  │
                    │                 │                      │
   HTTP :3002 ──────┤  ┌──────────────┴───────────────────┐  │
   (health only)    │  │      ConversationsService         │  │
                    │  │  - Message persistence            │  │
                    │  │  - Context management             │  │
                    │  └──────────────┬───────────────────┘  │
                    │                 │                      │
                    │  ┌──────────────┴───────────────────┐  │
                    │  │          LlmService               │  │
                    │  │  - Gemini Provider (primary)      │  │
                    │  │  - Fallback support               │  │
                    │  │  - Streaming generation           │  │
                    │  └──────────────────────────────────┘  │
                    │                                        │
                    │          ┌──────────┐                  │
                    │          │  Prisma  │ ──> PostgreSQL   │
                    │          └──────────┘                  │
                    └────────────────────────────────────────┘
```

## Stack Tecnológico
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: NestJS
- **Communication**: gRPC + HTTP (health)
- **Database**: PostgreSQL 16 (compartida con spotli-mvp)
- **ORM**: Prisma
- **Cache**: Redis 7
- **LLM**: Google Gemini (primary), con arquitectura para fallback

## Estructura del Proyecto
```
spotli-agents/
├── src/
│   ├── main.ts              # Bootstrap HTTP + gRPC
│   ├── app.module.ts
│   ├── common/
│   │   ├── guards/          # InternalAuthGuard
│   │   ├── interceptors/    # DummyModeInterceptor
│   │   ├── mocks/           # Mock data for development
│   │   └── prisma/          # PrismaService
│   └── modules/
│       ├── agents/          # Agent CRUD
│       ├── conversations/   # Chat, messages, streaming
│       ├── grpc/            # gRPC controller
│       ├── health/          # Health checks
│       └── llm/             # LLM providers (Gemini)
├── proto/
│   └── agents.proto         # gRPC service definition
├── prisma/
│   └── schema.prisma        # Database models
└── Dockerfile
```

## Módulos

### agents/
- CRUD de agentes (HTTP + gRPC)
- Validación de personalidad, tono, idioma
- Soft delete (isActive flag)

### conversations/
- Crear/listar conversaciones
- Persistir mensajes
- Streaming de respuestas LLM
- Construcción de contexto para LLM

### llm/
- **GeminiProvider**: Integración con Google Generative AI
- **LlmService**: Orquestación de providers con fallback
- Soporte para streaming y generación síncrona
- Manejo de errores y retry

### grpc/
- Mapea métodos gRPC a servicios internos
- Server streaming para `StreamChat`
- Dummy mode para desarrollo paralelo

## gRPC API

### Proto File: `proto/agents.proto`

```protobuf
service AgentsService {
  // Agents
  rpc CreateAgent(CreateAgentRequest) returns (Agent);
  rpc GetAgent(GetAgentRequest) returns (Agent);
  rpc UpdateAgent(UpdateAgentRequest) returns (Agent);
  rpc DeleteAgent(DeleteAgentRequest) returns (Agent);
  rpc ListAgents(ListAgentsRequest) returns (ListAgentsResponse);

  // Conversations
  rpc CreateConversation(CreateConversationRequest) returns (Conversation);
  rpc GetConversation(GetConversationRequest) returns (Conversation);
  rpc ListConversations(ListConversationsRequest) returns (ListConversationsResponse);

  // Messages
  rpc GetMessages(GetMessagesRequest) returns (GetMessagesResponse);
  rpc SendMessage(SendMessageRequest) returns (SendMessageResponse);

  // Streaming Chat (Server streaming)
  rpc StreamChat(ChatStreamRequest) returns (stream ChatStreamResponse);
}
```

### RequestContext
Todas las requests incluyen un `RequestContext`:
```protobuf
message RequestContext {
  string user_id = 1;
  string organization_id = 2;
}
```

### Stream Events
```protobuf
message ChatStreamResponse {
  oneof event {
    ChatStreamStart start = 1;   // {conversationId, messageId}
    ChatStreamToken token = 2;   // {content: string}
    ChatStreamDone done = 3;     // {model, tokens_used, latency_ms}
    ChatStreamError error = 4;   // {code, message}
  }
}
```

## Convenciones de Código

### General
- TypeScript estricto (`strict: true`)
- ESLint + Prettier
- Commits en inglés, formato Conventional Commits
- Branches: `main`, `develop`, `feature/*`, `fix/*`

### NestJS
- Un módulo por feature
- DTOs con class-validator
- Prisma para queries, no raw SQL
- Servicios inyectables, controllers delgados
- Tests con Jest

### Nombres
- Archivos: kebab-case (`agent-service.ts`)
- Clases/Types: PascalCase (`AgentService`)
- Variables/funciones: camelCase (`getAgentById`)
- Constantes: UPPER_SNAKE_CASE (`MAX_TOKENS`)

## Comandos Útiles

```bash
# Desarrollo
pnpm install              # Instalar dependencias
pnpm dev                  # Iniciar con hot-reload (HTTP + gRPC)
pnpm build                # Build de producción
pnpm start:prod           # Ejecutar build

# Database
pnpm db:generate          # Generar cliente Prisma
pnpm db:migrate           # Crear/aplicar migraciones
pnpm db:studio            # Abrir Prisma Studio

# Testing
pnpm test                 # Unit tests
pnpm test:e2e             # E2E tests
pnpm lint                 # Lint del código
```

## Variables de Entorno

```bash
# Server
PORT=3002                              # HTTP port
GRPC_PORT=50051                        # gRPC port

# Database
DATABASE_URL=postgresql://spotli:password@localhost:5432/spotli

# Redis (opcional)
REDIS_URL=redis://localhost:6379

# LLM Providers
GOOGLE_AI_API_KEY=your-google-ai-key   # Required
GOOGLE_AI_MODEL=gemini-1.5-flash       # Default model
# OPENAI_API_KEY=sk-xxx                # Fallback (future)
# ANTHROPIC_API_KEY=sk-ant-xxx         # Fallback (future)

# Development
DUMMY_MODE=false                       # Return mock data if true
```

## Desarrollo Local

### Con spotli-mvp
```bash
# Terminal 1: spotli-agents
cd /path/to/spotli-agents
GOOGLE_AI_API_KEY=your-key pnpm dev

# Terminal 2: spotli-mvp
cd /path/to/spotli-mvp
AGENTS_GRPC_URL=localhost:50051 pnpm dev
```

### Modo Dummy (sin LLM)
```bash
DUMMY_MODE=true pnpm dev
```
En este modo, todas las respuestas son mock data predefinida.
Útil para desarrollo paralelo cuando no se tiene API key.

## Puertos
| Protocolo | Puerto | Uso |
|-----------|--------|-----|
| HTTP      | 3002   | Health checks, HTTP API (legacy) |
| gRPC      | 50051  | Service-to-service communication |

## Límites y Consideraciones
- Servidor staging compartido: optimizar para memoria
- Rate limiting: 100 req/min por org, 20 req/min por usuario
- LLM costs: usar Gemini Flash por defecto (más económico ~$0.0001/1K tokens)
- gRPC es preferido sobre HTTP para comunicación con backend

## Referencias
- Spec principal: `specs/features/F300-agents.md`
- ADR de microservicio: Ver spotli-mvp `specs/architecture/adr/ADR-003-agents-microservice.md`
- Proto file: `proto/agents.proto`
- Google Gemini: https://ai.google.dev/docs
