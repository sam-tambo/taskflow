import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-gray-400 dark:text-slate-500">
        {icon}
      </div>
      <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mb-4">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-[#16A34A] text-white text-sm font-medium rounded-lg hover:bg-[#3d6b5e]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
