# Onboarding: Desarrollador de Agents Service

Bienvenido al equipo de Spotli.ai. Este documento te guiará en el setup del servicio de Agentes IA.

---

## Checklist de Setup

```markdown
1. [ ] Clonar: git clone git@github.com:manuelpineda-ux/spotli-agents.git
2. [ ] Instalar: pnpm install
3. [ ] Configurar: cp .env.example .env
4. [ ] Agregar INTERNAL_API_KEY al .env (pedir al equipo)
5. [ ] Probar HTTP: DUMMY_MODE=true pnpm start:dev
6. [ ] Verificar HTTP: curl http://localhost:3002/v1/health
7. [ ] Verificar gRPC: node scripts/test-grpc.js
8. [ ] Leer spec: specs/features/F300-agents.md
9. [ ] Leer ADRs: specs/architecture/adr/
```

---

## Antes de Empezar: Spec-Kit Workflow

**IMPORTANTE:** En este proyecto usamos "spec first, code second". Lee primero:

1. **[spec-kit-workflow.md](./spec-kit-workflow.md)** - Cómo trabajamos con specs
2. Luego la documentación técnica abajo

## Contexto

El servicio de Agents es un microservicio separado que maneja:
- Configuración de agentes de IA por organización
- Conversaciones con streaming
- Integración multi-LLM (Gemini, GPT, Claude)

### Documentación Clave (leer en este orden)

| # | Documento | Descripción |
|---|-----------|-------------|
| 1 | [spec-kit-workflow.md](./spec-kit-workflow.md) | Cómo trabajamos |
| 2 | [F300-agents.md](../specs/features/F300-agents.md) | Spec completa del feature |
| 3 | [ADR-001](../specs/architecture/adr/ADR-001-multi-tenant-strategy.md) | Estrategia multi-tenant |
| 4 | [ADR-002](../specs/architecture/adr/ADR-002-inter-service-authentication.md) | Auth entre servicios |
| 5 | [ADR-003](../specs/architecture/adr/ADR-003-agents-microservice.md) | Arquitectura del microservicio |

---

## 1. Setup del Repositorio

### Crear el repo spotli-agents

```bash
# Crear directorio
mkdir spotli-agents && cd spotli-agents

# Inicializar
git init
pnpm init

# Instalar NestJS
pnpm add @nestjs/core @nestjs/common @nestjs/platform-express
pnpm add @nestjs/config @nestjs/swagger
pnpm add @prisma/client
pnpm add class-validator class-transformer
pnpm add -D @nestjs/cli typescript @types/node prisma
pnpm add -D @types/express

# Crear estructura NestJS
npx nest new . --skip-git --package-manager pnpm
```

### Estructura de Directorios

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
│   │   └── decorators/
│   │       └── org-context.decorator.ts
│   ├── agents/
│   │   ├── agents.module.ts
│   │   ├── agents.controller.ts
│   │   ├── agents.service.ts
│   │   └── dto/
│   │       ├── create-agent.dto.ts
│   │       └── update-agent.dto.ts
│   ├── conversations/
│   │   └── ...
│   ├── chat/
│   │   └── ...
│   ├── llm/
│   │   ├── llm.module.ts
│   │   ├── llm.service.ts
│   │   └── providers/
│   │       ├── gemini.provider.ts
│   │       ├── openai.provider.ts
│   │       └── anthropic.provider.ts
│   └── prisma/
│       └── prisma.service.ts
├── prisma/
│   └── schema.prisma
├── test/
├── Dockerfile
├── .env.example
├── package.json
└── README.md
```

---

## 2. Configuración de Base de Datos

### Schema Prisma

Crea `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Modelos compartidos (ya existen en spotli-mvp)
// Solo necesitas las tablas de Agents

model Agent {
  id             String      @id @default(uuid())
  organizationId String
  name           String
  description    String?
  tone           AgentTone   @default(FRIENDLY)
  language       String      @default("es")
  systemPrompt   String?
  contextPrompt  String?
  primaryModel   LLMModel    @default(GEMINI_FLASH)
  fallbackModel  LLMModel?
  temperature    Float       @default(0.7)
  maxTokens      Int         @default(1000)
  status         AgentStatus @default(ACTIVE)

  conversations  Conversation[]

  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  @@index([organizationId])
}

model Conversation {
  id             String             @id @default(uuid())
  agentId        String
  organizationId String
  title          String?
  messageCount   Int                @default(0)
  tokenCount     Int                @default(0)
  status         ConversationStatus @default(ACTIVE)

  agent          Agent              @relation(fields: [agentId], references: [id])
  messages       Message[]

  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  @@index([agentId])
  @@index([organizationId])
}

model Message {
  id               String       @id @default(uuid())
  conversationId   String
  role             MessageRole
  content          String
  model            LLMModel?
  tokensUsed       Int?
  latencyMs        Int?
  contentType      ContentType?
  generatedContent Json?

  conversation     Conversation @relation(fields: [conversationId], references: [id])

  createdAt        DateTime     @default(now())

  @@index([conversationId])
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
  GEMINI_FLASH
  GPT_5_MINI
  CLAUDE_HAIKU
}

