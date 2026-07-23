'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Plus,
  Play,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Radio,
  Building,
  Server,
  Zap,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

import type { SiteOnboardingItem, OnboardingStatus } from '@/types';
import { useT } from '@/lib/i18n';
import { ExportButton } from '@/components/ExportButton';

// ──────────────────────────── Constants ────────────────────────────

const TECH_COLORS: Record<string, string> = {
  '2G': '#94A3B8',
  '3G': '#06B6D4',
  '4G': '#10B981',
  '5G': '#F59E0B',
};

const STATUS_COLORS: Record<OnboardingStatus, string> = {
  pending: 'slate',
  provisioning: 'blue',
  configuring: 'amber',
  verifying: 'cyan',
  completed: 'green',
  failed: 'red',
};

const PIPELINE_STEPS: OnboardingStatus[] = [
  'pending',
  'provisioning',
  'configuring',
  'verifying',
  'completed',
];

const TECHNOLOGIES = ['2G', '3G', '4G', '5G'] as const;
const REGIONS = ['Alger Centre', 'Oran Métropole', 'Constantine', 'Annaba', 'Sétif', 'Blida', 'Tlemcen', 'Tizi Ouzou'] as const;
const VENDORS = ['Ericsson', 'Huawei', 'Nokia', 'Samsung', 'ZTE'] as const;

// ──────────────────────────── Zod Schema ────────────────────────────

const onboardingFormSchema = z.object({
  siteName: z.string().min(1, 'required'),
  siteCode: z.string().min(1, 'required'),
  technology: z.string().min(1, 'required'),
  region: z.string().min(1, 'required'),
  vendor: z.string().min(1, ''),
  latitude: z.coerce.number().min(-90).max(90).default(0),
  longitude: z.coerce.number().min(-180).max(180).default(0),
  altitude: z.coerce.number().default(0),
  frequency: z.string().default(''),
  bandwidth: z.coerce.number().min(0).default(0),
  maxCapacity: z.coerce.number().min(0).default(0),
});

type OnboardingFormValues = z.input<typeof onboardingFormSchema>;

// ──────────────────────────── Types ────────────────────────────

interface OnboardingApiResponse {
  records: SiteOnboardingItem[];
  countsByStatus: Record<string, number>;
}

// ──────────────────────────── Sub-Components ────────────────────────────

