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
  DollarSign, AlertTriangle, CheckCircle2, Clock, TrendingUp,
  RefreshCw, Search, CreditCard, Receipt, TrendingDown,
} from 'lucide-react';
import { ExportButton } from '@/components/ExportButton';
import { useT } from '@/lib/i18n';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/PaginationControls';
import { cn } from '@/lib/utils';

interface Invoice {
  id: string; customerId: string; customerName: string; msisdn: string;
  region: string; serviceType: string; billingCycle: string;
  amount: number; tax: number; total: number;
  status: 'paid' | 'pending' | 'overdue' | 'partial';
  paymentMethod: string | null; dueDate: string; paidDate: string | null;
  daysOverdue: number;
}

interface BillingData {
  invoices: Invoice[];
  revenueByMonth: Array<{ month: string; revenue: number; invoices: number }>;
  revenueByRegion: Array<{ region: string; revenue: number; count: number }>;
  revenueByService: Array<{ name: string; value: number; color: string }>;
  paymentMethods: Array<{ method: string; count: number }>;
  topDebtors: Array<{ customerId: string; customerName: string; msisdn: string; region: string; totalDue: number; daysOverdue: number; status: string }>;
  summary: {
    totalRevenue: number; totalInvoices: number; paidCount: number;
    pendingCount: number; overdueCount: number; overdueAmount: number;
    avgInvoiceAmount: number; collectionRate: number; monthlyGrowth: number;
  };
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  paid: 'default', pending: 'secondary', overdue: 'destructive', partial: 'outline',
};
const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  paid: CheckCircle2, pending: Clock, overdue: AlertTriangle, partial: TrendingDown,
};
const PAY_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'];

