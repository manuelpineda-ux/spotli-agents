# CLAUDE.md - Spotli Agents Service

## Proyecto
Microservicio de agentes IA conversacionales para Spotli.ai.
Maneja configuración de agentes, conversaciones, y generación de contenido con LLMs.

**Repositorio principal**: `github.com/manuelpineda-ux/spotli-mvp` (referencia para specs)

## Stack Tecnológico
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: NestJS
- **Database**: PostgreSQL 16 (compartida con spotli-mvp)
- **ORM**: Prisma
- **Cache**: Redis 7
- **LLMs**: Gemini Flash, GPT-5-mini, Claude Haiku 4.5

## Estructura del Proyecto
```
spotli-agents/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── guards/internal-auth.guard.ts
│   │   └── prisma/
│   └── modules/
│       ├── agents/          # CRUD de agentes
│       ├── conversations/   # Chat y mensajes
│       ├── health/          # Health checks
│       └── llm/             # Providers LLM (TODO)
├── prisma/schema.prisma
├── docs/                    # Documentación
├── specs/                   # Specs y ADRs
└── Dockerfile
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

## Spec-Kit
Antes de implementar cualquier feature:
1. Lee la spec en `specs/features/F300-agents.md`
2. Revisa los ADRs en `specs/architecture/adr/`
3. Consulta la guía de onboarding: `docs/onboarding-agents-developer.md`

## Subagentes Disponibles
- `@backend` - Especialista en NestJS, APIs, Prisma
- `@qa` - Especialista en testing y validación
- `@integrations` - Especialista en LLMs (Gemini, OpenAI, Anthropic)

## Comandos Útiles

```bash
# Desarrollo
pnpm install              # Instalar dependencias
pnpm start:dev            # Iniciar con hot-reload
pnpm build                # Build de producción
pnpm start:prod           # Ejecutar build

# Database
pnpm prisma generate      # Generar cliente Prisma
pnpm prisma migrate dev   # Crear/aplicar migraciones
pnpm prisma studio        # Abrir Prisma Studio

# Testing
pnpm test                 # Unit tests
pnpm test:e2e             # E2E tests
pnpm lint                 # Lint del código
```

## Comunicación con spotli-mvp

### Autenticación Interna
Este servicio recibe requests del backend principal con headers:
```
X-API-Key: {INTERNAL_API_KEY}
X-User-Id: {userId}
X-Org-Id: {organizationId}
```

### Red Docker
- **Puerto**: 3002
- **Red**: Solo interna (no expuesto a internet)
- **URL interna**: `http://agents:3002`

## Variables de Entorno
Ver `.env.example` para la lista completa. Las principales:
```bash
PORT=3002
DATABASE_URL=postgresql://...
INTERNAL_API_KEY=...
GOOGLE_AI_API_KEY=...
```

## Límites y Consideraciones
- Servidor staging compartido: optimizar para memoria
- Rate limiting: 100 req/min por org, 20 req/min por usuario
- LLM costs: usar Gemini Flash por defecto (más económico)

## Referencias
- Spec principal: `specs/features/F300-agents.md`
- ADRs: `specs/architecture/adr/`
- Onboarding: `docs/onboarding-agents-developer.md`
- Workflow: `docs/spec-kit-workflow.md`
