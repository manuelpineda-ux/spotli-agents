# Spec-Kit: Flujo de Trabajo de Desarrollo

Este documento explica cómo trabajamos con especificaciones antes de escribir código.

## Filosofía

> **"Spec first, code second"**
>
> Antes de escribir código, debe existir una especificación clara. Esto reduce retrabajo y asegura que todos entiendan qué se está construyendo.

---

## Estructura de Specs

```
specs/
├── features/           # Specs de features (F001, F002, etc.)
│   ├── F001-auth.md
│   ├── F002-billing.md
│   ├── F003-onboarding.md
│   └── F300-agents.md
├── api/                # Contratos de API (OpenAPI)
├── architecture/
│   └── adr/            # Architecture Decision Records
└── roadmap/
    └── phases.md       # Timeline y fases del proyecto
```

---

## Flujo de Trabajo

### 1. Antes de Empezar: Lee el Spec

```
┌─────────────────────────────────────────────────────┐
│  1. Leer spec del feature (specs/features/FXXX.md) │
│  2. Leer ADRs relacionados (specs/architecture/adr/)│
│  3. Entender el API contract                        │
│  4. Preguntar si algo no está claro                 │
└─────────────────────────────────────────────────────┘
```

**Para F300-Agents:**
- [ ] Leer `specs/features/F300-agents.md`
- [ ] Leer `specs/architecture/adr/ADR-001-multi-tenant-strategy.md`
- [ ] Leer `specs/architecture/adr/ADR-002-inter-service-authentication.md`
- [ ] Leer `specs/architecture/adr/ADR-003-agents-microservice.md`

### 2. Crear Branch

```bash
git checkout -b feature/F300-agents
```

### 3. Implementar siguiendo el Spec

El spec define:
- **Modelo de datos** → Crear schema Prisma
- **API Contract** → Crear controllers y DTOs
- **Acceptance Criteria** → Checklist de qué debe funcionar

### 4. Validar con @qa

Antes de crear PR, validar:

```markdown
## QA Checklist

### Type Safety
- [ ] Tipos coinciden con el spec
- [ ] No hay `any` innecesarios

### API Contract
- [ ] Endpoints responden según spec
- [ ] Status codes correctos
- [ ] Headers de auth funcionan

### Funcionalidad
- [ ] Acceptance criteria cumplidos
- [ ] Happy path funciona
- [ ] Errores manejados
```

### 5. Crear PR

```bash
# PR a develop (nunca directo a main)
gh pr create --base develop --head feature/F300-agents
```

### 6. Review y Merge

- PR es revisada por el equipo
- CI corre tests automáticos
- Merge a develop → Deploy a staging
- Validación en staging
- Merge a main → Producción

---

## Comunicación

### Si el spec no está claro

1. **Preguntar** antes de asumir
2. **Proponer** cambios al spec si encuentras problemas
3. **Documentar** decisiones que tomes

### Si necesitas cambiar el spec

1. Crear PR al spec con los cambios propuestos
2. Discutir con el equipo
3. Una vez aprobado, implementar

---

## Agentes de Desarrollo

Usamos "agentes" conceptuales para diferentes responsabilidades:

| Agente | Responsabilidad |
|--------|-----------------|
| @backend | Implementación de APIs, base de datos |
| @frontend | UI, componentes React, estado |
| @qa | Testing, validación contra spec |
| @reviewer | Code review, aprobación de PRs |
| @infra | Docker, CI/CD, deployment |

### Cómo usar los agentes

En PRs y discussions, menciona el agente relevante:

```markdown
@qa por favor validar que los endpoints cumplen con el spec F300
```

```markdown
@reviewer listo para review
```

---

## Ejemplo: Implementando F300-Agents

### Día 1: Setup y Entendimiento

```bash
# 1. Clonar repo
git clone github.com/org/spotli-agents
cd spotli-agents

# 2. Leer specs (en spotli-mvp)
# - specs/features/F300-agents.md
# - specs/architecture/adr/*.md

# 3. Setup inicial
pnpm install
cp .env.example .env
```

### Día 2-3: Modelo de Datos

```bash
# Implementar schema según spec
# prisma/schema.prisma

npx prisma migrate dev --name init
```

### Día 4-5: CRUD de Agents

```bash
# Implementar:
# - POST /agents
# - GET /agents
# - GET /agents/:id
# - PATCH /agents/:id
# - DELETE /agents/:id
```

### Día 6-7: Conversations y Chat

```bash
# Implementar:
# - POST /agents/:id/conversations
# - GET /agents/:id/conversations
# - POST /agents/:id/chat (streaming)
```

### Día 8: Integración LLM

```bash
# Implementar providers:
# - Gemini (mínimo para MVP)
# - OpenAI (opcional)
# - Anthropic (opcional)
```

### Día 9-10: Testing y Polish

```bash
# Unit tests
pnpm test

# Probar integración con backend principal
# Documentar cualquier desviación del spec
```

---

## Tips

1. **El spec es tu guía** - Si no está en el spec, pregunta antes de implementar
2. **Commits pequeños** - Facilita review y rollback
3. **Tests desde el inicio** - No dejar para el final
4. **Documentar decisiones** - Si cambias algo del spec, documenta por qué

---

## Referencias

- [Conventional Commits](https://www.conventionalcommits.org/)
- [ADR Format](https://adr.github.io/)
- [NestJS Documentation](https://docs.nestjs.com/)
