# Spotli Agents Service

Microservicio de agentes conversacionales para Spotli.ai.

## Descripción

Este servicio maneja:
- Configuración y gestión de agentes IA
- Conversaciones y mensajes
- Integración con LLMs (Gemini, GPT, Claude)
- Streaming de respuestas via gRPC y SSE

## Stack Tecnológico

- **Runtime**: Node.js 20
- **Framework**: NestJS
- **Database**: PostgreSQL (compartida con spotli-mvp)
- **ORM**: Prisma
- **Comunicación**: HTTP/REST + gRPC
- **Language**: TypeScript

## Puertos

| Protocolo | Puerto | Uso |
|-----------|--------|-----|
| HTTP | 3002 | REST API, health checks |
| gRPC | 50051 | Comunicación interna optimizada |

---

## Quick Start

```bash
# 1. Clonar e instalar
git clone git@github.com:manuelpineda-ux/spotli-agents.git
cd spotli-agents
pnpm install

# 2. Configurar
cp .env.example .env
# Editar .env: agregar INTERNAL_API_KEY (pedir al equipo)

# 3. Iniciar (modo dummy para desarrollo)
DUMMY_MODE=true pnpm start:dev

# 4. Verificar HTTP
curl http://localhost:3002/v1/health

# 5. Verificar gRPC
node scripts/test-grpc.js
```

### Checklist de Setup

- [ ] Clonar repositorio
- [ ] `pnpm install`
- [ ] Configurar `.env` con `INTERNAL_API_KEY`
- [ ] Probar con `DUMMY_MODE=true pnpm start:dev`
- [ ] Verificar HTTP: `curl http://localhost:3002/v1/health`
- [ ] Verificar gRPC: `node scripts/test-grpc.js`
- [ ] Leer spec: `specs/features/F300-agents.md`
- [ ] Leer onboarding: `docs/onboarding-agents-developer.md`

---

## Dummy Mode (Desarrollo Paralelo)

El servicio soporta un modo "dummy" que retorna respuestas mock predefinidas. Esto permite que el equipo de spotli-mvp integre con la API mientras la implementación real está en progreso.

### Activar

```bash
# En .env
DUMMY_MODE=true
```

### Comportamiento

- ✅ Todos los endpoints HTTP retornan datos mock
- ✅ Todos los métodos gRPC retornan datos mock
- ✅ Streaming simula respuesta token por token
- ✅ No requiere conexión a base de datos
- ✅ No requiere API keys de LLM

### Desactivar

```bash
# En .env (cuando la implementación esté lista)
DUMMY_MODE=false
```

---

## API HTTP

### Autenticación

Todas las rutas (excepto `/health`) requieren headers:

```
X-API-Key: <INTERNAL_API_KEY>
X-User-Id: <user_id>
X-Org-Id: <organization_id>
```

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/v1/health` | Health check |
| POST | `/v1/agents` | Crear agente |
| GET | `/v1/agents` | Listar agentes |
| GET | `/v1/agents/:id` | Obtener agente |
| PUT | `/v1/agents/:id` | Actualizar agente |
| DELETE | `/v1/agents/:id` | Eliminar agente |
| POST | `/v1/conversations` | Crear conversación |
| GET | `/v1/conversations` | Listar conversaciones |
| GET | `/v1/conversations/:id` | Obtener conversación |
| GET | `/v1/conversations/:id/messages` | Obtener mensajes |
| POST | `/v1/conversations/:id/messages` | Enviar mensaje |

### Ejemplo HTTP

```bash
curl http://localhost:3002/v1/agents \
  -H "X-API-Key: $INTERNAL_API_KEY" \
  -H "X-User-Id: user-123" \
  -H "X-Org-Id: org-123"
