'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Send, RefreshCw, Sparkles, Activity, TrendingUp, Clock, Users, AlertTriangle } from 'lucide-react';
import type { OptimizationItem, OptimizationStatus, Technology } from '@/types';
import { toast } from 'sonner';

const TECH_COLORS: Record<Technology, string> = {
  '2G': '#94A3B8',
  '3G': '#06B6D4',
  '4G': '#10B981',
  '5G': '#F59E0B',
};

const STATUS_CONFIG: Record<OptimizationStatus, { color: string; label: string }> = {
  pending: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: 'Pending' },
  implemented: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Implemented' },
  dismissed: { color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', label: 'Dismissed' },
};

interface OptimizerResponse {
  optimizations: OptimizationItem[];
  healthSummary: {
    technology: Technology;
    avgThroughput: number;
    avgLatency: number;
    avgAvailability: number;
    avgDropRate: number;
    avgSinr: number;
    avgUsers: number;
    sites: number;
    degradedSites: number;
    downSites: number;
  }[];
}

export default function OptimizerView() {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; content: string; timestamp: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data, isLoading } = useQuery<OptimizerResponse>({
    queryKey: ['optimizer'],
    queryFn: () => fetch('/api/optimizer').then(r => r.json()),
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, data?.optimizations]);

  const postMutation = useMutation({
    mutationFn: (body: { prompt: string; healthSummary?: any[] }) =>
      fetch('/api/optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: (result) => {
      setChatHistory(prev => [
        ...prev,
        { role: 'ai', content: result.response || 'No response generated.', timestamp: new Date().toISOString() },
      ]);
      setPrompt('');
      queryClient.invalidateQueries({ queryKey: ['optimizer'] });
    },
    onError: () => {
      toast.error('Failed to get AI recommendation');
    },
  });

  const handleSubmit = () => {
    if (!prompt.trim() || postMutation.isPending) return;
    setChatHistory(prev => [...prev, { role: 'user', content: prompt, timestamp: new Date().toISOString() }]);
    postMutation.mutate({ prompt, healthSummary: data?.healthSummary });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel — Chat */}
      <div className="lg:col-span-2 flex flex-col">
        <Card className="flex flex-col flex-1 min-h-0">
          <CardHeader className="pb-2 shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                AI Network Optimizer
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['optimizer'] })}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(100vh - 340px)' }}>
            {/* Existing Recommendations */}
            {isLoading && !data ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-24 w-3/4" />
              </div>
            ) : (
              data?.optimizations.map((opt) => {
                const statusCfg = STATUS_CONFIG[opt.status];
                return (
                  <div key={opt.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          className="text-xs"
                          style={{ backgroundColor: TECH_COLORS[opt.technology], color: '#fff' }}
                        >
                          {opt.technology}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{opt.category}</span>
                        <Badge className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(opt.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{opt.issue}</p>
                    <div className="text-sm text-muted-foreground bg-muted/50 rounded p-3">
                      {opt.recommendation}
                    </div>
                    {opt.impact && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Impact:</span> {opt.impact}
                      </p>
                    )}
                  </div>
                );
              })
            )}

            {/* Chat History */}
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {postMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3 text-sm animate-pulse">
                  Analyzing network conditions...
                </div>
              </div>
            )}
          </div>
          <Separator />
          <div className="p-4 shrink-0">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask for optimization advice, e.g., 'How can I improve 4G throughput in the downtown area?'"
                className="min-h-[60px] max-h-[120px] resize-none text-sm"
              />
              <Button
                onClick={handleSubmit}
                disabled={!prompt.trim() || postMutation.isPending}
                className="self-end shrink-0"
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Right Panel — Health Summary */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Network Health
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {isLoading && !data ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              data?.healthSummary.map((h) => (
                <div key={h.technology} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      className="text-xs font-bold"
                      style={{ backgroundColor: TECH_COLORS[h.technology], color: '#fff' }}
                    >
                      {h.technology}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{h.sites} sites</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">DL:</span>
                      <span className="font-medium">{h.avgThroughput} Mbps</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Latency:</span>
                      <span className="font-medium">{h.avgLatency} ms</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Avail:</span>
                      <span className="font-medium">{(h.avgAvailability * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Drop:</span>
                      <span className="font-medium">{(h.avgDropRate * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Users:</span>
                      <span className="font-medium">{h.avgUsers}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">SINR:</span>
                      <span className="font-medium">{h.avgSinr} dB</span>
                    </div>
                  </div>
                  {(h.degradedSites > 0 || h.downSites > 0) && (
                    <div className="flex gap-2 text-[10px]">
                      {h.degradedSites > 0 && (
                        <span className="text-amber-600">{h.degradedSites} degraded</span>
                      )}
                      {h.downSites > 0 && (
                        <span className="text-red-600">{h.downSites} down</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}