'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, ____ScatterChart, __ZAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/constants';
import { useT } from '@/lib/i18n';
import { MessageSquare, Smile, Frown, TrendingUp, Zap } from 'lucide-react';

/* ─── Constants ─── */

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#10B981',
  neutral: '#6B7280',
  negative: '#EF4444',
  mixed: '#F59E0B',
};

const SOURCE_COLORS: Record<string, string> = {
  twitter: '#1DA1F2',
  facebook: '#4267B2',
  instagram: '#E4405F',
  youtube: '#FF0000',
  google_play: '#34A853',
};

const SOURCE_BADGE_CLASSES: Record<string, string> = {
  twitter: 'border-[#1DA1F2]/40 bg-[#1DA1F2]/10 text-[#1DA1F2]',
  facebook: 'border-[#4267B2]/40 bg-[#4267B2]/10 text-[#4267B2]',
  instagram: 'border-[#E4405F]/40 bg-[#E4405F]/10 text-[#E4405F]',
  youtube: 'border-[#FF0000]/40 bg-[#FF0000]/10 text-[#FF0000]',
  google_play: 'border-[#34A853]/40 bg-[#34A853]/10 text-[#34A853]',
};

const SOURCES = ['all', 'twitter', 'facebook', 'instagram', 'youtube', 'google_play'] as const;
const SENTIMENTS = ['all', 'positive', 'neutral', 'negative', 'mixed'] as const;
const OPERATORS = ['all', 'Us', 'Mobilis', 'Djezzy', 'Ooredoo'] as const;
const TOPICS = ['all', 'Coverage', 'Speed', 'Pricing', 'Customer Service', 'Outage', 'Promotion'] as const;

const SENTIMENT_LABELS: Record<string, string> = {
  positive: 'Positif',
  neutral: 'Neutre',
  negative: 'Négatif',
  mixed: 'Mixte',
};

/* ─── Interfaces ─── */

interface KpiData {
  totalPosts: number;
  avgSentimentScore: number;
  ourAvgSentiment: number;
  marketAvgSentiment: number;
  viralPosts: number;
}

interface SentimentTrend {
  date: string;
  positive: number;
  negative: number;
  avgScore: number;
}

interface WordCloudItem {
  word: string;
  count: number;
  sentiment: string;
}

interface PostRow {
  id: string;
  source: string;
  operator: string;
  sentiment: string;
  topic: string;
  wilaya: string;
  text: string;
  likes: number;
  reach: number;
  urgency: string;
  date: string;
}

/* ─── Badge helpers ─── */

const sentimentBadgeClass = (s: string): string => {
  const map: Record<string, string> = {
    positive: 'bg-emerald-500/15 text-emerald-600',
    neutral: 'bg-slate-500/15 text-slate-600',
    negative: 'bg-red-500/15 text-red-600',
    mixed: 'bg-amber-500/15 text-amber-600',
  };
  return map[s] ?? 'bg-slate-100 text-slate-600';
};

const urgencyBadgeClass = (u: string): string => {
  const map: Record<string, string> = {
    high: 'bg-red-500/15 text-red-600',
    medium: 'bg-amber-500/15 text-amber-600',
    low: 'bg-emerald-500/15 text-emerald-600',
  };
  return map[u] ?? 'bg-slate-100 text-slate-600';
};

const urgencyLabel = (u: string, t: (_k: string, _fb: string) => string): string => {
  const map: Record<string, string> = {
    high: t('comp.sentiment.urgency.high', 'Élevée'),
    medium: t('comp.sentiment.urgency.medium', 'Moyenne'),
    low: t('comp.sentiment.urgency.low', 'Faible'),
  };
  return map[u] ?? u;
};

const sourceBadgeClass = (s: string): string => SOURCE_BADGE_CLASSES[s] ?? 'border-slate-300 bg-slate-100 text-slate-600';

/* ─── Custom Tooltip ─── */

function SentimentTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-1 text-sm font-semibold">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
}

function TrendTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-1 text-sm font-semibold">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {entry.dataKey === 'avgScore' ? (entry.value as number).toFixed(2) : formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
}

/* ─── Main Component ─── */