export default function BillingIntegrationView() {
  const t = useT();
  const { data, isLoading, refetch } = useQuery<BillingData>({
    queryKey: ['integrations', 'billing'],
    queryFn: () => fetch('/api/integrations/billing').then(r => {
      if (!r.ok) throw new Error('Billing API error');
      return r.json();
    }),
    refetchInterval: 30000,
  });

  const { paginatedData: paginatedInvoices, currentPage, totalPages, setCurrentPage } = usePagination({ data: data?.invoices ?? [], pageSize: 10 });

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

  const { invoices, revenueByMonth, revenueByRegion, revenueByService, paymentMethods, topDebtors, summary } = data;

  // Aging buckets
  const agingBuckets = [
    { bucket: '0-30 days', count: invoices.filter(i => i.daysOverdue > 0 && i.daysOverdue <= 30).length, amount: invoices.filter(i => i.daysOverdue > 0 && i.daysOverdue <= 30).reduce((s, i) => s + i.total, 0) },
    { bucket: '31-60 days', count: invoices.filter(i => i.daysOverdue > 30 && i.daysOverdue <= 60).length, amount: invoices.filter(i => i.daysOverdue > 30 && i.daysOverdue <= 60).reduce((s, i) => s + i.total, 0) },
    { bucket: '61-90 days', count: invoices.filter(i => i.daysOverdue > 60 && i.daysOverdue <= 90).length, amount: invoices.filter(i => i.daysOverdue > 60 && i.daysOverdue <= 90).reduce((s, i) => s + i.total, 0) },
    { bucket: '90+ days', count: invoices.filter(i => i.daysOverdue > 90).length, amount: invoices.filter(i => i.daysOverdue > 90).reduce((s, i) => s + i.total, 0) },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('bil.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('bil.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input placeholder={t('bil.searchInvoices')} className="pl-9 pr-4 py-2 rounded-md border bg-background text-sm w-64" />
          </div>
          <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />{t('bil.syncBilling')}</Button>
          <ExportButton data={invoices} filename="billing-invoices" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('bil.totalRevenue')}</p>
            <p className="text-3xl font-bold mt-1">{(summary.totalRevenue / 1000000).toFixed(1)}M <span className="text-sm font-normal text-muted-foreground">DZD</span></p>
            <div className="flex items-center gap-1 mt-1">
              {summary.monthlyGrowth >= 0
                ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                : <TrendingDown className="h-3 w-3 text-red-500" />}
              <p className={cn('text-xs', summary.monthlyGrowth >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {summary.monthlyGrowth >= 0 ? '+' : ''}{summary.monthlyGrowth}% MoM
              </p>
            </div>
          </div>
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('bil.collectionRate')}</p>
            <p className="text-3xl font-bold mt-1">{summary.collectionRate}%</p>
            <Progress value={summary.collectionRate} className="mt-2 h-2" />
          </div>
          <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('bil.overdueAmount')}</p>
            <p className="text-3xl font-bold mt-1 text-red-600 dark:text-red-400">{(summary.overdueAmount / 1000).toFixed(0)}K <span className="text-sm font-normal text-muted-foreground">DZD</span></p>
            <p className="text-xs text-red-600 mt-1">{summary.overdueCount} {t('bil.invoicesOverdue')}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('bil.avgInvoice')}</p>
            <p className="text-3xl font-bold mt-1">{summary.avgInvoiceAmount.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">DZD</span></p>
            <p className="text-xs text-muted-foreground mt-1">{summary.totalInvoices} {t('bil.totalInvoices')}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Receipt className="h-6 w-6 text-slate-600 dark:text-slate-300" />
          </div>
        </div></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">{t('bil.invoices')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('bil.revenueAnalytics')}</TabsTrigger>
          <TabsTrigger value="payments">{t('bil.payments')}</TabsTrigger>
          <TabsTrigger value="aging">{t('bil.aging')}</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader><CardTitle className="text-base">{t('bil.invoiceRegister')} ({invoices.length})</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[480px]">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t('bil.colInvoiceId')}</TableHead><TableHead>{t('bil.colCustomer')}</TableHead><TableHead>{t('bil.colMsisdn')}</TableHead>
                    <TableHead>{t('bil.colService')}</TableHead><TableHead>{t('bil.colAmount')}</TableHead><TableHead>{t('bil.colTax')}</TableHead>
                    <TableHead>{t('bil.colTotal')}</TableHead><TableHead>{t('bil.colStatus')}</TableHead><TableHead>{t('bil.colPayment')}</TableHead>
                    <TableHead>{t('bil.colDueDate')}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {paginatedInvoices.map((inv) => {
                      const Icon = STATUS_ICON[inv.status] || Clock;
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-xs">{inv.id}</TableCell>
                          <TableCell className="font-medium">{inv.customerName}</TableCell>
                          <TableCell className="font-mono text-xs">{inv.msisdn}</TableCell>
                          <TableCell className="text-xs">{inv.serviceType}</TableCell>
                          <TableCell className="font-mono text-xs">{inv.amount.toLocaleString()}</TableCell>
                          <TableCell className="font-mono text-xs">{inv.tax.toLocaleString()}</TableCell>
                          <TableCell className="font-mono font-medium">{inv.total.toLocaleString()}</TableCell>
                          <TableCell><Badge variant={STATUS_VARIANT[inv.status]} className="capitalize"><Icon className="h-3 w-3 mr-1" />{inv.status}</Badge></TableCell>
                          <TableCell className="text-xs">{inv.paymentMethod || '—'}</TableCell>
                          <TableCell className="text-xs">{inv.dueDate}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{t('bil.monthlyRevenueTrend')}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(v: number) => `${v.toLocaleString()} DZD`} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Revenue (DZD)" stroke="#10B981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">{t('bil.revenueByRegion')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={revenueByRegion}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="region" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => `${v.toLocaleString()} DZD`} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="revenue" name="Revenue (DZD)" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">{t('bil.revenueByService')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <PieChart>
                    <Pie data={revenueByService} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={110} paddingAngle={3}>
                      {revenueByService.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v.toLocaleString()} DZD`} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">{t('bil.paymentMethods')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={paymentMethods} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="method" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="count" name="Transactions" radius={[0, 6, 6, 0]}>
                      {paymentMethods.map((_, idx) => <Cell key={idx} fill={PAY_COLORS[idx % PAY_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('bil.topDebtors')}</CardTitle>
                <CardDescription>{t('bil.highestUnpaid')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[340px]">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>{t('bil.colCustomer')}</TableHead><TableHead>{t('bil.colRegion')}</TableHead>
                      <TableHead>{t('bil.colTotalDue')}</TableHead><TableHead>{t('bil.colDays')}</TableHead><TableHead>{t('bil.colStatus')}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {topDebtors.map((d) => (
                        <TableRow key={d.customerId}>
                          <TableCell className="font-medium text-xs">{d.customerName}</TableCell>
                          <TableCell className="text-xs">{d.region}</TableCell>
                          <TableCell className="font-mono text-xs text-red-600 font-medium">{d.totalDue.toLocaleString()}</TableCell>
                          <TableCell className="text-xs font-mono">{d.daysOverdue}d</TableCell>
                          <TableCell><Badge variant={STATUS_VARIANT[d.status]} className="capitalize text-xs">{d.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="aging">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">{t('bil.agingAnalysis')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={agingBuckets}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Legend />
                    <Bar dataKey="count" name="Invoices" fill="#EF4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">{t('bil.agingByValue')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={agingBuckets}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => `${v.toLocaleString()} DZD`} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Legend />
                    <Bar dataKey="amount" name="Amount (DZD)" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
