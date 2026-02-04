/**
 * Mock data for DUMMY_MODE
 * All endpoints return predefined responses for integration testing
 */

// ============================================
// MOCK ENTITIES
// ============================================

const MOCK_ORG_ID = 'org-mock-12345678';
const MOCK_USER_ID = 'user-mock-12345678';

const MOCK_AGENT = {
  id: 'agent-mock-001',
  organizationId: MOCK_ORG_ID,
  name: 'Marketing Assistant',
  description: 'AI agent for creating social media content',
  personality: 'professional',
  tone: 'friendly',
  language: 'es',
  systemPrompt: 'You are a helpful marketing assistant...',
  isActive: true,
  createdAt: '2026-02-04T10:00:00.000Z',
  updatedAt: '2026-02-04T10:00:00.000Z',
};

const MOCK_AGENT_2 = {
  id: 'agent-mock-002',
  organizationId: MOCK_ORG_ID,
  name: 'Content Creator',
  description: 'Specialized in Instagram and TikTok content',
  personality: 'casual',
  tone: 'enthusiastic',
  language: 'es',
  systemPrompt: 'You are a creative content specialist...',
  isActive: true,
  createdAt: '2026-02-03T15:30:00.000Z',
  updatedAt: '2026-02-04T08:00:00.000Z',
};

const MOCK_CONVERSATION = {
  id: 'conv-mock-001',
  agentId: 'agent-mock-001',
  userId: MOCK_USER_ID,
  organizationId: MOCK_ORG_ID,
  title: 'Summer Campaign Ideas',
  status: 'active',
  createdAt: '2026-02-04T11:00:00.000Z',
  updatedAt: '2026-02-04T12:30:00.000Z',
  agent: {
    id: 'agent-mock-001',
    name: 'Marketing Assistant',
  },
};

const MOCK_CONVERSATION_2 = {
  id: 'conv-mock-002',
  agentId: 'agent-mock-001',
  userId: MOCK_USER_ID,
  organizationId: MOCK_ORG_ID,
  title: 'Product Launch Posts',
  status: 'active',
  createdAt: '2026-02-03T09:00:00.000Z',
  updatedAt: '2026-02-03T14:00:00.000Z',
  agent: {
    id: 'agent-mock-001',
    name: 'Marketing Assistant',
  },
};

const MOCK_MESSAGES = [
  {
    id: 'msg-mock-001',
    conversationId: 'conv-mock-001',
    role: 'user',
    content: 'I need 3 Instagram post ideas for a summer coffee campaign',
    createdAt: '2026-02-04T11:00:00.000Z',
  },
  {
    id: 'msg-mock-002',
    conversationId: 'conv-mock-001',
    role: 'assistant',
    content: `¡Claro! Aquí tienes 3 ideas para tu campaña de café de verano:

1. **"Cold Brew Sunset"** 🌅
   Foto de tu cold brew con hielo contra un atardecer. Caption: "El verano sabe mejor con cada sorbo. #ColdBrew #VeranoCafetero"

2. **"Beat the Heat"** ❄️
   Video corto mostrando el café siendo vertido sobre hielo. Caption: "Cuando el calor aprieta, nosotros refrescamos. #IcedCoffee #SummerVibes"

3. **"Morning Beach Routine"** 🏖️
   Lifestyle shot con café en la playa. Caption: "Sal, arena y el mejor café. ¿Qué más necesitas? #BeachCoffee #MorningRitual"

¿Quieres que desarrolle alguna de estas ideas con más detalle?`,
    metadata: {
      model: 'GEMINI_FLASH',
      tokensUsed: 245,
      latencyMs: 1234,
    },
    createdAt: '2026-02-04T11:00:05.000Z',
  },
  {
    id: 'msg-mock-003',
    conversationId: 'conv-mock-001',
    role: 'user',
    content: 'Me gusta la segunda, desarrolla más el concepto',
    createdAt: '2026-02-04T11:01:00.000Z',
  },
  {
    id: 'msg-mock-004',
    conversationId: 'conv-mock-001',
    role: 'assistant',
    content: `¡Excelente elección! Aquí está el concepto desarrollado para "Beat the Heat":

## Concepto Completo

**Formato:** Reel de 15-30 segundos

**Guión Visual:**
1. (0-3s) Close-up de gotas de sudor en un vaso vacío
2. (3-8s) Mano tomando la jarra de cold brew
3. (8-15s) Slow motion del café cayendo sobre cubos de hielo
4. (15-20s) El vaso completo con condensación
5. (20-30s) Persona dando el primer sorbo con expresión de alivio

**Audio:** Sonido ASMR del hielo + música chill de fondo

**Copy para el post:**
"Cuando el termómetro no perdona, tu café favorito sí. ☀️❄️

Nuestro Cold Brew está listo para ser tu mejor aliado este verano. Preparado con 12 horas de extracción en frío para un sabor suave y refrescante.

📍 Disponible en todas nuestras sucursales
🛵 O te lo llevamos a casa

#ColdBrew #VeranoRefrescante #CaféHelado #BeatTheHeat #SummerCoffee"

**Hashtags adicionales sugeridos:**
#coffeelovers #icedcoffee #summervibes #coffeetime #barista

¿Te gustaría que adapte este concepto para TikTok también?`,
    metadata: {
      model: 'GEMINI_FLASH',
      tokensUsed: 380,
      latencyMs: 1567,
    },
    createdAt: '2026-02-04T11:01:08.000Z',
  },
];

