import { Link } from 'react-router-dom';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { FolderKanban } from 'lucide-react';
import type { Project } from '@/types';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="block p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: project.color }}>
          <FolderKanban className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{project.name}</h3>
          {project.description && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">{project.description}</p>}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-400">{project.status}</span>
            {project.owner && (
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-medium" style={{ backgroundColor: getAvatarColor(project.owner.id) }}>
                {getInitials(project.owner.full_name)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