function StatusPipelineIndicator({ status }: { status: OnboardingStatus }) {
  const isFailed = status === 'failed';
  const currentStepIdx = isFailed
    ? -1
    : PIPELINE_STEPS.indexOf(status as (typeof PIPELINE_STEPS)[number]);

  return (
    <div className="flex items-center gap-1">
      {PIPELINE_STEPS.map((step, idx) => {
        const isCompleted = !isFailed && idx < currentStepIdx;
        const isCurrent = !isFailed && idx === currentStepIdx;
        const isFuture = !isCompleted && !isCurrent;

        return (
          <div key={step} className="flex items-center">
            <div className="relative flex items-center justify-center">
              {isCurrent ? (
                <span className="absolute inline-flex h-4 w-4 animate-ping rounded-full bg-emerald-400 opacity-60" />
              ) : null}
              <div
                className={`h-3 w-3 rounded-full border-[1.5px] transition-all ${
                  isCompleted
                    ? 'border-emerald-500 bg-emerald-500'
                    : isCurrent
                      ? 'border-emerald-400 bg-emerald-400'
                      : 'border-muted-foreground/30 bg-transparent'
                }`}
              />
            </div>
            {idx < PIPELINE_STEPS.length - 1 && (
              <div
                className={`mx-[2px] h-[1.5px] w-3 ${
                  !isFailed && idx < currentStepIdx
                    ? 'bg-emerald-500'
                    : 'bg-muted-foreground/20'
                }`}
              />
            )}
          </div>
        );
      })}
      {isFailed && (
        <>
          <div className="mx-[2px] h-[1.5px] w-3 bg-red-400" />
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-4 w-4 animate-ping rounded-full bg-red-400 opacity-50" />
            <div className="h-3 w-3 rounded-full border-[1.5px] border-red-500 bg-red-500" />
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: OnboardingStatus }) {
  const colorClasses: Record<OnboardingStatus, string> = {
    pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    provisioning: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    configuring: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    verifying: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
  };

  return (
    <Badge variant="outline" className={`text-[10px] font-medium ${colorClasses[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function TechBadge({ tech }: { tech: string }) {
  const color = TECH_COLORS[tech] || '#94A3B8';
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {tech}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <Card className="py-4">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────── Main Component ────────────────────────────

export default function OnboardingView() {
  const t = useT();
  const queryClient = useQueryClient();

  // ── Data fetching ──

  const { data, isLoading } = useQuery<OnboardingApiResponse>({
    queryKey: ['onboarding'],
    queryFn: () => fetch('/api/onboarding').then((r) => { if (!r.ok) throw new Error('Onboarding API error: ' + r.status); return r.json(); }),
    refetchInterval: 15000,
  });

  const records = data?.records ?? [];
  const counts = data?.countsByStatus ?? {};

  const totalSites = records.length;
  const inProgress =
    (counts.provisioning ?? 0) +
    (counts.configuring ?? 0) +
    (counts.verifying ?? 0);
  const completed = counts.completed ?? 0;
  const failed = counts.failed ?? 0;

  // ── Create mutation ──

  const createMutation = useMutation({
    mutationFn: (values: OnboardingFormValues) =>
      fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      toast.success(t('toast.onboardOk'));
      form.reset();
    },
    onError: (err: Error) => {
      toast.error(err.message || t('onb.failedToCreate'));
    },
  });

  // ── Advance mutation ──

  const advanceMutation = useMutation({
    mutationFn: ({ onboardingId }: { onboardingId: string }) =>
      fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingId, action: 'advance' }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      toast.success(t('toast.pipelineAdvanced'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('onb.failedToAdvance'));
    },
  });

  // ── Retry mutation (resets failed → pending) ──

  const retryMutation = useMutation({
    mutationFn: ({ onboardingId }: { onboardingId: string }) =>
      fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingId, action: 'advance', status: 'pending' }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      toast.success(t('toast.onboardRetry'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('onb.failedToRetry'));
    },
  });

  // ── Form ──

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      siteName: '',
      siteCode: '',
      technology: '',
      region: '',
      vendor: '',
      latitude: 0,
      longitude: 0,
      altitude: 0,
      frequency: '',
      bandwidth: 0,
      maxCapacity: 0,
    },
  });

  const onSubmit = (values: OnboardingFormValues) => {
    createMutation.mutate(values);
  };

  // ── Helpers ──

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  const isAdvanceable = (status: OnboardingStatus) =>
    status !== 'completed' && status !== 'failed';

  const isRetryable = (status: OnboardingStatus) => status === 'failed';

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title.onboarding')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('onb.subtitle')}
        </p>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Server}
          label={t('onb.totalSites')}
          value={totalSites}
          color="text-slate-700 dark:text-slate-300"
          bgColor="bg-slate-100 dark:bg-slate-800"
        />
        <StatCard
          icon={Radio}
          label={t('onb.inProgress')}
          value={inProgress}
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-100 dark:bg-blue-900/40"
        />
        <StatCard
          icon={CheckCircle}
          label={t('onb.completed')}
          value={completed}
          color="text-emerald-600 dark:text-emerald-400"
          bgColor="bg-emerald-100 dark:bg-emerald-900/40"
        />
        <StatCard
          icon={XCircle}
          label={t('onb.failed')}
          value={failed}
          color="text-red-600 dark:text-red-400"
          bgColor="bg-red-100 dark:bg-red-900/40"
        />
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left: New Site Form ── */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-emerald-600" />
              {t('onb.newSite')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Site Name */}
              <div className="space-y-1.5">
                <Label htmlFor="siteName" className="text-xs font-medium">
                  {t('onb.siteName')}
                </Label>
                <Input
                  id="siteName"
                  placeholder={t('onb.siteNamePh')}
                  className="h-8 text-sm"
                  {...form.register('siteName')}
                />
                {form.formState.errors.siteName && (
                  <p className="text-[11px] text-red-500">
                    {t('onb.siteNameReq')}
                  </p>
                )}
              </div>

              {/* Site Code */}
              <div className="space-y-1.5">
                <Label htmlFor="siteCode" className="text-xs font-medium">
                  {t('onb.siteCode')}
                </Label>
                <Input
                  id="siteCode"
                  placeholder={t('onb.siteCodePh')}
                  className="h-8 text-sm"
                  {...form.register('siteCode')}
                />
                {form.formState.errors.siteCode && (
                  <p className="text-[11px] text-red-500">
                    {t('onb.siteCodeReq')}
                  </p>
                )}
              </div>

              <Separator />

              {/* Technology & Region row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t('filter.technology')}</Label>
                  <Controller
                    name="technology"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-8 w-full text-sm">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {TECHNOLOGIES.map((tech) => (
                            <SelectItem key={tech} value={tech}>
                              {tech}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.technology && (
                    <p className="text-[11px] text-red-500">
                      {form.formState.errors.technology.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Region</Label>
                  <Controller
                    name="region"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-8 w-full text-sm">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {REGIONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.region && (
                    <p className="text-[11px] text-red-500">
                      {form.formState.errors.region.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Vendor */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Vendor</Label>
                <Controller
                  name="vendor"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-8 w-full text-sm">
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {VENDORS.map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.vendor && (
                  <p className="text-[11px] text-red-500">
                    {form.formState.errors.vendor.message}
                  </p>
                )}
              </div>

              <Separator />

              {/* Coordinates */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <MapPin className="h-3 w-3" />
                  Coordinates &amp; Altitude
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Input
                      placeholder="Lat"
                      className="h-8 text-sm"
                      type="number"
                      step="any"
                      {...form.register('latitude')}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Lng"
                      className="h-8 text-sm"
                      type="number"
                      step="any"
                      {...form.register('longitude')}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Alt (m)"
                      className="h-8 text-sm"
                      type="number"
                      step="any"
                      {...form.register('altitude')}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Frequency / Bandwidth / Max Capacity */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <Zap className="h-3 w-3" />
                  RF Configuration
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Input
                      placeholder="Freq (MHz)"
                      className="h-8 text-sm"
                      {...form.register('frequency')}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="BW (MHz)"
                      className="h-8 text-sm"
                      type="number"
                      step="any"
                      {...form.register('bandwidth')}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Max Cap"
                      className="h-8 text-sm"
                      type="number"
                      step="any"
                      {...form.register('maxCapacity')}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Submit */}
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Creating...
                  </span>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start Onboarding
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Right: Pipeline Table ── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-amber-500" />
              Onboarding Pipeline
              <Badge variant="secondary" className="ml-auto text-[10px]">
                Auto-refresh: 15s
              </Badge>
              <ExportButton data={records as unknown as Record<string, any>[]} filenamePrefix="onboarding" columns={[{ key: 'siteName', header: 'Site Name' }, { key: 'siteCode', header: 'Site Code' }, { key: 'technology', header: 'Technology' }, { key: 'status', header: 'Status' }, { key: 'vendor', header: 'Vendor' }, { key: 'region', header: 'Region' }, { key: 'progress', header: 'Progress (%)' }, { key: 'createdAt', header: 'Created At' }]} />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton />
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                <Building className="h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No onboarding records yet</p>
                <p className="text-xs">Create a new site to begin the provisioning pipeline</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[520px]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold">Site</TableHead>
                      <TableHead className="text-xs font-semibold">Code</TableHead>
                      <TableHead className="text-xs font-semibold">Tech</TableHead>
                      <TableHead className="text-xs font-semibold">Region</TableHead>
                      <TableHead className="text-xs font-semibold">Vendor</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">PCI</TableHead>
                      <TableHead className="text-xs font-semibold">Neighbors</TableHead>
                      <TableHead className="text-xs font-semibold">Created</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-sm">
                          {item.siteName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {item.siteCode}
                        </TableCell>
                        <TableCell>
                          <TechBadge tech={item.technology} />
                        </TableCell>
                        <TableCell className="text-xs">{item.region}</TableCell>
                        <TableCell className="text-xs">{item.vendor}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <StatusPipelineIndicator status={item.status} />
                            <StatusBadge status={item.status} />
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {item.assignedPci || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.initialNeighbors?.length ?? 0}
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isAdvanceable(item.status) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                onClick={() =>
                                  advanceMutation.mutate({ onboardingId: item.id })
                                }
                                disabled={advanceMutation.isPending}
                              >
                                <Play className="h-3 w-3" />
                                Advance
                              </Button>
                            )}
                            {isRetryable(item.status) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                onClick={() =>
                                  retryMutation.mutate({ onboardingId: item.id })
                                }
                                disabled={retryMutation.isPending}
                              >
                                <RotateCcw className="h-3 w-3" />
                                Retry
                              </Button>
                            )}
                            {item.status === 'completed' && (
                              <CheckCircle className="mx-auto h-4 w-4 text-emerald-500" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}