'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare, Sparkles, Send, Bot, User, Brain, Trash2,
  Loader2, Zap, ArrowRight, RotateCcw, FileText,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useT } from '@/lib/i18n';
import { useAppStore } from '@/store/app';

// ─── Types ─────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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

const SUGGESTIONS_BY_VIEW: Record<string, string[]> = {
  dashboard: ['What is the overall network health?', 'Show me critical alerts'],
  kpi: ['What are the top performing sites?', 'Which regions need attention?'],
  predictive: ['What are the main churn drivers?', 'Show capacity risk summary'],
  alerts: ['How many critical alerts are active?', 'Correlate recent alerts'],
  capacity: ['Which sites will reach capacity first?', 'Forecast for next 30 days'],
  faults: ['What components are most at risk?', 'Show critical fault predictions'],
  monitoring: ['Show network availability trends', 'What is the average latency?'],
  coverage: ['Which areas have coverage gaps?', 'Compare 4G vs 5G coverage'],
};

const DEFAULT_SUGGESTIONS = [
  'What is the overall network health?',
  'Analyze KPI trends across all technologies',
  'Show capacity risks and recommendations',
  'Which wilayas have the highest churn?',
];

const VIEW_NAMES = [
  'dashboard', 'monitoring', 'son', 'onboarding', 'live', 'alerts', 'faults',
  'spectrum', 'kpi', 'coverage', 'correlation', 'qoe', 'capacity', 'handover',
  'load', 'interference', 'coverage-holes', 'vendor-compare', 'services',
  'geomarketing', 'network-commercial', 'wilaya-intelligence', 'value-proposition',
  'slicing', 'energy', 'faults-prediction', 'subscribers', 'health',
  'benchmark', 'playbooks', 'assistant', 'npi', 'trends', 'simulations',
  'roi', 'evolution', 'audit', 'executive', 'optimizer', 'rca',
  'anomaly-detection', 'multi-agent', 'data-pipeline', 'predictive',
  'digital-twin', 'integration-hub', 'policies', 'changes', 'vendors',
  'reports', 'sla', 'config', 'settings',
];

// ─── Thinking Dots ─────────────────────────────────────────────────────

function ThinkingDots() {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="animate-bounce [animation-delay:0ms] inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
      <span className="animate-bounce [animation-delay:150ms] inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
      <span className="animate-bounce [animation-delay:300ms] inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
      <span className="ml-1">{t('ai.thinking')}</span>
    </span>
  );
}

// ─── Markdown Renderer ────────────────────────────────────────────────

