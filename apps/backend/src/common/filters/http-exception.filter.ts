import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_INTERNAL_SERVER_ERROR = 500;

type ErrorResponseBody = {
  success: false;
  statusCode: number;
  message: string;
  errorCode: string;
  details?: unknown;
  timestamp: string;
  path: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HTTP_INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const normalized = this.normalizeExceptionResponse(
      statusCode,
      exceptionResponse,
    );

    const body: ErrorResponseBody = {
      success: false,
      statusCode,
      message: normalized.message,
      errorCode: normalized.errorCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (normalized.details !== undefined) {
      body.details = normalized.details;
    }

    const requestId = request.header('x-request-id') ?? 'unknown';
    const logLine = `${request.method} ${request.url} -> ${statusCode} rid=${requestId} errorCode=${body.errorCode} message=${body.message}`;
    if (statusCode >= HTTP_INTERNAL_SERVER_ERROR) {
      this.logger.error(logLine);
    } else {
      this.logger.warn(logLine);
    }

    response.status(statusCode).json(body);
  }

  private normalizeExceptionResponse(
    statusCode: number,
    exceptionResponse: unknown,
  ): {
    message: string;
    errorCode: string;
    details?: unknown;
  } {
    if (typeof exceptionResponse === 'string') {
      return {
        message: exceptionResponse,
        errorCode: this.defaultErrorCode(statusCode),
      };
    }

    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      !Array.isArray(exceptionResponse)
    ) {
      const responseObject = exceptionResponse as Record<string, unknown>;
      const message = this.extractMessage(responseObject, statusCode);
      const errorCode =
        typeof responseObject.errorCode === 'string'
          ? responseObject.errorCode
          : this.defaultErrorCode(statusCode);
      const details = responseObject.details;

      return {
        message,
        errorCode,
        details,
      };
    }

    return {
      message:
        statusCode === HTTP_INTERNAL_SERVER_ERROR
          ? 'Internal server error'
          : 'Request failed',
      errorCode: this.defaultErrorCode(statusCode),
    };
  }

  private extractMessage(
    responseObject: Record<string, unknown>,
    statusCode: number,
  ): string {
    if (typeof responseObject.message === 'string') {
      return responseObject.message;
    }

    if (
      Array.isArray(responseObject.message) &&
      responseObject.message.every((item) => typeof item === 'string')
    ) {
      return statusCode === HTTP_BAD_REQUEST
        ? 'Validation failed'
        : responseObject.message[0];
    }

    return statusCode === HTTP_INTERNAL_SERVER_ERROR
      ? 'Internal server error'
      : 'Request failed';
  }

  private defaultErrorCode(statusCode: number): string {
    switch (statusCode) {
      case HTTP_BAD_REQUEST:
        return 'BAD_REQUEST';
      case HTTP_UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HTTP_FORBIDDEN:
        return 'FORBIDDEN';
      case HTTP_NOT_FOUND:
        return 'NOT_FOUND';
      case HTTP_CONFLICT:
        return 'CONFLICT';
      case HTTP_TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
