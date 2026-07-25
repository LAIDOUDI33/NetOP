'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
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
  Bot, Cpu, Zap, Activity, CheckCircle2, XCircle, Clock, Timer,
  RefreshCw, Brain, Play, Square, MessageSquare, Sparkles, AlertTriangle,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface Agent {
  id: string; name: string; type: string; description: string; model: string;
  status: string; tasksCompleted: number; tasksFailed: number;
  avgLatencyMs: number; successRate: number; uptime: number;
}

interface Task {
  id: string; agentId: string; agentName: string; type: string; status: string;
  input: { site: string; technology: string; metric: string };
  output: { recommendation: string; confidence: number } | null;
  latencyMs: number | null; tokensUsed: number;
  createdAt: string; completedAt: string | null;
}

interface ChatMsg {
  role: string; agentName?: string; content: string; timestamp: string;
}

interface MultiAgentData {
  agents: Agent[]; taskQueue: Task[];
  metrics: Array<{ hour: string; tasksTotal: number; tasksSuccess: number; avgLatency: number; tokensUsed: number }>;
  chat: ChatMsg[];
  summary: {
    totalAgents: number; activeAgents: number; totalTasks: number; totalFailed: number;
    avgSuccessRate: number; runningTasks: number; queuedTasks: number; totalTokens24h: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500', idle: 'bg-amber-500', error: 'bg-red-500', disabled: 'bg-slate-400',
};
const TASK_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default', failed: 'destructive', running: 'secondary', queued: 'outline', cancelled: 'outline',
};
const TYPE_ICONS: Record<string, typeof Bot> = { optimization: Zap, detection: AlertTriangle, analysis: Brain, forecasting: Activity, automation: Cpu, orchestration: Sparkles };

