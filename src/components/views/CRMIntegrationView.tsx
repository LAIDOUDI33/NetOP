'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
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
  Users, TrendingDown, TrendingUp, DollarSign, Star, AlertTriangle,
  RefreshCw, Search, Heart, ShieldCheck, Phone,
} from 'lucide-react';
import { ExportButton } from '@/components/ExportButton';
import { useT } from '@/lib/i18n';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/PaginationControls';
import { cn } from '@/lib/utils';

interface Customer {
  id: string; msisdn: string; name: string; type: 'prepaid' | 'postpaid' | 'corporate';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'; region: string; arpu: number;
  churnRisk: 'low' | 'medium' | 'high' | 'critical'; satisfactionScore: number;
  tenure: number; dataUsage: number; status: string; complaints: number;
  joinDate: string; serviceType: string;
}

interface CRMData {
  customers: Customer[];
  segmentDistribution: Array<{ name: string; value: number; color: string }>;
  arpuByRegion: Array<{ region: string; prepaid: number; postpaid: number; corporate: number }>;
  churnAnalysis: Array<{ risk: string; count: number; revenue: number }>;
  satisfactionTrend: Array<{ month: string; prepaid: number; postpaid: number; corporate: number }>;
  topComplaints: Array<{ id: string; category: string; region: string; count: number; trend: string; satisfactionImpact: number; pct: number }>;
  summary: { total: number; active: number; avgArpu: number; avgSatisfaction: number; churnRate: number; highRisk: number; avgTenure: number; avgDataUsage: number; totalRevenue: number };
}

const SEGMENT_COLORS: Record<string, string> = { prepaid: '#10B981', postpaid: '#3B82F6', corporate: '#F59E0B' };
const TIER_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { platinum: 'default', gold: 'default', silver: 'secondary', bronze: 'outline' };
const CHURN_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { critical: 'destructive', high: 'secondary', medium: 'outline', low: 'default' };
const TREND_ICON: Record<string, typeof TrendingUp> = { up: TrendingUp, down: TrendingDown, stable: TrendingUp };
const TREND_COLOR: Record<string, string> = { up: 'text-red-500', down: 'text-emerald-500', stable: 'text-slate-400' };

