import { format } from 'date-fns';
import type { Task } from '@/types';

export function exportTasksAsCsv(tasks: Task[], projectName: string) {
  const headers = [
    'Title', 'Status', 'Priority', 'Assignee', 'Due Date',
    'Start Date', 'Section', 'Tags', 'Estimated Hours',
    'Created At', 'Completed At'
  ];

  const rows = tasks.map(task => [
    task.title,
    task.status,
    task.priority ?? '',
    task.assignee?.full_name ?? 'Unassigned',
    task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '',
    task.start_date ? format(new Date(task.start_date), 'yyyy-MM-dd') : '',
    task.section?.name ?? '',
    (task.tags ?? []).join('; '),
    task.estimated_hours?.toString() ?? '',
    format(new Date(task.created_at), 'yyyy-MM-dd HH:mm'),
    task.completed_at ? format(new Date(task.completed_at), 'yyyy-MM-dd HH:mm') : ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName.replace(/\s+/g, '_')}_tasks_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
