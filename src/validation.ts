import type { UploadOptions } from './processRequest';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const DEFAULT_MAX_FIELD_SIZE = 1_000_000; // 1MB
export const DEFAULT_MAX_FILE_SIZE = Number.POSITIVE_INFINITY;
export const DEFAULT_MAX_FILES = Number.POSITIVE_INFINITY;

export function validateOptions(options?: UploadOptions): UploadOptions {
  const validatedOptions: Required<UploadOptions> = {
    maxFieldSize: options?.maxFieldSize ?? DEFAULT_MAX_FIELD_SIZE,
    maxFileSize: options?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE,
    maxFiles: options?.maxFiles ?? DEFAULT_MAX_FILES,
  };

  if (validatedOptions.maxFieldSize <= 0) {
    throw new Error('maxFieldSize must be a positive number');
  }

  if (validatedOptions.maxFileSize <= 0) {
    throw new Error('maxFileSize must be a positive number');
  }

  if (validatedOptions.maxFiles <= 0) {
    throw new Error('maxFiles must be a positive number');
  }

  if (
    !Number.isInteger(validatedOptions.maxFiles) &&
    validatedOptions.maxFiles !== Number.POSITIVE_INFINITY
  ) {
    throw new Error('maxFiles must be an integer');
  }

  return validatedOptions;
}

export function validateMimeType(mimetype: string, allowedTypes?: string[]): ValidationResult {
  if (!allowedTypes || allowedTypes.length === 0) {
    return { isValid: true };
  }

  const isValid = allowedTypes.some((type) => {
    if (type.endsWith('/*')) {
      const prefix = type.slice(0, -2);
      return mimetype.startsWith(`${prefix}/`);
    }
    return mimetype === type;
  });

  return {
    isValid,
    error: isValid ? undefined : `File type '${mimetype}' is not allowed`,
  };
}

export function validateFileExtension(
  filename: string,
  allowedExtensions?: string[]
): ValidationResult {
  if (!allowedExtensions || allowedExtensions.length === 0) {
    return { isValid: true };
  }

  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension) {
    return {
      isValid: false,
      error: 'File must have an extension',
    };
  }

  const isValid = allowedExtensions.some((ext) => ext.toLowerCase() === extension);

  return {
    isValid,
    error: isValid ? undefined : `File extension '.${extension}' is not allowed`,
  };
}

export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');

  // Remove directory separators
  sanitized = sanitized.replace(/[\/\\]/g, '');

  // Remove control characters and non-printable characters
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional to remove control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x7f-\x9f]/g, '');

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

  // If filename is empty after sanitization, generate a default name
  if (!sanitized) {
    sanitized = `upload_${Date.now()}`;
  }

  // Limit filename length
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    const extension = sanitized.split('.').pop();
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
    if (extension && extension.length < 20) {
      sanitized = `${nameWithoutExt.substring(0, maxLength - extension.length - 1)}.${extension}`;
    } else {
      sanitized = sanitized.substring(0, maxLength);
    }
  }

  return sanitized;
}
