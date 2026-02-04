import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { Request } from 'express';
import { getMockResponse } from '../mocks/mock-data';

/**
 * Interceptor that returns mock data when DUMMY_MODE=true
 * This allows parallel development - spotli-mvp can integrate
 * while spotli-agents implementation is in progress.
 *
 * Usage:
 * - Set DUMMY_MODE=true in .env to enable mock responses
 * - All endpoints will return predefined mock data
 * - Remove or set DUMMY_MODE=false when real implementation is ready
 */
@Injectable()
export class DummyModeInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DummyModeInterceptor.name);
  private readonly isDummyMode: boolean;

  constructor() {
    this.isDummyMode = process.env.DUMMY_MODE === 'true';
    if (this.isDummyMode) {
      this.logger.warn('🎭 DUMMY MODE ENABLED - All responses are mocked');
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.isDummyMode) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const { method, path } = request;

    // Skip health endpoint - always return real response
    if (path.includes('/health')) {
      return next.handle();
    }

    const mockResponse = getMockResponse(method, path, request.body);

    if (mockResponse) {
      this.logger.debug(`🎭 Mock response for ${method} ${path}`);
      return of(mockResponse);
    }

    // If no mock found, proceed with real handler
    this.logger.warn(`No mock found for ${method} ${path}, using real handler`);
    return next.handle();
  }
}
