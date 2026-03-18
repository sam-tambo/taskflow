import { useState, useEffect } from 'react'
import { Copy, Check, X, Link2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { generateInviteLink, type InviteRole } from '@/lib/invites'

interface InviteLinkModalProps {
  workspaceId: string
  userId: string
  workspaceName: string
  role: InviteRole
  onClose: () => void
  onGenerated?: (inviteId: string) => void
}

export function InviteLinkModal({
  workspaceId,
  userId,
  workspaceName,
  role,
  onClose,
  onGenerated,
}: InviteLinkModalProps) {
  const [link, setLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    generate()
  }, [])

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const invite = await generateInviteLink(workspaceId, userId, role, null)
      setLink(invite.link)
      onGenerated?.(invite.id)
    } catch (err: any) {
      setError(err.message ?? 'Failed to generate link')
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success('Invite link copied to clipboard')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      const input = document.createElement('input')
      input.value = link
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      toast.success('Invite link copied')
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const roleLabel = { admin: 'Admin', member: 'Member', guest: 'Guest' }[role] ?? role

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-950/30 rounded-lg flex items-center justify-center">
              <Link2 className="w-4 h-4 text-orange-500" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
              Invite link generated
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <span className="text-blue-500 text-lg leading-none mt-0.5">i</span>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Anyone with this link can join <strong>{workspaceName}</strong> as a{' '}
              <strong>{roleLabel}</strong>. The link expires in 7 days.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6 gap-3">
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
              <span className="text-sm text-gray-500 dark:text-slate-400">Generating link...</span>
            </div>
          ) : error ? (
            <div className="py-4 text-center space-y-3">
              <p className="text-sm text-red-500">{error}</p>
              <button onClick={generate} className="text-sm text-orange-500 hover:text-orange-600 underline">
                Try again
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                Invite link
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    readOnly
                    value={link ?? ''}
                    onFocus={e => e.target.select()}
                    className="w-full px-3 py-2.5 pr-8 text-xs font-mono rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 truncate"
                  />
                </div>
                <button
                  onClick={copy}
                  className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${copied ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                >
                  {copied ? (<><Check className="w-4 h-4" /> Copied!</>) : (<><Copy className="w-4 h-4" /> Copy</>)}
                </button>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={copy} className="text-xs text-gray-400 dark:text-slate-500 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
                  Copy to clipboard
                </button>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button onClick={onClose} className="w-full py-2.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
