import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRBAC } from '@/hooks/useRBAC';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useRealtimeComments } from '@/hooks/useRealtime';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { format } from 'date-fns';
import { Send, Pencil, Trash2, Lock } from 'lucide-react';
import { RichTextEditor, type RichTextEditorRef } from '@/components/ui/RichTextEditor';
import type { Comment } from '@/types';

interface CommentThreadProps {
  taskId: string;
}

export function CommentThread({ taskId }: CommentThreadProps) {
  const { user, profile } = useAuth();
  const rbac = useRBAC();
  const queryClient = useQueryClient();
  const { members: workspaceMembers } = useWorkspaceStore();
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [commentVisibility, setCommentVisibility] = useState<'all' | 'internal'>('all');
  const editorRef = useRef<RichTextEditorRef>(null);
  const mentionMembers = workspaceMembers.map(m => ({ id: m.user_id, label: m.profiles?.full_name || m.profiles?.email || '' }));

  useRealtimeComments(taskId);

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*, user:profiles!user_id(*)')
        .eq('task_id', taskId)
        .order('created_at');
      if (error) throw error;
      return data as Comment[];
    },
  });

  // Filter out internal comments for clients
  const visibleComments = rbac.isClient
    ? comments.filter(c => c.visibility !== 'internal')
    : comments;

  const addComment = useMutation({
    mutationFn: async ({ body, visibility }: { body: string; visibility: 'all' | 'internal' }) => {
      const { error } = await supabase.from('comments').insert({ task_id: taskId, user_id: user!.id, body, visibility });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', taskId] }),
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const { error } = await supabase.from('comments').update({ body, is_edited: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['comments', taskId] }); setEditingId(null); },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', taskId] }),
  });

  const handleSubmit = (html?: string) => {
    const body = html || newComment;
    const isEmpty = !body || body === '<p></p>' || !body.trim();
    if (isEmpty) return;
    addComment.mutate({ body, visibility: commentVisibility });
    setNewComment('');
    editorRef.current?.clearContent();
    setCommentVisibility('all');
  };

  return (
    <div className="space-y-4">
      <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Comments ({visibleComments.length})</span>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {visibleComments.map((comment) => (
          <div key={comment.id} className={cn('group flex gap-2', comment.visibility === 'internal' && 'bg-amber-50/50 dark:bg-amber-950/10 -mx-2 px-2 py-1 rounded-lg')}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0" style={{ backgroundColor: getAvatarColor(comment.user_id) }}>
              {getInitials(comment.user?.full_name || null)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{comment.user?.full_name || 'User'}</span>
                <span className="text-xs text-gray-400">{format(new Date(comment.created_at), 'MMM d, h:mm a')}</span>
                {comment.is_edited && <span className="text-xs text-gray-400">(edited)</span>}
                {comment.visibility === 'internal' && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">
                    <Lock className="w-2.5 h-2.5" /> Internal
                  </span>
                )}
              </div>
              {editingId === comment.id ? (
                <div className="mt-1">
                  <RichTextEditor
                    content={editText}
                    onChange={setEditText}
                    minimal
                    members={mentionMembers}
                    placeholder="Edit comment..."
                  />
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => updateComment.mutate({ id: comment.id, body: editText })} className="text-xs text-[#4B7C6F] hover:underline">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-700 dark:text-slate-300 mt-0.5 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: comment.body }} />
              )}
              {comment.user_id === user?.id && editingId !== comment.id && (
                <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100">
                  <button onClick={() => { setEditingId(comment.id); setEditText(comment.body); }} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => deleteComment.mutate(comment.id)} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add comment */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0 mt-1" style={{ backgroundColor: getAvatarColor(user?.id || '') }}>
            {getInitials(profile?.full_name || null)}
          </div>
          <div className="flex-1 flex gap-2 items-end">
            <div className="flex-1">
              <RichTextEditor
                ref={editorRef}
                content={newComment}
                onChange={setNewComment}
                onSubmit={handleSubmit}
                placeholder="Write a comment... (use @ to mention)"
                minimal
                members={mentionMembers}
              />
            </div>
            <button onClick={() => handleSubmit()} disabled={!newComment || newComment === '<p></p>'} className="p-2 bg-[#16A34A] text-white rounded-lg hover:bg-[#3d6b5e] disabled:opacity-50 flex-shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        {rbac.isEmployee && (
          <div className="ml-9">
            <button
              onClick={() => setCommentVisibility(v => v === 'all' ? 'internal' : 'all')}
              className={cn(
                'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full transition-colors',
                commentVisibility === 'internal'
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:text-gray-700'
              )}
            >
              <Lock className="w-2.5 h-2.5" />
              {commentVisibility === 'internal' ? 'Internal only — hidden from clients' : 'Visible to all'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
