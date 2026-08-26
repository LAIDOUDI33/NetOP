'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShieldAlert, Brain, Activity, Frown, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { TECH_BG_CLASSES, formatNumber } from '@/lib/constants';

// ─── API Response Types ────────────────────────────────────────────────

type ModelType = 'isolation_forest' | 'autoencoder' | 'lstm' | 'statistical' | 'prophet';
type ModelStatus = 'training' | 'active' | 'deprecated';
type Technology = '2G' | '3G' | '4G' | '5G';

interface MLModel {
  id: string;
  modelName: string;
  modelType: ModelType;
  technology: Technology;
  metric: string;
  status: ModelStatus;
  precision: number;
  recall: number;
  f1Score: number;
  falsePositiveRate: number;
  trainingSamples: number;
  featuresUsed: string[];
  lastTrainedAt: string;
  trainingDurationMs: number;
  detectionThreshold: number;
  autoTuneEnabled: boolean;
  totalDetections: number;
  truePositives: number;
  falsePositives: number;
  version: string;
}

interface AnomalySummary {
  totalModels: number;
  activeModels: number;
  avgF1Score: number;
  avgPrecision: number;
  avgRecall: number;
  totalDetections: number;
  avgFalsePositiveRate: number;
  modelTypes: Record<string, number>;
}

interface DetectionTimelineEntry {
  date: string;
  totalDetections: number;
  truePositives: number;
  falsePositives: number;
  criticalAnomalies: number;
}

interface FeatureImportanceEntry {
  name: string;
  score: number;
  rank: number;
}

interface AutoTuningEntry {
  id: string;
  modelId: string;
  modelName: string;
  previousThreshold: number;
  newThreshold: number;
  reason: string;
  f1Before: number;
  f1After: number;
  fprBefore: number;
  fprAfter: number;
  triggeredAt: string;
  approvedBy: string;
}

interface AnomalyEngineResponse {
  summary: AnomalySummary;
  models: MLModel[];
  modelComparison: Record<string, unknown>;
  detectionTimeline: DetectionTimelineEntry[];
  featureImportance: FeatureImportanceEntry[];
  autoTuningHistory: AutoTuningEntry[];
}

// ─── Constants ─────────────────────────────────────────────────────────

const MODEL_TYPE_COLORS: Record<ModelType, string> = {
  isolation_forest: '#06B6D4',
  autoencoder: '#8B5CF6',
  lstm: '#F59E0B',
  statistical: '#10B981',
  prophet: '#F43F5E',
};

const MODEL_TYPE_BG: Record<ModelType, string> = {
  isolation_forest: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  autoencoder: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20',
  lstm: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  statistical: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  prophet: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
};

const MODEL_TYPE_LABELS: Record<ModelType, string> = {
  isolation_forest: 'Isolation Forest',
  autoencoder: 'Autoencoder',
  lstm: 'LSTM',
  statistical: 'Statistical',
  prophet: 'Prophet',
};

const STATUS_BG: Record<ModelStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  training: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  deprecated: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
};

const STATUS_VARIANT: Record<ModelStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  training: 'secondary',
  deprecated: 'outline',
};

// ─── Helper Functions ──────────────────────────────────────────────────

