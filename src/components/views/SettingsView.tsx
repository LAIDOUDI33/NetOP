'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, RefreshCw } from 'lucide-react';
import type { NetworkParameterItem, Technology } from '@/types';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';

const TECH_COLORS: Record<Technology, string> = {
  '2G': '#94A3B8',
  '3G': '#06B6D4',
  '4G': '#10B981',
  '5G': '#F59E0B',
};

const CATEGORIES = ['all', 'RF', 'Power', 'Handover', 'Capacity'];

interface ParamsResponse {
  parameters: NetworkParameterItem[];
}

export default function SettingsView() {
  const t = useT();
  const queryClient = useQueryClient();
  const [technology, setTechnology] = useState<Technology>('4G');
  const [category, setCategory] = useState('all');
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery<ParamsResponse>({
    queryKey: ['parameters', technology, category],
    queryFn: () => fetch(`/api/parameters?technology=${technology}&category=${category}`).then(r => r.json()),
    refetchInterval: 30000,
  });

  const currentParamIds = useMemo(
    () => new Set(data?.parameters.map(p => p.id) ?? []),
    [data]
  );

  const filteredEdits = useMemo(
    () => {
      const result: Record<string, string> = {};
      for (const [id, val] of Object.entries(editedValues)) {
        if (currentParamIds.has(id)) result[id] = val;
      }
      return result;
    },
    [editedValues, currentParamIds]
  );

  const handleChange = useCallback((id: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [id]: value }));
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (changes: Record<string, string>) => {
      const results = await Promise.all(
        Object.entries(changes).map(([paramId, currentValue]) =>
          fetch('/api/parameters', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paramId, currentValue }),
          }).then(r => r.json())
        )
      );
      return results;
    },
    onSuccess: () => {
      toast.success(t('toast.saved'));
      queryClient.invalidateQueries({ queryKey: ['parameters'] });
      setEditedValues({});
    },
    onError: () => {
      toast.error(t('toast.saveFailed'));
    },
  });

  const hasChanges = Object.keys(filteredEdits).length > 0;

  return (
    <div className="space-y-6">
      {/* Technology Tabs */}
      <Tabs value={technology} onValueChange={(v) => setTechnology(v as Technology)}>
        <TabsList className="w-full sm:w-auto">
          {(Object.keys(TECH_COLORS) as Technology[]).map((tech) => (
            <TabsTrigger
              key={tech}
              value={tech}
              className="data-[state=active]:text-white"
              style={
                technology === tech
                  ? { backgroundColor: TECH_COLORS[tech], color: '#fff' }
                  : undefined
              }
            >
              {tech}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={category === cat ? 'default' : 'outline'}
            className="h-8 text-xs"
            onClick={() => setCategory(cat)}
          >
            {cat === 'all' ? t('set.allCategories') : t(`set.${cat.toLowerCase()}` as any)}
          </Button>
        ))}
      </div>

      {/* Parameters Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              {category !== 'all'
                ? t('set.paramsFor', { tech: technology, category: t(`set.${category.toLowerCase()}` as any) })
                : t('set.params', { tech: technology })}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['parameters'] })}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={!hasChanges || saveMutation.isPending}
                onClick={() => saveMutation.mutate(filteredEdits)}
              >
                <Save className="h-3 w-3 mr-1" />
                Save ({Object.keys(filteredEdits).length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading || !data ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="min-w-[900px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{t('th.parameter')}</TableHead>
                      <TableHead className="text-xs">{t('th.currentValue')}</TableHead>
                      <TableHead className="text-xs">{t('th.min')}</TableHead>
                      <TableHead className="text-xs">{t('th.max')}</TableHead>
                      <TableHead className="text-xs">{t('th.unit')}</TableHead>
                      <TableHead className="text-xs">{t('th.description')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.parameters.map((param) => {
                      const isEdited = param.id in filteredEdits;
                      const currentVal = filteredEdits[param.id] ?? param.currentValue;
                      return (
                        <TableRow key={param.id} className={isEdited ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                          <TableCell className="text-xs font-medium">{param.displayName}</TableCell>
                          <TableCell>
                            <Input
                              value={currentVal}
                              onChange={(e) => handleChange(param.id, e.target.value)}
                              className="h-8 text-xs w-28"
                            />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{param.minRange || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{param.maxRange || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{param.unit}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                            {param.description}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}