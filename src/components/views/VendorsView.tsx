'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Server,
  RefreshCw,
  Plug,
  Unplug,
  Check,
  X,
  Wifi,
  Radio,
  Globe,
  Activity,
  Settings,
  Cable,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  VendorProfileItem,
  VendorApiType,
  VendorStatus,
  Technology,
} from '@/types';

// ─── Color Maps ───────────────────────────────────────────────────────────────

const VENDOR_COLORS: Record<string, string> = {
  ericsson: '#0082C9',
  huawei: '#CF0A2C',
  nokia: '#124191',
  samsung: '#1428A0',
  zte: '#000000',
};

const VENDOR_FALLBACK_COLORS = [
  '#6366F1',
  '#EC4899',
  '#F97316',
  '#14B8A6',
  '#8B5CF6',
  '#EF4444',
  '#0EA5E9',
  '#84CC16',
];

function getVendorColor(vendorName: string): string {
  return VENDOR_COLORS[vendorName.toLowerCase()] ?? VENDOR_FALLBACK_COLORS[0];
}

const STATUS_DOT_COLORS: Record<VendorStatus, string> = {
  active: 'bg-emerald-500',
  disconnected: 'bg-slate-400',
  error: 'bg-red-500',
};

const STATUS_LABEL_COLORS: Record<VendorStatus, string> = {
  active: 'text-emerald-600 dark:text-emerald-400',
  disconnected: 'text-slate-500 dark:text-slate-400',
  error: 'text-red-600 dark:text-red-400',
};