export default function CRMIntegrationView() {
  const t = useT();
  const { data, isLoading, refetch } = useQuery<CRMData>({
    queryKey: ['integrations', 'crm'],
    queryFn: () => fetch('/api/integrations/crm').then(r => { if (!r.ok) throw new Error('CRM API error'); return r.json(); }),
    refetchInterval: 30000,
  });

  const { paginatedData: paginatedCustomers, currentPage, totalPages, setCurrentPage } = usePagination({ data: data?.customers ?? [], pageSize: 10 });

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

  const { customers, segmentDistribution, arpuByRegion, churnAnalysis, satisfactionTrend, topComplaints, summary } = data;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('crm.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('crm.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input placeholder={t('crm.searchCustomers')} className="pl-9 pr-4 py-2 rounded-md border bg-background text-sm w-64" />
          </div>
          <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />{t('crm.syncCrm')}</Button>
          <ExportButton data={customers} filename="crm-customers" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('crm.totalCustomers')}</p>
            <p className="text-3xl font-bold mt-1">{summary.total}</p>
            <p className="text-xs text-muted-foreground mt-1">{summary.active} {t('crm.activeSubscriptions')}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Users className="h-6 w-6 text-slate-600 dark:text-slate-300" /></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('crm.avgArpu')}</p>
            <p className="text-3xl font-bold mt-1">{summary.avgArpu.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">DZD</span></p>
            <p className="text-xs text-emerald-600 mt-1">{t('crm.revenue')}: {summary.totalRevenue.toLocaleString()} DZD</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" /></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('crm.avgSatisfaction')}</p>
            <p className="text-3xl font-bold mt-1">{summary.avgSatisfaction}/5.0</p>
            <Progress value={summary.avgSatisfaction * 20} className="mt-2 h-2" />
          </div>
          <div className="h-12 w-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center"><Star className="h-6 w-6 text-violet-600 dark:text-violet-400" /></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('crm.churnRisk')}</p>
            <p className={cn('text-3xl font-bold mt-1', summary.churnRate > 30 ? 'text-red-600' : 'text-amber-600')}>{summary.churnRate}%</p>
            <p className="text-xs text-red-600 mt-1">{summary.highRisk} {t('crm.highRisk')}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" /></div>
        </div></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers">{t('crm.customers')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('crm.analytics')}</TabsTrigger>
          <TabsTrigger value="churn">{t('crm.churn')}</TabsTrigger>
          <TabsTrigger value="complaints">{t('crm.complaints')}</TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <Card>
            <CardHeader><CardTitle className="text-base">{t('crm.customerList')} ({customers.length})</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[480px]">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t('crm.colMsisdn')}</TableHead><TableHead>{t('crm.colName')}</TableHead><TableHead>{t('crm.colSegment')}</TableHead>
                    <TableHead>{t('crm.colTier')}</TableHead><TableHead>{t('crm.colRegion')}</TableHead><TableHead>{t('crm.colArpu')}</TableHead>
                    <TableHead>{t('crm.colChurn')}</TableHead><TableHead>{t('crm.colSatisfaction')}</TableHead><TableHead>{t('crm.colTenure')}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {paginatedCustomers.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.msisdn}</TableCell>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize"><span className="mr-1 h-2 w-2 rounded-full inline-block" style={{ backgroundColor: SEGMENT_COLORS[c.type] }} />{c.type}</Badge></TableCell>
                        <TableCell><Badge variant={TIER_VARIANT[c.tier]}>{c.tier}</Badge></TableCell>
                        <TableCell>{c.region}</TableCell>
                        <TableCell className="font-mono">{c.arpu.toLocaleString()}</TableCell>
                        <TableCell><Badge variant={CHURN_VARIANT[c.churnRisk]} className="capitalize">{c.churnRisk}</Badge></TableCell>
                        <TableCell><div className="flex items-center gap-1"><Heart className={cn('h-3 w-3', c.satisfactionScore >= 4 ? 'text-emerald-500' : c.satisfactionScore >= 3 ? 'text-amber-500' : 'text-red-500')} /><span className="text-xs">{c.satisfactionScore}</span></div></TableCell>
                        <TableCell className="text-xs">{c.tenure}mo</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">{t('crm.segmentDistribution')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <PieChart><Pie data={segmentDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={110} paddingAngle={3}>
                    {segmentDistribution.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Pie><Tooltip /><Legend /></PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">{t('crm.arpuByRegion')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={arpuByRegion}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="region" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip /><Legend />
                    <Bar dataKey="prepaid" name="Prepaid" stackId="a" fill="#10B981" />
                    <Bar dataKey="postpaid" name="Postpaid" stackId="a" fill="#3B82F6" />
                    <Bar dataKey="corporate" name="Corporate" stackId="a" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-base">{t('crm.satisfactionTrend')}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={satisfactionTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip /><Legend />
                  <Line type="monotone" dataKey="prepaid" stroke="#10B981" name="Prepaid" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="postpaid" stroke="#3B82F6" name="Postpaid" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="corporate" stroke="#F59E0B" name="Corporate" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="churn">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">{t('crm.churnRiskDistribution')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={churnAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="risk" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Customers" fill="#EF4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">{t('crm.revenueAtRisk')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={churnAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="risk" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="revenue" name="Revenue (DZD)" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="complaints">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('crm.topComplaints')}</CardTitle>
              <CardDescription>{t('crm.complaintsImpact')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[420px]">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t('crm.colCategory')}</TableHead><TableHead>{t('crm.colRegion')}</TableHead><TableHead>{t('crm.colCount')}</TableHead>
                    <TableHead>{t('crm.colShare')}</TableHead><TableHead>{t('crm.colTrend')}</TableHead><TableHead>{t('crm.colSatImpact')}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {topComplaints.map((c) => {
                      const Icon = TREND_ICON[c.trend] || TrendingUp;
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.category}</TableCell>
                          <TableCell>{c.region}</TableCell>
                          <TableCell className="font-mono">{c.count}</TableCell>
                          <TableCell><div className="flex items-center gap-2"><Progress value={c.pct} className="w-16 h-2" /><span className="text-xs">{c.pct}%</span></div></TableCell>
                          <TableCell><div className="flex items-center gap-1"><Icon className={cn('h-4 w-4', TREND_COLOR[c.trend])} /></div></TableCell>
                          <TableCell className="text-red-600 text-xs">{c.satisfactionImpact.toFixed(1)}</TableCell>
                        </TableRow>
                      );
                    })}
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
