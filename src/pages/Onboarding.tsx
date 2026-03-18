import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { toast } from 'sonner';
import { slugify } from '@/lib/utils';
import { Building2, Users, FolderKanban, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

const PROJECT_COLORS = ['#F97316', '#8B5CF6', '#EC4899', '#14B8A6', '#3B82F6', '#EF4444', '#10B981', '#F59E0B'];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectColor, setProjectColor] = useState('#F97316');
  const [loading, setLoading] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();

  async function handleCreateWorkspace() {
    if (!user) return;
    setLoading(true);
    try {
      // Create workspace
      const slug = slugify(workspaceName);
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .insert({ name: workspaceName, slug, owner_id: user.id })
        .select()
        .single();
      if (wsError) throw wsError;

      // Add owner as workspace member
      await supabase.from('workspace_members').insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
      });

      // Invite members (just record them for now)
      if (inviteEmails.trim()) {
        const emails = inviteEmails.split(',').map((e) => e.trim()).filter(Boolean);
        for (const email of emails) {
          await supabase.auth.admin?.inviteUserByEmail?.(email).catch(() => {});
        }
      }

      // Create first project with default sections
      if (projectName.trim()) {
        const { data: project } = await supabase
          .from('projects')
          .insert({
            workspace_id: workspace.id,
            name: projectName,
            color: projectColor,
            owner_id: user.id,
          })
          .select()
          .single();

        if (project) {
          const sections = ['To Do', 'In Progress', 'Done'];
          for (let i = 0; i < sections.length; i++) {
            await supabase.from('sections').insert({
              project_id: project.id,
              name: sections[i],
              position: i,
            });
          }
          setCreatedProjectId(project.id);
        }
      }

      setCurrentWorkspace(workspace);
      toast.success('Workspace created!');
      setStep(4);
    } catch (err: any) {
      toast.error(err.message || 'Failed to set up workspace');
    } finally {
      setLoading(false);
    }
  }

  async function handleFinish() {
    setLoading(true);
    try {
      if (taskTitle.trim() && createdProjectId) {
        // Get the first section (To Do) of the project
        const { data: sections } = await supabase
          .from('sections')
          .select('id')
          .eq('project_id', createdProjectId)
          .order('position')
          .limit(1);

        const sectionId = sections?.[0]?.id;
        await supabase.from('tasks').insert({
          title: taskTitle.trim(),
          project_id: createdProjectId,
          section_id: sectionId || null,
          workspace_id: currentWorkspace?.id,
          created_by: user?.id,
          position: 0,
        });
      }
      navigate(createdProjectId ? `/projects/${createdProjectId}` : '/');
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-coral rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">TaskFlow</h1>
          </div>
          <p className="text-slate-400">Let's set up your workspace</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className={`h-2 rounded-full transition-all ${s === step ? 'w-8 bg-coral' : s < step ? 'w-8 bg-coral/50' : 'w-8 bg-slate-700'}`} />
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple/10 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create your workspace</h2>
                  <p className="text-sm text-gray-500">This is where your team will collaborate</p>
                </div>
              </div>
              <input
                type="text"
                placeholder="e.g., Acme Corp"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-coral"
                autoFocus
              />
              <button
                onClick={() => setStep(2)}
                disabled={!workspaceName.trim()}
                className="w-full py-2.5 bg-coral hover:bg-coral-dark text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple/10 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Invite your team</h2>
                  <p className="text-sm text-gray-500">Add team members by email (comma separated)</p>
                </div>
              </div>
              <textarea
                placeholder="alice@example.com, bob@example.com"
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-coral resize-none"
              />
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-2.5 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep(3)} className="flex-1 py-2.5 bg-coral hover:bg-coral-dark text-white rounded-xl font-medium flex items-center justify-center gap-2">
                  {inviteEmails.trim() ? 'Continue' : 'Skip'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple/10 rounded-xl flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-purple" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create your first project</h2>
                  <p className="text-sm text-gray-500">You can always create more later</p>
                </div>
              </div>
              <input
                type="text"
                placeholder="e.g., Product Launch"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-coral"
                autoFocus
              />
              <div className="flex gap-2">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setProjectColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${projectColor === c ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-2.5 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleCreateWorkspace}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-coral hover:bg-coral-dark text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Setting up...' : 'Continue'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple/10 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add your first task</h2>
                  <p className="text-sm text-gray-500">What needs to get done?</p>
                </div>
              </div>
              <input
                type="text"
                placeholder="e.g., Review project requirements"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-coral"
                autoFocus
              />
              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="flex-1 py-2.5 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-coral hover:bg-coral-dark text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Setting up...' : 'Get Started!'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
