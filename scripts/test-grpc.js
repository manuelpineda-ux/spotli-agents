/**
 * Simple gRPC client test script
 * Usage: node scripts/test-grpc.js
 */

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../proto/agents.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const agentsProto = grpc.loadPackageDefinition(packageDefinition).agents;

const client = new agentsProto.AgentsService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

const context = {
  userId: 'test-user-123',
  organizationId: 'test-org-123',
};

console.log('🧪 Testing gRPC endpoints...\n');

// Test 1: ListAgents
console.log('1. ListAgents');
client.ListAgents({ context }, (err, response) => {
  if (err) {
    console.error('   ❌ Error:', err.message);
  } else {
    console.log('   ✅ Got', response.agents.length, 'agents');
    console.log('   First agent:', response.agents[0]?.name);
  }

  // Test 2: CreateAgent
  console.log('\n2. CreateAgent');
  client.CreateAgent(
    {
      context,
      name: 'Test Agent via gRPC',
      personality: 'friendly',
    },
    (err, response) => {
      if (err) {
        console.error('   ❌ Error:', err.message);
      } else {
        console.log('   ✅ Created agent:', response.name);
        console.log('   ID:', response.id);
      }

      // Test 3: StreamChat
      console.log('\n3. StreamChat (streaming)');
      const stream = client.StreamChat({
        context,
        conversationId: 'conv-test-123',
        content: 'Hola, dame ideas para Instagram',
      });

      let fullResponse = '';

      stream.on('data', (chunk) => {
        if (chunk.start) {
          console.log('   📝 Stream started, messageId:', chunk.start.messageId);
        } else if (chunk.token) {
          process.stdout.write(chunk.token.content);
          fullResponse += chunk.token.content;
        } else if (chunk.done) {
          console.log('\n   ✅ Stream done');
          console.log('   Model:', chunk.done.model);
          console.log('   Tokens:', chunk.done.tokensUsed);
          console.log('   Latency:', chunk.done.latencyMs, 'ms');
        } else if (chunk.error) {
          console.error('   ❌ Stream error:', chunk.error.message);
        }
      });

      stream.on('end', () => {
        console.log('\n\n✅ All tests completed!');
        process.exit(0);
      });

      stream.on('error', (err) => {
        console.error('   ❌ Stream error:', err.message);
        process.exit(1);
      });
    }
  );
});
