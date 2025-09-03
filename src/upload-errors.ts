import { GraphQLError } from 'graphql';

export enum UploadErrorCode {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  TOO_MANY_FILES = 'TOO_MANY_FILES',
  FIELD_TOO_LARGE = 'FIELD_TOO_LARGE',
  INVALID_MULTIPART = 'INVALID_MULTIPART',
  MISSING_OPERATIONS = 'MISSING_OPERATIONS',
  MISSING_MAP = 'MISSING_MAP',
  INVALID_JSON = 'INVALID_JSON',
  INVALID_MAP = 'INVALID_MAP',
  FILE_MISSING = 'FILE_MISSING',
  STREAM_ERROR = 'STREAM_ERROR',
  REQUEST_DISCONNECTED = 'REQUEST_DISCONNECTED',
  INVALID_UPLOAD_VALUE = 'INVALID_UPLOAD_VALUE',
  UPLOAD_LITERAL_UNSUPPORTED = 'UPLOAD_LITERAL_UNSUPPORTED',
  UPLOAD_SERIALIZATION_UNSUPPORTED = 'UPLOAD_SERIALIZATION_UNSUPPORTED',
}

export class UploadError extends Error {
  public readonly code: UploadErrorCode;
  public readonly status: number;
  public readonly expose: boolean;

  constructor(message: string, code: UploadErrorCode, status = 400, expose = true) {
    super(message);
    this.name = 'UploadError';
    this.code = code;
    this.status = status;
    this.expose = expose;
    Object.setPrototypeOf(this, UploadError.prototype);
  }

  public toGraphQLError(): GraphQLError {
    return new GraphQLError(this.message, {
      extensions: {
        code: this.code,
        status: this.status,
      },
    });
  }
}

export class FileTooLargeError extends UploadError {
  constructor(maxSize: number) {
    super(
      `File truncated as it exceeds the ${maxSize} byte size limit.`,
      UploadErrorCode.FILE_TOO_LARGE,
      413
    );
  }
}

export class TooManyFilesError extends UploadError {
  constructor(maxFiles: number) {
    super(`${maxFiles} max file uploads exceeded.`, UploadErrorCode.TOO_MANY_FILES, 413);
  }
}

export class FieldTooLargeError extends UploadError {
  constructor(fieldName: string, maxSize: number) {
    super(
      `The '${fieldName}' multipart field value exceeds the ${maxSize} byte size limit.`,
      UploadErrorCode.FIELD_TOO_LARGE,
      413
    );
  }
}

export class InvalidMultipartError extends UploadError {
  constructor(message: string) {
    super(message, UploadErrorCode.INVALID_MULTIPART);
  }
}

export class MissingOperationsError extends UploadError {
  constructor() {
    super(
      `Missing multipart field 'operations' (${GRAPHQL_MULTIPART_REQUEST_SPEC_URL}).`,
      UploadErrorCode.MISSING_OPERATIONS
    );
  }
}

export class MissingMapError extends UploadError {
  constructor() {
    super(
      `Missing multipart field 'map' (${GRAPHQL_MULTIPART_REQUEST_SPEC_URL}).`,
      UploadErrorCode.MISSING_MAP
    );
  }
}

export class InvalidJSONError extends UploadError {
  constructor(fieldName: string) {
    super(
      `Invalid JSON in the '${fieldName}' multipart field (${GRAPHQL_MULTIPART_REQUEST_SPEC_URL}).`,
      UploadErrorCode.INVALID_JSON
    );
  }
}

export class InvalidMapError extends UploadError {
  constructor(message: string) {
    super(`${message} (${GRAPHQL_MULTIPART_REQUEST_SPEC_URL}).`, UploadErrorCode.INVALID_MAP);
  }
}

export class FileMissingError extends UploadError {
  constructor() {
    super('File missing in the request.', UploadErrorCode.FILE_MISSING);
  }
}

export class StreamError extends UploadError {
  constructor(message: string) {
    super(message, UploadErrorCode.STREAM_ERROR, 500);
  }
}

export class RequestDisconnectedError extends UploadError {
  constructor() {
    super(
      'Request disconnected during file upload stream parsing.',
      UploadErrorCode.REQUEST_DISCONNECTED,
      499
    );
  }
}

const GRAPHQL_MULTIPART_REQUEST_SPEC_URL =
  'https://github.com/jaydenseric/graphql-multipart-request-spec';
