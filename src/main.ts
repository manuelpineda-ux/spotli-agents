import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { DummyModeInterceptor } from './common/interceptors/dummy-mode.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create HTTP application
  const app = await NestFactory.create(AppModule);

  // Global prefix for all HTTP routes
  app.setGlobalPrefix('v1');

  // Dummy mode interceptor for parallel development (HTTP only)
  app.useGlobalInterceptors(new DummyModeInterceptor());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS - only allow requests from spotli-mvp backend
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Connect gRPC microservice
  const grpcPort = process.env.GRPC_PORT || 50051;
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'agents',
      protoPath: join(__dirname, '../proto/agents.proto'),
      url: `0.0.0.0:${grpcPort}`,
    },
  });

  // Start all microservices (gRPC)
  await app.startAllMicroservices();
  logger.log(`🚀 gRPC server running on port ${grpcPort}`);

  // Start HTTP server
  const httpPort = process.env.PORT || 3002;
  await app.listen(httpPort);
  logger.log(`🌐 HTTP server running on port ${httpPort}`);

  logger.log('');
  logger.log('Available endpoints:');
  logger.log(`  HTTP: http://localhost:${httpPort}/v1/...`);
  logger.log(`  gRPC: localhost:${grpcPort} (AgentsService)`);
}

bootstrap();
