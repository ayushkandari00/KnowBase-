import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { api, getErrorMessage } from '@/services/api.js';
import { cn } from '@/lib/utils.js';

interface FeedbackButtonsProps {
  messageId: string;
  className?: string;
}

export function FeedbackButtons({ messageId, className }: FeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<'POSITIVE' | 'NEGATIVE' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFeedback = async (type: 'POSITIVE' | 'NEGATIVE') => {
    if (feedback || isLoading) return;
    setIsLoading(true);
    try {
      await api.submitFeedback(messageId, type);
      setFeedback(type);
    } catch (err) {
      console.error('Feedback error:', getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (feedback) {
    return (
      <div className={cn('flex items-center gap-1 text-xs text-muted-foreground', className)}>
        <Check className="h-3 w-3 text-green-500" />
        <span>Thanks for your feedback!</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleFeedback('POSITIVE')}
        disabled={isLoading}
        className="h-7 px-2 text-muted-foreground hover:text-green-600"
        title="Helpful"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleFeedback('NEGATIVE')}
        disabled={isLoading}
        className="h-7 px-2 text-muted-foreground hover:text-red-600"
        title="Not helpful"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
