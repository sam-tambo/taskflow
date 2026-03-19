import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUIStore } from '@/stores/useUIStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { cn, formatDueDate, getDueDateColor, getPriorityColor, getInitials, getAvatarColor } from '@/lib/utils';
import { SubtaskList } from './SubtaskList';
import { DependencySection } from './DependencySection';
import { CommentThread } from './CommentThread';
import { AttachmentList } from './AttachmentList';
import { TimeTracker } from './TimeTracker';
import { format } from 'date-fns';
import {
  X, Check, Star, MoreHorizontal, Calendar, Flag, User, Tag, Clock,
  ChevronDown, Copy, Trash2, ArrowUpRight, Diamond, Search
} from 'lucide-react';
import type { Task, ActivityLog } from '@/types';
import { toast } from 'sonner';

interface TaskDetailPanelProps {
  taskId: string;
}

export function TaskDetailPanel({ taskId }: TaskDetailPanelProps) {
  const { closeTaskDetail } = useUIStore();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showActions, setShowActions] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!assignee_id(*), section:sections(*), project:projects(*)')
        .eq('id', taskId)
        .single();
      if (error) throw error;
      return data as Task;
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*, user:profiles!user_id(*)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as ActivityLog[];
    },
  });

  const { members: workspaceMembers } = useWorkspaceStore();
  const updateTask = useUpdateTask(task?.project_id || undefined);
  const deleteTask = useDeleteTask(task?.project_id || undefined);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const assigneeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
    }
  }, [task]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeTaskDetail(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeTaskDetail]);

  if (isLoading || !task) {
    return (
      <div className="h-full w-full md:w-[480px] bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 shadow-2xl flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#4B7C6F] border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleComplete = () => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateTask.mutate({ id: task.id, status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null });
  };

  const handleDelete = () => {
    if (confirm('Delete this task?')) {
      deleteTask.mutate(task.id);
      closeTaskDetail();
    }
  };

  const handleTitleSave = () => {
    if (title.trim() && title !== task.title) {
      updateTask.mutate({ id: task.id, title: title.trim() });
    }
    setIsEditingTitle(false);
  };

  const priorities: Task['priority'][] = ['none', 'low', 'medium', 'high', 'urgent'];
  const statuses: Task['status'][] = ['todo', 'in_progress', 'done', 'cancelled'];
  const statusLabels: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done', cancelled: 'Cancelled' };

  return (
    <div className="h-full w-full md:w-[480px] bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-slate-800">
        <button onClick={handleComplete} className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors', task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-slate-600 hover:border-[#4B7C6F]')}>
          {task.status === 'done' && <Check className="w-4 h-4 text-white" />}
        </button>
        <div className="flex-1" />
        <button
          onClick={() => updateTask.mutate({ id: task.id, is_favorite: !task.is_favorite })}
          className={cn('p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800', task.is_favorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500')}
        >
          <Star className={cn('w-4 h-4', task.is_favorite && 'fill-current')} />
        </button>
        <div className="relative">
          <button onClick={() => setShowActions(!showActions)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showActions && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-1 z-50">
              <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); setShowActions(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700">
                <Copy className="w-4 h-4" /> Copy link
              </button>
              <button onClick={() => { updateTask.mutate({ id: task.id, is_milestone: !task.is_milestone }); setShowActions(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700">
                <Diamond className="w-4 h-4" /> {task.is_milestone ? 'Remove milestone' : 'Mark as milestone'}
              </button>
              <hr className="my-1 border-gray-100 dark:border-slate-700" />
              <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 className="w-4 h-4" /> Delete task
              </button>
            </div>
          )}
        </div>
        <button onClick={closeTaskDetail} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body - scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Title */}
        {isEditingTitle ? (
          <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={handleTitleSave} onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); }} className="text-xl font-semibold w-full bg-transparent outline-none text-gray-900 dark:text-white" autoFocus />
        ) : (
          <h2 onClick={() => setIsEditingTitle(true)} className={cn('text-xl font-semibold cursor-text', task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white')}>
            {task.title}
          </h2>
        )}

        {/* Metadata grid */}
        <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-sm">
          {/* Assignee */}
          <span className="text-gray-500 dark:text-slate-400 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Assignee</span>
          <div className="relative" ref={assigneeRef}>
            <button
              onClick={() => setShowAssigneePicker(!showAssigneePicker)}
              className="flex items-center gap-2 px-1.5 py-1 -ml-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              {task.assignee ? (
                <>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium" style={{ backgroundColor: getAvatarColor(task.assignee.id) }}>
                    {getInitials(task.assignee.full_name)}
                  </div>
                  <span className="text-gray-900 dark:text-white text-sm">{task.assignee.full_name}</span>
                </>
              ) : <span className="text-gray-400 text-sm">Unassigned</span>}
            </button>
            {showAssigneePicker && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-2 border-b border-gray-100 dark:border-slate-700">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      placeholder="Search members..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg outline-none text-gray-900 dark:text-white"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  <button
                    onClick={() => { updateTask.mutate({ id: task.id, assignee_id: null }); setShowAssigneePicker(false); setAssigneeSearch(''); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center">
                      <User className="w-3 h-3 text-gray-400" />
                    </div>
                    Unassigned
                  </button>
                  {workspaceMembers
                    .filter(m => {
                      if (!assigneeSearch) return true;
                      const q = assigneeSearch.toLowerCase();
                      return (m.profiles?.full_name || '').toLowerCase().includes(q) || (m.profiles?.email || '').toLowerCase().includes(q);
                    })
                    .map((wm) => (
                      <button
                        key={wm.user_id}
                        onClick={() => { updateTask.mutate({ id: task.id, assignee_id: wm.user_id }); setShowAssigneePicker(false); setAssigneeSearch(''); }}
                        className={cn('w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700', task.assignee_id === wm.user_id && 'bg-[#4B7C6F]/5')}
                      >
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium" style={{ backgroundColor: getAvatarColor(wm.user_id) }}>
                          {getInitials(wm.profiles?.full_name || null)}
                        </div>
                        <span className="text-gray-900 dark:text-white truncate">{wm.profiles?.full_name || wm.profiles?.email}</span>
                        {task.assignee_id === wm.user_id && <Check className="w-3.5 h-3.5 text-[#4B7C6F] ml-auto" />}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Due date */}
          <span className="text-gray-500 dark:text-slate-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Due date</span>
          <div>
            <input type="date" value={task.due_date || ''} onChange={(e) => updateTask.mutate({ id: task.id, due_date: e.target.value || null })} className="text-sm bg-transparent outline-none text-gray-900 dark:text-white" />
          </div>

          {/* Start date */}
          <span className="text-gray-500 dark:text-slate-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Start date</span>
          <div>
            <input type="date" value={task.start_date || ''} onChange={(e) => updateTask.mutate({ id: task.id, start_date: e.target.value || null })} className="text-sm bg-transparent outline-none text-gray-900 dark:text-white" />
          </div>

          {/* Priority */}
          <span className="text-gray-500 dark:text-slate-400 flex items-center gap-1.5"><Flag className="w-3.5 h-3.5" /> Priority</span>
          <select value={task.priority} onChange={(e) => updateTask.mutate({ id: task.id, priority: e.target.value as Task['priority'] })} className={cn('text-sm bg-transparent outline-none rounded px-1 -ml-1 cursor-pointer', getPriorityColor(task.priority))}>
            {priorities.map((p) => <option key={p} value={p}>{p === 'none' ? 'None' : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>

          {/* Status */}
          <span className="text-gray-500 dark:text-slate-400 flex items-center gap-1.5"><ChevronDown className="w-3.5 h-3.5" /> Status</span>
          <select value={task.status} onChange={(e) => updateTask.mutate({ id: task.id, status: e.target.value as Task['status'], completed_at: e.target.value === 'done' ? new Date().toISOString() : null })} className="text-sm bg-transparent outline-none cursor-pointer text-gray-900 dark:text-white">
            {statuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
          </select>

          {/* Project */}
          {task.project && (
            <>
              <span className="text-gray-500 dark:text-slate-400 flex items-center gap-1.5"><ArrowUpRight className="w-3.5 h-3.5" /> Project</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project.color }} />
                <span className="text-gray-900 dark:text-white">{task.project.name}</span>
              </div>
            </>
          )}

          {/* Tags */}
          <span className="text-gray-500 dark:text-slate-400 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Tags</span>
          <div className="flex flex-wrap gap-1">
            {task.tags?.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-purple/10 text-purple rounded-full">{tag}</span>
            ))}
            {(!task.tags || task.tags.length === 0) && <span className="text-gray-400 text-sm">No tags</span>}
          </div>

          {/* Estimated hours */}
          <span className="text-gray-500 dark:text-slate-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Est. hours</span>
          <input type="number" step="0.5" min="0" value={task.estimated_hours || ''} onChange={(e) => updateTask.mutate({ id: task.id, estimated_hours: e.target.value ? parseFloat(e.target.value) : null })} placeholder="—" className="text-sm bg-transparent outline-none text-gray-900 dark:text-white w-20" />
        </div>

        {/* Description */}
        <div>
          <span className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2 block">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => { if (description !== (task.description || '')) updateTask.mutate({ id: task.id, description }); }}
            placeholder="Add a description..."
            rows={3}
            className="w-full text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#4B7C6F]/30 resize-none"
          />
        </div>

        {/* Subtasks */}
        <SubtaskList parentTask={task} />

        <hr className="border-gray-100 dark:border-slate-800" />

        {/* Dependencies */}
        <DependencySection taskId={task.id} projectId={task.project_id} />

        <hr className="border-gray-100 dark:border-slate-800" />

        {/* Comments */}
        <CommentThread taskId={taskId} />

        <hr className="border-gray-100 dark:border-slate-800" />

        {/* Time Tracking */}
        <TimeTracker taskId={taskId} />

        <hr className="border-gray-100 dark:border-slate-800" />

        {/* Attachments */}
        <AttachmentList taskId={taskId} />

        <hr className="border-gray-100 dark:border-slate-800" />

        {/* Activity Log */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Activity</span>
          {activities.length === 0 && <p className="text-xs text-gray-400">No activity yet</p>}
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-2 text-xs text-gray-500">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-medium flex-shrink-0 mt-0.5" style={{ backgroundColor: getAvatarColor(activity.user_id || '') }}>
                {getInitials(activity.user?.full_name || null)}
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-slate-300">{activity.user?.full_name || 'User'}</span>{' '}
                {activity.action === 'created' && 'created this task'}
                {activity.action === 'updated' && `changed ${activity.field_changed} from "${activity.old_value}" to "${activity.new_value}"`}
                {activity.action === 'completed' && 'marked this task complete'}
                {activity.action === 'assigned' && `assigned to ${activity.new_value}`}
                {activity.action === 'commented' && 'commented'}
                <span className="text-gray-400 ml-1">{format(new Date(activity.created_at), 'MMM d, h:mm a')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
