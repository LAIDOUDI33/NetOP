'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare, Search, Sparkles, Send, Bot, User, Brain, Trash2,
  Loader2, AlertTriangle, CheckCircle2, BarChart3,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useAppStore } from '@/store/app';
import { ExportButton } from '@/components/ExportButton';

// ─── Types ─────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type: 'text' | 'insight';
  domain?: string;
}

interface QueryResult {
  question: string;
  answer: string;
  confidence: number;
  dataSource: string;
  timestamp: Date;
}

interface InsightReport {
  domain: string;
  content: string;
  timestamp: Date;
}

type InsightDomain = 'network' | 'kpi' | 'capacity' | 'churn' | 'faults' | 'traffic' | 'revenue';

const INSIGHT_DOMAINS: InsightDomain[] = ['network', 'kpi', 'capacity', 'churn', 'faults', 'traffic', 'revenue'];

const INSIGHT_I18N_KEYS: Record<InsightDomain, string> = {
  network: 'ai.networkInsight', kpi: 'ai.kpiInsight', capacity: 'ai.capacityInsight',
  churn: 'ai.churnInsight', faults: 'ai.faultsInsight', traffic: 'ai.trafficInsight', revenue: 'ai.revenueInsight',
};

const QUERY_EXAMPLES = [
  'How many sites are degraded?',
  'Which wilayas have the highest churn?',
  'What is the average network availability?',
  'Show capacity risk summary',
  'Compare 4G vs 5G performance',
  'What are the main anomaly trends?',
];

const VIEW_SUGGESTIONS: Record<string, string[]> = {
  dashboard: ['What is the overall network health?', 'Show me critical alerts'],
  kpi: ['What are the top performing sites?', 'Which regions need attention?'],
  predictive: ['What are the main churn drivers?', 'Show capacity risk summary'],
  alerts: ['How many critical alerts are active?', 'Correlate recent alerts'],
  capacity: ['Which sites will reach capacity first?', 'Forecast for next 30 days'],
  faults: ['What components are most at risk?', 'Show critical fault predictions'],
};

const defaultSuggestions = ['What is the overall network health?', 'Analyze KPI trends', 'Show capacity risks', 'Explain recent anomalies'];

// ─── Thinking Dots ─────────────────────────────────────────────────────

function ThinkingDots() {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <span className="animate-bounce [animation-delay:0ms] inline-block w-1.5 h-1.5 rounded-full bg-current" />
      <span className="animate-bounce [animation-delay:150ms] inline-block w-1.5 h-1.5 rounded-full bg-current" />
      <span className="animate-bounce [animation-delay:300ms] inline-block w-1.5 h-1.5 rounded-full bg-current" />
      <span className="ml-1">{t('ai.thinking')}</span>
    </span>
  );
}

