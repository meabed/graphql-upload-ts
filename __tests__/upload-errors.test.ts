import { GraphQLError } from 'graphql';
import {
  FieldTooLargeError,
  FileMissingError,
  FileTooLargeError,
  InvalidJSONError,
  InvalidMapError,
  InvalidMultipartError,
  MissingMapError,
  MissingOperationsError,
  RequestDisconnectedError,
  StreamError,
  TooManyFilesError,
  UploadError,
  UploadErrorCode,
} from '../src';

describe('Errors', () => {
  describe('UploadError', () => {
    it('should create an UploadError with correct properties', () => {
      const error = new UploadError('Test message', UploadErrorCode.FILE_TOO_LARGE, 413, true);

      expect(error.name).toBe('UploadError');
      expect(error.message).toBe('Test message');
      expect(error.code).toBe(UploadErrorCode.FILE_TOO_LARGE);
      expect(error.status).toBe(413);
      expect(error.expose).toBe(true);
      expect(error instanceof Error).toBe(true);
      expect(error instanceof UploadError).toBe(true);
    });

    it('should use default values for optional parameters', () => {
      const error = new UploadError('Test message', UploadErrorCode.STREAM_ERROR);

      expect(error.status).toBe(400);
      expect(error.expose).toBe(true);
    });

    it('should convert to GraphQLError correctly', () => {
      const uploadError = new UploadError('Test message', UploadErrorCode.FILE_TOO_LARGE, 413);
      const graphqlError = uploadError.toGraphQLError();

      expect(graphqlError instanceof GraphQLError).toBe(true);
      expect(graphqlError.message).toBe('Test message');
      expect(graphqlError.extensions?.code).toBe(UploadErrorCode.FILE_TOO_LARGE);
      expect(graphqlError.extensions?.status).toBe(413);
    });

    it('should have correct prototype chain', () => {
      const error = new UploadError('Test', UploadErrorCode.INVALID_JSON);

      expect(Object.getPrototypeOf(error)).toBe(UploadError.prototype);
      expect(error.constructor).toBe(UploadError);
    });
  });

  describe('FileTooLargeError', () => {
    it('should create error with correct message and properties', () => {
      const error = new FileTooLargeError(1000000);

      expect(error.name).toBe('UploadError');
      expect(error.message).toBe('File truncated as it exceeds the 1000000 byte size limit.');
      expect(error.code).toBe(UploadErrorCode.FILE_TOO_LARGE);
      expect(error.status).toBe(413);
      expect(error.expose).toBe(true);
    });

    it('should inherit from UploadError', () => {
      const error = new FileTooLargeError(500);

      expect(error instanceof UploadError).toBe(true);
      expect(error instanceof Error).toBe(true);
      expect(error.name).toBe('UploadError');
      expect(error.code).toBe(UploadErrorCode.FILE_TOO_LARGE);
    });

    it('should handle different size values', () => {
      const error1 = new FileTooLargeError(1);
      const error2 = new FileTooLargeError(10000000);

      expect(error1.message).toBe('File truncated as it exceeds the 1 byte size limit.');
      expect(error2.message).toBe('File truncated as it exceeds the 10000000 byte size limit.');
    });
  });

  describe('TooManyFilesError', () => {
    it('should create error with correct message and properties', () => {
      const error = new TooManyFilesError(5);

      expect(error.name).toBe('UploadError');
      expect(error.message).toBe('5 max file uploads exceeded.');
      expect(error.code).toBe(UploadErrorCode.TOO_MANY_FILES);
      expect(error.status).toBe(413);
    });

    it('should handle different max file values', () => {
      const error1 = new TooManyFilesError(1);
      const error2 = new TooManyFilesError(100);

      expect(error1.message).toBe('1 max file uploads exceeded.');
      expect(error2.message).toBe('100 max file uploads exceeded.');
    });
  });

  describe('FieldTooLargeError', () => {
    it('should create error with correct message and properties', () => {
      const error = new FieldTooLargeError('operations', 1000000);

      expect(error.name).toBe('UploadError');
      expect(error.message).toBe(
        "The 'operations' multipart field value exceeds the 1000000 byte size limit."
      );
      expect(error.code).toBe(UploadErrorCode.FIELD_TOO_LARGE);
      expect(error.status).toBe(413);
    });

    it('should handle different field names and sizes', () => {
      const error1 = new FieldTooLargeError('map', 500);
      const error2 = new FieldTooLargeError('custom-field', 2000000);

      expect(error1.message).toBe(
        "The 'map' multipart field value exceeds the 500 byte size limit."
      );
      expect(error2.message).toBe(
        "The 'custom-field' multipart field value exceeds the 2000000 byte size limit."
      );
    });
  });

  describe('InvalidMultipartError', () => {
    it('should create error with correct properties', () => {
      const error = new InvalidMultipartError('Custom multipart error');

      expect(error.name).toBe('UploadError');
      expect(error.message).toBe('Custom multipart error');
      expect(error.code).toBe(UploadErrorCode.INVALID_MULTIPART);
      expect(error.status).toBe(400);
    });
  });

  describe('MissingOperationsError', () => {
    it('should create error with standard message', () => {
      const error = new MissingOperationsError();

      expect(error.name).toBe('UploadError');
      expect(error.message).toBe(
        "Missing multipart field 'operations' (https://github.com/jaydenseric/graphql-multipart-request-spec)."
      );
      expect(error.code).toBe(UploadErrorCode.MISSING_OPERATIONS);
      expect(error.status).toBe(400);
    });
  });

  describe('MissingMapError', () => {
    it('should create error with standard message', () => {
      const error = new MissingMapError();

      expect(error.name).toBe('UploadError');
      expect(error.message).toBe(
        "Missing multipart field 'map' (https://github.com/jaydenseric/graphql-multipart-request-spec)."
      );
      expect(error.code).toBe(UploadErrorCode.MISSING_MAP);
      expect(error.status).toBe(400);
    });
  });

  describe('InvalidJSONError', () => {
    it('should create error with field-specific message', () => {
      const error = new InvalidJSONError('operations');

      expect(error.name).toBe('UploadError');
      expect(error.message).toBe(
        "Invalid JSON in the 'operations' multipart field (https://github.com/jaydenseric/graphql-multipart-request-spec)."
      );
      expect(error.code).toBe(UploadErrorCode.INVALID_JSON);
      expect(error.status).toBe(400);
    });

    it('should handle different field names', () => {
      const error1 = new InvalidJSONError('map');
      const error2 = new InvalidJSONError('custom');

      expect(error1.message).toBe(
        "Invalid JSON in the 'map' multipart field (https://github.com/jaydenseric/graphql-multipart-request-spec)."
      );
      expect(error2.message).toBe(
        "Invalid JSON in the 'custom' multipart field (https://github.com/jaydenseric/graphql-multipart-request-spec)."
      );
    });
  });

  describe('InvalidMapError', () => {
    it('should create error with custom message and spec URL', () => {
      const error = new InvalidMapError('Map format is invalid');

      expect(error.name).toBe('UploadError');
      expect(error.message).toBe(
        'Map format is invalid (https://github.com/jaydenseric/graphql-multipart-request-spec).'
      );
      expect(error.code).toBe(UploadErrorCode.INVALID_MAP);
      expect(error.status).toBe(400);
    });

    it('should append spec URL to any message', () => {
      const error = new InvalidMapError('Custom validation failed');

      expect(error.message).toBe(
        'Custom validation failed (https://github.com/jaydenseric/graphql-multipart-request-spec).'
      );
    });
  });

  describe('FileMissingError', () => {
    it('should create error with standard message', () => {
      const error = new FileMissingError();

      expect(error.name).toBe('UploadError');
      expect(error.message).toBe('File missing in the request.');
      expect(error.code).toBe(UploadErrorCode.FILE_MISSING);
      expect(error.status).toBe(400);
    });
  });

  describe('StreamError', () => {
    it('should create error with custom message and 500 status', () => {
      const error = new StreamError('Stream processing failed');

      expect(error.name).toBe('UploadError');
      expect(error.message).toBe('Stream processing failed');
      expect(error.code).toBe(UploadErrorCode.STREAM_ERROR);
      expect(error.status).toBe(500);
    });

    it('should handle different error messages', () => {
      const error1 = new StreamError('Connection lost');
      const error2 = new StreamError('Parse error');

      expect(error1.message).toBe('Connection lost');
      expect(error2.message).toBe('Parse error');
    });
  });

  describe('RequestDisconnectedError', () => {
    it('should create error with standard message and 499 status', () => {
      const error = new RequestDisconnectedError();

      expect(error.name).toBe('UploadError');
      expect(error.message).toBe('Request disconnected during file upload stream parsing.');
      expect(error.code).toBe(UploadErrorCode.REQUEST_DISCONNECTED);
      expect(error.status).toBe(499);
    });
  });

  describe('UploadErrorCode enum', () => {
    it('should have all expected error codes', () => {
      expect(UploadErrorCode.FILE_TOO_LARGE).toBe('FILE_TOO_LARGE');
      expect(UploadErrorCode.TOO_MANY_FILES).toBe('TOO_MANY_FILES');
      expect(UploadErrorCode.FIELD_TOO_LARGE).toBe('FIELD_TOO_LARGE');
      expect(UploadErrorCode.INVALID_MULTIPART).toBe('INVALID_MULTIPART');
      expect(UploadErrorCode.MISSING_OPERATIONS).toBe('MISSING_OPERATIONS');
      expect(UploadErrorCode.MISSING_MAP).toBe('MISSING_MAP');
      expect(UploadErrorCode.INVALID_JSON).toBe('INVALID_JSON');
      expect(UploadErrorCode.INVALID_MAP).toBe('INVALID_MAP');
      expect(UploadErrorCode.FILE_MISSING).toBe('FILE_MISSING');
      expect(UploadErrorCode.STREAM_ERROR).toBe('STREAM_ERROR');
      expect(UploadErrorCode.REQUEST_DISCONNECTED).toBe('REQUEST_DISCONNECTED');
      expect(UploadErrorCode.INVALID_UPLOAD_VALUE).toBe('INVALID_UPLOAD_VALUE');
      expect(UploadErrorCode.UPLOAD_LITERAL_UNSUPPORTED).toBe('UPLOAD_LITERAL_UNSUPPORTED');
      expect(UploadErrorCode.UPLOAD_SERIALIZATION_UNSUPPORTED).toBe(
        'UPLOAD_SERIALIZATION_UNSUPPORTED'
      );
    });
  });

  describe('Error inheritance and instanceof checks', () => {
    it('should maintain proper inheritance chain for all error types', () => {
      const errors = [
        new FileTooLargeError(1000),
        new TooManyFilesError(5),
        new FieldTooLargeError('test', 500),
        new InvalidMultipartError('test'),
        new MissingOperationsError(),
        new MissingMapError(),
        new InvalidJSONError('test'),
        new InvalidMapError('test'),
        new FileMissingError(),
        new StreamError('test'),
        new RequestDisconnectedError(),
      ];

      // biome-ignore lint/complexity/noForEach: this is a test
      errors.forEach((error) => {
        expect(error instanceof Error).toBe(true);
        expect(error instanceof UploadError).toBe(true);
        expect(error.name).toBe('UploadError');
      });
    });

    it('should be catchable as Error', () => {
      const error = new FileTooLargeError(1000);
      let caught = false;

      try {
        throw error;
      } catch (e) {
        if (e instanceof Error) {
          caught = true;
          expect(e.message).toBe('File truncated as it exceeds the 1000 byte size limit.');
        }
      }

      expect(caught).toBe(true);
    });

    it('should be catchable as UploadError', () => {
      const error = new TooManyFilesError(3);
      let caught = false;

      try {
        throw error;
      } catch (e) {
        if (e instanceof UploadError) {
          caught = true;
          expect(e.code).toBe(UploadErrorCode.TOO_MANY_FILES);
        }
      }

      expect(caught).toBe(true);
    });
  });
});
