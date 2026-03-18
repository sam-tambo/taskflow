import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Task, Project } from '@/types';

export function exportProjectAsPdf(project: Project, tasks: Task[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text(project.name, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Exported ${format(new Date(), 'MMMM d, yyyy')}`, 14, 28);
  doc.text(`${tasks.length} tasks`, 14, 34);

  const done = tasks.filter(t => t.status === 'done').length;
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;
  doc.text(`Completed: ${done} | Overdue: ${overdue} | Open: ${tasks.length - done}`, 14, 40);

  const headers = [['Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Section']];
  const body = tasks.map(task => [
    task.title,
    task.status.replace('_', ' '),
    task.priority ?? '—',
    task.assignee?.full_name ?? 'Unassigned',
    task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '—',
    task.section?.name ?? '—'
  ]);

  autoTable(doc, {
    head: headers,
    body,
    startY: 48,
    headStyles: {
      fillColor: [249, 115, 22],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: { fontSize: 8, textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 25 },
      2: { cellWidth: 22 },
      3: { cellWidth: 35 },
      4: { cellWidth: 28 },
      5: { cellWidth: 30 }
    },
    margin: { left: 14, right: 14 }
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`TaskFlow — ${project.name} — Page ${i} of ${pageCount}`, 14, (doc as any).internal.pageSize.height - 8);
  }

  doc.save(`${project.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
