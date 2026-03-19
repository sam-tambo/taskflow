import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string | null;
  description: string | null;
  duration_minutes: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  user?: { id: string; full_name: string | null; email: string };
}

export function useTimeEntries(taskId: string | undefined) {
  return useQuery({
    queryKey: ['time-entries', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from('time_entries')
        .select('*, user:profiles!user_id(id, full_name, email)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TimeEntry[];
    },
    enabled: !!taskId,
  });
}

export function useAddTimeEntry(taskId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: { task_id: string; user_id: string; duration_minutes: number; description?: string }) => {
      const { data, error } = await supabase
        .from('time_entries')
        .insert(entry)
        .select('*, user:profiles!user_id(id, full_name, email)')
        .single();
      if (error) throw error;
      return data as TimeEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', taskId] });
      toast.success('Time logged');
    },
    onError: () => {
      toast.error('Failed to log time');
    },
  });
}

export function useDeleteTimeEntry(taskId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('time_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', taskId] });
    },
  });
}
