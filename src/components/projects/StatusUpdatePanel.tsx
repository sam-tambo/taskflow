import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { format } from 'date-fns';
import { Plus, Trash2, CheckCircle, AlertTriangle, XCircle, PauseCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface StatusUpdate {
  id: string;
  project_id: string;
  author_id: string | null;
  status: 'on_track' | 'at_risk' | 'off_track' | 'on_hold' | 'complete';
  title: string;
  body: string | null;
  created_at: string;
  author?: { id: string; full_name: string | null; email: string };
}

interface StatusUpdatePanelProps {
  projectId: string;
}

const STATUS_CONFIG = {
  on_track: { label: 'On Track', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  at_risk: { label: 'At Risk', icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  off_track: { label: 'Off Track', icon: XCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  on_hold: { label: 'On Hold', icon: PauseCircle, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
  complete: { label: 'Complete', icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
};

export function StatusUpdatePanel({ projectId }: StatusUpdatePanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newStatus, setNewStatus] = useState<StatusUpdate['status']>('on_track');
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');

  const { data: updates = [] } = useQuery({
    queryKey: ['status-updates', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_status_updates')
        .select('*, author:profiles!author_id(id, full_name, email)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as StatusUpdate[];
    },
  });

  const addUpdate = useMutation({
    mutationFn: async (update: { project_id: string; author_id: string; status: string; title: string; body: string | null }) => {
      const { error } = await supabase.from('project_status_updates').insert(update);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-updates', projectId] });
      toast.success('Status update posted');
      setIsAdding(false);
      setNewTitle('');
      setNewBody('');
    },
    onError: () => toast.error('Failed to post update'),
  });

  const deleteUpdate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_status_updates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-updates', projectId] });
    },
  });

  const handleSubmit = () => {
    if (!newTitle.trim() || !user) return;
    addUpdate.mutate({
      project_id: projectId,
      author_id: user.id,
      status: newStatus,
      title: newTitle.trim(),
      body: newBody.trim() || null,
    });
  };

  const latestStatus = updates[0]?.status || 'on_track';
  const LatestIcon = STATUS_CONFIG[latestStatus].icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Status Updates</h3>
          {updates.length > 0 && (
            <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', STATUS_CONFIG[latestStatus].bg, STATUS_CONFIG[latestStatus].color)}>
              <LatestIcon className="w-3 h-3" />
              {STATUS_CONFIG[latestStatus].label}
            </span>
          )}
        </div>
        <button onClick={() => setIsAdding(!isAdding)} className="text-xs text-[#4B7C6F] hover:underline flex items-center gap-1">
          <Plus className="w-3 h-3" /> Update
        </button>
      </div>

      {/* Add form */}
      {isAdding && (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex gap-1">
            {(Object.keys(STATUS_CONFIG) as StatusUpdate['status'][]).map(s => {
              const cfg = STATUS_CONFIG[s];
              const Icon = cfg.icon;
              return (
                <button
                  key={s}
                  onClick={() => setNewStatus(s)}
                  className={cn('flex items-center gap-1 px-2 py-1 text-xs rounded-md border', newStatus === s ? `${cfg.bg} ${cfg.color} border-current` : 'border-gray-200 dark:border-slate-600 text-gray-500')}
                >
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </button>
              );
            })}
          </div>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Summary (e.g., Sprint 3 complete)"
            className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-md outline-none text-gray-900 dark:text-white"
            autoFocus
          />
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Details (optional)"
            rows={2}
            className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-md outline-none resize-none text-gray-900 dark:text-white"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setIsAdding(false)} className="text-xs text-gray-500 px-2 py-1">Cancel</button>
            <button onClick={handleSubmit} disabled={!newTitle.trim()} className="text-xs text-white bg-[#4B7C6F] px-3 py-1 rounded-md hover:bg-[#3d6b5e] disabled:opacity-50">
              Post Update
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-3">
        {updates.map((update, idx) => {
          const cfg = STATUS_CONFIG[update.status];
          const Icon = cfg.icon;
          return (
            <div key={update.id} className="group relative pl-6">
              {/* Timeline line */}
              {idx < updates.length - 1 && <div className="absolute left-[9px] top-6 bottom-0 w-px bg-gray-200 dark:bg-slate-700" />}
              {/* Dot */}
              <div className={cn('absolute left-0 top-1 w-[18px] h-[18px] rounded-full flex items-center justify-center', cfg.bg)}>
                <Icon className={cn('w-2.5 h-2.5', cfg.color)} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{update.title}</span>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', cfg.bg, cfg.color)}>{cfg.label}</span>
                </div>
                {update.body && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{update.body}</p>}
                <div className="flex items-center gap-2 mt-1">
                  {update.author && (
                    <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[7px] font-medium" style={{ backgroundColor: getAvatarColor(update.author.id) }}>
                      {getInitials(update.author.full_name)}
                    </div>
                  )}
                  <span className="text-[10px] text-gray-400">{format(new Date(update.created_at), 'MMM d, h:mm a')}</span>
                  {update.author_id === user?.id && (
                    <button onClick={() => deleteUpdate.mutate(update.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {updates.length === 0 && !isAdding && (
          <p className="text-xs text-gray-400">No status updates yet</p>
        )}
      </div>
    </div>
  );
}