function MarkdownContent({ content, onNavigate }: { content: string; onNavigate: (_view: string) => void }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        components={{
          // Style navigation hints
          p: ({ children }) => {
            const text = String(children);
            const navMatch = text.match(/\[Navigate:\s*([\w-]+)\]/i);
            if (navMatch) {
              const view = navMatch[1];
              return (
                <button
                  onClick={() => onNavigate(view)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors mt-1"
                >
                  <ArrowRight className="h-3 w-3" />
                  Open {view}
                </button>
              );
            }
            return <p>{children}</p>;
          },
          // Style code blocks
          code: ({ className, children }) => {
            if (className) {
              return <code className={className}>{children}</code>;
            }
            return <code className="text-xs bg-muted px-1 py-0.5 rounded">{children}</code>;
          },
          // Style tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="text-xs border-collapse w-full">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border px-2 py-1 bg-muted/50 font-semibold text-left">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-2 py-1">{children}</td>
          ),
          // Style lists
          ul: ({ children }) => <ul className="text-sm space-y-1 my-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="text-sm space-y-1 my-1.5 list-decimal list-inside">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          // Strong emphasis
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function AssistantView() {
  const t = useT();
  const { currentView, setCurrentView } = useAppStore();
  const suggestions = SUGGESTIONS_BY_VIEW[currentView] ?? DEFAULT_SUGGESTIONS;

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState('');

  // Insight state
  const [insightLoading, setInsightLoading] = useState<InsightDomain | null>(null);
  const [reports, setReports] = useState<InsightReport[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages, streamingContent, isStreaming, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleNavigate = useCallback((view: string) => {
    if (VIEW_NAMES.includes(view)) {
      setCurrentView(view);
    }
  }, [setCurrentView]);

  // ─── Streaming Chat ─────────────────────────────────────────────────
  const handleChatSubmit = async (question?: string) => {
    const text = (question ?? input).trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');
    setError('');

    const allMessages = [...messages, userMsg];

    try {
      abortRef.current = new AbortController();
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages, currentView }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Read the streaming response
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamingContent(accumulated);
      }

      // Finalize: add the complete assistant message
      if (accumulated) {
        // Clean up any remaining [DONE] marker
        const cleanContent = accumulated.replace(/\[DONE\]/g, '').trim();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: cleanContent,
          timestamp: new Date(),
        }]);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(t('ai.errorMsg'));
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t('ai.errorMsg'),
        timestamp: new Date(),
      }]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      abortRef.current = null;
    }
  };

  // ─── Insight handlers ──────────────────────────────────────────────
  const handleInsight = async (domain: InsightDomain) => {
    if (insightLoading) return;
    setInsightLoading(domain);
    try {
      const res = await fetch('/api/assistant/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReports(prev => [{
        domain,
        content: data.report ?? data.answer ?? t('ai.errorMsg'),
        timestamp: new Date(),
      }, ...prev]);
    } catch {
      setReports(prev => [{ domain, content: t('ai.errorMsg'), timestamp: new Date() }, ...prev]);
    } finally {
      setInsightLoading(null);
    }
  };

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDateTime = (date: Date) => date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col p-4 md:p-6 h-full">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-emerald-500" />
          {t('ai.title')}
          <Badge variant="secondary" className="text-xs font-normal gap-1">
            <Zap className="h-3 w-3 text-amber-500" />
            {t('ai.upgraded')}
          </Badge>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t('ai.subtitle')}</p>
      </div>

      <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0">
        <TabsList className="shrink-0 mb-4 w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
          <TabsTrigger value="chat" className="gap-1.5 text-xs sm:text-sm">
            <MessageSquare className="h-4 w-4" />{t('ai.chat')}
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-1.5 text-xs sm:text-sm">
            <Sparkles className="h-4 w-4" />{t('ai.insights')}
          </TabsTrigger>
        </TabsList>

        {/* ═══════════ TAB 1: SMART CHAT ═══════════ */}
        <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0">
          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge variant="outline" className="text-xs font-normal gap-1">
              <Brain className="h-3 w-3" />
              {t('ai.contextAware', { view: currentView })}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal gap-1">
              <Zap className="h-3 w-3" />
              {t('ai.liveData')}
            </Badge>
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => { setMessages([]); setError(''); }}
              >
                <Trash2 className="h-3 w-3 mr-1" />{t('ai.clearChat')}
              </Button>
            </div>
          </div>

          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-360px)]">
              {/* Welcome screen */}
              {messages.length === 0 && !isStreaming && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{t('ai.welcome')}</h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-6">{t('ai.intro')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                    {suggestions.map((chip) => (
                      <Button
                        key={chip}
                        variant="outline"
                        size="sm"
                        className="text-xs h-auto py-2 px-3 whitespace-normal text-left justify-start gap-2"
                        onClick={() => handleChatSubmit(chip)}
                      >
                        <MessageSquare className="h-3 w-3 shrink-0 text-emerald-500" />
                        {chip}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message list */}
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted border'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <MarkdownContent content={msg.content} onNavigate={handleNavigate} />
                    ) : (
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    )}
                    <div className={`text-[10px] mt-2 ${
                      msg.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'
                    }`}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))}

              {/* Streaming indicator */}
              {isStreaming && (
                <div className="flex gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center mt-1">
                    <Bot className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-muted border">
                    {streamingContent ? (
                      <div className="relative">
                        <MarkdownContent content={streamingContent} onNavigate={handleNavigate} />
                        <span className="inline-block w-0.5 h-4 bg-emerald-500 animate-pulse ml-0.5 align-text-bottom" />
                      </div>
                    ) : (
                      <ThinkingDots />
                    )}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && !isStreaming && (
                <div className="text-center py-2">
                  <p className="text-xs text-destructive">{error}</p>
                  <Button variant="ghost" size="sm" className="text-xs h-7 mt-1" onClick={() => setError('')}>
                    <RotateCcw className="h-3 w-3 mr-1" />{t('ai.retry')}
                  </Button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestion chips (shown after messages) */}
            {messages.length > 0 && !isStreaming && (
              <div className="px-4 pt-2 border-t">
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.slice(0, 3).map((chip) => (
                    <Badge
                      key={chip}
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80 transition-colors text-xs py-1"
                      onClick={() => handleChatSubmit(chip)}
                    >
                      {chip}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Input area */}
            <div className="shrink-0 p-4 pt-3 border-t">
              <div className="flex gap-2 items-end">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleChatSubmit();
                    }
                  }}
                  placeholder={t('ai.placeholder')}
                  disabled={isStreaming}
                  rows={1}
                  className="min-h-[40px] max-h-[120px] resize-none"
                />
                {isStreaming ? (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="shrink-0 h-10 w-10"
                    onClick={() => abortRef.current?.abort()}
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span className="sr-only">Stop</span>
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    disabled={!input.trim()}
                    onClick={() => handleChatSubmit()}
                    className="shrink-0 h-10 w-10 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Send className="h-4 w-4" />
                    <span className="sr-only">{t('btn.send')}</span>
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                {t('ai.disclaimer')}
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* ═══════════ TAB 2: INSIGHT REPORTS ═══════════ */}
        <TabsContent value="insights" className="flex-1 flex flex-col min-h-0 mt-0 overflow-y-auto max-h-[calc(100vh-240px)]">
          <div className="mb-4">
            <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              {t('ai.generateInsight')}
            </p>
            <div className="flex flex-wrap gap-2">
              {INSIGHT_DOMAINS.map((domain) => (
                <Button
                  key={domain}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  disabled={insightLoading !== null}
                  onClick={() => handleInsight(domain)}
                >
                  {insightLoading === domain ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Brain className="h-3 w-3 mr-1" />
                  )}
                  {t(INSIGHT_I18N_KEYS[domain])}
                </Button>
              ))}
            </div>
            {insightLoading && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />{t('ai.generating')}
              </p>
            )}
          </div>

          {insightLoading && reports.length === 0 && (
            <Card className="mb-4">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          )}

          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <FileText className="h-4 w-4" />{t('ai.reportHistory')}
            </h4>
            {reports.length === 0 && !insightLoading ? (
              <p className="text-xs text-muted-foreground">{t('ai.noHistory')}</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {reports.map((r, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Brain className="h-3 w-3" />{t('ai.insightFor', { domain: r.domain })}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {formatDateTime(r.timestamp)}
                        </span>
                      </div>
                      <MarkdownContent content={r.content} onNavigate={handleNavigate} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
