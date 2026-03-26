import { useMemo, useState, useRef, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskForm } from '@/components/tasks/TaskForm';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { useSections, useCreateSection } from '@/hooks/useProjects';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type TaskFilters, applyFilters, DEFAULT_FILTERS } from '@/components/projects/FilterBar';
import type { Task, Section } from '@/types';

interface BoardViewProps {
  projectId: string;
  workspaceId: string;
  filters?: TaskFilters;
}

function SortableCard({ task, projectId }: { task: Task; projectId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} projectId={projectId} isDragging={isDragging} />
    </div>
  );
}

function Column({ section, tasks, projectId, workspaceId, defaultStatus }: { section: Section; tasks: Task[]; projectId: string; workspaceId: string; defaultStatus?: Task['status'] }) {
  const [addTaskTrigger, setAddTaskTrigger] = useState(0);
  const [showDone, setShowDone] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const activeTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks = tasks.filter(t => t.status === 'done');
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: section.id });

  const handlePlusClick = () => {
    setAddTaskTrigger(n => n + 1);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const sectionIdForForm = section.id === 'no-section' ? undefined : section.id;

  return (
    <div className={cn('flex-shrink-0 w-72 flex flex-col bg-gray-50 dark:bg-slate-800/30 rounded-xl max-h-full transition-all', isOver && 'ring-2 ring-[#4B7C6F]/40 bg-[#4B7C6F]/5')}>
      {section.color && <div className="h-1 rounded-t-xl" style={{ backgroundColor: section.color }} />}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-white">{section.name}</span>
          <span className="text-xs bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">{activeTasks.length}</span>
        </div>
        {section.id !== 'no-section' && (
          <button onClick={handlePlusClick} className="p-1 text-gray-400 hover:text-[#4B7C6F] rounded">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
      <div ref={setDroppableRef} className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[60px]">
        <SortableContext items={activeTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {activeTasks.map((task) => (
            <SortableCard key={task.id} task={task} projectId={projectId} />
          ))}
        </SortableContext>
        {section.id !== 'no-section' && (
          <div ref={formRef}>
            <TaskForm projectId={projectId} sectionId={sectionIdForForm} workspaceId={workspaceId} position={tasks.length} autoOpen={addTaskTrigger} defaultStatus={defaultStatus} />
          </div>
        )}
        {doneTasks.length > 0 && (
          <div className="px-2 pb-2">
            <button onClick={() => setShowDone(!showDone)} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1.5 text-center">
              {showDone ? 'Hide' : 'Show'} {doneTasks.length} completed
            </button>
            {showDone && doneTasks.map(t => (
              <div key={t.id} className="mb-2 opacity-60">
                <TaskCard task={t} projectId={projectId} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AddSectionButton({ projectId, nextPosition }: { projectId: string; nextPosition: number }) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const createSection = useCreateSection(projectId);

  useEffect(() => {
    if (isAdding) inputRef.current?.focus();
  }, [isAdding]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) { setIsAdding(false); return; }
    createSection.mutate(
      { project_id: projectId, name: trimmed, position: nextPosition },
      { onSuccess: () => { setName(''); setIsAdding(false); } }
    );
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="flex-shrink-0 flex items-center gap-2 h-10 px-4 text-sm text-gray-500 dark:text-slate-400 hover:text-[#4B7C6F] hover:bg-gray-100 dark:hover:bg-slate-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-700 w-52 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add section
      </button>
    );
  }

  return (
    <div className="flex-shrink-0 w-72 bg-gray-50 dark:bg-slate-800/30 rounded-xl p-3 flex flex-col gap-2">
      <input
        ref={inputRef}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
          if (e.key === 'Escape') { setIsAdding(false); setName(''); }
        }}
        onBlur={handleSubmit}
        placeholder="Section name..."
        className="w-full px-3 py-2 text-sm font-semibold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4B7C6F] focus:ring-1 focus:ring-[#4B7C6F] text-gray-800 dark:text-white"
      />
      <div className="flex gap-2">
        <button
          onMouseDown={e => { e.preventDefault(); handleSubmit(); }}
          disabled={createSection.isPending}
          className="flex-1 py-1.5 text-xs font-medium text-white bg-[#4B7C6F] hover:bg-[#3d6b5e] rounded-lg disabled:opacity-60 transition-colors"
        >
          {createSection.isPending ? 'Adding…' : 'Add section'}
        </button>
        <button
          onMouseDown={e => { e.preventDefault(); setIsAdding(false); setName(''); }}
          className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function BoardView({ projectId, workspaceId, filters = DEFAULT_FILTERS }: BoardViewProps) {
  const { data: rawTasks = [], isLoading } = useTasks(projectId);
  const tasks = useMemo(() => applyFilters(rawTasks, filters), [rawTasks, filters]);
  const { data: sections = [] } = useSections(projectId);
  const updateTask = useUpdateTask(projectId);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const tasksBySection = useMemo(() => {
    const map = new Map<string, Task[]>();
    sections.forEach(s => map.set(s.id, []));
    map.set('no-section', []);
    tasks.forEach(t => {
      const key = t.section_id && map.has(t.section_id) ? t.section_id : 'no-section';
      map.get(key)!.push(t);
    });
    return map;
  }, [tasks, sections]);

  const sectionStatusMap = useMemo(() => {
    const map: Record<string, Task['status']> = {};
    const nameToStatus: Record<string, Task['status']> = {
      'to do': 'todo',
      'todo': 'todo',
      'backlog': 'todo',
      'planning': 'todo',
      'in progress': 'in_progress',
      'in review': 'in_progress',
      'sprint': 'in_progress',
      'review': 'in_progress',
      'done': 'done',
      'complete': 'done',
      'completed': 'done',
      'published': 'done',
      'cancelled': 'cancelled',
      'canceled': 'cancelled',
    };
    sections.forEach(s => {
      const normalized = s.name.toLowerCase().trim();
      if (nameToStatus[normalized]) {
        map[s.id] = nameToStatus[normalized];
      }
    });
    return map;
  }, [sections]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    const overTask = tasks.find(t => t.id === over.id);
    const overSection = sections.find(s => s.id === over.id) || (over.id === 'no-section' ? { id: 'no-section' } : null);

    if (overTask) {
      const updates: Partial<Task> & { id: string } = { id: activeTask.id, section_id: overTask.section_id, position: overTask.position };
      if (overTask.section_id && overTask.section_id !== activeTask.section_id) {
        const newStatus = sectionStatusMap[overTask.section_id];
        if (newStatus && newStatus !== activeTask.status) {
          updates.status = newStatus;
          updates.completed_at = newStatus === 'done' ? new Date().toISOString() : null;
        }
      }
      updateTask.mutate(updates);
    } else if (overSection) {
      const targetSectionId = overSection.id === 'no-section' ? null : overSection.id;
      if (targetSectionId === activeTask.section_id) return;
      const updates: Partial<Task> & { id: string } = { id: activeTask.id, section_id: targetSectionId, position: 0 };
      if (targetSectionId) {
        const newStatus = sectionStatusMap[targetSectionId];
        if (newStatus && newStatus !== activeTask.status) {
          updates.status = newStatus;
          updates.completed_at = newStatus === 'done' ? new Date().toISOString() : null;
        }
      }
      updateTask.mutate(updates);
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 p-4 overflow-x-auto">
        {[1,2,3].map(i => (
          <div key={i} className="w-72 flex-shrink-0">
            <div className="skeleton h-10 mb-3 rounded-xl" />
            <div className="skeleton h-28 mb-2 rounded-xl" />
            <div className="skeleton h-28 mb-2 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  const noSectionTasks = tasksBySection.get('no-section') || [];
  const noSection: Section = { id: 'no-section', project_id: projectId, name: 'No Section', position: -1, color: null, created_at: '' };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 p-4 overflow-x-auto h-[calc(100vh-8rem)]">
        {sections.map((section) => (
          <Column
            key={section.id}
            section={section}
            tasks={tasksBySection.get(section.id) || []}
            projectId={projectId}
            workspaceId={workspaceId}
            defaultStatus={sectionStatusMap[section.id]}
          />
        ))}
        {noSectionTasks.length > 0 && (
          <Column
            key="no-section"
            section={noSection}
            tasks={noSectionTasks}
            projectId={projectId}
            workspaceId={workspaceId}
          />
        )}
        <AddSectionButton projectId={projectId} nextPosition={sections.length} />
      </div>
    </DndContext>
  );
}
