import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { documentController } from '../controllers/document.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import { env } from '../config/env.js';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = ['application/pdf', 'text/plain', 'text/markdown'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.pdf', '.txt', '.md'];

  if (allowed.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Allowed: PDF, TXT, MD'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
  },
});

const router = Router();

// All document routes require admin authentication
router.use(authenticate, requireAdmin);

// Upload a document
router.post('/upload', upload.single('file'), (req, res, next) =>
  documentController.upload(req, res, next)
);

// List all documents
router.get('/', (req, res, next) => documentController.listDocuments(req, res, next));

// Get document stats
router.get('/stats', (req, res, next) => documentController.getStats(req, res, next));

// Get a specific document
router.get('/:id', (req, res, next) => documentController.getDocument(req, res, next));

// Delete a document
router.delete('/:id', (req, res, next) => documentController.deleteDocument(req, res, next));

export default router;
