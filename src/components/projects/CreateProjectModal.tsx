import { useState } from 'react';
import { X } from 'lucide-react';
import { useCreateProject } from '@/hooks/useProjects';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#4B7C6F', '#EF4444', '#EC4899', '#8B5CF6',
  '#3B82F6', '#14B8A6', '#10B981', '#F59E0B',
];

const PRESET_ICONS = ['folder', 'rocket', 'star', 'zap', 'target', 'briefcase', 'code', 'globe'];

export function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState('folder');
  const [privacy, setPrivacy] = useState<'workspace' | 'private'>('workspace');
  const [error, setError] = useState<string | null>(null);
  const { currentWorkspace } = useWorkspaceStore();
  const { user } = useAuth();
  const createProject = useCreateProject(currentWorkspace?.id);
  const navigate = useNavigate();

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    if (!currentWorkspace?.id) {
      setError('No workspace selected. Please refresh the page.');
      toast.error('No workspace selected');
      return;
    }

    if (!user?.id) {
      setError('You must be logged in to create a project.');
      return;
    }

    createProject.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        color,
        icon,
        privacy,
        workspace_id: currentWorkspace.id,
        owner_id: user.id,
        status: 'active',
        default_view: 'list',
      },
      {
        onSuccess: (data) => {
          setName('');
          setDescription('');
          setColor(PRESET_COLORS[0]);
          setIcon('folder');
          setPrivacy('workspace');
          setError(null);
          onClose();
          navigate(`/projects/${data.id}`);
        },
        onError: (err: Error) => {
          setError(err.message || 'Failed to create project. Please try again.');
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Create Project" className="relative w-full max-w-md mx-4 sm:mx-0 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Project</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1">Project name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Marketing Campaign"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-[#4B7C6F]/30 text-gray-900 dark:text-white"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1">Color</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Select color ${c}`}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-transform"
                  style={{ backgroundColor: c, transform: color === c ? 'scale(1.2)' : 'scale(1)' }}
                >
                  {color === c && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`px-3 py-1.5 text-xs rounded-lg border ${icon === i ? 'border-[#4B7C6F] bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1">Privacy</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPrivacy('workspace')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border ${privacy === 'workspace' ? 'border-[#4B7C6F] bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400'}`}
              >
                Workspace
              </button>
              <button
                type="button"
                onClick={() => setPrivacy('private')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border ${privacy === 'private' ? 'border-[#4B7C6F] bg-[#4B7C6F]/10 text-[#4B7C6F]' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400'}`}
              >
                Private
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={2}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-[#4B7C6F]/30 resize-none text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || createProject.isPending}
              className="flex-1 px-4 py-2 text-sm text-white bg-[#16A34A] rounded-lg hover:bg-[#3d6b5e] disabled:opacity-50"
            >
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
