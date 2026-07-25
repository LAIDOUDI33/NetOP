'use client';

import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Server, Radio, AlertTriangle, RefreshCw, Search,
  CheckCircle2, XCircle, Clock, Cpu, Signal,
} from 'lucide-react';
import { ExportButton } from '@/components/ExportButton';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// --- Data shape MUST match /api/integrations/oss response ---
interface NetworkElement {
  neId: string; name: string; type: string; technology: string;
  vendor: string; region: string; site: string; status: string;
  lastPoll: string; cpuUsage: number; memoryUsage: number; carriers: number;
}

interface FaultEvent {
  id: string; neId: string; neName: string; severity: string;
  description: string; category: string; timestamp: string; acknowledged: boolean;
}

interface OSSData {
  elements: NetworkElement[];
  neTypeDistribution: Array<{ name: string; value: number }>;
  vendorDistribution: Array<{ name: string; count: number }>;
  performanceTrend: Array<{ time: string; cpu: number; memory: number; throughput: number }>;
  faultEvents: FaultEvent[];
  summary: { total: number; active: number; degraded: number; down: number; avgCpu: number; avgMemory: number };
}

const TYPE_COLORS: Record<string, string> = {
  gNodeB: '#F59E0B', eNodeB: '#10B981', RNC: '#8B5CF6', BSC: '#06B6D4',
  BTS: '#14B8A6', MME: '#EF4444', SGSN: '#EC4899', MSC: '#3B82F6',
  AMF: '#F97316', SMF: '#06B6D4', UPF: '#84CC16', HSS: '#A855F7', NodeB: '#14B8A6',
};
const PIE_COLORS = ['#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EF4444', '#EC4899', '#3B82F6', '#14B8A6', '#F97316', '#84CC16', '#A855F7', '#0EA5E9'];
const VENDOR_COLORS = ['#1E40AF', '#DC2626', '#059669', '#7C3AED'];

const STATUS_VARIANT: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
  active: 'default', degraded: 'secondary', down: 'destructive', maintenance: 'outline',
};
const SEVERITY_VARIANT: Record<string, 'destructive' | 'secondary' | 'outline' | 'default'> = {
  critical: 'destructive', major: 'secondary', minor: 'outline', warning: 'default',
};

const REGIONS = ['Alger', 'Oran', 'Constantine', 'Annaba', 'Tlemcen', 'Sétif', 'Blida', 'Batna', 'Béjaïa', 'Tizi Ouzou', 'Biskra', 'Ouargla'];

export default function OSSIntegrationView() {
  const t = useT();
  const { data, isLoading, refetch } = useQuery<OSSData>({
    queryKey: ['integrations', 'oss'],
    queryFn: () => fetch('/api/integrations/oss').then(r => { if (!r.ok) throw new Error('OSS API error'); return r.json(); }),
    refetchInterval: 30000,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>
      </div>
    );
  }

  const { elements, neTypeDistribution, vendorDistribution, performanceTrend, faultEvents, summary } = data;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">OSS Integration</h1>
          <p className="text-muted-foreground text-sm mt-1">Network element inventory and real-time performance from OSS systems</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input placeholder="Search network elements..." className="pl-9 pr-4 py-2 rounded-md border bg-background text-sm w-64" />
          </div>
          <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Sync OSS</Button>
          <ExportButton data={elements} filename="oss-network-elements" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total NEs</p>
                <p className="text-3xl font-bold mt-1">{summary.total}</p>
                <p className="text-xs text-muted-foreground mt-1">Managed Elements</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Server className="h-6 w-6 text-slate-600 dark:text-slate-300" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active NEs</p>
              <p className="text-3xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{summary.active}</p>
              <div className="flex items-center gap-1 mt-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /><p className="text-xs text-emerald-600">Fully Operational</p></div>
            </div>
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Signal className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg CPU / Memory</p>
                <p className="text-3xl font-bold mt-1">{summary.avgCpu}%</p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={summary.avgCpu} className="flex-1 h-2" />
                  <span className="text-xs font-mono">{summary.avgMemory}%</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Cpu className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Down NEs</p>
                <p className="text-3xl font-bold mt-1 text-red-600 dark:text-red-400">{summary.down}</p>
                <div className="flex items-center gap-1 mt-1"><AlertTriangle className="h-3 w-3 text-red-500" /><p className="text-xs text-red-600">Requires Attention</p></div>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">NE Inventory</TabsTrigger>
          <TabsTrigger value="charts">Distribution</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="faults">Fault Events</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Network Element Inventory</CardTitle>
              <CardDescription>All managed network elements across {REGIONS.length} regions</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[480px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NE ID</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead>
                      <TableHead>Vendor</TableHead><TableHead>Region</TableHead><TableHead>Status</TableHead>
                      <TableHead>Last Poll</TableHead><TableHead>CPU</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {elements.map((ne) => (
                      <TableRow key={ne.neId}>
                        <TableCell className="font-mono text-xs">{ne.neId}</TableCell>
                        <TableCell className="font-medium">{ne.name}</TableCell>
                        <TableCell><Badge variant="outline"><span className="mr-1 h-2 w-2 rounded-full inline-block" style={{ backgroundColor: TYPE_COLORS[ne.type] || '#888' }} />{ne.type}</Badge></TableCell>
                        <TableCell>{ne.vendor}</TableCell>
                        <TableCell>{ne.region}</TableCell>
                        <TableCell><Badge variant={STATUS_VARIANT[ne.status] || 'outline'}>{ne.status}</Badge></TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{new Date(ne.lastPoll).toLocaleTimeString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={ne.cpuUsage} className="w-16 h-2" />
                            <span className={cn('text-xs font-mono', ne.cpuUsage > 80 ? 'text-red-600' : '')}>{ne.cpuUsage}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">NE Type Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <PieChart>
                    <Pie data={neTypeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={110} paddingAngle={3}>
                      {neTypeDistribution.map((_, idx) => (<Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Vendor Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={vendorDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="count" name="Elements" radius={[6, 6, 0, 0]}>
                      {vendorDistribution.map((_, idx) => (<Cell key={idx} fill={VENDOR_COLORS[idx % VENDOR_COLORS.length]} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader><CardTitle className="text-base">Real-Time Performance Trends</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="cpu" stroke="#EF4444" name="CPU %" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="memory" stroke="#8B5CF6" name="Memory %" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="throughput" stroke="#06B6D4" name="Throughput Mbps" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faults">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fault Event Feed</CardTitle>
              <CardDescription>Latest alarms from OSS ({faultEvents.length} events)</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[480px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead><TableHead>Network Element</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead><TableHead>ACK</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faultEvents.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono text-xs">{new Date(f.timestamp).toLocaleTimeString()}</TableCell>
                        <TableCell className="font-medium">{f.neName}</TableCell>
                        <TableCell><Badge variant={SEVERITY_VARIANT[f.severity] || 'outline'}>{f.severity}</Badge></TableCell>
                        <TableCell className="text-xs">{f.category}</TableCell>
                        <TableCell className="text-xs max-w-xs truncate">{f.description}</TableCell>
                        <TableCell>
                          {f.acknowledged ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Clock className="h-4 w-4 text-amber-500" />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
