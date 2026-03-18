import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Portfolio, Project } from '@/types';
import { toast } from 'sonner';

export function usePortfolios(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['portfolios', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Portfolio[];
    },
    enabled: !!workspaceId,
  });
}

export function usePortfolio(portfolioId: string | undefined) {
  return useQuery({
    queryKey: ['portfolio', portfolioId],
    queryFn: async () => {
      if (!portfolioId) return null;
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('id', portfolioId)
        .single();
      if (error) throw error;
      return data as Portfolio;
    },
    enabled: !!portfolioId,
  });
}

export function usePortfolioProjects(portfolioId: string | undefined) {
  return useQuery({
    queryKey: ['portfolio-projects', portfolioId],
    queryFn: async () => {
      if (!portfolioId) return [];
      const { data, error } = await supabase
        .from('portfolio_projects')
        .select('*, project:projects(*, owner:profiles!owner_id(*))')
        .eq('portfolio_id', portfolioId)
        .order('position');
      if (error) throw error;
      return (data || []).map((pp: any) => ({
        ...pp.project,
        portfolio_project_id: pp.id,
        portfolio_status: pp.status,
        portfolio_progress: pp.progress,
      })) as (Project & { portfolio_project_id: string; portfolio_status: string; portfolio_progress: number })[];
    },
    enabled: !!portfolioId,
  });
}

export function useCreatePortfolio(workspaceId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (portfolio: Partial<Portfolio>) => {
      const { data, error } = await supabase
        .from('portfolios')
        .insert(portfolio)
        .select()
        .single();
      if (error) throw error;
      return data as Portfolio;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios', workspaceId] });
      toast.success('Portfolio created');
    },
    onError: () => toast.error('Failed to create portfolio'),
  });
}

export function useAddProjectToPortfolio(portfolioId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, position }: { projectId: string; position?: number }) => {
      const { data, error } = await supabase
        .from('portfolio_projects')
        .insert({ portfolio_id: portfolioId, project_id: projectId, position: position || 0 })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-projects', portfolioId] });
      toast.success('Project added');
    },
    onError: () => toast.error('Failed to add project'),
  });
}

export function useRemoveProjectFromPortfolio(portfolioId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (portfolioProjectId: string) => {
      const { error } = await supabase
        .from('portfolio_projects')
        .delete()
        .eq('id', portfolioProjectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-projects', portfolioId] });
      toast.success('Project removed');
    },
    onError: () => toast.error('Failed to remove project'),
  });
}

export function useUpdatePortfolioProject(portfolioId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; progress?: number }) => {
      const { error } = await supabase
        .from('portfolio_projects')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-projects', portfolioId] });
    },
  });
}
