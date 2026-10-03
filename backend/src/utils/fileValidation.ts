import path from 'node:path';
import type { SupportedFileType } from '../types/index.js';
import { FileValidationError } from './errors.js';

export const SUPPORTED_EXTENSIONS: Record<string, SupportedFileType> = {
  '.pdf': 'pdf',
  '.txt': 'txt',
  '.md': 'md',
  '.markdown': 'md',
};

const MAX_FILENAME_LENGTH = 200;

/**
 * Normalises a client-supplied filename: strips directories, control
 * characters and unusual symbols. The result is only used for display and
 * citations; files are stored on disk under a server-generated name.
 */
export function sanitizeFilename(original: string): string {
  const base = path.basename(original.replace(/\\/g, '/'));
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, '').replace(/[^\w.\- ()&,]/g, '_').trim();
  if (!cleaned || cleaned === '.' || cleaned === '..' || cleaned.startsWith('.')) {
    throw new FileValidationError('Invalid filename', 'INVALID_FILENAME');
  }
  if (cleaned.length > MAX_FILENAME_LENGTH) {
    throw new FileValidationError(`Filename must be at most ${MAX_FILENAME_LENGTH} characters`, 'INVALID_FILENAME');
  }
  return cleaned;
}

export function detectFileTypeFromName(filename: string): SupportedFileType {
  const type = SUPPORTED_EXTENSIONS[path.extname(filename).toLowerCase()];
  if (!type) {
    throw new FileValidationError('Unsupported file type. Allowed: PDF, TXT, MD', 'UNSUPPORTED_FILE_TYPE');
  }
  return type;
}

/**
 * Validates the actual file bytes rather than trusting the client MIME type:
 *  - PDFs must start with the `%PDF-` magic number.
 *  - TXT/MD must be valid UTF-8 and contain no NUL bytes (i.e. not binary).
 *  - Files must not be empty / whitespace only.
 */
export function validateFileContent(buffer: Buffer, type: SupportedFileType): void {
  if (buffer.length === 0) throw new FileValidationError('File is empty', 'EMPTY_FILE');

  if (type === 'pdf') {
    if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
      throw new FileValidationError('File content is not a valid PDF', 'INVALID_FILE_CONTENT');
    }
    return;
  }

  if (buffer.includes(0)) {
    throw new FileValidationError('Text file appears to be binary', 'INVALID_FILE_CONTENT');
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new FileValidationError('Text file must be UTF-8 encoded', 'INVALID_FILE_CONTENT');
  }
  if (text.trim().length === 0) throw new FileValidationError('File is empty', 'EMPTY_FILE');
}

/** Runs all checks and returns the normalised filename and detected type. */
export function validateUpload(originalName: string, buffer: Buffer): { filename: string; fileType: SupportedFileType } {
  const filename = sanitizeFilename(originalName);
  const fileType = detectFileTypeFromName(filename);
  validateFileContent(buffer, fileType);
  return { filename, fileType };
}
