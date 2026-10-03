import { Document } from '@langchain/core/documents';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { logger } from '../utils/logger.js';

export interface LoaderOptions {
  documentId: string;
  filename: string;
  fileType: string;
  filePath: string;
}

export async function loadDocument(options: LoaderOptions): Promise<Document[]> {
  const { documentId, filename, fileType, filePath } = options;

  logger.info(`Loading document: ${filename} (${fileType})`);

  let docs: Document[];

  try {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        docs = await loadPDF(filePath);
        break;
      case 'txt':
        docs = await loadText(filePath);
        break;
      case 'md':
      case 'markdown':
        docs = await loadMarkdown(filePath);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Enrich each document with our metadata
    return docs.map((doc, index) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        documentId,
        filename,
        fileType,
        source: filename,
        pageNumber: doc.metadata.loc?.pageNumber ?? doc.metadata.page ?? index + 1,
      },
    }));
  } catch (error) {
    logger.error(`Failed to load document: ${filename}`, { error });
    throw new Error(
      `Document loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function loadPDF(filePath: string): Promise<Document[]> {
  const loader = new PDFLoader(filePath, {
    splitPages: true,
  });
  return loader.load();
}

async function loadText(filePath: string): Promise<Document[]> {
  const loader = new TextLoader(filePath);
  return loader.load();
}

async function loadMarkdown(filePath: string): Promise<Document[]> {
  // Use TextLoader for markdown - it preserves content as-is
  const loader = new TextLoader(filePath);
  return loader.load();
}
