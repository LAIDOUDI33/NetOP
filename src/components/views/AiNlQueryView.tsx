'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare, Send, Bot, Clock, Star, Globe, Frown, Loader2,
} from 'lucide-react';

// ─── API Response Types ────────────────────────────────────────────────

interface RecentQuery {
  id: string;
  queryText: string;
  queryLocale: 'fr' | 'en' | 'ar';
  intent: string;
  generatedSql: string;
  responseSummary: string;
  responseData: Record<string, unknown>[];
  tablesAccessed: string[];
  executionTimeMs: number;
  tokenCount: number;
  modelUsed: string;
  satisfaction: number;
  createdAt: string;
}

interface NlQuerySummary {
  totalQueries: number;
  avgExecutionTimeMs: number;
  avgSatisfaction: number;
  topIntents: { intent: string; count: number }[];
  queriesByLocale: { locale: string; count: number }[];
}

interface SampleQuery {
  locale: 'fr' | 'en' | 'ar';
  queries: { query: string; intent: string }[];
}

interface SupportedIntent {
  intent: string;
  description: {
    fr: string;
    en: string;
    ar: string;
  };
  exampleQueries: {
    fr: string[];
    en: string[];
    ar: string[];
  };
  requiredTables: string[];
}

interface NlQueryResponse {
  summary: NlQuerySummary;
  recentQueries: RecentQuery[];
  sampleQueries: SampleQuery[];
  supportedIntents: SupportedIntent[];
}

interface ChatResponse {
  id: string;
  queryText: string;
  queryLocale: string;
  intent: string;
  generatedSql: string;
  responseSummary: string;
  responseData: Record<string, unknown>[];
  tablesAccessed: string[];
  executionTimeMs: number;
  tokenCount: number;
  modelUsed: string;
  createdAt: string;
}

// ─── Constants ─────────────────────────────────────────────────────────

const LOCALE_COLORS: Record<string, string> = {
  fr: '#3B82F6',
  en: '#10B981',
  ar: '#F59E0B',
};

const LOCALE_LABELS: Record<string, string> = {
  fr: 'French',
  en: 'English',
  ar: 'Arabic',
};

const INTENT_LABELS: Record<string, string> = {
  churn_analysis: 'Churn Analysis',
  kpi_status: 'KPI Status',
  coverage_gap: 'Coverage Gap',
  demand_forecast: 'Demand Forecast',
  revenue_impact: 'Revenue Impact',
  general: 'General',
};

const INTENT_BADGE_CLASSES: Record<string, string> = {
  churn_analysis: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  kpi_status: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  coverage_gap: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  demand_forecast: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
  revenue_impact: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  general: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
};

const LOCALE_BADGE_CLASSES: Record<string, string> = {
  fr: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  en: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  ar: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
};

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B'];

// ─── Helper Functions ──────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Loading Skeletons ────────────────────────────────────────────────

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20 mb-1" />
            <Skeleton className="h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MainSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardContent className="py-4">
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="lg:col-span-2 space-y-4">
        <Card><CardContent className="py-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
        <Card><CardContent className="py-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
        <Card><CardContent className="py-4"><Skeleton className="h-56 w-full" /></CardContent></Card>
      </div>
    </div>
  );
}

// ─── Pie Chart Tooltip ─────────────────────────────────────────────────

interface PieTooltipProps { active?: boolean; payload?: Array<{ color?: string; name?: string; value?: number }>; }

