import React, { useState } from 'react';
import { Copy, Check, Bot, User } from 'lucide-react';
import { Message } from '@/types/index.js';
import { SourceCard } from './SourceCard.js';
import { FeedbackButtons } from './FeedbackButtons.js';
import { Button } from '@/components/ui/button.js';
import { cn, formatDateTime } from '@/lib/utils.js';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'USER';
  const sources = Array.isArray(message.sources) ? message.sources : [];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white',
          isUser ? 'bg-primary' : 'bg-slate-600'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className={cn('max-w-[80%] space-y-2', isUser ? 'items-end' : 'items-start')}>
        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted text-foreground rounded-tl-sm'
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          {isStreaming && (
            <span className="inline-flex ml-1 gap-0.5 items-end">
              <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-current opacity-75 [animation-delay:0ms]" />
              <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-current opacity-75 [animation-delay:150ms]" />
              <span className="animate-bounce h-1.5 w-1.5 rounded-full bg-current opacity-75 [animation-delay:300ms]" />
            </span>
          )}
        </div>

        {/* Sources */}
        {!isUser && sources.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <span>📚</span> Sources
            </p>
            <div className="space-y-1.5">
              {sources.map((source, i) => (
                <SourceCard
                  key={`${source.documentId}-${source.chunkIndex}`}
                  source={source}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {!isUser && !isStreaming && (
          <div className="flex items-center gap-2">
            <FeedbackButtons messageId={message.id} />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-muted-foreground"
              title="Copy response"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(message.createdAt)}
            </span>
          </div>
        )}

        {isUser && (
          <span className="text-xs text-muted-foreground px-1">
            {formatDateTime(message.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}
