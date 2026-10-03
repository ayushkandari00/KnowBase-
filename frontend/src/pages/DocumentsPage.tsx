import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Upload,
  Trash2,
  RefreshCw,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
} from 'lucide-react';
import { api, getErrorMessage } from '@/services/api.js';
import { Document } from '@/types/index.js';
import { AppLayout } from '@/components/layout/AppLayout.js';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.js';
import { toast } from '@/hooks/use-toast.js';
import { formatDate, formatDateTime, getFileIcon } from '@/lib/utils.js';

function getStatusIcon(status: Document['status']) {
  switch (status) {
    case 'INDEXED':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'PROCESSING':
      return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
    case 'FAILED':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusVariant(status: Document['status']) {
  switch (status) {
    case 'INDEXED': return 'success' as const;
    case 'PROCESSING': return 'processing' as const;
    case 'FAILED': return 'error' as const;
    default: return 'secondary' as const;
  }
}

export function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();

    // Poll for processing documents
    const interval = setInterval(() => {
      if (documents.some((d) => d.status === 'PROCESSING' || d.status === 'UPLOADED')) {
        fetchDocuments();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchDocuments, documents]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['application/pdf', 'text/plain', 'text/markdown'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(file.type) && !['pdf', 'txt', 'md'].includes(ext ?? '')) {
      toast({
        title: 'Invalid file type',
        description: 'Only PDF, TXT, and Markdown files are supported',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const result = await api.uploadDocument(file);
      toast({ title: 'Upload successful', description: result.message });
      await fetchDocuments();
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, filename: string) => {
    setDeletingId(id);
    try {
      await api.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast({ title: 'Document deleted', description: filename });
    } catch (err) {
      toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleReindex = async (id: string) => {
    setReindexingId(id);
    try {
      const result = await api.reindexDocument(id);
      toast({ title: 'Reindexing started', description: result.message });
      await fetchDocuments();
    } catch (err) {
      toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setReindexingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Knowledge Base Documents</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Upload and manage documents that power the AI assistant
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDocuments}
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Upload Document
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.markdown"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Supported formats info */}
          <div className="flex gap-2 text-xs text-muted-foreground items-center">
            <Upload className="h-3.5 w-3.5" />
            <span>Supported formats: PDF, TXT, Markdown (.md)</span>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg p-4">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          ) : documents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold">No documents uploaded</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload your first document to start building the knowledge base
                  </p>
                </div>
                <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Document
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">{getFileIcon(doc.fileType)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm truncate">{doc.filename}</p>
                          <Badge variant={getStatusVariant(doc.status)} className="gap-1">
                            {getStatusIcon(doc.status)}
                            {doc.status.toLowerCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="uppercase">{doc.fileType}</span>
                          {doc.chunkCount > 0 && (
                            <span>{doc.chunkCount} chunks indexed</span>
                          )}
                          <span>Uploaded {formatDate(doc.createdAt)}</span>
                          <span>Updated {formatDateTime(doc.updatedAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {doc.status === 'FAILED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReindex(doc.id)}
                            disabled={reindexingId === doc.id}
                            className="gap-1"
                          >
                            {reindexingId === doc.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                            Reindex
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc.id, doc.filename)}
                          disabled={deletingId === doc.id}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
