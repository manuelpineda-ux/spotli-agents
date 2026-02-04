# Spotli Agents Service

Microservicio de agentes conversacionales para Spotli.ai.

## Descripción

Este servicio maneja:
- Configuración y gestión de agentes IA
- Conversaciones y mensajes
- Integración con LLMs (Gemini, GPT, Claude)
- Streaming de respuestas via SSE

## Stack Tecnológico

- **Runtime**: Node.js 20
- **Framework**: NestJS
- **Database**: PostgreSQL (compartida con spotli-mvp)
- **ORM**: Prisma
- **Language**: TypeScript

## Requisitos

- Node.js 20+
- pnpm
- PostgreSQL 16
- Redis 7 (opcional, para rate limiting)

## Setup

### 1. Clonar repositorio

```bash
git clone git@github.com:manuelpineda-ux/spotli-agents.git
cd spotli-agents
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus valores
```

### 4. Generar cliente Prisma

```bash
pnpm prisma generate
```

### 5. Correr migraciones (si es necesario)

```bash
pnpm prisma migrate dev
```

### 6. Iniciar en desarrollo

```bash
pnpm start:dev
```

El servicio estará disponible en `http://localhost:3002`

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm start:dev` | Desarrollo con hot-reload |
| `pnpm build` | Build de producción |
| `pnpm start:prod` | Ejecutar build de producción |
| `pnpm test` | Correr tests |
| `pnpm lint` | Lint del código |
| `pnpm prisma studio` | Abrir Prisma Studio |

## Estructura del Proyecto

```
src/
├── common/
│   ├── guards/          # Guards de autenticación
│   └── prisma/          # Módulo Prisma
├── modules/
│   ├── agents/          # CRUD de agentes
│   ├── conversations/   # Gestión de conversaciones
│   └── health/          # Health checks
└── main.ts              # Entry point
```

## API

### Autenticación

Todas las rutas (excepto `/health`) requieren autenticación interna:

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
| SSE | `/v1/conversations/:id/stream` | Stream de respuesta |

## Documentación

- [Spec de Agentes (F300)](../spotli-mvp/specs/features/F300-agents.md)
- [ADR-003: Agents Microservice](../spotli-mvp/specs/architecture/adr/ADR-003-agents-microservice.md)
- [Onboarding Guide](../spotli-mvp/docs/onboarding-agents-developer.md)
- [Spec-Kit Workflow](../spotli-mvp/docs/spec-kit-workflow.md)

## Docker

### Build

```bash
docker build -t spotli-agents .
```

### Run

```bash
docker run -p 3002:3002 \
  -e DATABASE_URL="postgresql://..." \
  -e INTERNAL_API_KEY="..." \
  spotli-agents
```

## Contributing

1. Leer el spec antes de implementar: `specs/features/F300-agents.md`
2. Crear branch: `feature/FEAT-XXX-descripcion`
3. Implementar siguiendo la spec
4. Escribir tests
5. Crear PR

## License

Proprietary - Spotli.ai
