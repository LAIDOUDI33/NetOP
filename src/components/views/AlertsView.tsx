'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, AlertCircle, Info, CheckCircle, Eye, EyeOff } from 'lucide-react';
import type { AlertItem, AlertRuleItem, Technology, AlertSeverity } from '@/types';
import { toast } from 'sonner';

const TECH_COLORS: Record<Technology, string> = {
  '2G': '#94A3B8',
  '3G': '#06B6D4',
  '4G': '#10B981',
  '5G': '#F59E0B',
};

const SEVERITY_CONFIG: Record<AlertSeverity, { color: string; icon: typeof AlertTriangle; variant: 'destructive' | 'secondary' | 'outline' }> = {
  critical: { color: 'text-red-600 bg-red-500/10', icon: AlertTriangle, variant: 'destructive' },
  warning: { color: 'text-amber-600 bg-amber-500/10', icon: AlertCircle, variant: 'secondary' },
  info: { color: 'text-cyan-600 bg-cyan-500/10', icon: Info, variant: 'outline' },
};

interface AlertsResponse {
  alerts: AlertItem[];
  rules: AlertRuleItem[];
  stats: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    byTech: Record<string, number>;
  };
}

export default function AlertsView() {
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState('all');
  const [techFilter, setTechFilter] = useState('all');
  const [showResolved, setShowResolved] = useState(false);

  const { data, isLoading } = useQuery<AlertsResponse>({
    queryKey: ['alerts', severityFilter, techFilter, showResolved],
    queryFn: () =>
      fetch(`/api/alerts?severity=${severityFilter}&technology=${techFilter}&resolved=${showResolved}`)
        .then(r => r.json()),
    refetchInterval: 15000,
  });

  const patchMutation = useMutation({
    mutationFn: (body: { alertId?: string; action: string; ruleId?: string; enabled?: boolean }) =>
      fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Action completed');
    },
    onError: () => {
      toast.error('Action failed');
    },
  });

  const handleAcknowledge = (id: string) => patchMutation.mutate({ alertId: id, action: 'acknowledge' });
  const handleResolve = (id: string) => patchMutation.mutate({ alertId: id, action: 'resolve' });
  const handleToggleRule = (ruleId: string, enabled: boolean) =>
    patchMutation.mutate({ ruleId, action: 'toggleRule', enabled });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Unresolved</p>
                <p className="text-2xl font-bold">{data.stats.total}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Critical</p>
                <p className="text-2xl font-bold text-red-600">{data.stats.critical}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-900/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600">Warning</p>
                <p className="text-2xl font-bold text-amber-600">{data.stats.warning}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-cyan-200 dark:border-cyan-900/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cyan-600">Info</p>
                <p className="text-2xl font-bold text-cyan-600">{data.stats.info}</p>
              </div>
              <Info className="h-8 w-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={techFilter} onValueChange={setTechFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Technology" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Technologies</SelectItem>
            <SelectItem value="2G">2G</SelectItem>
            <SelectItem value="3G">3G</SelectItem>
            <SelectItem value="4G">4G</SelectItem>
            <SelectItem value="5G">5G</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch checked={showResolved} onCheckedChange={setShowResolved} />
          <span className="text-sm text-muted-foreground">Show Resolved</span>
        </div>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Alerts ({data.alerts.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="max-h-96">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Severity</TableHead>
                    <TableHead className="text-xs">Site</TableHead>
                    <TableHead className="text-xs">Technology</TableHead>
                    <TableHead className="text-xs">Metric</TableHead>
                    <TableHead className="text-xs">Value vs Threshold</TableHead>
                    <TableHead className="text-xs">Message</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.alerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                        No alerts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.alerts.map((alert) => {
                      const sev = SEVERITY_CONFIG[alert.severity];
                      const SevIcon = sev.icon;
                      return (
                        <TableRow key={alert.id}>
                          <TableCell>
                            <Badge variant={sev.variant} className="text-xs gap-1">
                              <SevIcon className="h-3 w-3" />
                              {alert.severity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {alert.siteName || alert.siteCode || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className="text-xs"
                              style={{ backgroundColor: TECH_COLORS[alert.technology], color: '#fff' }}
                            >
                              {alert.technology}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{alert.metric}</TableCell>
                          <TableCell className="text-xs">
                            <span className={alert.value > alert.threshold ? 'text-red-600 font-medium' : ''}>
                              {alert.value} / {alert.threshold}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{alert.message}</TableCell>
                          <TableCell>
                            {alert.resolvedAt ? (
                              <Badge variant="outline" className="text-xs gap-1 text-emerald-600">
                                <CheckCircle className="h-3 w-3" /> Resolved
                              </Badge>
                            ) : alert.acknowledged ? (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Eye className="h-3 w-3" /> Ack'd
                              </Badge>
                            ) : (
                              <Badge className="text-xs gap-1">
                                <EyeOff className="h-3 w-3" /> New
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              {!alert.acknowledged && !alert.resolvedAt && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAcknowledge(alert.id)}>
                                  Ack
                                </Button>
                              )}
                              {!alert.resolvedAt && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleResolve(alert.id)}>
                                  Resolve
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Alert Rules */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Alert Rules</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="max-h-72">
            <div className="min-w-[700px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Rule Name</TableHead>
                    <TableHead className="text-xs">Technology</TableHead>
                    <TableHead className="text-xs">Metric</TableHead>
                    <TableHead className="text-xs">Condition</TableHead>
                    <TableHead className="text-xs">Threshold</TableHead>
                    <TableHead className="text-xs">Severity</TableHead>
                    <TableHead className="text-xs text-center">Enabled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="text-xs font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <Badge
                          className="text-xs"
                          style={{ backgroundColor: TECH_COLORS[rule.technology as Technology], color: '#fff' }}
                        >
                          {rule.technology}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{rule.metric}</TableCell>
                      <TableCell className="text-xs">{rule.condition}</TableCell>
                      <TableCell className="text-xs font-medium">{rule.threshold}</TableCell>
                      <TableCell>
                        <Badge variant={SEVERITY_CONFIG[rule.severity].variant} className="text-xs">
                          {rule.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                        />
                      </TableCell>
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