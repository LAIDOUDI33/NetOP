'use client';
import { useT } from '@/lib/i18n';
import { ExportButton } from '@/components/ExportButton';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Server, Signal, Users, Wifi } from 'lucide-react';
import type { CoverageData, Technology, SiteStatus } from '@/types';

const TECH_COLORS: Record<Technology, string> = {
  '2G': '#94A3B8',
  '3G': '#06B6D4',
  '4G': '#10B981',
  '5G': '#F59E0B',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  degraded: 'secondary',
  down: 'destructive',
  maintenance: 'outline',
};

function getSignalColor(signal: number) {
  if (signal >= -80) return 'text-emerald-600 dark:text-emerald-400';
  if (signal >= -95) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getSignalLabelKey(signal: number): string {
  if (signal >= -80) return 'good';
  if (signal >= -95) return 'fair';
  return 'poor';
}

export default function CoverageView() {
  const t = useT();
  const [technology, setTechnology] = useState<string>('all');
  const [region, setRegion] = useState<string>('all');

  const { data, isLoading, isError } = useQuery<CoverageData>({
    queryKey: ['coverage', technology, region],
    queryFn: () => fetch(`/api/coverage?technology=${technology}&region=${region}`).then(r => { if (!r.ok) throw new Error('Coverage API error: ' + r.status); return r.json(); }),
    refetchInterval: 30000,
  });

  const regions = data ? [...new Set(data.sites.map(s => s.region))].sort() : [];

  if (isError) {
    return <div className="text-red-500 p-4">Error loading coverage data</div>;
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    active: t('status.active'),
    degraded: t('status.degraded'),
    down: t('status.down'),
    maintenance: t('status.maintenance'),
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select value={technology} onValueChange={setTechnology}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('filter.technology')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allTech')}</SelectItem>
            <SelectItem value="2G">2G</SelectItem>
            <SelectItem value="3G">3G</SelectItem>
            <SelectItem value="4G">4G</SelectItem>
            <SelectItem value="5G">5G</SelectItem>
          </SelectContent>
        </Select>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('filter.region')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allRegions')}</SelectItem>
            {regions.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Region Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.regionStats.map((rs) => (
          <Card key={rs.region}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">{rs.region}</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <Server className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-bold">{rs.totalSites}</p>
                  <p className="text-[10px] text-muted-foreground">Sites</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <Wifi className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-bold">{(rs.avgAvailability ?? 0).toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground">Avail</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <Signal className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-bold">{(rs.avgSignal ?? 0).toFixed(0)}</p>
                  <p className="text-[10px] text-muted-foreground">Signal</p>
                </div>
              </div>
              <div className="flex gap-1 flex-wrap">
                {(Object.entries(rs.techDistribution) as [Technology, number][]).map(([tech, count]) => (
                  <Badge
                    key={tech}
                    className="text-[10px]"
                    style={{ backgroundColor: TECH_COLORS[tech], color: '#fff' }}
                  >
                    {tech}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sites Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Sites ({data.sites.length})</CardTitle>
          <ExportButton data={data.sites} filenamePrefix="coverage" columns={[{ key: 'name', header: 'Site' }, { key: 'code', header: 'Code' }, { key: 'technology', header: 'Technology' }, { key: 'region', header: 'Region' }, { key: 'status', header: 'Status' }, { key: 'avgSignal', header: 'Signal (dBm)' }, { key: 'avgThroughput', header: 'Throughput (Mbps)' }, { key: 'avgUsers', header: 'Users' }]} />
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="max-h-96">
            <div className="min-w-[700px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{t('th.site')}</TableHead>
                    <TableHead className="text-xs">{t('th.code')}</TableHead>
                    <TableHead className="text-xs">{t('th.technology')}</TableHead>
                    <TableHead className="text-xs">{t('th.region')}</TableHead>
                    <TableHead className="text-xs">{t('th.status')}</TableHead>
                    <TableHead className="text-xs text-right">Signal</TableHead>
                    <TableHead className="text-xs text-right">Throughput</TableHead>
                    <TableHead className="text-xs text-right">{t('th.users')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="text-xs font-medium">{site.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{site.code}</TableCell>
                      <TableCell>
                        <Badge
                          className="text-xs"
                          style={{ backgroundColor: TECH_COLORS[site.technology], color: '#fff' }}
                        >
                          {site.technology}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{site.region}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[site.status]} className="text-xs">
                          {statusLabels[site.status] ?? site.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <span className={`font-medium ${getSignalColor(site.avgSignal)}`}>
                          {(site.avgSignal ?? 0).toFixed(1)} {t('unit.dbm')}
                        </span>
                        <span className={`text-[10px] ml-1 ${getSignalColor(site.avgSignal)}`}>
                          ({t('signal.' + getSignalLabelKey(site.avgSignal))})
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-right">{(site.avgThroughput ?? 0).toFixed(1)} {t('unit.mbps')}</TableCell>
                      <TableCell className="text-xs text-right">{Math.round(site.avgUsers)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}