'use client';
import { useT } from '@/lib/i18n';
import { ExportButton } from '@/components/ExportButton';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Brain,
  Loader2,
  History,
  AlertTriangle,
  Wifi,
  Users,
  ArrowRightLeft,
  Zap,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { CoverageData, Technology } from '@/types';
import { TECH_COLORS } from '@/lib/constants';

/* ------------------------------------------------------------------ */
/*  Quick-diagnostic presets                                            */
/* ------------------------------------------------------------------ */
interface QuickIssue {
  category: string;
  icon: React.ReactNode;
  items: { label: string; description: string }[];
}

const QUICK_ISSUES: QuickIssue[] = [
  {
    category: 'rca.coverageIssues',
    icon: <Wifi className="h-4 w-4 text-cyan-500" />,
    items: [
      { label: 'rca.covHole', description: 'rca.covHoleDesc' },
      { label: 'rca.pilotPollution', description: 'rca.pilotPollutionDesc' },
      { label: 'rca.cellEdge', description: 'rca.cellEdgeDesc' },
    ],
  },
  {
    category: 'rca.capacityIssues',
    icon: <Users className="h-4 w-4 text-amber-500" />,
    items: [
      { label: 'rca.prbExhaustion', description: 'rca.prbExhaustionDesc' },
      { label: 'rca.ranCongestion', description: 'rca.ranCongestionDesc' },
    ],
  },
  {
    category: 'rca.handoverIssues',
    icon: <ArrowRightLeft className="h-4 w-4 text-emerald-500" />,
    items: [
      { label: 'rca.hoFailSpike', description: 'rca.hoFailSpikeDesc' },
      { label: 'rca.pingPong', description: 'rca.pingPongDesc' },
    ],
  },
  {
    category: 'rca.interferenceIssues',
    icon: <Zap className="h-4 w-4 text-red-500" />,
    items: [
      { label: 'rca.ulInterference', description: 'rca.ulInterferenceDesc' },
      { label: 'rca.extInterference', description: 'rca.extInterferenceDesc' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Analysis history item                                               */
/* ------------------------------------------------------------------ */
interface AnalysisRecord {
  id: string;
  timestamp: string;
  technology: string;
  site: string;
  symptom: string;
  response: string;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */
export default function RootCauseAnalysisView() {
  const t = useT();
  const [technology, setTechnology] = useState<string>('4G');
  const [siteCode, setSiteCode] = useState<string>('');
  const [symptoms, setSymptoms] = useState<string>('');
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  // Fetch sites for the site selector
  const { data: coverageData, isLoading: sitesLoading } = useQuery<CoverageData>({
    queryKey: ['coverage-rca'],
    queryFn: () => fetch('/api/coverage?technology=all&region=all').then(r => r.json()),
    refetchInterval: 60000,
  });

  const sites = coverageData?.sites ?? [];
  const filteredSites = technology === 'all'
    ? sites
    : sites.filter(s => s.technology === technology);

  // POST mutation for AI analysis
  const analyzeMutation = useMutation({
    mutationFn: (body: { prompt: string }) =>
      fetch('/api/optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: (result) => {
      const responseText = result.response ?? result.result ?? JSON.stringify(result);
      const record: AnalysisRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        technology,
        site: siteCode,
        symptom: symptoms,
        response: responseText,
      };
      setHistory(prev => [record, ...prev]);
      // Scroll to result
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    },
  });

  const handleAnalyze = useCallback(() => {
    if (!symptoms.trim()) return;
    const prompt = `Perform Root Cause Analysis for the following network issue:
Technology: ${technology}, Site: ${siteCode}
Symptoms: ${symptoms}

Provide analysis in this format:
## Likely Root Cause
[specific cause]

## Contributing Factors
- [factor 1]
- [factor 2]

## Recommended Actions
1. [action with specific parameter values]
2. [action]

## Expected Impact
[quantified expected improvement]`;
    analyzeMutation.mutate({ prompt });
  }, [technology, siteCode, symptoms, analyzeMutation]);

  const fillSymptom = useCallback((desc: string) => {
    setSymptoms(desc);
  }, []);

  const loadHistoryItem = useCallback((record: AnalysisRecord) => {
    setTechnology(record.technology);
    setSiteCode(record.site);
    setSymptoms(record.symptom);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ===== LEFT PANEL — Analysis Input (2 cols) ===== */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Root Cause Analysis
            </CardTitle>
            <ExportButton data={history as unknown as Record<string, any>[]} filenamePrefix="rca" columns={[{ key: 'timestamp', header: 'Time' }, { key: 'technology', header: 'Technology' }, { key: 'site', header: 'Site' }, { key: 'symptom', header: 'Symptom' }, { key: 'response', header: 'Analysis' }]} />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row: Tech + Site */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('filter.technology')}</Label>
                <Select value={technology} onValueChange={v => { setTechnology(v); setSiteCode(''); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select technology" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2G">2G</SelectItem>
                    <SelectItem value="3G">3G</SelectItem>
                    <SelectItem value="4G">4G</SelectItem>
                    <SelectItem value="5G">5G</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('rca.site')}</Label>
                {sitesLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select value={siteCode} onValueChange={setSiteCode}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select a site" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSites.map(s => (
                        <SelectItem key={s.id} value={s.code}>
                          {s.name} ({s.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Symptom description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('rca.symptomDesc')}</Label>
              <Textarea
                value={symptoms}
                onChange={e => setSymptoms(e.target.value)}
                placeholder={t('rca.placeholder')}
                rows={5}
                className="text-sm resize-none"
              />
            </div>

            {/* Analyze button */}
            <Button
              onClick={handleAnalyze}
              disabled={!symptoms.trim() || analyzeMutation.isPending}
              className="w-full sm:w-auto gap-2"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('btn.analyzing')}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t('btn.analyze')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* AI Response */}
        {analyzeMutation.data && (
          <Card ref={resultRef}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                {t('rca.aiResult')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 rounded-lg p-4 border">
                <ReactMarkdown>
                  {analyzeMutation.data.response ?? analyzeMutation.data.result ?? JSON.stringify(analyzeMutation.data)}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {analyzeMutation.isPending && (
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium">{t('rca.analyzing')}</span>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* History */}
        {history.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                {t('rca.analysisHistory')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {history.map(record => (
                    <button
                      key={record.id}
                      onClick={() => loadHistoryItem(record)}
                      className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors flex items-start gap-3 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            className="text-[10px]"
                            style={{ backgroundColor: TECH_COLORS[record.technology as Technology] ?? '#94A3B8', color: '#fff' }}
                          >
                            {record.technology}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{record.site || t('rca.allSites')}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto">{record.timestamp}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{record.symptom}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ===== RIGHT PANEL — Quick Diagnostics ===== */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {t('rca.quickDiag')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ScrollArea className="max-h-[calc(100vh-240px)]">
              <div className="space-y-5">
                {QUICK_ISSUES.map(category => (
                  <div key={category.category}>
                    <div className="flex items-center gap-2 mb-2">
                      {category.icon}
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t(category.category)}
                      </h4>
                    </div>
                    <div className="space-y-1.5 ml-6">
                      {category.items.map(item => (
                        <button
                          key={item.label}
                          onClick={() => fillSymptom(item.description)}
                          className="w-full text-left p-2.5 rounded-lg border border-border/60 hover:bg-muted/50 hover:border-primary/30 transition-all text-xs group"
                        >
                          <div className="flex items-center gap-1.5 font-medium text-foreground group-hover:text-primary transition-colors">
                            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            {t(item.label)}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 ml-4">
                            {t(item.description)}
                          </p>
                        </button>
                      ))}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}