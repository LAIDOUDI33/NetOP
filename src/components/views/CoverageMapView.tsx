'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Signal, TrendingUp, Users, Wifi } from 'lucide-react';
import { TECH_COLORS, TECH_BG_CLASSES, getSignalQuality } from '@/lib/constants';
import type { Technology, SiteStatus, CoverageData } from '@/types';
import { useT } from '@/lib/i18n';
import { ExportButton } from '@/components/ExportButton';

import 'leaflet/dist/leaflet.css';

// Dynamic imports for all Leaflet components (SSR-safe)
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false },
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then((mod) => mod.CircleMarker),
  { ssr: false },
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false },
);

// Status-based stroke colors for CircleMarker
const STATUS_STROKE: Record<SiteStatus, string> = {
  active: '#10B981',
  degraded: '#F59E0B',
  down: '#EF4444',
  maintenance: '#94A3B8',
};

// Radius by status
const STATUS_RADIUS: Record<SiteStatus, number> = {
  active: 8,
  degraded: 10,
  down: 12,
  maintenance: 7,
};

export default function CoverageMapView() {
  const t = useT();
  const [technology, setTechnology] = useState<string>('all');
  const [region, setRegion] = useState<string>('all');
  const { data, isLoading } = useQuery<CoverageData>({
    queryKey: ['coverage', technology, region],
    queryFn: () =>
      fetch(`/api/coverage?technology=${technology}&region=${region}`).then((r) =>
        r.json(),
      ),
  });

  const sites = data?.sites ?? [];
  const regionStats = data?.regionStats ?? [];
  const regions = [...new Set(regionStats.map((r) => r.region))];

  // Technology distribution counts
  const techCounts: Partial<Record<Technology, number>> = {};
  sites.forEach((s) => {
    techCounts[s.technology] = (techCounts[s.technology] ?? 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MapPin className="h-6 w-6 text-emerald-500" />
          Coverage Analysis
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('cov.subtitle')}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select value={technology} onValueChange={setTechnology}>
          <SelectTrigger className="w-[180px]">
            <Wifi className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t('filter.technology')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allTech')}</SelectItem>
            <SelectItem value="2G">{t('cov.gsm')}</SelectItem>
            <SelectItem value="3G">{t('cov.umts')}</SelectItem>
            <SelectItem value="4G">{t('cov.lte')}</SelectItem>
            <SelectItem value="5G">{t('cov.nr')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="w-[200px]">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t('filter.region')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allRegions')}</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isLoading && (
          <span className="text-sm text-muted-foreground ml-auto">
            {t('cov.sitesDisplayed', { n: sites.length })}
          </span>
        )}
      </div>

      {/* Leaflet Map */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-[400px] lg:h-[500px] flex items-center justify-center bg-muted/30">
              <div className="space-y-4 w-full max-w-md px-6">
                <Skeleton className="h-[400px] lg:h-[500px] w-full rounded-none" />
              </div>
            </div>
          ) : (
            <div className="h-[400px] lg:h-[500px]" role="application" aria-label="Interactive network coverage map">
              {sites.length === 0 ? (
                <div className="h-full flex items-center justify-center bg-muted/30">
                  <div className="text-center space-y-2">
                    <MapPin className="h-10 w-10 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground font-medium">{t('cov.noSitesMatch')}</p>
                    <p className="text-sm text-muted-foreground">{t('cov.tryAdjust')}</p>
                  </div>
                </div>
              ) : (
                <MapContainer
                  center={[28.0, 2.0]}
                  zoom={5}
                  className="h-full w-full"
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {sites.map((site) => (
                    <CircleMarker
                      key={site.id}
                      center={[site.latitude, site.longitude]}
                      radius={STATUS_RADIUS[site.status] ?? 8}
                      pathOptions={{
                        fillColor: TECH_COLORS[site.technology],
                        fillOpacity: 0.7,
                        color: STATUS_STROKE[site.status] ?? '#64748B',
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="space-y-2 min-w-[200px] text-sm font-sans">
                          <div className="font-semibold text-base">{site.name}</div>
                          <div className="text-xs text-gray-500">{site.code}</div>
                          <div className="flex gap-2 flex-wrap">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: TECH_COLORS[site.technology] + '20',
                                color: TECH_COLORS[site.technology],
                                border: `1px solid ${TECH_COLORS[site.technology]}40`,
                              }}
                            >
                              {site.technology}
                            </span>
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: STATUS_STROKE[site.status] + '20',
                                color: STATUS_STROKE[site.status],
                                border: `1px solid ${STATUS_STROKE[site.status]}40`,
                              }}
                            >
                              {site.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div className="flex items-center gap-1">
                              <Signal className="h-3 w-3 text-gray-400" />
                              <span>{t('cov.signal')}</span>
                              <span className="font-mono font-medium">{(site.avgSignal ?? 0).toFixed(1)} {t('unit.dbm')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-gray-400" />
                              <span>{t('cov.throughput')}</span>
                              <span className="font-mono font-medium">{(site.avgThroughput ?? 0).toFixed(1)} {t('unit.mbps')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-gray-400" />
                              <span>{t('cov.users')}</span>
                              <span className="font-mono font-medium">{site.avgUsers}</span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 border-t pt-1 mt-1">
                            <div>{t('cov.region')} {site.region}</div>
                            <div>{t('cov.vendorLabel')} {site.vendor}</div>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map Legend */}
      {!isLoading && sites.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{t('cov.technology')}</span>
          {(Object.entries(TECH_COLORS) as [Technology, string][]).map(([tech, color]) => (
            <span key={tech} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: color }}
              />
              {tech}: {techCounts[tech] ?? 0}
            </span>
          ))}
          <span className="ml-4 font-medium text-foreground">{t('cov.statusLabel')}</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-emerald-500" />
            {t('status.active')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-amber-500" />
            {t('status.degraded')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-red-500" />
            {t('status.down')}
          </span>
        </div>
      )}

      {/* Technology Distribution */}
      {!isLoading && sites.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{t('cov.techDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(Object.entries(TECH_COLORS) as [Technology, string][]).map(([tech, color]) => {
                const count = techCounts[tech] ?? 0;
                const pct = sites.length > 0 ? ((count / sites.length) * 100).toFixed(1) : '0.0';
                return (
                  <div
                    key={tech}
                    className="rounded-lg p-4 border"
                    style={{ backgroundColor: color + '08', borderColor: color + '30' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold" style={{ color }}>
                        {tech}
                      </span>
                      <span className="text-lg font-bold">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{pct}% of sites</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Region Statistics Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            {t('cov.regionStats')}
          </CardTitle>
          <ExportButton data={regionStats} filenamePrefix="coverage-map" columns={[{ key: 'region', header: t('th.region') }, { key: 'totalSites', header: t('th.totalSites') }, { key: 'avgAvailability', header: t('th.avgAvailabilityPct') }, { key: 'avgSignal', header: t('th.avgSignalDbm') }]} />
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : regionStats.length > 0 ? (
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('th.region')}</TableHead>
                    <TableHead className="text-right">{t('cov.totalSites')}</TableHead>
                    <TableHead className="text-right">{t('cov.avgAvailability')}</TableHead>
                    <TableHead className="text-right">{t('cov.avgSignal')}</TableHead>
                    <TableHead>{t('cov.techDistCol')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regionStats.map((rs) => {
                    const quality = getSignalQuality(rs.avgSignal);
                    return (
                      <TableRow key={rs.region}>
                        <TableCell className="font-medium">{rs.region}</TableCell>
                        <TableCell className="text-right font-mono">
                          {rs.totalSites}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {(rs.avgAvailability ?? 0).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-mono text-xs ${quality.color}`}>
                            {(rs.avgSignal ?? 0).toFixed(1)} dBm
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({quality.label})
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1.5 flex-wrap">
                            {(Object.entries(rs.techDistribution) as [Technology, number][]).map(
                              ([tech, count]) =>
                                count > 0 ? (
                                  <Badge
                                    key={tech}
                                    className={TECH_BG_CLASSES[tech]}
                                  >
                                    {tech}: {count}
                                  </Badge>
                                ) : null,
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p>{t('cov.noRegionData')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}