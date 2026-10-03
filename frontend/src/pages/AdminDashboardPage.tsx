import React, { useEffect, useState } from 'react';
import {
  Users,
  MessageSquare,
  FileText,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { api, getErrorMessage } from '@/services/api.js';
import { Stats, Analytics } from '@/types/index.js';
import { AppLayout } from '@/components/layout/AppLayout.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.js';
import { Badge } from '@/components/ui/badge.js';
import { formatDate, truncate } from '@/lib/utils.js';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
}

function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getDocStatusVariant(status: string) {
  switch (status) {
    case 'INDEXED': return 'success' as const;
    case 'PROCESSING': return 'processing' as const;
    case 'FAILED': return 'error' as const;
    default: return 'secondary' as const;
  }
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [s, a] = await Promise.all([api.getStats(), api.getAnalytics()]);
        setStats(s);
        setAnalytics(a);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  const satisfactionRate =
    stats && stats.feedback.total > 0
      ? Math.round((stats.feedback.positive / stats.feedback.total) * 100)
      : 0;

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Overview of your AI support assistant usage
            </p>
          </div>

          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Users" value={stats.users} icon={Users} />
              <StatCard
                title="Conversations"
                value={stats.conversations}
                icon={MessageSquare}
              />
              <StatCard
                title="Questions Asked"
                value={stats.questions}
                icon={HelpCircle}
              />
              <StatCard
                title="Documents"
                value={stats.documents}
                icon={FileText}
                description={`${stats.indexedChunks} / ${stats.totalChunks} chunks indexed`}
              />
            </div>
          )}

          {/* Feedback */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Positive Feedback</p>
                      <p className="text-3xl font-bold mt-1 text-green-600">
                        {stats.feedback.positive}
                      </p>
                    </div>
                    <ThumbsUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Negative Feedback</p>
                      <p className="text-3xl font-bold mt-1 text-red-600">
                        {stats.feedback.negative}
                      </p>
                    </div>
                    <ThumbsDown className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Satisfaction Rate</p>
                      <p className="text-3xl font-bold mt-1 text-primary">{satisfactionRate}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Analytics Tables */}
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Conversations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Conversations</CardTitle>
                  <CardDescription>Latest user conversations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.recentConversations.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No conversations yet
                      </p>
                    ) : (
                      analytics.recentConversations.map((conv) => (
                        <div
                          key={conv.id}
                          className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {truncate(conv.title, 40)}
                            </p>
                            <p className="text-xs text-muted-foreground">{conv.user.email}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs text-muted-foreground">
                              {conv._count.messages} msgs
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(conv.createdAt)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Documents</CardTitle>
                  <CardDescription>Recently uploaded knowledge base files</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.recentDocuments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No documents yet
                      </p>
                    ) : (
                      analytics.recentDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">{doc.filename}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.chunkCount} chunks
                            </p>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <Badge variant={getDocStatusVariant(doc.status)}>
                              {doc.status.toLowerCase()}
                            </Badge>
                            <p className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
