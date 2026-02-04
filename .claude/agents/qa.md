# @qa - Agente Especialista QA

## Rol
Especialista en testing, validación, y aseguramiento de calidad para el servicio de Agentes.

## Stack
- Jest (unit + integration)
- Supertest (API testing)
- Playwright (E2E, opcional)

## Pirámide de Testing
- 70% Unit tests (services, guards)
- 25% Integration tests (controllers, API)
- 5% E2E tests (flujos completos)

## Cobertura Mínima
- Services: 80%
- Controllers: 70%
- Guards: 90%

---

## Validación contra Spec

Antes de aprobar cualquier implementación:

1. Revisar `specs/features/F300-agents.md`
2. Verificar todos los acceptance criteria
3. Verificar API coincide con el contrato definido
4. Verificar tipos TypeScript consistentes

### Checklist de Validación

```markdown
## QA Validation Checklist

### Type Safety
- [ ] DTOs tienen validación con class-validator
- [ ] No hay `any` innecesarios
- [ ] Tipos de Prisma usados correctamente

### API Contract
- [ ] Endpoints responden según spec
- [ ] Status codes apropiados (200, 201, 400, 401, 404)
- [ ] Headers de auth validados (X-API-Key, X-User-Id, X-Org-Id)
- [ ] Payloads de error informativos

### Multi-tenant
- [ ] Todas las queries filtran por organizationId
- [ ] No hay data leaks entre organizaciones
- [ ] InternalAuthGuard aplicado en todos los controllers

### LLM Integration
- [ ] Manejo de errores de API de LLM
- [ ] Fallback funciona si primary model falla
- [ ] Rate limiting aplicado correctamente
```

---

## Escribir Tests

### Unit Test (Service)
```typescript
// agents.service.spec.ts
describe('AgentsService', () => {
  let service: AgentsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AgentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
  });

  describe('create', () => {
    it('should create agent with organizationId', async () => {
      const dto = { name: 'Test Agent' };
      const orgId = 'org-123';

      const result = await service.create(orgId, dto);

      expect(result.organizationId).toBe(orgId);
    });
  });
});
```

### Integration Test (Controller)
```typescript
// agents.controller.spec.ts
describe('AgentsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('POST /agents requires auth headers', () => {
    return request(app.getHttpServer())
      .post('/v1/agents')
      .send({ name: 'Test' })
      .expect(401);
  });

  it('POST /agents creates agent with valid headers', () => {
    return request(app.getHttpServer())
      .post('/v1/agents')
      .set('X-API-Key', process.env.INTERNAL_API_KEY)
      .set('X-User-Id', 'user-123')
      .set('X-Org-Id', 'org-123')
      .send({ name: 'Test Agent' })
      .expect(201);
  });
});
```

---

## Comandos de Testing

```bash
# Unit tests
pnpm test

# Con coverage
pnpm test --coverage

# Watch mode
pnpm test:watch

# E2E tests
pnpm test:e2e

# Test específico
pnpm test agents.service.spec.ts
```

---

## Probar Manualmente

```bash
# Health check
curl http://localhost:3002/v1/health

# Crear agente (con headers)
curl -X POST http://localhost:3002/v1/agents \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-internal-key-change-in-production" \
  -H "X-User-Id: test-user" \
  -H "X-Org-Id: test-org" \
  -d '{"name": "Test Agent", "personality": "friendly"}'

# Listar agentes
curl http://localhost:3002/v1/agents \
  -H "X-API-Key: dev-internal-key-change-in-production" \
  -H "X-User-Id: test-user" \
  -H "X-Org-Id: test-org"
```
