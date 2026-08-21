'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Loader2, User } from 'lucide-react';
import { useT } from '@/lib/i18n';

interface Comment {
  id: string;
  entityType: string;
  entityId: string;
  authorName: string;
  content: string;
  isResolved: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CommentThreadProps {
  entityType: string; // 'alert', 'incident', 'change', 'site'
  entityId: string;
  compact?: boolean; // show inline without card wrapper
}

export function CommentThread({ entityType, entityId, compact = false }: CommentThreadProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  const { data, isLoading } = useQuery<{ comments: Comment[] }>({
    queryKey: ['comments', entityType, entityId],
    queryFn: () => fetch(`/api/collaboration/comments?entityType=${entityType}&entityId=${entityId}`).then(r => r.json()),
  });

  const addComment = useMutation({
    mutationFn: (content: string) => fetch('/api/collaboration/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId, content, authorName: 'Operator' }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
      setNewComment('');
    },
  });

  const comments = data?.comments ?? [];
  const topLevel = comments.filter(c => !c.parentId);
  const replies = comments.filter(c => c.parentId);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t('time.justNow');
    if (diffMin < 60) return t('time.minutesAgo', { n: diffMin });
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return t('time.hoursAgo', { n: diffHr });
    const diffDay = Math.floor(diffHr / 24);
    return t('time.daysAgo', { n: diffDay });
  };

  const content = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4" />
          {t('collab.comments')}
          {comments.length > 0 && <Badge variant="secondary" className="text-[10px]">{comments.length}</Badge>}
        </h4>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">{t('collab.noComments')}</p>
      ) : (
        <ScrollArea className="max-h-64">
          <div className="space-y-3 pr-2">
            {topLevel.map(c => {
              const commentReplies = replies.filter(r => r.parentId === c.id);
              return (
                <div key={c.id} className="space-y-2">
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium">{c.authorName}</span>
                        <span className="text-[10px] text-muted-foreground">{formatTime(c.createdAt)}</span>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                  {commentReplies.map(r => (
                    <div key={r.id} className="flex gap-2 ml-9">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-2.5 w-2.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-medium">{r.authorName}</span>
                          <span className="text-[10px] text-muted-foreground">{formatTime(r.createdAt)}</span>
                        </div>
                        <p className="text-[10px] text-foreground/80 leading-relaxed">{r.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Add comment input */}
      <div className="flex gap-2 items-end">
        <Textarea
          placeholder={t('collab.addComment')}
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          rows={2}
          className="text-xs min-h-[40px] max-h-[80px] resize-none flex-1"
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (newComment.trim()) addComment.mutate(newComment.trim()); } }}
        />
        <Button
          size="icon"
          disabled={!newComment.trim() || addComment.isPending}
          onClick={() => { if (newComment.trim()) addComment.mutate(newComment.trim()); }}
          className="shrink-0 h-9 w-9"
        >
          {addComment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          <span className="sr-only">{t('collab.postComment')}</span>
        </Button>
      </div>
    </div>
  );

  if (compact) return content;
  return <Card><CardContent className="p-4">{content}</CardContent></Card>;
}
