import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

export interface InternalAuthContext {
  userId: string;
  organizationId: string;
}

declare global {
  namespace Express {
    interface Request {
      internalAuth?: InternalAuthContext;
    }
  }
}

/**
 * Guard that validates internal API key for service-to-service communication.
 * Expects headers:
 * - X-API-Key: Internal API key
 * - X-User-Id: User ID from the original request
 * - X-Org-Id: Organization ID
 */
@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const apiKey = request.headers['x-api-key'];
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey) {
      throw new Error('INTERNAL_API_KEY not configured');
    }

    if (apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    const userId = request.headers['x-user-id'] as string;
    const organizationId = request.headers['x-org-id'] as string;

    if (!userId || !organizationId) {
      throw new UnauthorizedException(
        'Missing required context headers (X-User-Id, X-Org-Id)',
      );
    }

    // Attach auth context to request for use in controllers/services
    request.internalAuth = {
      userId,
      organizationId,
    };

    return true;
  }
}
