'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Send, Bot, User, Sparkles } from 'lucide-react';
import { useT } from '@/lib/i18n';

// ─── Types ─────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTION_KEYS = [
  'ai.suggestion1',
  'ai.suggestion2',
  'ai.suggestion3',
  'ai.suggestion4',
  'ai.suggestion5',
];

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

// ─── Main Component ────────────────────────────────────────────────────

export default function AssistantView() {
  const t = useT();
  const suggestions = SUGGESTION_KEYS.map((k) => t(k));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      });

      if (!res.ok) throw new Error('Failed to get response');

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: t('ai.errorMsg'),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  };

  const handleChipClick = (chip: string) => {
    handleSubmit(chip);
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col p-6 h-full">
      {/* Header */}
      <div className="shrink-0 mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-emerald-500" />
          {t('ai.title')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('ai.subtitle')}
        </p>
      </div>

      {/* Chat Container */}
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-280px)]">
          {/* Empty State */}
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold mb-1">{t('ai.welcome')}</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                {t('ai.intro')}
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {suggestions.map((chip) => (
                  <Button
                    key={chip}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-1.5 px-3 whitespace-normal text-left"
                    onClick={() => handleChipClick(chip)}
                  >
                    {chip}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Message List */}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[75%] rounded-xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </div>
                <div
                  className={`text-[10px] mt-1.5 ${
                    msg.role === 'user'
                      ? 'text-primary-foreground/60'
                      : 'text-muted-foreground'
                  }`}
                >
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center mt-1">
                <Bot className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="bg-muted rounded-xl px-4 py-3">
                <ThinkingDots />
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips (shown when messages exist) */}
        {messages.length > 0 && !isLoading && (
          <div className="px-4 pt-2 border-t">
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((chip) => (
                <Badge
                  key={chip}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80 transition-colors text-xs py-1"
                  onClick={() => handleChipClick(chip)}
                >
                  {chip}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="shrink-0 p-4 pt-3 border-t">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('ai.placeholder')}
              disabled={isLoading}
              rows={1}
              className="min-h-[40px] max-h-[120px] resize-none"
            />
            <Button
              size="icon"
              disabled={!input.trim() || isLoading}
              onClick={() => handleSubmit(input)}
              className="shrink-0 h-10 w-10"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">{t('btn.send')}</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}