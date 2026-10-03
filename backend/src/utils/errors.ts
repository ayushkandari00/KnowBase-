/**
 * Application error hierarchy. Every error carries an HTTP status and a
 * stable machine-readable `code`, which the central error handler serialises.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = 'INTERNAL_ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHENTICATED') {
    super(message, 401, code);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class FileValidationError extends AppError {
  constructor(message: string, code = 'INVALID_FILE') {
    super(message, 400, code);
  }
}

export class DocumentProcessingError extends AppError {
  constructor(message: string) {
    super(message, 422, 'DOCUMENT_PROCESSING_FAILED');
  }
}

/** Failures in the AI layer (embeddings, vector search, LLM). */
export class AIServiceError extends AppError {
  constructor(message: string, code: 'EMBEDDING_FAILED' | 'VECTOR_SEARCH_FAILED' | 'LLM_FAILED' | 'RETRIEVAL_FAILED') {
    super(message, 502, code);
  }
}
