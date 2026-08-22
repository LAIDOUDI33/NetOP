'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  MessageSquare, Sparkles, Send, Bot, User, Brain, Trash2,
  Loader2, Zap, ArrowRight, RotateCcw, FileText,
  ImageIcon, Volume2, Mic, Globe, Upload, X, ExternalLink,
  Play, Square, Camera, Wrench, BarChart3, Link2, Headphones,
  ChevronDown, AlertTriangle, CheckCircle2, Shield, TrendingDown,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReactMarkdown from 'react-markdown';
import { useT } from '@/lib/i18n';
import type { ViewType } from '@/types';
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

function MarkdownContent({ content, onNavigate }: { content: string; onNavigate: (view: string) => void }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        components={{
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
          code: ({ className, children }) => {
            if (className) return <code className={className}>{children}</code>;
            return <code className="text-xs bg-muted px-1 py-0.5 rounded">{children}</code>;
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="text-xs border-collapse w-full">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-border px-2 py-1 bg-muted/50 font-semibold text-left">{children}</th>,
          td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
          ul: ({ children }) => <ul className="text-sm space-y-1 my-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="text-sm space-y-1 my-1.5 list-decimal list-inside">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ─── VLM Image Analysis Component ─────────────────────────────────────

function ImageAnalysisTool() {
  const t = useT();
  const [imageUrl, setImageUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError(t('ai.imageTooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      const base64 = dataUrl.split(',')[1];
      setBase64Data(base64);
      setImageUrl('');
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageUrl && !base64Data) { setError(t('ai.noImageError')); return; }
    const q = prompt || t('ai.defaultImagePrompt');
    setLoading(true); setError(''); setAnalysis('');
    try {
      const body = base64Data
        ? { image: base64Data, prompt: q, isBase64: true }
        : { image: imageUrl, prompt: q, isBase64: false };
      const res = await fetch('/api/assistant/analyze-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.errorMsg'));
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><ImageIcon className="h-4 w-4 text-emerald-500" />{t('ai.imageAnalysis')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">{t('ai.imageAnalysisDesc')}</p>
          {/* Upload or URL */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1" />{t('ai.uploadImage')}
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            <div className="flex-1 min-w-[200px]">
              <Input placeholder={t('ai.imageUrlPlaceholder')} value={imageUrl} onChange={e => { setImageUrl(e.target.value); setPreview(null); setBase64Data(null); }} className="h-8 text-xs" />
            </div>
          </div>
          {/* Preview */}
          {preview && (
            <div className="relative inline-block">
              <img src={preview} alt="Preview" className="max-h-48 rounded-lg border" />
              <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => { setPreview(null); setBase64Data(null); }}><X className="h-3 w-3" /></Button>
            </div>
          )}
          <Textarea placeholder={t('ai.imagePromptPlaceholder')} value={prompt} onChange={e => setPrompt(e.target.value)} rows={2} className="text-xs" />
          <Button onClick={handleAnalyze} disabled={loading || (!imageUrl && !base64Data)} className="bg-emerald-600 hover:bg-emerald-700 text-xs">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Brain className="h-3.5 w-3.5 mr-1" />}
            {t('ai.analyzeImage')}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>
      {analysis && (
        <Card><CardContent className="p-4"><MarkdownContent content={analysis} onNavigate={() => {}} /></CardContent></Card>
      )}
    </div>
  );
}

// ─── TTS Component ─────────────────────────────────────────────────────

function TTSTool() {
  const t = useT();
  const [text, setText] = useState('');
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSpeak = async () => {
    if (!text.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/assistant/tts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.trim().slice(0, 1024) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) { audioRef.current.pause(); URL.revokeObjectURL(audioRef.current.src); }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay = () => setPlaying(true);
      audio.onended = () => { setPlaying(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setPlaying(false); setError(t('ai.ttsPlayError')); };
      await audio.play();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.errorMsg'));
    } finally { setLoading(false); }
  };

  const handleStop = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setPlaying(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Volume2 className="h-4 w-4 text-emerald-500" />{t('ai.textToSpeech')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">{t('ai.ttsDesc')}</p>
          <div className="relative">
            <Textarea
              placeholder={t('ai.ttsPlaceholder')}
              value={text} onChange={e => { setText(e.target.value); setCharCount(e.target.value.length); }}
              rows={4} className="text-xs pr-14"
            />
            <span className={`absolute bottom-2 right-2 text-[10px] ${charCount > 1024 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {charCount}/1024
            </span>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSpeak} disabled={loading || !text.trim() || charCount > 1024} className="bg-emerald-600 hover:bg-emerald-700 text-xs">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
              {t('ai.speak')}
            </Button>
            {playing && (
              <Button variant="outline" size="sm" className="text-xs" onClick={handleStop}>
                <Square className="h-3.5 w-3.5 mr-1" />{t('ai.stop')}
              </Button>
            )}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── ASR Voice Input Component ─────────────────────────────────────────

function ASRTool({ onTranscribed }: { onTranscribed: (text: string) => void }) {
  const t = useT();
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setRecording(false);
        if (chunksRef.current.length === 0) return;
        setTranscribing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            try {
              const res = await fetch('/api/assistant/transcribe', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio: base64 }),
              });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const data = await res.json();
              setLastResult(data.text);
              onTranscribed(data.text);
            } catch (err) { setError(err instanceof Error ? err.message : t('ai.errorMsg')); }
            finally { setTranscribing(false); }
          };
          reader.readAsDataURL(blob);
        } catch { setTranscribing(false); setError(t('ai.transcribeError')); }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError(t('ai.micAccessError'));
    }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); };

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Mic className="h-4 w-4 text-emerald-500" />{t('ai.voiceInput')}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{t('ai.asrDesc')}</p>
        <div className="flex items-center gap-3">
          {!recording ? (
            <Button onClick={startRecording} disabled={transcribing} variant="outline" className="text-xs border-red-300 hover:bg-red-50 dark:hover:bg-red-950">
              <Mic className="h-3.5 w-3.5 mr-1 text-red-500" />{t('ai.startRecording')}
            </Button>
          ) : (
            <Button onClick={stopRecording} variant="destructive" size="sm" className="text-xs animate-pulse">
              <Square className="h-3.5 w-3.5 mr-1" />{t('ai.stopRecording')}
            </Button>
          )}
          {transcribing && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />{t('ai.transcribing')}</span>}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {lastResult && (
          <div className="p-2 rounded-md bg-muted text-xs">
            <span className="text-muted-foreground">{t('ai.transcriptionResult')}:</span> {lastResult}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Web Search Component ─────────────────────────────────────────────

function WebSearchTool() {
  const t = useT();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ title: string; url: string; snippet: string; domain: string; date: string }>>([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(''); setResults([]); setSummary('');
    try {
      const res = await fetch('/api/assistant/web-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: query.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResults(data.results || []);
      setSummary(data.summary || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.errorMsg'));
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Globe className="h-4 w-4 text-emerald-500" />{t('ai.webSearch')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">{t('ai.webSearchDesc')}</p>
          <div className="flex gap-2">
            <Input placeholder={t('ai.webSearchPlaceholder')} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }} className="text-xs flex-1" />
            <Button onClick={handleSearch} disabled={loading || !query.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-xs shrink-0">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>
      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" />
        </div>
      )}
      {summary && !loading && (
        <Card><CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-emerald-500" /><span className="text-xs font-semibold">{t('ai.aiSummary')}</span></div>
          <MarkdownContent content={summary} onNavigate={() => {}} />
        </CardContent></Card>
      )}
      {results.length > 0 && !loading && (
        <Card><CardContent className="p-4 space-y-3">
          <p className="text-xs font-semibold">{t('ai.searchResults')} ({results.length})</p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {results.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="block p-2 rounded-md border hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground mt-0.5">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate flex items-center gap-1">{r.title} <ExternalLink className="h-3 w-3 shrink-0" /></p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{r.snippet}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{r.domain}{r.date ? ` · ${r.date}` : ''}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}

// ─── Auto-Remediation Component ─────────────────────────────────────

function AutoRemediateTool({ onNavigate }: { onNavigate: (view: string) => void }) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [tech, setTech] = useState('ALL');
  const [severity, setSeverity] = useState('');

  const handleRun = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const body: Record<string, string> = { technology: tech };
      if (severity) body.severity = severity;
      const res = await fetch('/api/assistant/auto-remediate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const changes = data.changeRequests || [];
      if (changes.length === 0) {
        setResult('No actionable issues found. The network is in good condition.');
      } else {
        const lines = changes.map((c: { title: string; technology: string; riskLevel: string; siteName: string; parameter: string; proposedValue: string }, i: number) =>
          `**${i + 1}. ${c.title}** (${c.technology})\n- Site: ${c.siteName || 'N/A'} | Param: ${c.parameter} → ${c.proposedValue}\n- Risk: ${c.riskLevel}`
        ).join('\n\n');
        setResult(t('ai.autoRemediateResult', { count: changes.length }) + '\n\n' + lines);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.errorMsg'));
    } finally { setLoading(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Wrench className="h-4 w-4 text-orange-500" />{t('ai.autoRemediate')}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{t('ai.autoRemediateDesc')}</p>
        <div className="flex flex-wrap gap-2">
          <Select value={tech} onValueChange={setTech}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['ALL', '2G', '3G', '4G', '5G'].map(v => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="All Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="" className="text-xs">All</SelectItem>
              <SelectItem value="critical" className="text-xs">Critical</SelectItem>
              <SelectItem value="high" className="text-xs">High</SelectItem>
              <SelectItem value="medium" className="text-xs">Medium</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleRun} disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-xs">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Wrench className="h-3.5 w-3.5 mr-1" />}
          {t('ai.runAutoRemediate')}
        </Button>
        {loading && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />{t('ai.autoRemediateRunning')}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
        {result && <Card><CardContent className="p-3"><MarkdownContent content={result} onNavigate={onNavigate} /></CardContent></Card>}
      </CardContent>
    </Card>
  );
}

// ─── Executive Report Component ──────────────────────────────────────

function ExecutiveReportTool() {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [reportType, setReportType] = useState('network_health');

  const REPORT_TYPES = [
    { value: 'network_health', labelKey: 'ai.reportNetworkHealth' },
    { value: 'performance', labelKey: 'ai.reportPerformance' },
    { value: 'capacity', labelKey: 'ai.reportCapacity' },
    { value: 'financial', labelKey: 'ai.reportFinancial' },
    { value: 'comprehensive', labelKey: 'ai.reportComprehensive' },
  ];

  const handleGenerate = async () => {
    setLoading(true); setError(''); setReport(null);
    try {
      const res = await fetch('/api/assistant/executive-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportType }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.errorMsg'));
    } finally { setLoading(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-violet-500" />{t('ai.executiveReport')}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{t('ai.executiveReportDesc')}</p>
        <div className="flex flex-wrap gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder={t('ai.reportType')} /></SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map(rt => <SelectItem key={rt.value} value={rt.value} className="text-xs">{t(rt.labelKey)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={loading} className="bg-violet-600 hover:bg-violet-700 text-xs">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <FileText className="h-3.5 w-3.5 mr-1" />}
            {t('ai.generateReport')}
          </Button>
        </div>
        {loading && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />{t('ai.reportGenerating')}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
        {report && (
          <Card><CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs gap-1"><BarChart3 className="h-3 w-3" />{report.title as string}</Badge>
              {report.overallScore !== undefined && (
                <Badge variant={Number(report.overallScore) >= 70 ? 'default' : 'destructive'} className="text-xs">
                  Score: {report.overallScore as number}/100
                </Badge>
              )}
              {report.riskLevel ? (
                <Badge variant={report.riskLevel === 'low' ? 'secondary' : report.riskLevel === 'medium' ? 'outline' : 'destructive'} className="text-xs">
                  {report.riskLevel as string}
                </Badge>
              ) : null}
            </div>
            {Array.isArray(report.sections) && (report.sections as Array<{ heading: string; content: string; priority: string }>).map((section, i) => (
              <div key={i} className="space-y-1">
                <h4 className="text-xs font-semibold flex items-center gap-1.5">
                  {section.priority === 'high' && <AlertTriangle className="h-3 w-3 text-red-500" />}
                  {section.heading}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{section.content}</p>
              </div>
            ))}
            {Array.isArray(report.recommendations) && (report.recommendations as Array<{ action: string; priority: string; impact: string }>).length > 0 && (
              <div className="border-t pt-2">
                <p className="text-xs font-semibold mb-1.5">Recommendations</p>
                {(report.recommendations as Array<{ action: string; priority: string; impact: string }>).map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs mb-1">
                    <Badge variant={rec.priority === 'high' ? 'destructive' : 'outline'} className="text-[9px] mt-0.5 shrink-0">{rec.priority}</Badge>
                    <span>{rec.action}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Alert Correlation Component ─────────────────────────────────────

function AlertCorrelationTool({ onNavigate }: { onNavigate: (view: string) => void }) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleCorrelate = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/assistant/alert-correlation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timeWindowMinutes: 120, maxAlerts: 40 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const incidents = data.incidents || [];
      if (incidents.length === 0) {
        setResult('No correlated alert patterns found. Alerts appear to be independent.');
      } else {
        const lines = incidents.map((inc: { title: string; severity: string; rootCause: string; affectedSites: string; recommendedActions: string }, i: number) =>
          `**${i + 1}. ${inc.title}** (${inc.severity})\n- Root Cause: ${inc.rootCause}\n- Affected Sites: ${inc.affectedSites || 'Multiple'}\n- Actions: ${inc.recommendedActions}`
        ).join('\n\n');
        setResult(t('ai.correlationResult', { count: incidents.length }) + '\n\n' + lines);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.errorMsg'));
    } finally { setLoading(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Link2 className="h-4 w-4 text-cyan-500" />{t('ai.alertCorrelation')}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{t('ai.alertCorrelationDesc')}</p>
        <Button onClick={handleCorrelate} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 text-xs">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Link2 className="h-3.5 w-3.5 mr-1" />}
          {t('ai.runCorrelation')}
        </Button>
        {loading && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />{t('ai.correlating')}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
        {result && <Card><CardContent className="p-3"><MarkdownContent content={result} onNavigate={onNavigate} /></CardContent></Card>}
      </CardContent>
    </Card>
  );
}

// ─── Voice NOC Component ─────────────────────────────────────────────

function VoiceNocTool({ onNavigate }: { onNavigate: (view: string) => void }) {
  const t = useT();
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [suggestedView, setSuggestedView] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setError(''); setTranscription(''); setResponse(''); setSuggestedView(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(tr => tr.stop());
        setRecording(false);
        if (chunksRef.current.length === 0) return;
        setProcessing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            try {
              const res = await fetch('/api/assistant/voice-noc', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio: base64 }),
              });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const data = await res.json();
              setTranscription(data.transcription || '');
              setResponse(data.response || '');
              if (data.suggestedView) setSuggestedView(data.suggestedView);
            } catch (err) { setError(err instanceof Error ? err.message : t('ai.errorMsg')); }
            finally { setProcessing(false); }
          };
          reader.readAsDataURL(blob);
        } catch { setProcessing(false); setError(t('ai.transcribeError')); }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch { setError(t('ai.micAccessError')); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); };

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Headphones className="h-4 w-4 text-pink-500" />{t('ai.voiceNoc')}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{t('ai.voiceNocDesc')}</p>
        <p className="text-[10px] text-muted-foreground italic">{t('ai.voiceNocHint')}</p>
        <div className="flex items-center gap-3">
          {!recording ? (
            <Button onClick={startRecording} disabled={processing} variant="outline" className="text-xs border-pink-300 hover:bg-pink-50 dark:hover:bg-pink-950">
              <Mic className="h-3.5 w-3.5 mr-1 text-pink-500" />{t('ai.startRecording')}
            </Button>
          ) : (
            <Button onClick={stopRecording} variant="destructive" size="sm" className="text-xs animate-pulse">
              <Square className="h-3.5 w-3.5 mr-1" />{t('ai.stopRecording')}
            </Button>
          )}
          {processing && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />{t('ai.voiceNocProcessing')}</span>}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {transcription && (
          <div className="p-2 rounded-md bg-muted text-xs space-y-1">
            <p className="font-medium text-muted-foreground">{t('ai.voiceNocTranscription')}:</p>
            <p>{transcription}</p>
          </div>
        )}
        {response && (
          <div className="space-y-2">
            <p className="text-xs font-medium flex items-center gap-1.5"><Bot className="h-3.5 w-3.5 text-pink-500" />{t('ai.voiceNocResponse')}</p>
            <Card><CardContent className="p-3"><MarkdownContent content={response} onNavigate={onNavigate} /></CardContent></Card>
            {suggestedView && (
              <button onClick={() => onNavigate(suggestedView)} className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-pink-500/10 text-pink-700 dark:text-pink-400 hover:bg-pink-500/20 transition-colors">
                <ArrowRight className="h-3 w-3" />Go to {suggestedView}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 120)}px`; }
  }, [input]);

  const handleNavigate = useCallback((view: string) => {
    if (VIEW_NAMES.includes(view)) setCurrentView(view as ViewType);
  }, [setCurrentView]);

  // Handle voice transcription → inject into chat
  const handleTranscribed = useCallback((text: string) => {
    setInput(prev => prev ? `${prev} ${text}` : text);
  }, []);

  // ─── Streaming Chat ─────────────────────────────────────────────────
  const handleChatSubmit = async (question?: string) => {
    const text = (question ?? input).trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput(''); setIsStreaming(true); setStreamingContent(''); setError('');

    const allMessages = [...messages, userMsg];

    try {
      abortRef.current = new AbortController();
      const res = await fetch('/api/assistant/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages, currentView }), signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

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

      if (accumulated) {
        const cleanContent = accumulated.replace(/\[DONE\]/g, '').trim();
        setMessages(prev => [...prev, { role: 'assistant', content: cleanContent, timestamp: new Date() }]);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(t('ai.errorMsg'));
      setMessages(prev => [...prev, { role: 'assistant', content: t('ai.errorMsg'), timestamp: new Date() }]);
    } finally {
      setIsStreaming(false); setStreamingContent(''); abortRef.current = null;
    }
  };

  // ─── Insight handlers ──────────────────────────────────────────────
  const handleInsight = async (domain: InsightDomain) => {
    if (insightLoading) return;
    setInsightLoading(domain);
    try {
      const res = await fetch('/api/assistant/insight', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReports(prev => [{ domain, content: data.report ?? data.answer ?? t('ai.errorMsg'), timestamp: new Date() }, ...prev]);
    } catch {
      setReports(prev => [{ domain, content: t('ai.errorMsg'), timestamp: new Date() }, ...prev]);
    } finally { setInsightLoading(null); }
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
            <Zap className="h-3 w-3 text-amber-500" />{t('ai.upgraded')}
          </Badge>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t('ai.subtitle')}</p>
      </div>

      <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0">
        <TabsList className="shrink-0 mb-4 w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
          <TabsTrigger value="chat" className="gap-1.5 text-xs sm:text-sm"><MessageSquare className="h-4 w-4" />{t('ai.chat')}</TabsTrigger>
          <TabsTrigger value="insights" className="gap-1.5 text-xs sm:text-sm"><Sparkles className="h-4 w-4" />{t('ai.insights')}</TabsTrigger>
          <TabsTrigger value="tools" className="gap-1.5 text-xs sm:text-sm"><Brain className="h-4 w-4" />{t('ai.tools')}</TabsTrigger>
        </TabsList>

        {/* ═══════════ TAB 1: SMART CHAT ═══════════ */}
        <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0">
          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge variant="outline" className="text-xs font-normal gap-1"><Brain className="h-3 w-3" />{t('ai.contextAware', { view: currentView })}</Badge>
            <Badge variant="outline" className="text-xs font-normal gap-1"><Zap className="h-3 w-3" />{t('ai.liveData')}</Badge>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setMessages([]); setError(''); }}>
                <Trash2 className="h-3 w-3 mr-1" />{t('ai.clearChat')}
              </Button>
            </div>
          </div>

          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-360px)]">
              {messages.length === 0 && !isStreaming && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{t('ai.welcome')}</h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-6">{t('ai.intro')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                    {suggestions.map((chip) => (
                      <Button key={chip} variant="outline" size="sm" className="text-xs h-auto py-2 px-3 whitespace-normal text-left justify-start gap-2" onClick={() => handleChatSubmit(chip)}>
                        <MessageSquare className="h-3 w-3 shrink-0 text-emerald-500" />{chip}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted border'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <MarkdownContent content={msg.content} onNavigate={handleNavigate} />
                    ) : (
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    )}
                    <div className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))}

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

              {error && !isStreaming && (
                <div className="text-center py-2">
                  <p className="text-xs text-destructive">{error}</p>
                  <Button variant="ghost" size="sm" className="text-xs h-7 mt-1" onClick={() => setError('')}><RotateCcw className="h-3 w-3 mr-1" />{t('ai.retry')}</Button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {messages.length > 0 && !isStreaming && (
              <div className="px-4 pt-2 border-t">
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.slice(0, 3).map((chip) => (
                    <Badge key={chip} variant="secondary" className="cursor-pointer hover:bg-secondary/80 transition-colors text-xs py-1" onClick={() => handleChatSubmit(chip)}>{chip}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Input area */}
            <div className="shrink-0 p-4 pt-3 border-t">
              <div className="flex gap-2 items-end">
                <Textarea
                  ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(); } }}
                  placeholder={t('ai.placeholder')} disabled={isStreaming} rows={1} className="min-h-[40px] max-h-[120px] resize-none"
                />
                {isStreaming ? (
                  <Button variant="destructive" size="icon" className="shrink-0 h-10 w-10" onClick={() => abortRef.current?.abort()}>
                    <RotateCcw className="h-4 w-4" /><span className="sr-only">Stop</span>
                  </Button>
                ) : (
                  <Button size="icon" disabled={!input.trim()} onClick={() => handleChatSubmit()} className="shrink-0 h-10 w-10 bg-emerald-600 hover:bg-emerald-700">
                    <Send className="h-4 w-4" /><span className="sr-only">{t('btn.send')}</span>
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">{t('ai.disclaimer')}</p>
            </div>
          </Card>
        </TabsContent>

        {/* ═══════════ TAB 2: INSIGHT REPORTS ═══════════ */}
        <TabsContent value="insights" className="flex-1 flex flex-col min-h-0 mt-0 overflow-y-auto max-h-[calc(100vh-240px)]">
          <div className="mb-4">
            <p className="text-sm font-medium mb-2 flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-emerald-500" />{t('ai.generateInsight')}</p>
            <div className="flex flex-wrap gap-2">
              {INSIGHT_DOMAINS.map((domain) => (
                <Button key={domain} variant="outline" size="sm" className="text-xs h-8" disabled={insightLoading !== null} onClick={() => handleInsight(domain)}>
                  {insightLoading === domain ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Brain className="h-3 w-3 mr-1" />}
                  {t(INSIGHT_I18N_KEYS[domain])}
                </Button>
              ))}
            </div>
            {insightLoading && <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />{t('ai.generating')}</p>}
          </div>

          {insightLoading && reports.length === 0 && (
            <Card className="mb-4"><CardContent className="p-4 space-y-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-3/4" /></CardContent></Card>
          )}

          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><FileText className="h-4 w-4" />{t('ai.reportHistory')}</h4>
            {reports.length === 0 && !insightLoading ? (
              <p className="text-xs text-muted-foreground">{t('ai.noHistory')}</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {reports.map((r, i) => (
                  <Card key={i}><CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs gap-1"><Brain className="h-3 w-3" />{t('ai.insightFor', { domain: r.domain })}</Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto">{formatDateTime(r.timestamp)}</span>
                    </div>
                    <MarkdownContent content={r.content} onNavigate={handleNavigate} />
                  </CardContent></Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══════════ TAB 3: AI TOOLS ═══════════ */}
        <TabsContent value="tools" className="flex-1 flex flex-col min-h-0 mt-0 overflow-y-auto max-h-[calc(100vh-240px)]">
          <div className="space-y-4">
            {/* Tool cards grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-lg border bg-card text-center">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-2"><Camera className="h-5 w-5 text-emerald-500" /></div>
                <p className="text-xs font-semibold">{t('ai.toolImageAnalysis')}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t('ai.toolImageAnalysisDesc')}</p>
                <Badge variant="secondary" className="mt-1.5 text-[9px]">VLM</Badge>
              </div>
              <div className="p-3 rounded-lg border bg-card text-center">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-2"><Volume2 className="h-5 w-5 text-blue-500" /></div>
                <p className="text-xs font-semibold">{t('ai.toolTTS')}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t('ai.toolTTSDesc')}</p>
                <Badge variant="secondary" className="mt-1.5 text-[9px]">TTS</Badge>
              </div>
              <div className="p-3 rounded-lg border bg-card text-center">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-2"><Mic className="h-5 w-5 text-red-500" /></div>
                <p className="text-xs font-semibold">{t('ai.toolASR')}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t('ai.toolASRDesc')}</p>
                <Badge variant="secondary" className="mt-1.5 text-[9px]">ASR</Badge>
              </div>
              <div className="p-3 rounded-lg border bg-card text-center">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-2"><Globe className="h-5 w-5 text-amber-500" /></div>
                <p className="text-xs font-semibold">{t('ai.toolWebSearch')}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t('ai.toolWebSearchDesc')}</p>
                <Badge variant="secondary" className="mt-1.5 text-[9px]">Search</Badge>
              </div>
              <div className="p-3 rounded-lg border bg-card text-center">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mx-auto mb-2"><Wrench className="h-5 w-5 text-orange-500" /></div>
                <p className="text-xs font-semibold">{t('ai.autoRemediate')}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t('ai.autoRemediateDesc')}</p>
                <Badge variant="secondary" className="mt-1.5 text-[9px]">LLM</Badge>
              </div>
              <div className="p-3 rounded-lg border bg-card text-center">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto mb-2"><BarChart3 className="h-5 w-5 text-violet-500" /></div>
                <p className="text-xs font-semibold">{t('ai.executiveReport')}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t('ai.executiveReportDesc')}</p>
                <Badge variant="secondary" className="mt-1.5 text-[9px]">LLM</Badge>
              </div>
              <div className="p-3 rounded-lg border bg-card text-center">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-2"><Link2 className="h-5 w-5 text-cyan-500" /></div>
                <p className="text-xs font-semibold">{t('ai.alertCorrelation')}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t('ai.alertCorrelationDesc')}</p>
                <Badge variant="secondary" className="mt-1.5 text-[9px]">LLM</Badge>
              </div>
              <div className="p-3 rounded-lg border bg-card text-center">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center mx-auto mb-2"><Headphones className="h-5 w-5 text-pink-500" /></div>
                <p className="text-xs font-semibold">{t('ai.voiceNoc')}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t('ai.voiceNocDesc')}</p>
                <Badge variant="secondary" className="mt-1.5 text-[9px]">ASR+LLM</Badge>
              </div>
            </div>

            {/* Voice Input (always visible in tools tab) */}
            <ASRTool onTranscribed={handleTranscribed} />

            {/* Image Analysis */}
            <ImageAnalysisTool />

            {/* Text to Speech */}
            <TTSTool />

            {/* Web Search */}
            <WebSearchTool />

            {/* Auto-Remediation */}
            <AutoRemediateTool onNavigate={handleNavigate} />

            {/* Executive Report */}
            <ExecutiveReportTool />

            {/* Alert Correlation */}
            <AlertCorrelationTool onNavigate={handleNavigate} />

            {/* Voice NOC */}
            <VoiceNocTool onNavigate={handleNavigate} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
