import { useMemo, useState, useRef } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskForm } from '@/components/tasks/TaskForm';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { useSections } from '@/hooks/useProjects';
import { Plus } from 'lucide-react';
import type { Task, Section } from '@/types';

interface BoardViewProps {
  projectId: string;
  workspaceId: string;
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

function Column({ section, tasks, projectId, workspaceId }: { section: Section; tasks: Task[]; projectId: string; workspaceId: string }) {
  const [addTaskTrigger, setAddTaskTrigger] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);
  const activeTasks = tasks.filter(t => t.status !== 'done');

  const handlePlusClick = () => {
    setAddTaskTrigger(n => n + 1);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div className="flex-shrink-0 w-72 flex flex-col bg-gray-50 dark:bg-slate-800/30 rounded-xl max-h-full">
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-white">{section.name}</span>
          <span className="text-xs bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">{activeTasks.length}</span>
        </div>
        <button onClick={handlePlusClick} className="p-1 text-gray-400 hover:text-coral rounded">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
        <SortableContext items={activeTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {activeTasks.map((task) => (
            <SortableCard key={task.id} task={task} projectId={projectId} />
          ))}
        </SortableContext>
        <div ref={formRef}>
          <TaskForm projectId={projectId} sectionId={section.id} workspaceId={workspaceId} position={tasks.length} autoOpen={addTaskTrigger} />
        </div>
      </div>
    </div>
  );
}

export default function BoardView({ projectId, workspaceId }: BoardViewProps) {
  const { data: tasks = [], isLoading } = useTasks(projectId);
  const { data: sections = [] } = useSections(projectId);
  const updateTask = useUpdateTask(projectId);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const tasksBySection = useMemo(() => {
    const map = new Map<string, Task[]>();
    sections.forEach(s => map.set(s.id, []));
    tasks.forEach(t => {
      if (t.section_id && map.has(t.section_id)) {
        map.get(t.section_id)!.push(t);
      }
    });
    return map;
  }, [tasks, sections]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeTask = tasks.find(t => t.id === active.id);
    const overTask = tasks.find(t => t.id === over.id);
    if (activeTask && overTask) {
      updateTask.mutate({ id: activeTask.id, section_id: overTask.section_id, position: overTask.position });
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
          />
        ))}
      </div>
    </DndContext>
  );
}
