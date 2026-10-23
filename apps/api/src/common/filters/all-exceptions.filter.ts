import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiError } from '@stumatch/shared';
import type { Response } from 'express';

/** แปลงทุก error ให้อยู่ในรูปแบบ ApiError เดียวกัน (ดู docs/ARCHITECTURE.md) */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.toApiError(exception);

    if (body.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    response.status(body.statusCode).json(body);
  }

  private toApiError(exception: unknown): ApiError {
    if (!(exception instanceof HttpException)) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'Something went wrong',
        details: [],
      };
    }

    const statusCode = exception.getStatus();
    const res = exception.getResponse();
    const fallbackError = HttpStatus[statusCode] ?? 'Error';

    if (typeof res === 'string') {
      return { statusCode, error: fallbackError, message: res, details: [] };
    }

    const { message, error, details } = res as {
      message?: string | string[];
      error?: string;
      details?: unknown[];
    };
    return {
      statusCode,
      error: error ?? fallbackError,
      message: Array.isArray(message) ? message.join(', ') : (message ?? exception.message),
      details: details ?? (Array.isArray(message) ? message : []),
    };
  }
}