function f1Color(f1: number): string {
  if (f1 >= 0.93) return 'text-emerald-600 dark:text-emerald-400';
  if (f1 >= 0.90) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function fprColor(fpr: number): string {
  if (fpr <= 0.06) return 'text-emerald-600 dark:text-emerald-400';
  if (fpr <= 0.10) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return formatNumber(value, 0);
}

// ─── Loading Skeletons ────────────────────────────────────────────────

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
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

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: rows }).map((_, r) => (
            <Skeleton key={r} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Custom Chart Tooltip ─────────────────────────────────────────────

interface ChartTooltipPayloadEntry { color?: string; name?: string; value?: number; }
interface ChartTooltipProps { active?: boolean; payload?: ChartTooltipPayloadEntry[]; label?: string; }

function ChartTooltipContent({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatNumber(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function AiAnomalyEngineView() {
  const { data, isLoading, isError } = useQuery<AnomalyEngineResponse>({
    queryKey: ['ai-anomaly-engine'],
    queryFn: () =>
      fetch('/api/ai/anomaly-engine').then((r) => {
        if (!r.ok) throw new Error('AI Anomaly Engine API error: ' + r.status);
        return r.json();
      }),
    refetchInterval: 30000,
  });

  const summary = data?.summary;
  const models = data?.models ?? [];
  const detectionTimeline = data?.detectionTimeline ?? [];
  const featureImportance = data?.featureImportance ?? [];
  const autoTuningHistory = data?.autoTuningHistory ?? [];

  // Model Performance chart data
  const modelPerfData = models.map((m) => ({
    name: m.modelName.length > 30 ? m.modelName.slice(0, 28) + '…' : m.modelName,
    f1Score: m.f1Score,
    modelType: m.modelType,
    fill: MODEL_TYPE_COLORS[m.modelType] ?? '#94A3B8',
  }));

  // Detection timeline – format date for display
  const timelineData = detectionTimeline.map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));

  // Feature importance – reverse for horizontal bar (highest on top)
  const featureData = [...featureImportance].reverse();

  // ─── Render: Loading State ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <KpiCardsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <ChartSkeleton />
        <TableSkeleton rows={8} />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  // ─── Render: Error State ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Frown className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Failed to load AI Anomaly Engine data</p>
        <p className="text-sm mt-1">Please try again later</p>
      </div>
    );
  }

  // ─── Render: Empty State ────────────────────────────────────────────
  if (!data || models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <ShieldAlert className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No anomaly models found</p>
        <p className="text-sm mt-1">Models will appear once trained</p>
      </div>
    );
  }

  // ─── Render: Main View ─────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-violet-500" />
          AI Anomaly Engine
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Multi-model anomaly detection with auto-tuning and feature importance analysis
        </p>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Models */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Brain className="h-4 w-4 text-slate-500" />
              Total Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{summary?.totalModels ?? 0}</span>
            <p className="text-xs text-muted-foreground mt-1">Across all types</p>
          </CardContent>
        </Card>

        {/* Active Models */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Active Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary?.activeModels ?? 0}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Currently detecting</p>
          </CardContent>
        </Card>

        {/* Avg F1 Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-violet-500" />
              Avg F1 Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-2xl font-bold ${f1Color(summary?.avgF1Score ?? 0)}`}>
              {formatNumber(summary?.avgF1Score ?? 0, 3)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Harmonic mean</p>
          </CardContent>
        </Card>

        {/* Total Detections */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Total Detections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {formatCount(summary?.totalDetections ?? 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">All-time anomalies</p>
          </CardContent>
        </Card>

        {/* Avg False Positive Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Frown className="h-4 w-4 text-rose-500" />
              Avg False Positive Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-2xl font-bold ${fprColor(summary?.avgFalsePositiveRate ?? 0)}`}>
              {formatNumber((summary?.avgFalsePositiveRate ?? 0) * 100, 1)}%
            </span>
            <p className="text-xs text-muted-foreground mt-1">Lower is better</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Model Performance Comparison – Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Model Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelPerfData} barSize={28} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 1]}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: number) => formatNumber(v, 2)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    width={200}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="f1Score" name="F1 Score" radius={[0, 4, 4, 0]}>
                    {modelPerfData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Legend for model types */}
            <div className="flex flex-wrap gap-3 mt-3">
              {(Object.keys(MODEL_TYPE_COLORS) as ModelType[]).map((type) => (
                <div key={type} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: MODEL_TYPE_COLORS[type] }} />
                  <span className="text-muted-foreground">{MODEL_TYPE_LABELS[type]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detection Timeline – Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detection Timeline (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="label"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    interval={4}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: number) => formatCount(v)}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalDetections"
                    name="Total Detections"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="truePositives"
                    name="True Positives"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="falsePositives"
                    name="False Positives"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Feature Importance – Horizontal Bar Chart ────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature Importance (Top 15)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureData} barSize={16} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis
                  type="number"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  width={140}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
                        <p className="font-medium mb-1">{payload[0].payload.name}</p>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#8B5CF6' }} />
                          <span className="text-muted-foreground">Importance:</span>
                          <span className="font-medium">{formatNumber(Number(payload[0]?.value ?? 0) * 100, 2)}%</span>
                        </div>
                        <p className="text-muted-foreground mt-1">Rank #{payload[0].payload.rank}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="score" name="Importance" radius={[0, 4, 4, 0]}>
                  {featureData.map((entry, idx) => {
                    const topScore = featureImportance[0]?.score ?? 1;
                    const ratio = entry.score / topScore;
                    let fill = '#8B5CF6';
                    if (ratio < 0.3) fill = '#A78BFA';
                    else if (ratio < 0.6) fill = '#7C3AED';
                    return <Cell key={idx} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── ML Models Table ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ML Models</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Model Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Technology</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">F1</TableHead>
                  <TableHead className="text-right">Precision</TableHead>
                  <TableHead className="text-right">Recall</TableHead>
                  <TableHead className="text-right">FPR</TableHead>
                  <TableHead className="text-right">Detections</TableHead>
                  <TableHead className="text-center">Auto-tune</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium text-xs max-w-[220px] truncate sticky left-0 bg-background">
                      {m.modelName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={MODEL_TYPE_BG[m.modelType]}>
                        {MODEL_TYPE_LABELS[m.modelType]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={TECH_BG_CLASSES[m.technology]}>
                        {m.technology}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{m.metric}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[m.status]} className={STATUS_BG[m.status]}>
                        {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right text-xs font-medium ${f1Color(m.f1Score)}`}>
                      {formatNumber(m.f1Score, 3)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {formatNumber(m.precision, 3)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {formatNumber(m.recall, 3)}
                    </TableCell>
                    <TableCell className={`text-right text-xs font-medium ${fprColor(m.falsePositiveRate)}`}>
                      {formatNumber(m.falsePositiveRate * 100, 1)}%
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {formatCount(m.totalDetections)}
                    </TableCell>
                    <TableCell className="text-center">
                      {m.autoTuneEnabled ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 inline-block" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Off</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Auto-Tuning History ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auto-Tuning History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Model</TableHead>
                <TableHead className="text-right">Threshold Before</TableHead>
                <TableHead className="text-right">Threshold After</TableHead>
                <TableHead className="text-right">F1 Before</TableHead>
                <TableHead className="text-right">F1 After</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead className="min-w-[260px]">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {autoTuningHistory.map((at) => {
                const f1Improved = at.f1After >= at.f1Before;
                return (
                  <TableRow key={at.id}>
                    <TableCell className="text-xs font-medium max-w-[200px] truncate" title={at.modelName}>
                      {at.modelName}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatNumber(at.previousThreshold, 2)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {formatNumber(at.newThreshold, 2)}
                    </TableCell>
                    <TableCell className={`text-right text-xs ${f1Color(at.f1Before)}`}>
                      {formatNumber(at.f1Before, 3)}
                    </TableCell>
                    <TableCell className={`text-right text-xs font-medium ${f1Color(at.f1After)}`}>
                      {formatNumber(at.f1After, 3)}
                      {f1Improved && <span className="text-emerald-500 ml-1">▲</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className={at.approvedBy === 'auto' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20' : 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20'}>
                        {at.approvedBy === 'auto' ? 'Auto' : at.approvedBy}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate" title={at.reason}>
                      {at.reason}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}