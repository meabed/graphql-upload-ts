import type { UploadOptions } from '../src/processRequest';
import {
  DEFAULT_MAX_FIELD_SIZE,
  DEFAULT_MAX_FILE_SIZE,
  DEFAULT_MAX_FILES,
  sanitizeFilename,
  type ValidationResult,
  validateFileExtension,
  validateMimeType,
  validateOptions,
} from '../src/validation';

describe('Validation', () => {
  describe('validateOptions', () => {
    it('should use default values for undefined options', () => {
      const result = validateOptions(undefined);

      expect(result.maxFieldSize).toBe(DEFAULT_MAX_FIELD_SIZE);
      expect(result.maxFileSize).toBe(DEFAULT_MAX_FILE_SIZE);
      expect(result.maxFiles).toBe(DEFAULT_MAX_FILES);
    });

    it('should use default values for empty options object', () => {
      const result = validateOptions({});

      expect(result.maxFieldSize).toBe(DEFAULT_MAX_FIELD_SIZE);
      expect(result.maxFileSize).toBe(DEFAULT_MAX_FILE_SIZE);
      expect(result.maxFiles).toBe(DEFAULT_MAX_FILES);
    });

    it('should preserve provided options', () => {
      const options: UploadOptions = {
        maxFieldSize: 500000,
        maxFileSize: 10000000,
        maxFiles: 5,
      };

      const result = validateOptions(options);

      expect(result.maxFieldSize).toBe(500000);
      expect(result.maxFileSize).toBe(10000000);
      expect(result.maxFiles).toBe(5);
    });

    it('should use defaults for null/undefined individual options', () => {
      const options: UploadOptions = {
        maxFieldSize: undefined,
        maxFileSize: undefined,
        maxFiles: undefined,
      };

      const result = validateOptions(options);

      expect(result.maxFieldSize).toBe(DEFAULT_MAX_FIELD_SIZE);
      expect(result.maxFileSize).toBe(DEFAULT_MAX_FILE_SIZE);
      expect(result.maxFiles).toBe(DEFAULT_MAX_FILES);
    });

    it('should throw error for non-positive maxFieldSize', () => {
      expect(() => validateOptions({ maxFieldSize: 0 })).toThrow(
        'maxFieldSize must be a positive number'
      );
      expect(() => validateOptions({ maxFieldSize: -1 })).toThrow(
        'maxFieldSize must be a positive number'
      );
      expect(() => validateOptions({ maxFieldSize: -100 })).toThrow(
        'maxFieldSize must be a positive number'
      );
    });

    it('should throw error for non-positive maxFileSize', () => {
      expect(() => validateOptions({ maxFileSize: 0 })).toThrow(
        'maxFileSize must be a positive number'
      );
      expect(() => validateOptions({ maxFileSize: -1 })).toThrow(
        'maxFileSize must be a positive number'
      );
      expect(() => validateOptions({ maxFileSize: -1000000 })).toThrow(
        'maxFileSize must be a positive number'
      );
    });

    it('should throw error for non-positive maxFiles', () => {
      expect(() => validateOptions({ maxFiles: 0 })).toThrow('maxFiles must be a positive number');
      expect(() => validateOptions({ maxFiles: -1 })).toThrow('maxFiles must be a positive number');
      expect(() => validateOptions({ maxFiles: -10 })).toThrow(
        'maxFiles must be a positive number'
      );
    });

    it('should throw error for non-integer maxFiles', () => {
      expect(() => validateOptions({ maxFiles: 1.5 })).toThrow('maxFiles must be an integer');
      expect(() => validateOptions({ maxFiles: 3.14 })).toThrow('maxFiles must be an integer');
      expect(() => validateOptions({ maxFiles: 10.1 })).toThrow('maxFiles must be an integer');
    });

    it('should accept valid positive values', () => {
      const options: UploadOptions = {
        maxFieldSize: 1,
        maxFileSize: 1,
        maxFiles: 1,
      };

      expect(() => validateOptions(options)).not.toThrow();

      const result = validateOptions(options);
      expect(result.maxFieldSize).toBe(1);
      expect(result.maxFileSize).toBe(1);
      expect(result.maxFiles).toBe(1);
    });

    it('should accept Infinity for file size limits', () => {
      const options: UploadOptions = {
        maxFileSize: Number.POSITIVE_INFINITY,
        maxFiles: Number.POSITIVE_INFINITY,
      };

      expect(() => validateOptions(options)).not.toThrow();

      const result = validateOptions(options);
      expect(result.maxFileSize).toBe(Number.POSITIVE_INFINITY);
      expect(result.maxFiles).toBe(Number.POSITIVE_INFINITY);
    });
  });

  describe('validateMimeType', () => {
    it('should return valid for any mimetype when no allowed types specified', () => {
      const result1 = validateMimeType('image/jpeg');
      const result2 = validateMimeType('application/pdf', []);
      const result3 = validateMimeType('text/plain', undefined);

      expect(result1.isValid).toBe(true);
      expect(result1.error).toBeUndefined();
      expect(result2.isValid).toBe(true);
      expect(result2.error).toBeUndefined();
      expect(result3.isValid).toBe(true);
      expect(result3.error).toBeUndefined();
    });

    it('should validate exact mimetype matches', () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'text/plain'];

      const result1 = validateMimeType('image/jpeg', allowedTypes);
      const result2 = validateMimeType('image/png', allowedTypes);
      const result3 = validateMimeType('text/plain', allowedTypes);

      expect(result1.isValid).toBe(true);
      expect(result1.error).toBeUndefined();
      expect(result2.isValid).toBe(true);
      expect(result2.error).toBeUndefined();
      expect(result3.isValid).toBe(true);
      expect(result3.error).toBeUndefined();
    });

    it('should reject disallowed mimetypes', () => {
      const allowedTypes = ['image/jpeg', 'text/plain'];

      const result = validateMimeType('application/pdf', allowedTypes);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("File type 'application/pdf' is not allowed");
    });

    it('should validate wildcard patterns', () => {
      const allowedTypes = ['image/*', 'text/*'];

      const result1 = validateMimeType('image/jpeg', allowedTypes);
      const result2 = validateMimeType('image/png', allowedTypes);
      const result3 = validateMimeType('image/gif', allowedTypes);
      const result4 = validateMimeType('text/plain', allowedTypes);
      const result5 = validateMimeType('text/html', allowedTypes);

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
      expect(result3.isValid).toBe(true);
      expect(result4.isValid).toBe(true);
      expect(result5.isValid).toBe(true);
    });

    it('should reject types that do not match wildcards', () => {
      const allowedTypes = ['image/*'];

      const result1 = validateMimeType('application/pdf', allowedTypes);
      const result2 = validateMimeType('text/plain', allowedTypes);

      expect(result1.isValid).toBe(false);
      expect(result1.error).toBe("File type 'application/pdf' is not allowed");
      expect(result2.isValid).toBe(false);
      expect(result2.error).toBe("File type 'text/plain' is not allowed");
    });

    it('should handle mixed exact and wildcard patterns', () => {
      const allowedTypes = ['image/*', 'application/pdf', 'text/plain'];

      const result1 = validateMimeType('image/jpeg', allowedTypes); // matches image/*
      const result2 = validateMimeType('application/pdf', allowedTypes); // exact match
      const result3 = validateMimeType('text/plain', allowedTypes); // exact match
      const result4 = validateMimeType('application/json', allowedTypes); // no match

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
      expect(result3.isValid).toBe(true);
      expect(result4.isValid).toBe(false);
      expect(result4.error).toBe("File type 'application/json' is not allowed");
    });

    it('should handle edge cases with wildcards', () => {
      const allowedTypes = ['*/json', 'image/*'];

      // Should not match */json as it only handles prefix wildcards
      const result1 = validateMimeType('application/json', allowedTypes);
      const result2 = validateMimeType('image/png', allowedTypes);

      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(true);
    });
  });

  describe('validateFileExtension', () => {
    it('should return valid when no allowed extensions specified', () => {
      const result1 = validateFileExtension('document.pdf');
      const result2 = validateFileExtension('image.jpg', []);
      const result3 = validateFileExtension('file.txt', undefined);

      expect(result1.isValid).toBe(true);
      expect(result1.error).toBeUndefined();
      expect(result2.isValid).toBe(true);
      expect(result2.error).toBeUndefined();
      expect(result3.isValid).toBe(true);
      expect(result3.error).toBeUndefined();
    });

    it('should validate allowed extensions (case insensitive)', () => {
      const allowedExtensions = ['jpg', 'png', 'pdf'];

      const result1 = validateFileExtension('image.jpg', allowedExtensions);
      const result2 = validateFileExtension('image.JPG', allowedExtensions);
      const result3 = validateFileExtension('image.PNG', allowedExtensions);
      const result4 = validateFileExtension('document.pdf', allowedExtensions);

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
      expect(result3.isValid).toBe(true);
      expect(result4.isValid).toBe(true);
    });

    it('should reject disallowed extensions', () => {
      const allowedExtensions = ['jpg', 'png'];

      const result = validateFileExtension('document.pdf', allowedExtensions);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("File extension '.pdf' is not allowed");
    });

    it('should handle files without extensions', () => {
      const allowedExtensions = ['txt'];

      const result1 = validateFileExtension('filename', allowedExtensions);
      const result2 = validateFileExtension('filename.', allowedExtensions);

      expect(result1.isValid).toBe(false);
      expect(result1.error).toBe("File extension '.filename' is not allowed");
      expect(result2.isValid).toBe(false);
      expect(result2.error).toBe('File must have an extension');
    });

    it('should handle multiple extensions', () => {
      const allowedExtensions = ['tar.gz', 'gz'];

      const result1 = validateFileExtension('archive.tar.gz', allowedExtensions);
      const result2 = validateFileExtension('file.gz', allowedExtensions);

      // Only checks the last extension
      expect(result1.isValid).toBe(true); // matches .gz
      expect(result2.isValid).toBe(true); // matches .gz
    });

    it('should handle case sensitivity correctly', () => {
      const allowedExtensions = ['JPG', 'png'];

      const result1 = validateFileExtension('image.jpg', allowedExtensions);
      const result2 = validateFileExtension('image.PNG', allowedExtensions);

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    it('should handle edge cases', () => {
      const allowedExtensions = ['txt'];

      const result1 = validateFileExtension('.txt', allowedExtensions);
      const result2 = validateFileExtension('..txt', allowedExtensions);
      const result3 = validateFileExtension('file.txt.bak', allowedExtensions);

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
      expect(result3.isValid).toBe(false);
      expect(result3.error).toBe("File extension '.bak' is not allowed");
    });
  });

  describe('sanitizeFilename', () => {
    it('should return original filename if already clean', () => {
      const result = sanitizeFilename('document.pdf');
      expect(result).toBe('document.pdf');
    });

    it('should remove path traversal attempts', () => {
      const result1 = sanitizeFilename('../document.pdf');
      const result2 = sanitizeFilename('../../secret.txt');
      const result3 = sanitizeFilename('folder/../file.txt');

      expect(result1).toBe('document.pdf');
      expect(result2).toBe('secret.txt');
      expect(result3).toBe('folderfile.txt'); // Directory separators are also removed
    });

    it('should remove directory separators', () => {
      const result1 = sanitizeFilename('folder/file.txt');
      const result2 = sanitizeFilename('folder\\file.txt');
      const result3 = sanitizeFilename('/etc/passwd');
      const result4 = sanitizeFilename('C:\\Windows\\system32\\file.exe');

      expect(result1).toBe('folderfile.txt');
      expect(result2).toBe('folderfile.txt');
      expect(result3).toBe('etcpasswd');
      expect(result4).toBe('C:Windowssystem32file.exe'); // : is not removed, only / and \
    });

    it('should remove control characters', () => {
      const result1 = sanitizeFilename('file\x00name.txt');
      const result2 = sanitizeFilename('file\x1fname.txt');
      const result3 = sanitizeFilename('file\x7fname.txt');
      const result4 = sanitizeFilename('file\x9fname.txt');

      expect(result1).toBe('filename.txt');
      expect(result2).toBe('filename.txt');
      expect(result3).toBe('filename.txt');
      expect(result4).toBe('filename.txt');
    });

    it('should remove leading and trailing dots and spaces', () => {
      const result1 = sanitizeFilename('  filename.txt  ');
      const result2 = sanitizeFilename('...filename.txt...');
      const result3 = sanitizeFilename(' . filename.txt . ');

      expect(result1).toBe('filename.txt');
      expect(result2).toBe('filename.txt');
      expect(result3).toBe('filename.txt');
    });

    it('should generate default name for empty results', () => {
      const result1 = sanitizeFilename('');
      const result2 = sanitizeFilename('   ');
      const result3 = sanitizeFilename('...');
      const result4 = sanitizeFilename('/\\');

      expect(result1).toMatch(/^upload_\d+$/);
      expect(result2).toMatch(/^upload_\d+$/);
      expect(result3).toMatch(/^upload_\d+$/);
      expect(result4).toMatch(/^upload_\d+$/);
    });

    it('should limit filename length', () => {
      const longName = 'a'.repeat(300);
      const result = sanitizeFilename(longName);

      expect(result.length).toBe(255);
      expect(result).toBe('a'.repeat(255));
    });

    it('should preserve extension when truncating long filenames', () => {
      // biome-ignore lint/style/useTemplate: Intentional to test long filenames
      const longName = 'a'.repeat(300) + '.txt';
      const result = sanitizeFilename(longName);

      expect(result.length).toBe(255);
      expect(result.endsWith('.txt')).toBe(true);
      expect(result.startsWith('a'.repeat(251))).toBe(true);
    });

    it('should handle long extensions correctly', () => {
      const longExt = 'x'.repeat(30);
      const filename = `file.${longExt}`;
      const result = sanitizeFilename(filename);

      // Should not try to preserve extension if it's too long (>= 20 chars)
      expect(result.length).toBe(filename.length); // Not truncated since total length is under 255
      expect(result).toBe(filename);
    });

    it('should handle complex real-world cases', () => {
      const cases = [
        'My File (1).pdf',
        'résumé_2023.docx',
        'file-name_with+special&chars.txt',
        'UPPER-case.PDF',
      ];

      const results = cases.map(sanitizeFilename);

      expect(results[0]).toBe('My File (1).pdf');
      expect(results[1]).toBe('résumé_2023.docx');
      expect(results[2]).toBe('file-name_with+special&chars.txt');
      expect(results[3]).toBe('UPPER-case.PDF');
    });

    it('should handle files with no extension but long names', () => {
      const longName = 'a'.repeat(300);
      const result = sanitizeFilename(longName);

      expect(result.length).toBe(255);
      expect(result).toBe('a'.repeat(255));
    });

    it('should handle multiple dots in filename', () => {
      const filename = 'file.backup.2023.txt';
      // biome-ignore lint/style/useTemplate: Intentional to test long filenames
      const longName = 'a'.repeat(300) + '.backup.2023.txt';

      const result1 = sanitizeFilename(filename);
      const result2 = sanitizeFilename(longName);

      expect(result1).toBe('file.backup.2023.txt');
      expect(result2.length).toBe(255);
      expect(result2.endsWith('.txt')).toBe(true);
    });

    it('should handle edge case with only extension', () => {
      const result1 = sanitizeFilename('.gitignore');
      const result2 = sanitizeFilename('.hidden');

      // Leading dots are removed by the sanitization process
      expect(result1).toBe('gitignore');
      expect(result2).toBe('hidden');
    });
  });

  describe('DEFAULT constants', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_MAX_FIELD_SIZE).toBe(1_000_000); // 1MB
      expect(DEFAULT_MAX_FILE_SIZE).toBe(Number.POSITIVE_INFINITY);
      expect(DEFAULT_MAX_FILES).toBe(Number.POSITIVE_INFINITY);
    });
  });

  describe('ValidationResult interface', () => {
    it('should match expected structure for valid results', () => {
      const result: ValidationResult = { isValid: true };

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should match expected structure for invalid results', () => {
      const result: ValidationResult = {
        isValid: false,
        error: 'Test error message',
      };

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Test error message');
    });
  });
});