const API_TYPE_COLORS: Record<VendorApiType, string> = {
  rest: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  netconf: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  snmp: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  cli: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

const TECH_BADGE_COLORS: Record<string, string> = {
  '2G': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  '3G': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  '4G': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  '5G': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

const TECH_ICONS: Record<string, React.ReactNode> = {
  '2G': <Radio className="h-3 w-3 mr-1" />,
  '3G': <Wifi className="h-3 w-3 mr-1" />,
  '4G': <Globe className="h-3 w-3 mr-1" />,
  '5G': <Activity className="h-3 w-3 mr-1" />,
};

const MATRIX_TECHS: Technology[] = ['2G', '3G', '4G', '5G'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return 'Never';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function truncateMiddle(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  const start = str.slice(0, Math.ceil(maxLen / 2) - 1);
  const end = str.slice(-(Math.floor(maxLen / 2) - 2));
  return `${start}…${end}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface VendorsResponse {
  vendors: VendorProfileItem[];
}

export default function VendorsView() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<VendorsResponse>({
    queryKey: ['vendors'],
    queryFn: () => fetch('/api/vendors').then((r) => r.json()),
    refetchInterval: 30000,
  });

  const vendors = data?.vendors ?? [];

  const syncMutation = useMutation({
    mutationFn: (vendorId: string) =>
      fetch('/api/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, action: 'sync' }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Sync initiated successfully');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: () => {
      toast.error('Failed to initiate sync');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({
      vendorId,
      enabled,
    }: {
      vendorId: string;
      enabled: boolean;
    }) =>
      fetch('/api/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, action: 'toggle', enabled }),
      }).then((r) => r.json()),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.enabled
          ? 'Vendor connection enabled'
          : 'Vendor connection disabled'
      );
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: () => {
      toast.error('Failed to toggle vendor connection');
    },
  });

  // ─── Computed Stats ─────────────────────────────────────────────────────

  const totalVendors = vendors.length;
  const activeConnections = vendors.filter((v) => v.status === 'active').length;
  const totalSitesManaged = vendors.reduce(
    (sum, v) => sum + (v.stats.sitesManaged ?? 0),
    0
  );
  const lastSyncStatus = (() => {
    if (vendors.length === 0) return 'N/A';
    const synced = vendors.filter((v) => v.stats.syncStatus === 'synced');
    const total = vendors.length;
    if (synced.length === total) return 'All Synced';
    return `${synced.length}/${total} Synced`;
  })();

  const isSyncing = syncMutation.isPending || toggleMutation.isPending;

  // ─── Skeleton ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-1">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>

        {/* Stats row skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Vendor cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Vendor Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Multi-Vendor Integration Hub
        </p>
      </div>

      {/* ─── Stats Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary shrink-0">
              <Server className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Total Vendors</p>
              <p className="text-2xl font-bold">{totalVendors}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Plug className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">
                Active Connections
              </p>
              <p className="text-2xl font-bold">{activeConnections}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Settings className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">
                Total Sites Managed
              </p>
              <p className="text-2xl font-bold">
                {totalSitesManaged.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Last Sync Status</p>
              <p className="text-2xl font-bold">{lastSyncStatus}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Vendor Cards Grid ──────────────────────────────────────────── */}
      {vendors.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Server className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              No vendors configured
            </h3>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Add a vendor integration to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {vendors.map((vendor) => {
            const color = getVendorColor(vendor.vendor);
            const initial = vendor.displayName.charAt(0).toUpperCase();
            const isActive = vendor.status === 'active';
            const syncingThis =
              syncMutation.variables === vendor.id && syncMutation.isPending;

            return (
              <Card
                key={vendor.id}
                className="relative overflow-hidden transition-shadow hover:shadow-md"
              >
                {/* Top accent line */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: color }}
                />

                <CardContent className="p-6 pt-7">
                  {/* Top row: Logo, Name, Status */}
                  <div className="flex items-start gap-4">
                    {/* Vendor logo circle */}
                    <div
                      className="flex items-center justify-center h-12 w-12 rounded-full text-white font-bold text-lg shrink-0 shadow-sm"
                      style={{ backgroundColor: color }}
                    >
                      {initial}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">
                          {vendor.displayName}
                        </h3>
                        <span className="text-xs text-muted-foreground font-mono">
                          ({vendor.vendor})
                        </span>
                      </div>

                      {/* Status indicator */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="relative flex h-2.5 w-2.5">
                          {isActive && (
                            <span
                              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${STATUS_DOT_COLORS[vendor.status]} opacity-75`}
                            />
                          )}
                          <span
                            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${STATUS_DOT_COLORS[vendor.status]}`}
                          />
                        </span>
                        <span
                          className={`text-xs font-medium capitalize ${STATUS_LABEL_COLORS[vendor.status]}`}
                        >
                          {vendor.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Technologies + API Type */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {vendor.technologies.map((tech) => (
                      <Badge
                        key={tech}
                        variant="secondary"
                        className={`text-xs font-medium ${TECH_BADGE_COLORS[tech] ?? ''}`}
                      >
                        {TECH_ICONS[tech] ?? null}
                        {tech}
                      </Badge>
                    ))}
                    <Badge
                      variant="outline"
                      className={`text-xs font-medium ${API_TYPE_COLORS[vendor.apiType] ?? ''}`}
                    >
                      <Cable className="h-3 w-3 mr-1" />
                      {vendor.apiType.toUpperCase()}
                    </Badge>
                  </div>

                  {/* API Endpoint */}
                  {vendor.apiEndpoint && (
                    <p className="text-xs text-muted-foreground mt-3 font-mono truncate">
                      {vendor.apiEndpoint}
                    </p>
                  )}

                  <Separator className="my-4" />

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Sites Managed
                      </p>
                      <p className="text-sm font-semibold">
                        {vendor.stats.sitesManaged ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Last Actions
                      </p>
                      <p className="text-sm font-semibold">
                        {vendor.stats.lastActionCount ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Sync Status
                      </p>
                      <p
                        className={`text-sm font-medium capitalize ${
                          vendor.stats.syncStatus === 'synced'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : vendor.stats.syncStatus === 'syncing'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {vendor.stats.syncStatus ?? 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Last sync time */}
                  <p className="text-xs text-muted-foreground/70 mt-3">
                    Last synced: {formatTimeAgo(vendor.lastSync)}
                  </p>

                  <Separator className="my-4" />

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={syncingThis || !isActive}
                      onClick={() => syncMutation.mutate(vendor.id)}
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 mr-1.5 ${syncingThis ? 'animate-spin' : ''}`}
                      />
                      {syncingThis ? 'Syncing…' : 'Sync Now'}
                    </Button>
                    <Button
                      size="sm"
                      variant={isActive ? 'secondary' : 'default'}
                      className="flex-1"
                      disabled={toggleMutation.isPending}
                      onClick={() =>
                        toggleMutation.mutate({
                          vendorId: vendor.id,
                          enabled: !isActive,
                        })
                      }
                    >
                      {isActive ? (
                        <>
                          <Unplug className="h-3.5 w-3.5 mr-1.5" />
                          Disconnect
                        </>
                      ) : (
                        <>
                          <Plug className="h-3.5 w-3.5 mr-1.5" />
                          Connect
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Technology Coverage Matrix ─────────────────────────────────── */}
      {vendors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Technology Coverage Matrix
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px] sticky left-0 bg-background z-10">
                      Vendor
                    </TableHead>
                    {MATRIX_TECHS.map((tech) => (
                      <TableHead
                        key={tech}
                        className="text-center min-w-[100px]"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {TECH_ICONS[tech]}
                          <span>{tech}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((vendor) => {
                    const color = getVendorColor(vendor.vendor);

                    return (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-medium sticky left-0 bg-background z-10">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ backgroundColor: color }}
                            >
                              {vendor.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm">
                                {vendor.displayName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {vendor.vendor}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        {MATRIX_TECHS.map((tech) => {
                          const supported = vendor.technologies.includes(tech);

                          return (
                            <TableCell key={tech} className="text-center p-3">
                              {supported ? (
                                <div className="flex items-center justify-center">
                                  <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center">
                                  <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                                  </div>
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}