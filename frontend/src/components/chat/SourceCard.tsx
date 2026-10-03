import React from 'react';
import { FileText } from 'lucide-react';
import { Source } from '@/types/index.js';
import { formatPercent, getFileIcon } from '@/lib/utils.js';

interface SourceCardProps {
  source: Source;
  index: number;
}

export function SourceCard({ source, index }: SourceCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-3 text-sm">
      <div className="mt-0.5 text-lg">{getFileIcon(source.fileType)}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">{source.filename}</span>
          <span className="shrink-0 text-xs text-muted-foreground">#{index + 1}</span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          {source.page && <span>Page {source.page}</span>}
          <span>Chunk {source.chunkIndex}</span>
          <span className="font-medium text-green-600">
            {formatPercent(source.similarity)} relevance
          </span>
        </div>
        {source.content && (
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 italic">
            &ldquo;{source.content}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