export default function MultiAgentView() {
  const t = useT();
  const { data, isLoading, refetch } = useQuery<MultiAgentData>({
    queryKey: ['multi-agent'],
    queryFn: () => fetch('/api/multi-agent').then(r => { if (!r.ok) throw new Error('API error'); return r.json(); }),
    refetchInterval: 15000,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (<Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>))}
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>
      </div>
    );
  }

  const { agents, taskQueue, metrics, chat, summary } = data;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Multi-Agent System</h1>
          <p className="text-muted-foreground text-sm mt-1">AI agent orchestration, task routing, and autonomous network management</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-muted-foreground">Active Agents</p><p className="text-3xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{summary.activeAgents}<span className="text-sm font-normal text-muted-foreground">/{summary.totalAgents}</span></p><p className="text-xs text-muted-foreground mt-1">AI models running</p></div>
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><Bot className="h-6 w-6 text-emerald-600" /></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-muted-foreground">Success Rate</p><p className="text-3xl font-bold mt-1">{summary.avgSuccessRate}%</p><Progress value={summary.avgSuccessRate} className="mt-2 h-2" /></div>
          <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><CheckCircle2 className="h-6 w-6 text-amber-600" /></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-muted-foreground">Tasks Running</p><p className="text-3xl font-bold mt-1">{summary.runningTasks} <span className="text-sm font-normal text-muted-foreground">+{summary.queuedTasks} queued</span></p><p className="text-xs text-muted-foreground mt-1">{summary.totalTasks.toLocaleString()} total completed</p></div>
          <div className="h-12 w-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center"><Cpu className="h-6 w-6 text-violet-600" /></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between">
          <div><p className="text-sm font-medium text-muted-foreground">Tokens 24h</p><p className="text-3xl font-bold mt-1">{(summary.totalTokens24h / 1000000).toFixed(1)}M</p><p className="text-xs text-red-600 mt-1">{summary.totalFailed} failed tasks</p></div>
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Sparkles className="h-6 w-6 text-slate-600" /></div>
        </div></CardContent></Card>
      </div>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Agent Fleet</TabsTrigger>
          <TabsTrigger value="tasks">Task Queue</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="chat">Orchestrator Log</TabsTrigger>
        </TabsList>

        <TabsContent value="agents">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {agents.map(agent => {
              const Icon = TYPE_ICONS[agent.type] || Bot;
              return (
                <Card key={agent.id} className={cn('transition-colors', agent.status === 'active' ? 'border-emerald-500/30' : 'border-amber-500/30')}>
                  <CardHeader className="pb-3"><div className="flex items-center justify-between">
                    <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Icon className="h-5 w-5 text-primary" /></div><div><CardTitle className="text-sm font-semibold">{agent.name}</CardTitle><p className="text-xs text-muted-foreground">{agent.model} · {agent.type}</p></div></div>
                    <Badge variant={agent.status === 'active' ? 'default' : 'secondary'} className="capitalize text-xs">{agent.status}</Badge>
                  </div></CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">{agent.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Tasks:</span> <span className="font-mono font-medium">{agent.tasksCompleted.toLocaleString()}</span></div>
                      <div><span className="text-muted-foreground">Failed:</span> <span className="font-mono text-red-600">{agent.tasksFailed}</span></div>
                      <div><span className="text-muted-foreground">Latency:</span> <span className="font-mono">{agent.avgLatencyMs}ms</span></div>
                      <div><span className="text-muted-foreground">Success:</span> <span className="font-mono text-emerald-600">{agent.successRate}%</span></div>
                    </div>
                    <div className="mt-3 flex items-center gap-2"><Progress value={agent.successRate} className="h-1.5" /><span className="text-[10px] text-muted-foreground">Uptime {agent.uptime}%</span></div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <Card><CardHeader><CardTitle className="text-base">Recent Tasks ({taskQueue.length})</CardTitle></CardHeader><CardContent>
            <ScrollArea className="h-[480px]"><Table>
              <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Agent</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Latency</TableHead><TableHead>Tokens</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
              <TableBody>
                {taskQueue.map(task => (
                  <TableRow key={task.id}><TableCell className="font-mono text-xs">{task.id}</TableCell><TableCell className="text-xs">{task.agentName}</TableCell><TableCell className="text-xs">{task.type.replace(/_/g, ' ')}</TableCell><TableCell><Badge variant={TASK_STATUS_VARIANT[task.status]} className="capitalize text-xs">{task.status === 'running' && <Play className="h-2.5 w-2.5 mr-1 inline" />}{task.status}</Badge></TableCell><TableCell className="font-mono text-xs">{task.latencyMs ? `${task.latencyMs}ms` : '—'}</TableCell><TableCell className="font-mono text-xs">{task.tokensUsed.toLocaleString()}</TableCell><TableCell className="text-xs text-muted-foreground">{new Date(task.createdAt).toLocaleTimeString()}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table></ScrollArea>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="metrics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle className="text-base">Task Throughput (24h)</CardTitle></CardHeader><CardContent>
              <ResponsiveContainer width="100%" height={320}><LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" /><XAxis dataKey="hour" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} /><Legend />
                <Line type="monotone" dataKey="tasksTotal" name="Total" stroke="#10B981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="tasksSuccess" name="Success" stroke="#F59E0B" strokeWidth={2} dot={false} />
              </LineChart></ResponsiveContainer>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Avg Latency (ms)</CardTitle></CardHeader><CardContent>
              <ResponsiveContainer width="100%" height={320}><LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" /><XAxis dataKey="hour" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="avgLatency" name="Latency (ms)" stroke="#EF4444" strokeWidth={2} dot={false} />
              </LineChart></ResponsiveContainer>
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="chat">
          <Card><CardHeader><CardTitle className="text-base">Orchestrator Communication Log</CardTitle></CardHeader><CardContent>
            <ScrollArea className="h-[480px]"><div className="space-y-3">
              {chat.map((msg, i) => (
                <div key={i} className={cn('flex gap-3', msg.role === 'orchestrator' ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[70%] rounded-lg px-4 py-3 text-sm', msg.role === 'orchestrator' ? 'bg-primary text-primary-foreground' : msg.role === 'agent' ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-500/20' : 'bg-muted')}>
                    {msg.role === 'agent' && <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">🤖 {msg.agentName}</p>}
                    {msg.role === 'orchestrator' && <p className="text-xs font-semibold mb-1 opacity-80">🎯 Orchestrator</p>}
                    <p>{msg.content}</p>
                    <p className={cn('text-[10px] mt-1', msg.role === 'orchestrator' ? 'opacity-60' : 'text-muted-foreground')}>{new Date(msg.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div></ScrollArea>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}