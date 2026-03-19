import { useState } from 'react';
import { X, Briefcase, Code, Megaphone, Palette, Lightbulb, GraduationCap } from 'lucide-react';
import { useCreateProject } from '@/hooks/useProjects';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#4B7C6F', '#EF4444', '#EC4899', '#8B5CF6',
  '#3B82F6', '#14B8A6', '#10B981', '#F59E0B',
];

const PRESET_ICONS = ['folder', 'rocket', 'star', 'zap', 'target', 'briefcase', 'code', 'globe'];

interface TemplateTasks {
  [sectionName: string]: string[];
}

interface ProjectTemplate {
  name: string;
  icon: typeof Briefcase;
  description: string;
  color: string;
  sections: string[];
  defaultView: 'list' | 'board' | 'timeline' | 'calendar';
  tasks?: TemplateTasks;
}

const TEMPLATES: ProjectTemplate[] = [
  { name: 'Blank Project', icon: Lightbulb, description: 'Start from scratch', color: '#4B7C6F', sections: ['To Do', 'In Progress', 'Done'], defaultView: 'list' },
  {
    name: 'Marketing Campaign', icon: Megaphone, description: 'Plan and execute campaigns', color: '#EC4899',
    sections: ['Planning', 'In Progress', 'Review', 'Published'], defaultView: 'board',
    tasks: {
      'Planning': ['Define campaign goals', 'Identify target audience', 'Create content calendar', 'Set budget'],
      'In Progress': ['Design social media assets', 'Write blog post', 'Create email templates'],
      'Review': ['Review campaign copy', 'Approve final designs'],
    },
  },
  {
    name: 'Product Launch', icon: Briefcase, description: 'Coordinate product releases', color: '#8B5CF6',
    sections: ['Research', 'Development', 'Testing', 'Launch'], defaultView: 'timeline',
    tasks: {
      'Research': ['Market analysis', 'Competitor research', 'Define product requirements', 'User interviews'],
      'Development': ['Build MVP', 'Create landing page', 'Set up analytics'],
      'Testing': ['QA testing', 'Beta user testing', 'Fix critical bugs'],
      'Launch': ['Prepare press release', 'Social media announcement', 'Email existing users'],
    },
  },
  {
    name: 'Software Development', icon: Code, description: 'Agile sprints and features', color: '#3B82F6',
    sections: ['Backlog', 'Sprint', 'In Review', 'Done'], defaultView: 'board',
    tasks: {
      'Backlog': ['Set up project repository', 'Define coding standards', 'Create CI/CD pipeline', 'Write technical spec'],
      'Sprint': ['Implement authentication', 'Build API endpoints', 'Create database schema'],
      'In Review': ['Code review: auth module', 'Update documentation'],
    },
  },
  {
    name: 'Design Project', icon: Palette, description: 'Creative design workflow', color: '#F59E0B',
    sections: ['Brief', 'Concepts', 'Revisions', 'Final'], defaultView: 'board',
    tasks: {
      'Brief': ['Gather requirements', 'Create mood board', 'Define design system', 'Stakeholder alignment'],
      'Concepts': ['Wireframes', 'Low-fidelity mockups', 'Typography selection'],
      'Revisions': ['Incorporate feedback', 'High-fidelity designs'],
    },
  },
  {
    name: 'Onboarding', icon: GraduationCap, description: 'New hire onboarding tasks', color: '#10B981',
    sections: ['Before Start', 'Week 1', 'Week 2', 'Ongoing'], defaultView: 'list',
    tasks: {
      'Before Start': ['Send welcome email', 'Set up accounts', 'Prepare workstation', 'Schedule intro meetings'],
      'Week 1': ['Company overview presentation', 'Meet the team', 'Set up dev environment', 'First task assignment'],
      'Week 2': ['Shadow team members', '1:1 with manager', 'Complete training modules'],
      'Ongoing': ['Weekly check-ins', 'Quarterly goals review'],
    },
  },
];

