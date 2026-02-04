# ADR-003: Agents como Microservicio Separado

## Estado
**Aceptado** - 2026-02-04

## Contexto

El módulo de Agentes IA (F300) es un componente core de Spotli.ai que:
- Configura y gestiona agentes de IA por organización
- Integra con múltiples LLMs (Gemini, GPT, Claude)
- Procesa conversaciones y genera contenido

Con la incorporación de un nuevo miembro al equipo, necesitamos decidir cómo estructurar el desarrollo para:

1. **Desarrollo paralelo**: Evitar conflictos de merge y bloqueos
2. **Ownership claro**: Responsabilidad definida por componente
3. **Escalabilidad futura**: Permitir escalar el servicio de agentes independientemente
4. **Simplicidad operacional**: Mantener la complejidad manejable

### Opciones Consideradas

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **A. Mismo repo, feature branch** | Todo en spotli-mvp | Tipos compartidos | Conflictos git, bloqueos |
| **B. Repo separado, microservicio** | spotli-agents independiente | Desarrollo paralelo real | Integración vía HTTP |
| **C. Monorepo con package separado** | Nuevo package en workspace | Balance entre A y B | Aún hay acoplamiento |

## Decisión

**Adoptamos Opción B: Repositorio y servicio separado**

### Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        Repositorios                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  github.com/org/spotli-mvp          github.com/org/spotli-agents
│  ├── apps/backend                   ├── src/
│  ├── apps/frontend                  │   ├── agents/
│  ├── packages/shared-types          │   ├── llm/
│  └── docker-compose.yml             │   └── prompts/
│                                     ├── Dockerfile
│                                     └── README.md
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Runtime (Docker)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐          │
│  │ Frontend │───▶│ Backend  │───▶│ Agents API   │          │
│  │ :3001    │    │ :3000    │    │ :3002        │          │
│  └──────────┘    └──────────┘    └──────────────┘          │
│       │               │                │                    │
│       │               ▼                ▼                    │
│       │         ┌──────────┐    ┌──────────┐               │
│       │         │ Postgres │    │  Redis   │               │
│       │         └──────────┘    └──────────┘               │
│       │               │                                     │
│       │               ▼                                     │
│       │         ┌──────────┐                               │
│       └────────▶│  Caddy   │◀── Internet                   │
│                 └──────────┘                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Comunicación entre Servicios

- **Protocolo**: HTTP/REST (simple para MVP)
- **Autenticación**: API Key + Context Headers (ver ADR-002)
- **Formato**: JSON

### Contrato de API

```yaml
# API que expone Agents Service
openapi: 3.0.0
info:
  title: Spotli Agents API
  version: 1.0.0

paths:
  /agents:
    post:
      summary: Crear agente
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateAgentRequest'
    get:
      summary: Listar agentes de la organización

  /agents/{id}:
    get:
      summary: Obtener agente
    patch:
      summary: Actualizar agente
    delete:
      summary: Eliminar agente

  /agents/{id}/chat:
    post:
      summary: Enviar mensaje al agente
      description: Streaming response via SSE

  /agents/{id}/conversations:
    get:
      summary: Listar conversaciones
    post:
      summary: Crear nueva conversación

  /agents/{id}/conversations/{convId}/messages:
    get:
      summary: Obtener historial de mensajes
```

### Base de Datos

Según ADR-001, usa la misma PostgreSQL con RLS:

```
┌─────────────────────────────────────────┐
│              PostgreSQL                  │
├─────────────────────────────────────────┤
│  Tablas de Backend:                     │
│  - users                                │
│  - organizations                        │
│  - subscriptions                        │
│                                         │
│  Tablas de Agents (mismo schema):       │
│  - agents                               │
│  - conversations                        │
│  - messages                             │
│  - prompts                              │
│                                         │
│  RLS activo en todas ───────────────────│
└─────────────────────────────────────────┘
```

### Docker Compose Actualizado

```yaml
# docker-compose.yml (en spotli-mvp)
version: '3.8'

services:
  # ... servicios existentes ...

  agents:
    image: ghcr.io/org/spotli-agents:latest
    # O para desarrollo local:
    # build:
    #   context: ../spotli-agents
    #   dockerfile: Dockerfile
    environment:
      NODE_ENV: ${NODE_ENV}
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      INTERNAL_API_KEY: ${INTERNAL_API_KEY}
      # LLM API Keys
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      GOOGLE_AI_API_KEY: ${GOOGLE_AI_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    networks:
      - internal
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

networks:
  internal:
    driver: bridge
  external:
    driver: bridge
```

## Consecuencias

### Positivas
- **Desarrollo paralelo real**: Cero conflictos de git entre equipos
- **Deploy independiente**: Actualizar agents sin tocar backend/frontend
- **Ownership claro**: Nueva persona es dueña del repo completo
- **Escalabilidad**: Escalar pods de agents independientemente
- **Tecnología flexible**: Agents podría usar Python si LLM lo requiere

### Negativas
- **Latencia adicional**: HTTP call vs function call (~1-5ms)
- **Complejidad operacional**: Dos repos que mantener
- **Tipos no compartidos**: Definir DTOs en ambos lados
- **Testing E2E más complejo**: Requiere ambos servicios corriendo

### Mitigación

| Riesgo | Mitigación |
|--------|------------|
| Tipos inconsistentes | OpenAPI spec como fuente de verdad |
| Latencia | Redis cache para datos frecuentes |
| Complejidad | Docker Compose orquesta todo localmente |
| Testing | GitHub Actions levanta ambos servicios |

## Onboarding Nueva Persona

### Documentación Requerida

1. **README.md** en spotli-agents con:
   - Setup local
   - Variables de entorno
   - Cómo correr con docker-compose del repo principal

2. **CONTRIBUTING.md** con:
   - Convenciones de código (mismo que spotli-mvp)
   - Proceso de PR y review
   - Cómo probar integración

3. **API.md** con:
   - Contrato OpenAPI completo
   - Ejemplos de requests/responses

### Checklist de Setup

```markdown
## Setup spotli-agents

1. [ ] Clonar repo: `git clone github.com/org/spotli-agents`
2. [ ] Copiar `.env.example` a `.env`
3. [ ] Obtener API keys de LLMs (OpenAI, Google, Anthropic)
4. [ ] Para desarrollo integrado:
   - Clonar también spotli-mvp
   - Usar docker-compose del repo principal
5. [ ] Verificar: `curl http://localhost:3002/health`
```

## Referencias

- ADR-001: Estrategia Multi-tenant
- ADR-002: Autenticación entre Servicios
- [Microservices Patterns](https://microservices.io/patterns/)
- [12 Factor App](https://12factor.net/)
