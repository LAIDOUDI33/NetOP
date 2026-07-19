'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Wifi, Signal, TrendingUp, Users } from 'lucide-react';
import { TECH_COLORS, TECH_BG_CLASSES, getSignalQuality, getSignalDot } from '@/lib/constants';
import type { Technology } from '@/types';

interface SiteData {
  id: string; name: string; code: string; technology: Technology; status: string;
  region: string; latitude: number; longitude: number; frequency: string;
  bandwidth: number; vendor: string; avgSignal: number; avgThroughput: number; avgUsers: number;
}

export default function CoverageMapView() {
  const [technology, setTechnology] = useState<string>('all');
  const [region, setRegion] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['coverage', technology, region],
    queryFn: () => fetch(`/api/coverage?technology=${technology}&region=${region}`).then(r => r.json()),
  });

  const sites: SiteData[] = data?.sites || [];
  const regionStats = data?.regionStats || [];
  const regions = [...new Set(regionStats.map(r => r.region))];

  return (
    <div className="space-y-6">
      {/* Map Placeholder - Interactive Leaflet Map */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Coverage Map
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative h-[400px] lg:h-[500px] bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: `radial-gradient(circle at 30% 40%, ${TECH_COLORS['4G']}33 0%, transparent 50%),
                              radial-gradient(circle at 70% 60%, ${TECH_COLORS['5G']}33 0%, transparent 50%),
                              radial-gradient(circle at 50% 30%, ${TECH_COLORS['3G']}22 0%, transparent 40%)`,
            }} />
            <div className="relative text-center space-y-3 z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30">
                <MapPin className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-lg">Interactive Coverage Map</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  {sites.length} sites across {regions.length} regions · Technology-colored markers with signal heat visualization
                </p>
              </div>
              <div className="flex items-center justify-center gap-4 text-xs">
                {(Object.entries(TECH_COLORS) as [Technology, string][]).map(([tech, color]) => {
                  const count = sites.filter(s => s.technology === tech).length;
                  return (
                    <span key={tech} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      {tech}: {count}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select value={technology} onValueChange={setTechnology}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Technology" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Technologies</SelectItem>
            <SelectItem value="2G">2G (GSM)</SelectItem>
            <SelectItem value="3G">3G (UMTS)</SelectItem>
            <SelectItem value="4G">4G (LTE)</SelectItem>
            <SelectItem value="5G">5G (NR)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Region Stats */}
      {!isLoading && regionStats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {regionStats.map((rs: any) => (
            <Card key={rs.region}>
              <CardContent className="p-4">
                <p className="text-sm font-medium text-muted-foreground mb-3">{rs.region}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-bold">{rs.totalSites}</p>
                    <p className="text-[10px] text-muted-foreground">Sites</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1">
                      <Wifi className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-bold">{rs.avgAvailability.toFixed(1)}%</p>
                    <p className="text-[10px] text-muted-foreground">Avail</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1">
                      <Signal className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-bold">{rs.avgSignal.toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">Signal</p>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-3">
                  {(Object.entries(rs.techDistribution) as [Technology, number][]).map(([tech, count]) => (
                    count > 0 ? (
                      <Badge key={tech} className={TECH_BG_CLASSES[tech]}>{tech}:{count}</Badge>
                    ) : null
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sites Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Site Coverage Details ({sites.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : (
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Site</TableHead>
                    <TableHead>Tech</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Signal</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Throughput</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((s) => {
                    const quality = getSignalQuality(s.avgSignal);
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${getSignalDot(s.avgSignal)}`} />
                            <div>
                              <p className="text-xs">{s.name}</p>
                              <p className="text-[10px] text-muted-foreground">{s.code}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={TECH_BG_CLASSES[s.technology]}>{s.technology}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{s.region}</TableCell>
                        <TableCell className="font-mono text-xs">{s.avgSignal.toFixed(1)} dBm</TableCell>
                        <TableCell><span className={`text-xs font-medium ${quality.color}`}>{quality.label}</span></TableCell>
                        <TableCell className="text-xs">{s.avgThroughput.toFixed(1)} Mbps</TableCell>
                        <TableCell className="text-xs">{s.avgUsers}</TableCell>
                        <TableCell>
                          <Badge variant={s.status === 'active' ? 'default' : s.status === 'down' ? 'destructive' : 'secondary'} className="text-[10px]">
                            {s.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}