function PieTooltipContent({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
        <span className="font-medium">{LOCALE_LABELS[d.name] ?? d.name}</span>
      </div>
      <span className="text-muted-foreground ml-4">{d.value} queries</span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function AiNlQueryView() {
  const queryClient = useQueryClient();
  const [queryText, setQueryText] = useState('');
  const [chatResult, setChatResult] = useState<ChatResponse | null>(null);

  const { data, isLoading, isError } = useQuery<NlQueryResponse>({
    queryKey: ['ai-nl-query'],
    queryFn: () =>
      fetch('/api/ai/nl-query').then((r) => {
        if (!r.ok) throw new Error('NL Query API error: ' + r.status);
        return r.json();
      }),
    refetchInterval: 30000,
  });

  const chatMutation = useMutation<ChatResponse, Error, { query: string; locale: string }>({
    mutationFn: (body) =>
      fetch('/api/ai/nl-query/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) throw new Error('Chat API error: ' + r.status);
        return r.json();
      }),
    onSuccess: (result) => {
      setChatResult(result);
      queryClient.invalidateQueries({ queryKey: ['ai-nl-query'] });
    },
  });

  const handleSend = () => {
    const trimmed = queryText.trim();
    if (!trimmed || chatMutation.isPending) return;
    chatMutation.mutate({ query: trimmed, locale: 'fr' });
    setQueryText('');
  };

  const handleRerun = (query: string) => {
    setQueryText(query);
    chatMutation.mutate({ query, locale: 'fr' });
  };

  const summary = data?.summary;
  const recentQueries = data?.recentQueries ?? [];
  const sampleQueries = data?.sampleQueries ?? [];
  const supportedIntents = data?.supportedIntents ?? [];

  // Pie chart data
  const localePieData = (summary?.queriesByLocale ?? []).map((d) => ({
    name: d.locale,
    value: d.count,
  }));

  // ─── Render: Loading State ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-56 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <KpiCardsSkeleton />
        <MainSkeleton />
        <Card>
          <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              {Array.from({ length: 5 }).map((_, r) => (
                <Skeleton key={r} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Frown className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Failed to load NL Query data</p>
        <p className="text-sm mt-1">Please try again later.</p>
      </div>
    );
  }

  // ─── Render: Main View ─────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-blue-500" />
          AI NL Query Engine
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Natural language interface for telecom network analytics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Queries */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              Total Queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {(summary?.totalQueries ?? 0).toLocaleString()}
            </span>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        {/* Avg Execution Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Avg Execution Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {summary?.avgExecutionTimeMs ?? 0} ms
            </span>
            <p className="text-xs text-muted-foreground mt-1">Per query</p>
          </CardContent>
        </Card>

        {/* Avg Satisfaction */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Avg Satisfaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {((summary?.avgSatisfaction ?? 0) * 100).toFixed(0)}%
            </span>
            <p className="text-xs text-muted-foreground mt-1">User rating</p>
          </CardContent>
        </Card>

        {/* Top Intent */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-500" />
              Top Intent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {INTENT_LABELS[summary?.topIntents?.[0]?.intent ?? ''] ?? '—'}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.topIntents?.[0]?.count ?? 0} queries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT: Chat Interface (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Chat Input */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Ask a question about the network..."
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend();
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!queryText.trim() || chatMutation.isPending}
                  size="icon"
                >
                  {chatMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Chat Result Card */}
          {chatMutation.isPending && (
            <Card className="border-blue-500/30">
              <CardContent className="py-6 flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="text-sm text-muted-foreground">Processing your query...</span>
              </CardContent>
            </Card>
          )}

          {chatResult && !chatMutation.isPending && (
            <Card className="border-blue-500/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Bot className="h-4 w-4 text-blue-500" />
                    Response
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={INTENT_BADGE_CLASSES[chatResult.intent] ?? ''}>
                      {INTENT_LABELS[chatResult.intent] ?? chatResult.intent}
                    </Badge>
                    <Badge variant="outline" className={LOCALE_BADGE_CLASSES[chatResult.queryLocale] ?? ''}>
                      <Globe className="h-3 w-3 mr-1" />
                      {chatResult.queryLocale.toUpperCase()}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {chatResult.executionTimeMs} ms
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground italic">
                  Q: {chatResult.queryText}
                </p>
                <p className="text-sm leading-relaxed">{chatResult.responseSummary}</p>
                <div className="flex flex-wrap gap-1">
                  {chatResult.tablesAccessed.map((t) => (
                    <Badge key={t} variant="outline" className="text-xs font-mono">
                      {t}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {chatMutation.isError && (
            <Card className="border-red-500/30">
              <CardContent className="py-4">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Error: {chatMutation.error?.message ?? 'Failed to process query'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Recent Queries List (clickable cards) */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Recent Queries</h3>
            {recentQueries.map((q) => (
              <Card
                key={q.id}
                className="cursor-pointer hover:border-blue-500/40 transition-colors"
                onClick={() => handleRerun(q.queryText)}
              >
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-tight line-clamp-2">{q.queryText}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className={LOCALE_BADGE_CLASSES[q.queryLocale] ?? ''}>
                        {q.queryLocale.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className={INTENT_BADGE_CLASSES[q.intent] ?? ''}>
                        {INTENT_LABELS[q.intent] ?? q.intent}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{q.responseSummary}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {q.executionTimeMs} ms
                    </span>
                    <span>{timeAgo(q.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* RIGHT: Sidebar (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Supported Intents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-purple-500" />
                Supported Intents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {supportedIntents.map((si) => (
                  <div key={si.intent} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={INTENT_BADGE_CLASSES[si.intent] ?? ''}>
                        {INTENT_LABELS[si.intent] ?? si.intent}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{si.description.en}</p>
                    <div className="flex flex-wrap gap-1">
                      {si.requiredTables.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px] font-mono">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sample Queries by Locale */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-500" />
                Sample Queries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sampleQueries.map((sq) => (
                  <div key={sq.locale}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={LOCALE_BADGE_CLASSES[sq.locale] ?? ''}>
                        <Globe className="h-3 w-3 mr-1" />
                        {LOCALE_LABELS[sq.locale] ?? sq.locale}
                      </Badge>
                    </div>
                    <ul className="space-y-1.5">
                      {sq.queries.map((q, i) => (
                        <li
                          key={i}
                          className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors truncate"
                          onClick={() => handleRerun(q.query)}
                          title={q.query}
                        >
                          <span className="text-foreground/60 mr-1">
                            {INTENT_LABELS[q.intent] ?? q.intent}:
                          </span>
                          {q.query}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Query Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                Query Distribution by Locale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={localePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {localePieData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={LOCALE_COLORS[entry.name] ?? PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltipContent />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => LOCALE_LABELS[value] ?? value}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Queries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Query History</CardTitle>
        </CardHeader>
        <CardContent>
          {recentQueries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No recent queries found.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">Query</TableHead>
                    <TableHead>Locale</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead className="max-w-[260px]">Response Summary</TableHead>
                    <TableHead className="text-right">Exec Time</TableHead>
                    <TableHead className="text-right">Satisfaction</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentQueries.map((q) => (
                    <TableRow
                      key={q.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRerun(q.queryText)}
                    >
                      <TableCell className="font-medium text-xs max-w-[200px] truncate sticky left-0 bg-background">
                        {q.queryText}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={LOCALE_BADGE_CLASSES[q.queryLocale] ?? ''}>
                          {q.queryLocale.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={INTENT_BADGE_CLASSES[q.intent] ?? ''}>
                          {INTENT_LABELS[q.intent] ?? q.intent}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[260px] truncate text-muted-foreground">
                        {q.responseSummary}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {q.executionTimeMs} ms
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        <span className={
                          q.satisfaction >= 0.8
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : q.satisfaction >= 0.6
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                        }>
                          {(q.satisfaction * 100).toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{q.modelUsed}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{timeAgo(q.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
