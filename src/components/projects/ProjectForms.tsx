import { useNavigate } from 'react-router-dom';
import { useForms, useCreateForm, useDeleteForm } from '@/hooks/useForms';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Plus, FileText, Trash2, ExternalLink, Settings } from 'lucide-react';

interface ProjectFormsProps {
  projectId: string;
}

export default function ProjectForms({ projectId }: ProjectFormsProps) {
  const navigate = useNavigate();
  const { data: forms, isLoading } = useForms(projectId);
  const createForm = useCreateForm();
  const deleteForm = useDeleteForm();

  const handleCreate = async () => {
    const form = await createForm.mutateAsync({
      project_id: projectId,
      title: 'New Form',
    });
    navigate(`/projects/${projectId}/forms/${form.id}`);
  };

  const handleDelete = (e: React.MouseEvent, formId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this form?')) return;
    deleteForm.mutate({ id: formId, projectId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Forms</h2>
        <button
          onClick={handleCreate}
          disabled={createForm.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Form
        </button>
      </div>

      {!forms || forms.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No forms yet</p>
          <button
            onClick={handleCreate}
            disabled={createForm.isPending}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Create your first form
          </button>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden">
          {forms.map((form) => (
            <div
              key={form.id}
              onClick={() => navigate(`/projects/${projectId}/forms/${form.id}`)}
              className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
            >
              <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {form.title}
                  </span>
                  {form.is_public && (
                    <span className="text-xs px-1.5 py-0.5 bg-green-50 text-green-600 rounded font-medium">
                      Public
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-400">
                    Created {format(new Date(form.created_at), 'MMM d, yyyy')}
                  </span>
                  {form.slug && (
                    <span className="text-xs text-gray-400 truncate">
                      /forms/{form.slug}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {form.is_public && form.slug && (
                  <a
                    href={`/forms/${form.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                    title="Open public link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/projects/${projectId}/forms/${form.id}`);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
                  title="Edit form"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDelete(e, form.id)}
                  disabled={deleteForm.isPending}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                  title="Delete form"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
