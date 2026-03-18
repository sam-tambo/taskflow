import { useState } from 'react'
import { X, Link2, Mail } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { InviteLinkModal } from './InviteLinkModal'
import { generateInviteLink, type InviteRole } from '@/lib/invites'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface InvitePanelProps {
  open: boolean
  onClose: () => void
  workspaceId: string
  userId: string
  workspaceName: string
  inviterName: string
}

const ROLES: { value: InviteRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full access — manage members, projects, and settings' },
  { value: 'employee', label: 'Employee', description: 'Create and edit projects, tasks, and reports' },
  { value: 'client', label: 'Client', description: 'View assigned projects and leave comments' },
]

type Mode = 'link' | 'email'

export function InvitePanel({
  open, onClose, workspaceId, userId, workspaceName, inviterName
}: InvitePanelProps) {
  const [mode, setMode] = useState<Mode>('link')
  const [role, setRole] = useState<InviteRole>('employee')
  const [email, setEmail] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const queryClient = useQueryClient()

  if (!open) return null

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  const handleGenerateLink = () => {
    setShowLinkModal(true)
  }

  const handleSendEmail = async () => {
    setEmailError(null)
    const trimmed = email.trim()
    if (!trimmed) { setEmailError('Email address is required'); return }
    if (!validateEmail(trimmed)) { setEmailError('Enter a valid email address'); return }

    setSendingEmail(true)
    try {
      const invite = await generateInviteLink(workspaceId, userId, role, trimmed)

      const { error: fnError } = await supabase.functions.invoke('send-invite', {
        body: {
          email: trimmed,
          inviteLink: invite.link,
          workspaceName,
          inviterName,
        },
      })

      if (fnError) {
        console.warn('Email send failed:', fnError)
        setEmailError(`Invite created but email failed to send. Share this link manually: ${invite.link}`)
      } else {
        setEmailSuccess(true)
        setEmail('')
        queryClient.invalidateQueries({ queryKey: ['workspace-invites', workspaceId] })
        toast.success('Invitation email sent')
      }
    } catch (err: any) {
      setEmailError(err.message ?? 'Failed to send invite')
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Invite members</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Mode switcher */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
              {([
                { value: 'link' as Mode, label: 'Invite link', icon: Link2 },
                { value: 'email' as Mode, label: 'By email', icon: Mail },
              ]).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => { setMode(value); setEmailError(null); setEmailSuccess(false) }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${mode === value ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Role selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Role</label>
              {ROLES.map(r => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${role === r.value ? 'border-[#4B7C6F] bg-[#f0f7f5] dark:bg-[#4B7C6F]/10' : 'border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700'}`}
                >
                  <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} className="accent-orange-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{r.label}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{r.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Link mode */}
            {mode === 'link' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Generate a shareable link. Anyone with the link joins as{' '}
                  <strong className="text-gray-700 dark:text-slate-300">{ROLES.find(r => r.value === role)?.label}</strong>.
                  Expires in 7 days.
                </p>
                <button
                  onClick={handleGenerateLink}
                  className="w-full py-2.5 bg-[#16A34A] text-white rounded-xl text-sm font-medium hover:bg-[#15803d] transition-colors flex items-center justify-center gap-2"
                >
                  <Link2 className="w-4 h-4" />
                  Generate invite link
                </button>
              </div>
            )}

            {/* Email mode */}
            {mode === 'email' && (
              <div className="space-y-3">
                {emailSuccess ? (
                  <div className="text-center py-4 space-y-2">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Invitation sent!</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">An invite email has been sent.</p>
                    <button onClick={() => { setEmailSuccess(false); setEmail('') }} className="text-xs text-[#4B7C6F] hover:text-[#4B7C6F] underline">
                      Send another
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Email address</label>
                      <input
                        type="email"
                        autoFocus
                        value={email}
                        onChange={e => { setEmail(e.target.value); setEmailError(null) }}
                        onKeyDown={e => e.key === 'Enter' && handleSendEmail()}
                        placeholder="colleague@company.com"
                        className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4B7C6F] focus:border-transparent ${emailError ? 'border-red-400 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'}`}
                      />
                      {emailError && <p className="mt-1.5 text-xs text-red-500">{emailError}</p>}
                    </div>
                    <button
                      onClick={handleSendEmail}
                      disabled={!email.trim() || sendingEmail}
                      className="w-full py-2.5 bg-[#16A34A] text-white rounded-xl text-sm font-medium hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {sendingEmail ? (
                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                      ) : (
                        <><Mail className="w-4 h-4" /> Send invite email</>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showLinkModal && (
        <InviteLinkModal
          workspaceId={workspaceId}
          userId={userId}
          workspaceName={workspaceName}
          role={role}
          onClose={() => {
            setShowLinkModal(false)
            queryClient.invalidateQueries({ queryKey: ['workspace-invites', workspaceId] })
            onClose()
          }}
          onGenerated={() => {
            queryClient.invalidateQueries({ queryKey: ['workspace-invites', workspaceId] })
          }}
        />
      )}
    </>
  )
}
