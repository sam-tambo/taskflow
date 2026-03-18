import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ProjectForm, FormSubmission } from '@/types';

export function useForms(projectId: string | undefined) {
  return useQuery({
    queryKey: ['forms', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_forms')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProjectForm[];
    },
    enabled: !!projectId,
  });
}

export function useForm(formId: string | undefined) {
  return useQuery({
    queryKey: ['form', formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_forms')
        .select('*')
        .eq('id', formId!)
        .single();
      if (error) throw error;
      return data as ProjectForm;
    },
    enabled: !!formId,
  });
}

export function useFormBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['form', 'slug', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_forms')
        .select('*')
        .eq('slug', slug!)
        .eq('is_public', true)
        .single();
      if (error) throw error;
      return data as ProjectForm;
    },
    enabled: !!slug,
  });
}

export function useCreateForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (form: Partial<ProjectForm> & { project_id: string; title: string }) => {
      const slug = form.slug || `${form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
      const { data, error } = await supabase
        .from('project_forms')
        .insert({
          project_id: form.project_id,
          title: form.title,
          description: form.description ?? null,
          is_public: form.is_public ?? true,
          slug,
          fields: form.fields ?? [],
          submit_button_text: form.submit_button_text ?? 'Submit',
          success_message: form.success_message ?? 'Thank you! Your submission has been received.',
          target_section_id: form.target_section_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ProjectForm;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['forms', data.project_id] });
      toast.success('Form created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create form: ${error.message}`);
    },
  });
}

export function useUpdateForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectForm> & { id: string }) => {
      const { data, error } = await supabase
        .from('project_forms')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ProjectForm;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['forms', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['form', data.id] });
      toast.success('Form saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update form: ${error.message}`);
    },
  });
}

export function useDeleteForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_forms')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { id, projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['forms', projectId] });
      toast.success('Form deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete form: ${error.message}`);
    },
  });
}

export function useFormSubmissions(formId: string | undefined) {
  return useQuery({
    queryKey: ['form-submissions', formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*, tasks(*)')
        .eq('form_id', formId!)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data as (FormSubmission & { tasks: any })[];
    },
    enabled: !!formId,
  });
}

export function useSubmitForm(formId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      submittedData,
      form,
    }: {
      submittedData: Record<string, any>;
      form: ProjectForm;
    }) => {
      // Build task from mapped fields
      let title = `Form submission ${new Date().toISOString()}`;
      let description: string | null = null;
      let dueDate: string | null = null;
      let priority: string | null = null;
      let tags: string[] = [];

      for (const field of form.fields) {
        const value = submittedData[field.id];
        if (value === undefined || value === '' || value === null) continue;
        switch (field.maps_to) {
          case 'title':
            title = String(value);
            break;
          case 'description':
            description = String(value);
            break;
          case 'due_date':
            dueDate = String(value);
            break;
          case 'priority':
            priority = String(value);
            break;
          case 'tag':
            tags.push(String(value));
            break;
        }
      }

      // Find submitter email
      const emailField = form.fields.find((f) => f.type === 'email');
      const submitterEmail = emailField ? submittedData[emailField.id] ?? null : null;

      // Create the task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          project_id: form.project_id,
          title,
          description,
          due_date: dueDate,
          priority: priority ?? 'medium',
          tags,
          section_id: form.target_section_id,
          status: 'todo',
        })
        .select()
        .single();
      if (taskError) throw taskError;

      // Create the submission
      const { data: submission, error: subError } = await supabase
        .from('form_submissions')
        .insert({
          form_id: formId,
          task_id: task.id,
          submitted_data: submittedData,
          submitter_email: submitterEmail,
        })
        .select()
        .single();
      if (subError) throw subError;

      return submission as FormSubmission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-submissions', formId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: Error) => {
      toast.error(`Submission failed: ${error.message}`);
    },
  });
}
