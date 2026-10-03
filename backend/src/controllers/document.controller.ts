import { Response, NextFunction } from 'express';
import { documentService } from '../services/document.service.js';
import { AuthRequest } from '../types/index.js';

export class DocumentController {
  async upload(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded', code: 'NO_FILE' });
        return;
      }

      const document = await documentService.createDocument(req.file);
      res.status(201).json({ document });
    } catch (error) {
      next(error);
    }
  }

  async listDocuments(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const documents = await documentService.listDocuments();
      res.status(200).json({ documents });
    } catch (error) {
      next(error);
    }
  }

  async getDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const document = await documentService.getDocument(id);
      res.status(200).json({ document });
    } catch (error) {
      next(error);
    }
  }

  async deleteDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await documentService.deleteDocument(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async getStats(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await documentService.getDocumentStats();
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }
}

export const documentController = new DocumentController();
