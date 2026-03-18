import { supabase } from './supabase'

export type InviteRole = 'admin' | 'member' | 'guest'

export interface GeneratedInvite {
  id: string
  token: string
  link: string
  role: InviteRole
  expiresAt: string
}

export async function generateInviteLink(
  workspaceId: string,
  userId: string,
  role: InviteRole,
  email: string | null = null
): Promise<GeneratedInvite> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('workspace_invites')
    .insert({
      workspace_id: workspaceId,
      invited_by: userId,
      role,
      email: email ?? null,
      expires_at: expiresAt,
    })
    .select('id, token, role, expires_at')
    .single()

  if (error) throw new Error(error.message)

  const appUrl = import.meta.env.VITE_APP_URL ?? window.location.origin
  const link = `${appUrl}/invite/${data.token}`

  return {
    id: data.id,
    token: data.token,
    link,
    role: data.role as InviteRole,
    expiresAt: data.expires_at,
  }
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('workspace_invites')
    .delete()
    .eq('id', inviteId)

  if (error) throw new Error(error.message)
}