```

---

## API gRPC

### Proto File

El archivo de definición está en `proto/agents.proto`.

### Servicio: AgentsService

| Método | Request | Response | Descripción |
|--------|---------|----------|-------------|
| `CreateAgent` | `CreateAgentRequest` | `Agent` | Crear agente |
| `GetAgent` | `GetAgentRequest` | `Agent` | Obtener agente |
| `UpdateAgent` | `UpdateAgentRequest` | `Agent` | Actualizar agente |
| `DeleteAgent` | `DeleteAgentRequest` | `Agent` | Eliminar agente |
| `ListAgents` | `ListAgentsRequest` | `ListAgentsResponse` | Listar agentes |
| `CreateConversation` | `CreateConversationRequest` | `Conversation` | Crear conversación |
| `GetConversation` | `GetConversationRequest` | `Conversation` | Obtener conversación |
| `ListConversations` | `ListConversationsRequest` | `ListConversationsResponse` | Listar conversaciones |
| `GetMessages` | `GetMessagesRequest` | `GetMessagesResponse` | Obtener mensajes |
| `SendMessage` | `SendMessageRequest` | `SendMessageResponse` | Enviar mensaje |
| `StreamChat` | `ChatStreamRequest` | `stream ChatStreamResponse` | Chat con streaming |

### Contexto de Request

Todos los requests gRPC incluyen un `RequestContext`:

```protobuf
message RequestContext {
  string user_id = 1;
  string organization_id = 2;
}
```

### Ejemplo gRPC (Node.js)

```typescript
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const packageDef = protoLoader.loadSync('proto/agents.proto');
const proto = grpc.loadPackageDefinition(packageDef);

const client = new proto.agents.AgentsService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

// Listar agentes
client.ListAgents({
  context: { userId: 'user-123', organizationId: 'org-123' }
}, (err, response) => {
  console.log(response.agents);
});

// Streaming chat
const stream = client.StreamChat({
  context: { userId: 'user-123', organizationId: 'org-123' },
  conversationId: 'conv-123',
  content: 'Hola, necesito ideas para posts'
});

stream.on('data', (chunk) => {
  if (chunk.token) {
    process.stdout.write(chunk.token.content);
  }
});
```

---

## Estructura del Proyecto

```
spotli-agents/
├── proto/
│   └── agents.proto          # Definición gRPC
├── src/
│   ├── common/
│   │   ├── guards/           # Autenticación
│   │   ├── interceptors/     # Dummy mode
│   │   ├── mocks/            # Datos mock
│   │   └── prisma/           # ORM
│   ├── modules/
│   │   ├── agents/           # CRUD agentes
│   │   ├── conversations/    # Chat y mensajes
│   │   ├── grpc/             # Controller gRPC
│   │   └── health/           # Health checks
│   ├── app.module.ts
│   └── main.ts               # HTTP + gRPC bootstrap
├── docs/                     # Documentación
├── specs/                    # Specs y ADRs
└── Dockerfile
```

---

## Variables de Entorno

```bash
# Server
NODE_ENV=development
PORT=3002
GRPC_PORT=50051

# Dummy Mode
DUMMY_MODE=true

# Database
DATABASE_URL=postgresql://spotli:password@localhost:5432/spotli

# Internal Auth
INTERNAL_API_KEY=your-api-key

# LLM Providers
GOOGLE_AI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm start:dev` | Desarrollo con hot-reload |
| `pnpm build` | Build de producción |
| `pnpm start:prod` | Ejecutar build |
| `pnpm test` | Correr tests |
| `pnpm lint` | Lint del código |
| `pnpm prisma studio` | Abrir Prisma Studio |

---

## Docker

### Build

```bash
docker build -t spotli-agents .
```

### Run

```bash
docker run -p 3002:3002 -p 50051:50051 \
  -e DUMMY_MODE=true \
  -e INTERNAL_API_KEY="..." \
  spotli-agents
```

---

## Documentación

- [Spec de Agentes (F300)](specs/features/F300-agents.md)
- [ADR-001: Multi-tenant Strategy](specs/architecture/adr/ADR-001-multi-tenant-strategy.md)
- [ADR-002: Inter-service Auth](specs/architecture/adr/ADR-002-inter-service-authentication.md)
- [ADR-003: Agents Microservice](specs/architecture/adr/ADR-003-agents-microservice.md)
- [Onboarding Guide](docs/onboarding-agents-developer.md)
- [Spec-Kit Workflow](docs/spec-kit-workflow.md)

---

## License

Proprietary - Spotli.ai