// ─── Confidence Badge ──────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: number }) {
  const t = useT();
  const color = score >= 0.8 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : score >= 0.6 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200';
  const Icon = score >= 0.8 ? CheckCircle2 : score >= 0.6 ? AlertTriangle : AlertTriangle;
  return (
    <Badge variant="outline" className={`${color} gap-1 text-xs`}>
      <Icon className="h-3 w-3" />
      {t('ai.confidence')}: {Math.round(score * 100)}%
    </Badge>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function AssistantView() {
  const t = useT();
  const currentView = useAppStore((s) => s.currentView);
  const suggestions = VIEW_SUGGESTIONS[currentView] ?? defaultSuggestions;

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [networkSummary, setNetworkSummary] = useState('');

  // NL Query state
  const [queryInput, setQueryInput] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryResult[]>([]);

  // Insight state
  const [insightLoading, setInsightLoading] = useState<InsightDomain | null>(null);
  const [reports, setReports] = useState<InsightReport[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), []);
  useEffect(() => { scrollToBottom(); }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 120)}px`; }
  }, [input]);

  // Fetch network summary on mount
  useEffect(() => {
    fetch('/api/assistant/summary').then(r => r.ok ? r.json() : null).then(d => { if (d?.summary) setNetworkSummary(d.summary); }).catch(() => {});
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDateTime = (date: Date) => date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // ─── Chat handlers ─────────────────────────────────────────────────
  const handleChatSubmit = async (question: string) => {
    if (!question.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: question.trim(), timestamp: new Date(), type: 'text' };
    setMessages((p) => [...p, userMsg]); setInput(''); setIsLoading(true);
    try {
      const body: Record<string, string> = { question: question.trim(), currentView };
      if (networkSummary) body.context = networkSummary;
      const res = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages((p) => [...p, { role: 'assistant', content: data.answer, timestamp: new Date(), type: 'text' }]);
    } catch {
      setMessages((p) => [...p, { role: 'assistant', content: t('ai.errorMsg'), timestamp: new Date(), type: 'text' }]);
    } finally { setIsLoading(false); }
  };

  // ─── NL Query handlers ─────────────────────────────────────────────
  const handleQuery = async (q?: string) => {
    const question = (q ?? queryInput).trim();
    if (!question || queryLoading) return;
    setQueryLoading(true); setQueryResult(null);
    try {
      const res = await fetch('/api/assistant/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const result: QueryResult = { question, answer: data.answer, confidence: data.confidence ?? 0.85, dataSource: data.dataSource ?? 'Network Database', timestamp: new Date() };
      setQueryResult(result); setQueryHistory((p) => [result, ...p].slice(0, 5));
    } catch { setQueryResult({ question, answer: t('ai.errorMsg'), confidence: 0, dataSource: '—', timestamp: new Date() }); setQueryHistory((p) => [{ question, answer: t('ai.errorMsg'), confidence: 0, dataSource: '—', timestamp: new Date() }, ...p].slice(0, 5)); }
    finally { setQueryLoading(false); }
  };

  // ─── Insight handlers ──────────────────────────────────────────────
  const handleInsight = async (domain: InsightDomain) => {
    if (insightLoading) return;
    setInsightLoading(domain);
    try {
      const res = await fetch('/api/assistant/insight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReports((p) => [{ domain, content: data.report ?? data.answer ?? t('ai.errorMsg'), timestamp: new Date() }, ...p]);
    } catch { setReports((p) => [{ domain, content: t('ai.errorMsg'), timestamp: new Date() }, ...p]); }
    finally { setInsightLoading(null); }
  };

  return (
    <div className="flex flex-col p-4 md:p-6 h-full">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-emerald-500" />{t('ai.title')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t('ai.subtitle')}</p>
      </div>

      <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0">
        <TabsList className="shrink-0 mb-4 w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="chat" className="gap-1.5 text-xs sm:text-sm"><MessageSquare className="h-4 w-4" />{t('ai.chat')}</TabsTrigger>
          <TabsTrigger value="query" className="gap-1.5 text-xs sm:text-sm"><Search className="h-4 w-4" />{t('ai.query')}</TabsTrigger>
          <TabsTrigger value="insights" className="gap-1.5 text-xs sm:text-sm"><Sparkles className="h-4 w-4" />{t('ai.insights')}</TabsTrigger>
        </TabsList>

        {/* ═══════════ TAB 1: CHAT ═══════════ */}
        <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge variant="outline" className="text-xs font-normal"><Brain className="h-3 w-3 mr-1" />{t('ai.contextAware', { view: currentView })}</Badge>
            <Button variant="ghost" size="sm" className="text-xs h-7 ml-auto" onClick={() => setMessages([])}><Trash2 className="h-3 w-3 mr-1" />{t('ai.clearChat')}</Button>
            <ExportButton data={messages.map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp.toLocaleString(), type: m.type, domain: m.domain ?? '' }))} filenamePrefix="assistant" columns={[{ key: 'role', header: 'Role' }, { key: 'content', header: 'Message' }, { key: 'timestamp', header: 'Timestamp' }, { key: 'type', header: 'Type' }, { key: 'domain', header: 'Domain' }]} />
          </div>
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-360px)]">
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4"><Sparkles className="h-8 w-8 text-emerald-500" /></div>
                  <h3 className="text-lg font-semibold mb-1">{t('ai.welcome')}</h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-6">{t('ai.intro')}</p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                    {suggestions.map((chip) => (<Button key={chip} variant="outline" size="sm" className="text-xs h-auto py-1.5 px-3 whitespace-normal text-left" onClick={() => handleChatSubmit(chip)}>{chip}</Button>))}
                  </div>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</div>
                  {msg.type === 'insight' && msg.role === 'assistant' ? (
                    <div className="max-w-[80%]"><CardContent className="rounded-xl border bg-card p-4 space-y-3">
                      <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-emerald-500" /><Badge variant="secondary" className="text-xs">{t('ai.insightFor', { domain: msg.domain ?? '' })}</Badge></div>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                      <div className="text-[10px] text-muted-foreground">{formatTime(msg.timestamp)}</div>
                    </CardContent></div>
                  ) : (
                    <div className={`max-w-[75%] rounded-xl px-4 py-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                      <div className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{formatTime(msg.timestamp)}</div>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (<div className="flex gap-3"><div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center mt-1"><Bot className="h-4 w-4 text-muted-foreground" /></div><div className="bg-muted rounded-xl px-4 py-3"><ThinkingDots /></div></div>)}
              <div ref={messagesEndRef} />
            </div>
            {messages.length > 0 && !isLoading && (<div className="px-4 pt-2 border-t"><div className="flex flex-wrap gap-1.5">{suggestions.map((chip) => (<Badge key={chip} variant="secondary" className="cursor-pointer hover:bg-secondary/80 transition-colors text-xs py-1" onClick={() => handleChatSubmit(chip)}>{chip}</Badge>))}</div></div>)}
            <div className="shrink-0 p-4 pt-3 border-t">
              <div className="flex gap-2 items-end">
                <Textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(input); } }} placeholder={t('ai.placeholder')} disabled={isLoading} rows={1} className="min-h-[40px] max-h-[120px] resize-none" />
                <Button size="icon" disabled={!input.trim() || isLoading} onClick={() => handleChatSubmit(input)} className="shrink-0 h-10 w-10"><Send className="h-4 w-4" /><span className="sr-only">{t('btn.send')}</span></Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ═══════════ TAB 2: NL QUERY ═══════════ */}
        <TabsContent value="query" className="flex-1 flex flex-col min-h-0 mt-0 overflow-y-auto max-h-[calc(100vh-240px)]">
          <Card className="mb-4">
            <CardContent className="p-4 space-y-3">
              <Textarea value={queryInput} onChange={(e) => setQueryInput(e.target.value)} placeholder={t('ai.queryPlaceholder')} disabled={queryLoading} rows={3} className="min-h-[80px] resize-none" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuery(); } }} />
              <div className="flex items-center gap-2">
                <Button onClick={() => handleQuery()} disabled={!queryInput.trim() || queryLoading} className="gap-1.5"><Send className="h-4 w-4" />{t('ai.askQuery')}</Button>
                {queryLoading && <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />{t('ai.querying')}</span>}
              </div>
            </CardContent>
          </Card>
          {/* Example chips */}
          <div className="mb-4"><p className="text-xs font-medium text-muted-foreground mb-2">Quick examples:</p>
            <div className="flex flex-wrap gap-1.5">{QUERY_EXAMPLES.map((q) => (<Badge key={q} variant="outline" className="cursor-pointer hover:bg-accent transition-colors text-xs py-1 px-2.5" onClick={() => { setQueryInput(q); handleQuery(q); }}>{q}</Badge>))}</div>
          </div>
          {/* Result */}
          {queryLoading && !queryResult && (
            <Card className="mb-4"><CardContent className="p-4 space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-2/3" /></CardContent></Card>
          )}
          {queryResult && (
            <Card className="mb-4"><CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap"><ConfidenceBadge score={queryResult.confidence} /><Badge variant="outline" className="text-xs gap-1"><BarChart3 className="h-3 w-3" />{t('ai.dataSource')}: {queryResult.dataSource}</Badge><span className="text-[10px] text-muted-foreground ml-auto">{formatDateTime(queryResult.timestamp)}</span></div>
              <p className="text-xs text-muted-foreground font-medium">Q: {queryResult.question}</p>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{queryResult.answer}</div>
            </CardContent></Card>
          )}
          {/* History */}
          <div><h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><BarChart3 className="h-4 w-4" />{t('ai.queryHistory')}</h4>
            {queryHistory.length === 0 ? <p className="text-xs text-muted-foreground">{t('ai.noHistory')}</p> : (
              <div className="space-y-2 max-h-64 overflow-y-auto">{queryHistory.map((h, i) => (
                <Card key={i} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setQueryResult(h)}><CardContent className="p-3"><div className="flex items-center gap-2 mb-1"><p className="text-xs font-medium truncate flex-1">{h.question}</p><ConfidenceBadge score={h.confidence} /></div><p className="text-xs text-muted-foreground line-clamp-2">{h.answer}</p></CardContent></Card>
              ))}</div>
            )}
          </div>
        </TabsContent>

        {/* ═══════════ TAB 3: INSIGHT REPORTS ═══════════ */}
        <TabsContent value="insights" className="flex-1 flex flex-col min-h-0 mt-0 overflow-y-auto max-h-[calc(100vh-240px)]">
          <div className="mb-4"><p className="text-sm font-medium mb-2 flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-emerald-500" />{t('ai.generateInsight')}</p>
            <div className="flex flex-wrap gap-2">{INSIGHT_DOMAINS.map((domain) => (
              <Button key={domain} variant="outline" size="sm" className="text-xs h-8" disabled={insightLoading !== null} onClick={() => handleInsight(domain)}>
                {insightLoading === domain ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Brain className="h-3 w-3 mr-1" />}{t(INSIGHT_I18N_KEYS[domain])}
              </Button>
            ))}</div>
            {insightLoading && <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />{t('ai.generating')}</p>}
          </div>
          {insightLoading && reports.length === 0 && (
            <Card className="mb-4"><CardContent className="p-4 space-y-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-full" /></CardContent></Card>
          )}
          <div><h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Sparkles className="h-4 w-4" />{t('ai.reportHistory')}</h4>
            {reports.length === 0 && !insightLoading ? <p className="text-xs text-muted-foreground">{t('ai.noHistory')}</p> : (
              <div className="space-y-3 max-h-96 overflow-y-auto">{reports.map((r, i) => (
                <Card key={i}><CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap"><Badge variant="secondary" className="text-xs gap-1"><Brain className="h-3 w-3" />{t('ai.insightFor', { domain: r.domain })}</Badge><span className="text-[10px] text-muted-foreground ml-auto">{formatDateTime(r.timestamp)}</span></div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{r.content}</div>
                </CardContent></Card>
              ))}</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
