# ADR-001: Estrategia Multi-tenant

## Estado
**Aceptado** - 2026-02-04

## Contexto

Spotli.ai es una plataforma SaaS donde múltiples organizaciones (tenants) comparten la infraestructura. Necesitamos definir cómo aislar los datos entre organizaciones para:

1. **Seguridad**: Prevenir acceso no autorizado a datos de otros tenants
2. **Escalabilidad**: Permitir crecimiento sin rediseñar la arquitectura
3. **Simplicidad**: Mantener complejidad manejable para MVP (<100 usuarios)

### Opciones Consideradas

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **A. Shared schema** | Todas las tablas compartidas, filtro por `organizationId` | Simple, bajo costo | Riesgo de data leaks si se olvida WHERE |
| **B. Schema por tenant** | PostgreSQL schema separado por organización | Buen aislamiento | Migraciones complejas |
| **C. DB por tenant** | Base de datos separada por organización | Máximo aislamiento | Costoso, complejo |

## Decisión

**Adoptamos Opción A (Shared Schema) + Row Level Security (RLS) de PostgreSQL.**

### Implementación

1. **Todas las tablas tienen `organizationId`** (ya implementado en Prisma schema)

2. **RLS habilitado en tablas sensibles**:
```sql
-- Ejemplo para tabla agents
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON agents
  USING (organization_id = current_setting('app.current_org_id')::uuid);

-- Bypass para migraciones/admin
CREATE POLICY admin_bypass ON agents
  FOR ALL
  USING (current_setting('app.bypass_rls', true)::boolean = true);
```

3. **Contexto de tenant en cada request**:
```typescript
// Middleware que setea el contexto antes de queries
async function setTenantContext(prisma: PrismaClient, orgId: string) {
  await prisma.$executeRawUnsafe(
    `SET app.current_org_id = '${orgId}'`
  );
}
```

4. **Validación en capa de servicio** (defensa en profundidad):
```typescript
// Siempre filtrar por organizationId aunque RLS esté activo
const agents = await prisma.agent.findMany({
  where: { organizationId: user.organizationId }
});
```

## Consecuencias

### Positivas
- **Seguridad a nivel de DB**: RLS previene data leaks incluso si la app tiene bugs
- **Simplicidad operacional**: Una sola base de datos para mantener
- **Costo bajo**: Ideal para MVP con presupuesto limitado (~$70-90/mes)
- **Migraciones simples**: Un solo schema para migrar

### Negativas
- **Performance compartida**: Un tenant pesado puede afectar a otros
- **Backup granular difícil**: No se puede respaldar un solo tenant fácilmente
- **Compliance**: Algunos clientes enterprise pueden requerir aislamiento físico

### Mitigación de Riesgos
- Monitorear queries lentas por tenant
- Documentar proceso de migración a schema/DB separados si se requiere en el futuro
- El diseño con `organizationId` en todas las tablas facilita migración posterior

## Migración Futura

Si escalamos más allá de MVP y necesitamos mayor aislamiento:

1. **Fase 1**: Schema separado por tenant (PostgreSQL schemas)
2. **Fase 2**: Database separada por tenant (si hay requisitos de compliance)

El diseño actual facilita esta migración porque:
- Todas las tablas ya tienen `organizationId`
- RLS nos forzó a siempre tener contexto de tenant
- No hay queries hardcodeadas sin filtro de organización

## Referencias

- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Multi-tenant SaaS patterns](https://docs.microsoft.com/en-us/azure/architecture/guide/multitenant/overview)
