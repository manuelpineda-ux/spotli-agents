# ADR-002: Autenticación entre Servicios

## Estado
**Aceptado** - 2026-02-04

## Contexto

Con la arquitectura de microservicios (ver ADR-003), necesitamos definir cómo los servicios internos se autentican entre sí. El caso principal es:

```
Usuario → Frontend → Backend API → Agents Service
                         ↓
                    ¿Cómo autenticar?
```

### Requisitos

1. **Seguridad**: Prevenir acceso no autorizado a servicios internos
2. **Simplicidad**: Fácil de implementar para MVP
3. **Contexto de usuario**: El servicio destino necesita saber qué usuario/organización está haciendo la request
4. **Performance**: Mínima latencia adicional

### Opciones Consideradas

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **A. JWT Passthrough** | Pasar el JWT del usuario al servicio interno | Contexto completo del usuario | Requiere Clerk SDK en cada servicio |
| **B. API Key + Headers** | API key compartida + headers con contexto | Simple, sin dependencias externas | Menos seguro si red comprometida |
| **C. mTLS** | Certificados mutuos entre servicios | Muy seguro | Complejo, overkill para MVP |
| **D. Service Mesh** | Istio/Linkerd maneja auth | Muy robusto | Infraestructura adicional significativa |

## Decisión

**Adoptamos Opción B: API Key + Context Headers**

### Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     Red Docker Interna                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Internet ──▶ Caddy ──▶ Backend ──────▶ Agents Service     │
│                           │                   │             │
│                           │   X-API-Key       │             │
│                           │   X-User-Id       │             │
│                           │   X-Org-Id        │             │
│                           │                   │             │
│              (expuesto)       (solo red interna)            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementación

#### 1. Variables de Entorno
```bash
# .env (compartido entre servicios)
INTERNAL_API_KEY=<random-32-char-string>
```

#### 2. Cliente HTTP en Backend (llamador)
```typescript
// libs/internal-client.ts
@Injectable()
export class AgentsClient {
  constructor(private readonly httpService: HttpService) {}

  async createAgent(orgId: string, userId: string, data: CreateAgentDto) {
    return this.httpService.post(
      `${process.env.AGENTS_SERVICE_URL}/agents`,
      data,
      {
        headers: {
          'X-API-Key': process.env.INTERNAL_API_KEY,
          'X-User-Id': userId,
          'X-Org-Id': orgId,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
```

#### 3. Guard en Servicio Destino (receptor)
```typescript
// guards/internal-auth.guard.ts
@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Validar API Key
    const apiKey = request.headers['x-api-key'];
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    // Extraer y validar contexto
    const userId = request.headers['x-user-id'];
    const orgId = request.headers['x-org-id'];

    if (!userId || !orgId) {
      throw new BadRequestException('Missing user context headers');
    }

    // Adjuntar al request para uso en controllers/services
    request.internalAuth = {
      userId,
      organizationId: orgId,
    };

    return true;
  }
}
```

#### 4. Uso en Controller
```typescript
@Controller('agents')
@UseGuards(InternalAuthGuard)
export class AgentsController {
  @Post()
  async create(@Req() req, @Body() dto: CreateAgentDto) {
    const { userId, organizationId } = req.internalAuth;
    return this.agentsService.create(organizationId, userId, dto);
  }
}
```

#### 5. Docker Compose
```yaml
services:
  backend:
    environment:
      - INTERNAL_API_KEY=${INTERNAL_API_KEY}
      - AGENTS_SERVICE_URL=http://agents:3002
    networks:
      - external  # Accesible via Caddy
      - internal  # Comunicación con otros servicios

  agents:
    environment:
      - INTERNAL_API_KEY=${INTERNAL_API_KEY}
    networks:
      - internal  # SOLO red interna, no expuesto
    # NO tiene 'ports' - no accesible desde fuera
```

## Consecuencias

### Positivas
- **Simple**: Sin dependencias externas (no Clerk SDK en cada servicio)
- **Rápido**: Sin validación de JWT en cada request interna
- **Contexto preservado**: userId y orgId disponibles en servicio destino
- **Seguro para MVP**: Red Docker interna no es accesible desde internet

### Negativas
- **API Key estática**: Rotación requiere redeploy de todos los servicios
- **Confianza en red**: Asume que red Docker interna es segura
- **Sin audit trail detallado**: Headers pueden ser spoofed si red comprometida

### Mitigación de Riesgos

| Riesgo | Mitigación |
|--------|------------|
| API Key comprometida | Rotar inmediatamente, está solo en env vars |
| Spoofing de headers | Solo Backend puede llamar (red interna) |
| Logging insuficiente | Loggear todas las requests internas con contexto |

## Migración Futura

Si necesitamos mayor seguridad:

1. **Fase 1**: JWT interno firmado por Backend (no Clerk)
2. **Fase 2**: mTLS entre servicios
3. **Fase 3**: Service mesh (Istio/Linkerd) si hay muchos servicios

## Referencias

- [Microservices Security Patterns](https://microservices.io/patterns/security/access-token.html)
- [Docker Networking](https://docs.docker.com/network/)
