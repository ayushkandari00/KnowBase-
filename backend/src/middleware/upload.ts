import multer from 'multer';
import { env } from '../config/env.js';

/**
 * Multer configured with in-memory storage and a hard size limit.
 * Files are validated (content sniffing, filename sanitisation) in the
 * document service before anything is written to disk.
 */
export const uploadSingleFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE, files: 1, fields: 5 },
}).single('file');