export function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState('folder');
  const [privacy, setPrivacy] = useState<'workspace' | 'private'>('workspace');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [step, setStep] = useState<'template' | 'details'>('template');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const { user } = useAuth();
  const createProject = useCreateProject(currentWorkspace?.id);
  const navigate = useNavigate();

  if (!open) return null;

  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    if (template.name !== 'Blank Project') {
      setName(template.name);
      setDescription(template.description);
    }
    setColor(template.color);
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    if (!user?.id) {
      setError('You must be logged in to create a project.');
      return;
    }

    // Get workspace ID from store, or fetch directly as fallback
    let workspaceId = currentWorkspace?.id;
    if (!workspaceId) {
      const { data: membership, error: memErr } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspace:workspaces(*)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (memErr) {
        console.error('[CreateProject] Fallback workspace query error:', memErr.message);
      }

      if (membership?.workspace_id) {
        workspaceId = membership.workspace_id;
        // Also fix the store for future use
        const ws = membership.workspace;
        if (ws) {
          setCurrentWorkspace(Array.isArray(ws) ? ws[0] : ws);
        }
      }
    }

    if (!workspaceId) {
      setError('No workspace found. Please create a workspace first or refresh the page.');
      return;
    }

    setLoading(true);
    createProject.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        color,
        icon,
        privacy,
        workspace_id: workspaceId,
        owner_id: user.id,
        status: 'active',
        default_view: selectedTemplate?.defaultView || 'list',
      },
      {
        onSuccess: async (data) => {
          // Create template-specific sections and tasks if not blank
          if (selectedTemplate && selectedTemplate.name !== 'Blank Project') {
            const sectionIds: Record<string, string> = {};
            for (let i = 0; i < selectedTemplate.sections.length; i++) {
              const { data: sec } = await supabase.from('sections').insert({
                project_id: data.id,
                name: selectedTemplate.sections[i],
                position: i,
              }).select('id').single();
              if (sec) sectionIds[selectedTemplate.sections[i]] = sec.id;
            }
            // Create template tasks
            if (selectedTemplate.tasks) {
              for (const [sectionName, taskTitles] of Object.entries(selectedTemplate.tasks)) {
                const sectionId = sectionIds[sectionName];
                if (!sectionId) continue;
                for (let j = 0; j < taskTitles.length; j++) {
                  await supabase.from('tasks').insert({
                    workspace_id: workspaceId,
                    project_id: data.id,
                    section_id: sectionId,
                    title: taskTitles[j],
                    status: 'todo',
                    priority: 'none',
                    position: j,
                    created_by: user.id,
                    tags: [],
                  });
                }
              }
            }
          }
          setName('');
          setDescription('');
          setColor(PRESET_COLORS[0]);
          setIcon('folder');
          setPrivacy('workspace');
          setSelectedTemplate(null);
          setStep('template');
          setError(null);
          setLoading(false);
          onClose();
          navigate(`/projects/${data.id}`);
        },
        onError: (err: Error) => {
          setError(err.message || 'Failed to create project. Please try again.');
          setLoading(false);
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Create Project" className="relative w-full max-w-md mx-4 sm:mx-0 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {step === 'template' ? 'Choose a template' : 'Create Project'}
          </h2>
          <button onClick={() => { if (step === 'details') { setStep('template'); } else { onClose(); } }} aria-label="Close" className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template picker */}
        {step === 'template' && (
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((template) => {
              const TIcon = template.icon;
              return (
                <button
                  key={template.name}
                  onClick={() => handleSelectTemplate(template)}
                  className="flex flex-col items-start p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-[#4B7C6F] hover:bg-[#4B7C6F]/5 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: template.color + '20' }}>
                    <TIcon className="w-4 h-4" style={{ color: template.color }} />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{template.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{template.description}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* Detail form */}
        {step === 'details' && (
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
              disabled={!name.trim() || loading || createProject.isPending}
              className="flex-1 px-4 py-2 text-sm text-white bg-[#16A34A] rounded-lg hover:bg-[#3d6b5e] disabled:opacity-50"
            >
              {loading || createProject.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
