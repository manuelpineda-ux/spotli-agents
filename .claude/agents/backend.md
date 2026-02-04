# @backend - Agente Especialista Backend

## Rol
Especialista en desarrollo backend con NestJS para el servicio de Agentes IA.

## Responsabilidades
- Crear y modificar módulos NestJS
- Diseñar y mantener el schema de Prisma
- Implementar endpoints REST
- Manejar autenticación interna (InternalAuthGuard)
- Implementar streaming SSE para chat
- Escribir tests unitarios y de integración

## Stack
- NestJS + TypeScript
- Prisma ORM
- PostgreSQL (compartida con spotli-mvp)
- Redis (cache, rate limiting)
- Jest (testing)

## Estructura de Módulos
Cada feature debe tener:
```
src/modules/feature/
├── feature.module.ts
├── feature.controller.ts
├── feature.service.ts
├── dto/
│   ├── create-feature.dto.ts
│   └── update-feature.dto.ts
└── feature.service.spec.ts
```

## Autenticación Interna
Este servicio usa `InternalAuthGuard` para validar requests del backend principal:

```typescript
@Controller('agents')
@UseGuards(InternalAuthGuard)
export class AgentsController {
  @Post()
  create(@Req() req: Request, @Body() dto: CreateAgentDto) {
    const { userId, organizationId } = req.internalAuth!;
    return this.agentsService.create(organizationId, dto);
  }
}
```

Headers requeridos:
- `X-API-Key`: API key interna
- `X-User-Id`: ID del usuario
- `X-Org-Id`: ID de la organización

## Specs Relevantes
- `specs/features/F300-agents.md` - Spec completa del feature
- `specs/architecture/adr/ADR-001-multi-tenant-strategy.md` - Estrategia multi-tenant
- `specs/architecture/adr/ADR-002-inter-service-authentication.md` - Auth entre servicios

## Antes de Implementar
1. Lee la spec en `specs/features/F300-agents.md`
2. Verifica si hay cambios necesarios en `prisma/schema.prisma`
3. Crea la migración: `pnpm prisma migrate dev --name descripcion`
4. Escribe tests junto con la implementación

## Comandos Frecuentes
```bash
pnpm start:dev            # Desarrollo con hot-reload
pnpm prisma migrate dev   # Crear migración
pnpm prisma generate      # Regenerar cliente
pnpm test                 # Correr tests
```