// ============================================
// ROUTE MATCHERS & RESPONSES
// ============================================

interface RouteHandler {
  method: string;
  pattern: RegExp;
  handler: (matches: RegExpMatchArray, body?: Record<string, unknown>) => unknown;
}

const routes: RouteHandler[] = [
  // ============================================
  // AGENTS
  // ============================================

  // GET /v1/agents - List agents
  {
    method: 'GET',
    pattern: /^\/v1\/agents\/?$/,
    handler: () => [MOCK_AGENT, MOCK_AGENT_2],
  },

  // POST /v1/agents - Create agent
  {
    method: 'POST',
    pattern: /^\/v1\/agents\/?$/,
    handler: (_, body: Record<string, unknown> = {}) => ({
      id: `agent-mock-${Date.now()}`,
      organizationId: MOCK_ORG_ID,
      name: body.name || 'New Agent',
      description: body.description || null,
      personality: body.personality || 'professional',
      tone: body.tone || 'friendly',
      language: body.language || 'es',
      systemPrompt: body.systemPrompt || null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  },

  // GET /v1/agents/:id - Get agent
  {
    method: 'GET',
    pattern: /^\/v1\/agents\/([^/]+)\/?$/,
    handler: (matches) => ({
      ...MOCK_AGENT,
      id: matches[1],
    }),
  },

  // PUT /v1/agents/:id - Update agent
  {
    method: 'PUT',
    pattern: /^\/v1\/agents\/([^/]+)\/?$/,
    handler: (matches, body: Record<string, unknown> = {}) => ({
      ...MOCK_AGENT,
      id: matches[1],
      ...body,
      updatedAt: new Date().toISOString(),
    }),
  },

  // DELETE /v1/agents/:id - Delete agent
  {
    method: 'DELETE',
    pattern: /^\/v1\/agents\/([^/]+)\/?$/,
    handler: (matches) => ({
      ...MOCK_AGENT,
      id: matches[1],
      isActive: false,
      updatedAt: new Date().toISOString(),
    }),
  },

  // ============================================
  // CONVERSATIONS
  // ============================================

  // GET /v1/conversations - List conversations
  {
    method: 'GET',
    pattern: /^\/v1\/conversations\/?$/,
    handler: () => [
      { ...MOCK_CONVERSATION, _count: { messages: 4 } },
      { ...MOCK_CONVERSATION_2, _count: { messages: 2 } },
    ],
  },

  // POST /v1/conversations - Create conversation
  {
    method: 'POST',
    pattern: /^\/v1\/conversations\/?$/,
    handler: (_, body: Record<string, unknown> = {}) => ({
      id: `conv-mock-${Date.now()}`,
      agentId: body.agentId || 'agent-mock-001',
      userId: MOCK_USER_ID,
      organizationId: MOCK_ORG_ID,
      title: body.title || null,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      agent: MOCK_AGENT,
    }),
  },

  // GET /v1/conversations/:id - Get conversation
  {
    method: 'GET',
    pattern: /^\/v1\/conversations\/([^/]+)\/?$/,
    handler: (matches) => ({
      ...MOCK_CONVERSATION,
      id: matches[1],
    }),
  },

  // GET /v1/conversations/:id/messages - Get messages
  {
    method: 'GET',
    pattern: /^\/v1\/conversations\/([^/]+)\/messages\/?$/,
    handler: (matches) =>
      MOCK_MESSAGES.map((msg) => ({
        ...msg,
        conversationId: matches[1],
      })),
  },

  // POST /v1/conversations/:id/messages - Send message
  {
    method: 'POST',
    pattern: /^\/v1\/conversations\/([^/]+)\/messages\/?$/,
    handler: (matches, body: Record<string, unknown> = {}) => ({
      userMessage: {
        id: `msg-mock-${Date.now()}`,
        conversationId: matches[1],
        role: 'user',
        content: body.content || 'Hello',
        createdAt: new Date().toISOString(),
      },
      assistantMessage: {
        id: `msg-mock-${Date.now() + 1}`,
        conversationId: matches[1],
        role: 'assistant',
        content:
          '¡Hola! Soy tu asistente de marketing. ¿En qué puedo ayudarte hoy? Puedo ayudarte a crear contenido para Instagram, Facebook o TikTok, generar ideas para campañas, o mejorar tus textos existentes.',
        metadata: {
          model: 'GEMINI_FLASH',
          tokensUsed: 68,
          latencyMs: 892,
        },
        createdAt: new Date().toISOString(),
      },
    }),
  },
];

// ============================================
// MATCHER FUNCTION
// ============================================

export function getMockResponse(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): unknown | null {
  for (const route of routes) {
    if (route.method !== method) continue;

    const matches = path.match(route.pattern);
    if (matches) {
      return route.handler(matches, body);
    }
  }

  return null;
}
