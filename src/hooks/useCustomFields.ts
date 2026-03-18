import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CustomField, CustomFieldValue } from '@/types';
import { toast } from 'sonner';

export function useCustomFields(projectId: string | undefined) {
  return useQuery({
    queryKey: ['custom-fields', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('project_id', projectId)
        .order('position');
      if (error) throw error;
      return data as CustomField[];
    },
    enabled: !!projectId,
  });
}

export function useCustomFieldValues(taskId: string | undefined) {
  return useQuery({
    queryKey: ['custom-field-values', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from('custom_field_values')
        .select('*, field:custom_fields(*)')
        .eq('task_id', taskId);
      if (error) throw error;
      return data as CustomFieldValue[];
    },
    enabled: !!taskId,
  });
}

export function useCreateCustomField(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (field: Partial<CustomField>) => {
      const { data, error } = await supabase
        .from('custom_fields')
        .insert(field)
        .select()
        .single();
      if (error) throw error;
      return data as CustomField;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', projectId] });
      toast.success('Custom field created');
    },
    onError: () => toast.error('Failed to create field'),
  });
}

export function useDeleteCustomField(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fieldId: string) => {
      const { error } = await supabase.from('custom_fields').delete().eq('id', fieldId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', projectId] });
      toast.success('Field deleted');
    },
  });
}

export function useSetCustomFieldValue(taskId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fieldId, value }: { fieldId: string; value: string | null }) => {
      // Upsert: try update, then insert
      const { data: existing } = await supabase
        .from('custom_field_values')
        .select('id')
        .eq('task_id', taskId)
        .eq('field_id', fieldId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('custom_field_values')
          .update({ value })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('custom_field_values')
          .insert({ task_id: taskId, field_id: fieldId, value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-values', taskId] });
    },
  });
}
