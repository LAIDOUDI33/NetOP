'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Settings2, FileText, Tags, Star, Layers, Clock, Copy } from 'lucide-react';
import { TECH_BG_CLASSES } from '@/lib/constants';
import type { Technology } from '@/types';
import { useT } from '@/lib/i18n';

interface TemplateParam {
  value: string | number;
  unit?: string;
  range?: string;
}

interface ConfigTemplate {
  id: string;
  name: string;
  technology: Technology;
  category: string;
  description: string;
  vendor: string;
  parameters: Record<string, TemplateParam>;
  isDefault: boolean;
  applyCount: number;
  lastApplied: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ConfigSummary {
  total: number;
  byCategory: Record<string, number>;
  byTech: Record<string, number>;
  totalApplications: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  radio: '#10B981',
  neighbor: '#06B6D4',
  handover: '#F59E0B',
  power: '#EF4444',
  capacity: '#8B5CF6',
};

export default function ConfigView() {
  const t = useT();
  const [techFilter, setTechFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');

  const { data, isLoading } = useQuery<{
    templates: ConfigTemplate[];
    summary: ConfigSummary;
  }>({
    queryKey: ['config', techFilter, categoryFilter, vendorFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (techFilter !== 'all') params.set('technology', techFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (vendorFilter !== 'all') params.set('vendor', vendorFilter);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return fetch(`/api/config${qs}`).then(r => r.json());
    },
  });

  const templates = data?.templates ?? [];
  const summary = data?.summary ?? { total: 0, byCategory: {}, byTech: {}, totalApplications: 0 };

  const vendors = templates.length > 0
    ? Array.from(new Set(templates.map(t => t.vendor))).sort()
    : [];

  const categories = templates.length > 0
    ? Array.from(new Set(templates.map(t => t.category))).sort()
    : [];

  const chartData = summary.byCategory
    ? Object.entries(summary.byCategory).map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count,
        fill: CATEGORY_COLORS[name] || '#6B7280',
      }))
    : [];

  const defaultCount = templates.filter(t => t.isDefault).length;

  function formatDateTime(ts: string | null): string {
    if (!ts) return 'Never';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border bg-card p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-6">
              <Skeleton className="h-5 w-40 mb-3" />
              <Skeleton className="h-3 w-full mb-6" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
            <Settings2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Configuration Templates</h2>
            <p className="text-sm text-muted-foreground">{t('cfg.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{t('cfg.totalTemplates')}</p>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-1">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{t('th.category')}</p>
              <Tags className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-1">{Object.keys(summary.byCategory).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{t('cfg.defaultTemplates')}</p>
              <Star className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{defaultCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{t('cfg.totalApplications')}</p>
              <Copy className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-1">{summary.totalApplications.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Distribution Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4" />
            {t('th.category')} Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={techFilter} onValueChange={setTechFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder={t('filter.technology')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allTechShort')}</SelectItem>
            <SelectItem value="2G">2G</SelectItem>
            <SelectItem value="3G">3G</SelectItem>
            <SelectItem value="4G">4G</SelectItem>
            <SelectItem value="5G">5G</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder={t('filter.category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allCategories')}</SelectItem>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder={"Vendor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allVendors')}</SelectItem>
            {vendors.map(v => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          {templates.length} template{templates.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Template Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {templates.map((template) => {
          const paramEntries = Object.entries(template.parameters);
          const paramCount = paramEntries.length;
          return (
            <Card key={template.id} className="relative">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{template.name}</h3>
                      {template.isDefault && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                          <Star className="h-2.5 w-2.5 mr-0.5" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                  </div>
                  <Badge variant="outline" className={TECH_BG_CLASSES[template.technology] || ''}>
                    {template.technology}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                  </span>
                  <Separator orientation="vertical" className="h-3" />
                  <span>{template.vendor}</span>
                  <Separator orientation="vertical" className="h-3" />
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {paramCount} param{paramCount !== 1 ? 's' : ''}
                  </span>
                  <Separator orientation="vertical" className="h-3" />
                  <span className="flex items-center gap-1">
                    <Copy className="h-3 w-3" />
                    Applied {template.applyCount}x
                  </span>
                </div>

                {template.lastApplied && (
                  <p className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last applied: {formatDateTime(template.lastApplied)}
                  </p>
                )}

                {paramEntries.length > 0 && (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-[11px] font-semibold h-8 px-3">Name</TableHead>
                          <TableHead className="text-[11px] font-semibold h-8 px-3">Value</TableHead>
                          <TableHead className="text-[11px] font-semibold h-8 px-3">Unit</TableHead>
                          <TableHead className="text-[11px] font-semibold h-8 px-3">Range</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paramEntries.slice(0, 5).map(([name, param]) => (
                          <TableRow key={name} className="h-8">
                            <TableCell className="text-xs px-3 font-mono py-1.5">{name}</TableCell>
                            <TableCell className="text-xs px-3 font-medium py-1.5">{String(param.value)}</TableCell>
                            <TableCell className="text-xs px-3 text-muted-foreground py-1.5">{param.unit || '-'}</TableCell>
                            <TableCell className="text-xs px-3 text-muted-foreground py-1.5">{param.range || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {paramEntries.length > 5 && (
                      <p className="text-[10px] text-muted-foreground text-center py-1.5 border-t bg-muted/30">
                        +{paramEntries.length - 5} more parameter{paramEntries.length - 5 !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {templates.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Settings2 className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm font-medium">{t('cfg.noTemplates')}</p>
          <p className="text-xs mt-1">{t('empty.tryFilters')}</p>
        </div>
      )}
    </div>
  );
}
