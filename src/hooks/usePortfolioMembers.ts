import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PortfolioMember, PortfolioRole } from '@/types';
import { toast } from 'sonner';

export function usePortfolioMembers(portfolioId: string | undefined) {
  return useQuery({
    queryKey: ['portfolio-members', portfolioId],
    queryFn: async () => {
      if (!portfolioId) return [];
      const { data, error } = await supabase
        .from('portfolio_members')
        .select('*, profiles:profiles!user_id(*)')
        .eq('portfolio_id', portfolioId)
        .order('created_at');
      if (error) throw error;
      return data as PortfolioMember[];
    },
    enabled: !!portfolioId,
  });
}

export function useAddPortfolioMember(portfolioId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (member: {
      portfolio_id: string;
      user_id: string;
      role: PortfolioRole;
      invited_by: string;
      invited_email?: string;
    }) => {
      const { data, error } = await supabase
        .from('portfolio_members')
        .insert(member)
        .select('*, profiles:profiles!user_id(*)')
        .single();
      if (error) throw error;
      return data as PortfolioMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-members', portfolioId] });
      toast.success('Member added to portfolio');
    },
    onError: (err: Error) => {
      if (err.message?.includes('duplicate')) {
        toast.error('Already a member of this portfolio');
      } else {
        toast.error('Failed to add member');
      }
    },
  });
}

export function useUpdatePortfolioMember(portfolioId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PortfolioMember> & { id: string }) => {
      const { data, error } = await supabase
        .from('portfolio_members')
        .update(updates)
        .eq('id', id)
        .select('*, profiles:profiles!user_id(*)')
        .single();
      if (error) throw error;
      return data as PortfolioMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-members', portfolioId] });
    },
    onError: () => {
      toast.error('Failed to update member role');
    },
  });
}

export function useRemovePortfolioMember(portfolioId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('portfolio_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-members', portfolioId] });
      toast.success('Member removed');
    },
    onError: () => {
      toast.error('Failed to remove member');
    },
  });
}
