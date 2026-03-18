import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeComments } from '@/hooks/useRealtime';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { format } from 'date-fns';
import { Send, Pencil, Trash2 } from 'lucide-react';
import type { Comment } from '@/types';

interface CommentThreadProps {
  taskId: string;
}

export function CommentThread({ taskId }: CommentThreadProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

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

  const addComment = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase.from('comments').insert({ task_id: taskId, user_id: user!.id, body });
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

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addComment.mutate(newComment.trim());
    setNewComment('');
  };

  return (
    <div className="space-y-4">
      <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Comments ({comments.length})</span>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {comments.map((comment) => (
          <div key={comment.id} className="group flex gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0" style={{ backgroundColor: getAvatarColor(comment.user_id) }}>
              {getInitials(comment.user?.full_name || null)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{comment.user?.full_name || 'User'}</span>
                <span className="text-xs text-gray-400">{format(new Date(comment.created_at), 'MMM d, h:mm a')}</span>
                {comment.is_edited && <span className="text-xs text-gray-400">(edited)</span>}
              </div>
              {editingId === comment.id ? (
                <div className="mt-1">
                  <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 outline-none resize-none" rows={2} autoFocus />
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => updateComment.mutate({ id: comment.id, body: editText })} className="text-xs text-[#4B7C6F] hover:underline">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 dark:text-slate-300 mt-0.5">{comment.body}</p>
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
      <div className="flex gap-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0" style={{ backgroundColor: getAvatarColor(user?.id || '') }}>
          {getInitials(profile?.full_name || null)}
        </div>
        <div className="flex-1 flex gap-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            placeholder="Write a comment..."
            className="flex-1 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#4B7C6F]/30"
          />
          <button onClick={handleSubmit} disabled={!newComment.trim()} className="p-2 bg-[#16A34A] text-white rounded-lg hover:bg-[#3d6b5e] disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
