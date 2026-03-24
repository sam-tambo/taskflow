import { useState, useMemo } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskRow } from '@/components/tasks/TaskRow';
import { TaskForm } from '@/components/tasks/TaskForm';
import { BulkActionBar } from '@/components/tasks/BulkActionBar';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { useSections, useCreateSection, useUpdateSection } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Plus, Check, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { type TaskFilters, applyFilters, DEFAULT_FILTERS } from '@/components/projects/FilterBar';
import type { Task, Section } from '@/types';

interface ListViewProps {
  projectId: string;
  workspaceId: string;
  filters?: TaskFilters;
}

function SortableTaskRow({ task, projectId }: { task: Task; projectId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style}>
      <TaskRow task={task} projectId={projectId} listeners={listeners} attributes={attributes} isDragging={isDragging} selectable />
    </div>
  );
}

function SectionGroup({ section, tasks, projectId, workspaceId, defaultStatus }: { section: Section; tasks: Task[]; projectId: string; workspaceId: string; defaultStatus?: Task['status'] }) {
  const { setNodeRef: setDroppableRef } = useDroppable({ id: section.id });
  const [collapsed, setCollapsed] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [sectionName, setSectionName] = useState(section.name);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const updateSection = useUpdateSection(projectId);
  const queryClient = useQueryClient();
  const activeTasks = tasks.filter(t => t.status !== 'done');
  const completedTasks = tasks.filter(t => t.status === 'done');

  const handleRename = () => {
    if (sectionName.trim() && sectionName !== section.name) {
      updateSection.mutate({ id: section.id, name: sectionName.trim() });
    }
    setIsRenaming(false);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
    setShowMenu(false);
  };

  const confirmDelete = async () => {
    // The tasks FK on section_id has ON DELETE SET NULL, so deleting the section
    // automatically nulls out section_id on all tasks — no manual loop needed.
    const { error } = await supabase.from('sections').delete().eq('id', section.id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['sections', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="mb-4">
      <div className="group flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-800/50 rounded-t-lg border border-gray-100 dark:border-slate-800">
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-500 hover:text-gray-700 dark:hover:text-white">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {section.color && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: section.color }} />}
        {isRenaming ? (
          <input
            value={sectionName}
            onChange={e => setSectionName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setSectionName(section.name); setIsRenaming(false); }}}
            className="text-sm font-semibold bg-transparent outline-none text-gray-700 dark:text-white flex-1"
            autoFocus
          />
        ) : (
          <span className="text-sm font-semibold text-gray-700 dark:text-white" onDoubleClick={() => { if (section.id !== 'no-section') setIsRenaming(true); }}>{section.name}</span>
        )}
        <span className="text-xs text-gray-400 ml-1">{activeTasks.length}</span>
        {section.id !== 'no-section' && (
          <div className="relative ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-1 z-20">
                <button onClick={() => { setIsRenaming(true); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700">
                  <Pencil className="w-3.5 h-3.5" /> Rename
                </button>
                <button onClick={() => { handleDelete(); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 className="w-3.5 h-3.5" /> Delete section
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {!collapsed && (
        <div ref={setDroppableRef} className="border-x border-gray-100 dark:border-slate-800 min-h-[4px]">
          <SortableContext items={activeTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {activeTasks.map((task) => (
              <SortableTaskRow key={task.id} task={task} projectId={projectId} />
            ))}
          </SortableContext>

          <TaskForm projectId={projectId} sectionId={section.id} workspaceId={workspaceId} position={tasks.length} defaultStatus={defaultStatus} />

          {completedTasks.length > 0 && (
            <div className="border-t border-gray-100 dark:border-slate-800">
              <button onClick={() => setShowCompleted(!showCompleted)} className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 w-full">
                <Check className="w-3.5 h-3.5" />
                {completedTasks.length} completed task{completedTasks.length > 1 ? 's' : ''}
              </button>
              {showCompleted && completedTasks.map(task => (
                <TaskRow key={task.id} task={task} projectId={projectId} />
              ))}
            </div>
          )}
        </div>
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          message={`Delete section "${section.name}"? Tasks will be moved to "No Section".`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

export default function ListView({ projectId, workspaceId, filters = DEFAULT_FILTERS }: ListViewProps) {
  const { data: rawTasks = [], isLoading } = useTasks(projectId);
  const tasks = useMemo(() => applyFilters(rawTasks, filters), [rawTasks, filters]);
  const { data: sections = [] } = useSections(projectId);
  const updateTask = useUpdateTask(projectId);
  const createSection = useCreateSection(projectId);
  const [newSectionName, setNewSectionName] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const tasksBySection = useMemo(() => {
    const map = new Map<string, Task[]>();
    sections.forEach(s => map.set(s.id, []));
    map.set('no-section', []);
    tasks.forEach(t => {
      const key = t.section_id || 'no-section';
      const list = map.get(key);
      if (list) list.push(t);
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
      const updates: Partial<Task> & { id: string } = { id: activeTask.id, position: overTask.position, section_id: overTask.section_id };
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

  const handleAddSection = () => {
    if (!newSectionName.trim()) { setIsAddingSection(false); return; }
    createSection.mutate({ project_id: projectId, name: newSectionName.trim(), position: sections.length });
    setNewSectionName('');
    setIsAddingSection(false);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1,2,3].map(i => (
          <div key={i}>
            <div className="skeleton h-10 mb-2" />
            <div className="skeleton h-12 mb-1" />
            <div className="skeleton h-12 mb-1" />
            <div className="skeleton h-12" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="p-4">
        {sections.map((section) => (
          <SectionGroup
            key={section.id}
            section={section}
            tasks={tasksBySection.get(section.id) || []}
            projectId={projectId}
            workspaceId={workspaceId}
            defaultStatus={sectionStatusMap[section.id]}
          />
        ))}

        {(sections.length === 0 || (tasksBySection.get('no-section') || []).length > 0) && (
          <SectionGroup
            section={{ id: 'no-section', project_id: projectId, name: 'No Section', position: -1, color: null, created_at: '' }}
            tasks={tasksBySection.get('no-section') || []}
            projectId={projectId}
            workspaceId={workspaceId}
          />
        )}

        {isAddingSection ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddSection(); if (e.key === 'Escape') setIsAddingSection(false); }}
              onBlur={handleAddSection}
              placeholder="Section name"
              className="text-sm font-semibold bg-transparent outline-none text-gray-900 dark:text-white"
              autoFocus
            />
          </div>
        ) : (
          <button onClick={() => setIsAddingSection(true)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-[#4B7C6F]">
            <Plus className="w-4 h-4" /> Add section
          </button>
        )}
        <BulkActionBar projectId={projectId} />
      </div>
    </DndContext>
  );
}