enum ConversationStatus {
  ACTIVE
  ARCHIVED
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

### Ejecutar Migración

```bash
# Generar cliente
npx prisma generate

# Crear migración
npx prisma migrate dev --name init_agents
```

---

## 3. Guard de Autenticación Interna

Crea `src/common/guards/internal-auth.guard.ts`:

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Validar API Key
    const apiKey = request.headers['x-api-key'];
    const expectedKey = this.configService.get<string>('INTERNAL_API_KEY');

    if (!apiKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    // Extraer contexto de usuario
    const userId = request.headers['x-user-id'];
    const organizationId = request.headers['x-org-id'];

    if (!userId || !organizationId) {
      throw new BadRequestException('Missing user context headers');
    }

    // Adjuntar al request
    request.auth = {
      userId,
      organizationId,
    };

    return true;
  }
}
```

### Decorador para Contexto

Crea `src/common/decorators/org-context.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const OrgContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.auth;
  },
);

export interface AuthContext {
  userId: string;
  organizationId: string;
}
```

---

## 4. Variables de Entorno

Crea `.env.example`:

```bash
# Server
NODE_ENV=development
PORT=3002

# Database (usa la misma que spotli-mvp en desarrollo)
DATABASE_URL=postgresql://spotli:password@localhost:5432/spotli

# Redis
REDIS_URL=redis://localhost:6379

# Internal Authentication
INTERNAL_API_KEY=dev-internal-key-change-in-production

# LLM Providers (obtén tus propias keys)
GOOGLE_AI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Rate Limiting
RATE_LIMIT_ORG_PER_MIN=100
RATE_LIMIT_USER_PER_MIN=20
```

---

## 5. Desarrollo Local

### Opción A: Standalone (solo Agents)

```bash
# Terminal 1: Base de datos (desde spotli-mvp)
cd ../spotli-mvp
pnpm docker:dev  # Levanta Postgres + Redis

# Terminal 2: Agents service
cd spotli-agents
cp .env.example .env
# Editar .env con tus valores
pnpm dev
```

### Opción B: Integrado (con spotli-mvp)

```bash
# Clonar ambos repos lado a lado
git clone github.com/org/spotli-mvp
git clone github.com/org/spotli-agents

# En spotli-mvp, editar docker-compose para desarrollo local:
# Descomentar la sección de build para agents

# Levantar todo
cd spotli-mvp/infrastructure/docker
docker compose -f docker-compose.staging.yml up
```

### Verificar que funciona

```bash
# Health check
curl http://localhost:3002/health

# Crear agente (requiere headers de auth)
curl -X POST http://localhost:3002/agents \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-internal-key-change-in-production" \
  -H "X-User-Id: test-user-id" \
  -H "X-Org-Id: test-org-id" \
  -d '{"name": "Test Agent", "tone": "FRIENDLY"}'
```

---

## 6. Convenciones de Código

### Mismas que spotli-mvp

- TypeScript estricto
- ESLint + Prettier
- Commits en inglés, Conventional Commits
- PRs a `develop`, merge a `main`

### Estructura de Módulos NestJS

```typescript
// agents/agents.module.ts
@Module({
  imports: [PrismaModule],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
```

### DTOs con Validación

```typescript
// dto/create-agent.dto.ts
import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { AgentTone, LLMModel } from '@prisma/client';

export class CreateAgentDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(AgentTone)
  tone?: AgentTone;

  @IsOptional()
  @IsEnum(LLMModel)
  primaryModel?: LLMModel;
}
```

---

## 7. Testing

### Unit Tests

```bash
pnpm test
```

### E2E Tests

```bash
pnpm test:e2e
```

### Probar Integración con Backend

Una vez que el servicio esté corriendo, puedes probarlo desde el backend principal:

```typescript
// En spotli-mvp, crear un endpoint de prueba
@Get('test-agents')
async testAgents(@CurrentUser() user: User) {
  const agent = await this.agentsClient.createAgent(
    user.id,
    user.organizationId,
    { name: 'Test from Backend' }
  );
  return agent;
}
```

---

## 8. CI/CD (Fase Posterior)

> **Nota:** El CI/CD para build de imagen Docker se configurará más adelante cuando tengamos un registry. Por ahora, enfócate en desarrollo local.

### Por ahora

1. Desarrollar y testear localmente
2. PRs a `develop` para code review
3. Deploy manual cuando se requiera

### Futuro

Cuando configuremos el registry:
- Build automático en merge a main
- Push a GitHub Container Registry (o alternativa)
- Deploy automático a staging

---

## 9. Contacto y Ayuda

- **Repo principal:** github.com/org/spotli-mvp
- **Specs:** `spotli-mvp/specs/features/F300-agents.md`
- **ADRs:** `spotli-mvp/specs/architecture/adr/`

### Preguntas Frecuentes

**¿Cómo obtengo las API keys de LLM?**
- Google AI: https://ai.google.dev/
- OpenAI: https://platform.openai.com/
- Anthropic: https://console.anthropic.com/

**¿Cómo pruebo sin el backend principal?**
- Usa los headers `X-API-Key`, `X-User-Id`, `X-Org-Id` directamente en tus requests

**¿Dónde reporto issues?**
- Issues técnicos del servicio: repo spotli-agents
- Issues de integración: repo spotli-mvp

---

Bienvenido al equipo!