export default function SocialSentimentView() {
  const { t } = useT();
  const [source, setSource] = useState<string>('all');
  const [sentiment, setSentiment] = useState<string>('all');
  const [operator, setOperator] = useState<string>('all');
  const [topic, setTopic] = useState<string>('all');

  /* ── Data fetching ── */
  const { data, isLoading } = useQuery({
    queryKey: ['social-sentiment', source, sentiment, operator, topic],
    queryFn: () =>
      fetch(
        `/api/competitive/social-sentiment?source=${source}&sentiment=${sentiment}&operator=${operator}&topic=${topic}`,
      ).then((r) => r.json()),
  });

  /* ── Derived data ── */
  const kpi: KpiData = data?.kpi ?? {
    totalPosts: 0,
    avgSentimentScore: 0,
    ourAvgSentiment: 0,
    marketAvgSentiment: 0,
    viralPosts: 0,
  };
  const sentimentByOperator = data?.sentimentByOperator ?? [];
  const postsBySource = data?.postsBySource ?? [];
  const trend: SentimentTrend[] = data?.trend ?? [];
  const postsByTopic = data?.postsByTopic ?? [];
  const wordCloud: WordCloudItem[] = data?.wordCloud ?? [];
  const posts: PostRow[] = data?.posts ?? [];

  /* ── KPI computations ── */
  const avgSentColor =
    kpi.avgSentimentScore >= 0.3
      ? 'text-emerald-600'
      : kpi.avgSentimentScore >= 0
        ? 'text-amber-600'
        : 'text-red-600';

  const isPositiveSentiment = kpi.avgSentimentScore >= 0.3;

  const vsMarket =
    kpi.marketAvgSentiment !== 0
      ? ((kpi.ourAvgSentiment - kpi.marketAvgSentiment) / Math.abs(kpi.marketAvgSentiment) * 100).toFixed(1)
      : '0.0';

  const vsMarketColor = Number(vsMarket) >= 0 ? 'text-emerald-600' : 'text-red-600';
  const vsMarketArrow = Number(vsMarket) >= 0 ? '▲' : '▼';

  /* ── Word cloud max ── */
  const wcMaxCount = useMemo(() => Math.max(...wordCloud.map((w) => w.count), 1), [wordCloud]);

  /* ────────────────────────────── Render ────────────────────────────── */

  return (
    <div className="space-y-6 p-6">
      {/* ── Header + Filters ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          {t('comp.sentiment.title', 'Intelligence Sociale & Sentiment')}
        </h2>

        <div className="flex flex-wrap gap-3">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm"
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {t(`comp.sentiment.source.${s}`, s === 'all' ? 'Toutes sources' : s)}
              </option>
            ))}
          </select>

          <select
            value={sentiment}
            onChange={(e) => setSentiment(e.target.value)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm"
          >
            {SENTIMENTS.map((s) => (
              <option key={s} value={s}>
                {t(`comp.sentiment.sentiment.${s}`, s === 'all' ? 'Tous sentiments' : s)}
              </option>
            ))}
          </select>

          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm"
          >
            {OPERATORS.map((o) => (
              <option key={o} value={o}>
                {t(`comp.sentiment.operator.${o}`, o === 'all' ? 'Tous opérateurs' : o)}
              </option>
            ))}
          </select>

          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm"
          >
            {TOPICS.map((tp) => (
              <option key={tp} value={tp}>
                {t(`comp.sentiment.topic.${tp}`, tp === 'all' ? 'Tous sujets' : tp)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {isLoading ? (
        <KpiCardsSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Posts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('comp.sentiment.kpi.totalPosts', 'Total Publications')}
              </CardTitle>
              <MessageSquare className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatNumber(kpi.totalPosts)}</div>
            </CardContent>
          </Card>

          {/* Average Sentiment Score */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('comp.sentiment.kpi.avgScore', 'Score Sentiment Moyen')}
              </CardTitle>
              {isPositiveSentiment
                ? <Smile className="h-5 w-5 text-emerald-500" />
                : <Frown className="h-5 w-5 text-red-500" />}
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${avgSentColor}`}>
                {kpi.avgSentimentScore.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('comp.sentiment.kpi.scale', 'Échelle -1 à +1')}
              </p>
            </CardContent>
          </Card>

          {/* Our Avg Sentiment vs Market */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('comp.sentiment.kpi.ourSentiment', 'Notre Sentiment')}
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpi.ourAvgSentiment.toFixed(2)}</div>
              <p className={`text-xs ${vsMarketColor}`}>
                {vsMarketArrow} {Math.abs(Number(vsMarket))}%{' '}
                {t('comp.sentiment.kpi.vsMarket', 'vs marché')}
              </p>
            </CardContent>
          </Card>

          {/* Viral Posts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('comp.sentiment.kpi.viralPosts', 'Publications Virales')}
              </CardTitle>
              <Zap className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatNumber(kpi.viralPosts)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Charts Row 1: Sentiment by Operator | Posts by Source ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('comp.sentiment.chart.sentimentByOperator', 'Sentiment par Opérateur')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={sentimentByOperator}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="operator" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<SentimentTooltipContent />} />
                  <Legend />
                  {(['positive', 'neutral', 'negative', 'mixed'] as const).map((key) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      stackId="a"
                      fill={SENTIMENT_COLORS[key]}
                      name={t(`comp.sentiment.sentiment.${key}`, SENTIMENT_LABELS[key])}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('comp.sentiment.chart.postsBySource', 'Publications par Source')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={postsBySource}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label={({ name, percent }: { name: string; percent: number }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {postsBySource.map((entry: { source: string }, idx: number) => (
                      <Cell key={idx} fill={SOURCE_COLORS[entry.source] ?? '#6B7280'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Charts Row 2: 30-day Trend | Posts by Topic ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('comp.sentiment.chart.trend', 'Tendance Sentiment 30 jours')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[-1, 1]} tick={{ fontSize: 12 }} />
                  <Tooltip content={<TrendTooltipContent />} />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="positive"
                    stroke={SENTIMENT_COLORS.positive}
                    strokeWidth={2}
                    dot={false}
                    name={t('comp.sentiment.positive', 'Positif')}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="negative"
                    stroke={SENTIMENT_COLORS.negative}
                    strokeWidth={2}
                    dot={false}
                    name={t('comp.sentiment.negative', 'Négatif')}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgScore"
                    stroke="#6366F1"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name={t('comp.sentiment.avgScore', 'Score Moyen')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('comp.sentiment.chart.postsByTopic', 'Publications par Sujet')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={postsByTopic} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="topic" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366F1" radius={[0, 4, 4, 0]} name={t('comp.sentiment.count', 'Nombre')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Word Cloud ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('comp.sentiment.wordCloud', 'Nuage de Mots Clés')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 14 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-20 rounded-full" />
              ))}
            </div>
          ) : wordCloud.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('comp.sentiment.noKeywords', 'Aucun mot-clé disponible')}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {wordCloud.slice(0, 20).map((item) => {
                const sizeRatio = item.count / wcMaxCount;
                const fontSize = Math.max(0.7, sizeRatio * 1.5);
                const colorClass =
                  item.sentiment === 'positive'
                    ? 'bg-emerald-500/15 text-emerald-700 border-emerald-300'
                    : item.sentiment === 'negative'
                      ? 'bg-red-500/15 text-red-700 border-red-300'
                      : 'bg-slate-500/15 text-slate-700 border-slate-300';

                return (
                  <Badge
                    key={item.word}
                    variant="outline"
                    className={`${colorClass} cursor-default transition-opacity hover:opacity-80`}
                    style={{
                      fontSize: `${fontSize}rem`,
                      padding: `${fontSize * 0.3}rem ${fontSize * 0.7}rem`,
                    }}
                  >
                    {item.word}
                    <span className="ml-1 opacity-60">({item.count})</span>
                  </Badge>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Posts Table ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('comp.sentiment.postsTable', 'Détail des Publications')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t('comp.sentiment.noPosts', 'Aucune publication trouvée pour les filtres sélectionnés')}
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="whitespace-nowrap">{t('comp.sentiment.col.source', 'Source')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('comp.sentiment.col.operator', 'Opérateur')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('comp.sentiment.col.sentiment', 'Sentiment')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('comp.sentiment.col.topic', 'Sujet')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('comp.sentiment.col.wilaya', 'Wilaya')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('comp.sentiment.col.text', 'Texte')}</TableHead>
                    <TableHead className="whitespace-nowrap text-right">{t('comp.sentiment.col.likes', 'Likes')}</TableHead>
                    <TableHead className="whitespace-nowrap text-right">{t('comp.sentiment.col.reach', 'Portée')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('comp.sentiment.col.urgency', 'Urgence')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('comp.sentiment.col.date', 'Date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <Badge variant="outline" className={sourceBadgeClass(post.source)}>
                          {post.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{post.operator}</TableCell>
                      <TableCell>
                        <Badge className={sentimentBadgeClass(post.sentiment)}>
                          {t(`comp.sentiment.sentiment.${post.sentiment}`, SENTIMENT_LABELS[post.sentiment] ?? post.sentiment)}
                        </Badge>
                      </TableCell>
                      <TableCell>{post.topic}</TableCell>
                      <TableCell>{post.wilaya}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={post.text}>
                        {post.text.length > 80 ? `${post.text.slice(0, 80)}…` : post.text}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(post.likes)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(post.reach)}</TableCell>
                      <TableCell>
                        <Badge className={urgencyBadgeClass(post.urgency)}>
                          {urgencyLabel(post.urgency, t)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{post.date}</TableCell>
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

/* ─── Skeleton Components ─── */

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-5 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[320px] w-full" />
      </CardContent>
    </Card>
  );
}
