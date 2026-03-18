import { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useUpdateForm } from '@/hooks/useForms';
import { useSections } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import {
  Plus,
  GripVertical,
  X,
  Settings,
  Eye,
  Type,
  AlignLeft,
  Mail,
  List,
  Calendar,
  CheckSquare,
} from 'lucide-react';
import type { FormField } from '@/types';

const FIELD_TYPES: { type: FormField['type']; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Short Text', icon: <Type className="w-4 h-4" /> },
  { type: 'textarea', label: 'Long Text', icon: <AlignLeft className="w-4 h-4" /> },
  { type: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
  { type: 'select', label: 'Dropdown', icon: <List className="w-4 h-4" /> },
  { type: 'date', label: 'Date', icon: <Calendar className="w-4 h-4" /> },
  { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare className="w-4 h-4" /> },
];

const MAPS_TO_OPTIONS: { value: FormField['maps_to']; label: string }[] = [
  { value: null, label: 'None' },
  { value: 'title', label: 'Task Title' },
  { value: 'description', label: 'Task Description' },
  { value: 'due_date', label: 'Due Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'tag', label: 'Tag' },
];

function generateId() {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function FormBuilder() {
  const { projectId, formId } = useParams<{ projectId: string; formId: string }>();
  const navigate = useNavigate();
  const { data: form, isLoading } = useForm(formId);
  const { data: sections } = useSections(projectId);
  const updateForm = useUpdateForm();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitButtonText, setSubmitButtonText] = useState('Submit');
  const [successMessage, setSuccessMessage] = useState('');
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Initialize state from loaded form
  if (form && !initialized) {
    setTitle(form.title);
    setDescription(form.description ?? '');
    setSubmitButtonText(form.submit_button_text);
    setSuccessMessage(form.success_message);
    setTargetSectionId(form.target_section_id);
    setFields(form.fields ?? []);
    setIsPublic(form.is_public);
    setInitialized(true);
  }

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;

  const addField = useCallback((type: FormField['type']) => {
    const newField: FormField = {
      id: generateId(),
      type,
      label: FIELD_TYPES.find((t) => t.type === type)?.label ?? 'Field',
      placeholder: '',
      required: false,
      options: type === 'select' ? ['Option 1', 'Option 2'] : [],
      maps_to: null,
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
  }, []);

  const removeField = useCallback(
    (id: string) => {
      setFields((prev) => prev.filter((f) => f.id !== id));
      if (selectedFieldId === id) setSelectedFieldId(null);
    },
    [selectedFieldId]
  );

  const updateField = useCallback((id: string, updates: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }, []);

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const reordered = [...fields];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);
    setFields(reordered);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleSave = () => {
    if (!formId) return;
    updateForm.mutate({
      id: formId,
      title,
      description: description || null,
      submit_button_text: submitButtonText,
      success_message: successMessage,
      target_section_id: targetSectionId,
      fields,
      is_public: isPublic,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!form && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-gray-500 dark:text-gray-400">Form not found</p>
        <button
          onClick={() => navigate(-1)}
          className="text-indigo-600 hover:text-indigo-700 text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4 flex items-center justify-between">
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Form title"
            className="text-xl font-semibold w-full border-none outline-none bg-transparent text-gray-900 dark:text-white"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Form description (optional)"
            className="text-sm text-gray-500 dark:text-gray-400 w-full border-none outline-none bg-transparent"
          />
        </div>
        <div className="flex items-center gap-3 ml-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded border-gray-300"
            />
            Public
          </label>
          {form?.slug && (
            <a
              href={`/forms/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
            >
              <Eye className="w-4 h-4" />
              Preview
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={updateForm.isPending}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {updateForm.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Settings row */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-3 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <label className="text-gray-600 dark:text-gray-400">Submit button:</label>
          <input
            type="text"
            value={submitButtonText}
            onChange={(e) => setSubmitButtonText(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-32"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-gray-600 dark:text-gray-400">Success message:</label>
          <input
            type="text"
            value={successMessage}
            onChange={(e) => setSuccessMessage(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-gray-600 dark:text-gray-400">Target section:</label>
          <select
            value={targetSectionId ?? ''}
            onChange={(e) => setTargetSectionId(e.target.value || null)}
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">None</option>
            {sections?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Field palette */}
        <div className="w-56 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Add Fields
          </h3>
          <div className="space-y-2">
            {FIELD_TYPES.map((ft) => (
              <button
                key={ft.type}
                onClick={() => addField(ft.type)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
              >
                {ft.icon}
                {ft.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Form canvas */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl mx-auto">
            {fields.length === 0 ? (
              <div className="text-center py-20 text-gray-400 dark:text-gray-500">
                <Plus className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Click a field type on the left to add it to your form</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => setSelectedFieldId(field.id)}
                    className={cn(
                      'group flex items-start gap-2 p-4 bg-white dark:bg-gray-800 border rounded-lg cursor-pointer transition-colors',
                      selectedFieldId === field.id
                        ? 'border-indigo-400 ring-2 ring-indigo-100 dark:ring-indigo-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <div className="mt-1 cursor-grab text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</span>
                        {field.required && (
                          <span className="text-red-500 text-xs">*</span>
                        )}
                        {field.maps_to && (
                          <span className="text-xs px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded">
                            {field.maps_to}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 capitalize">{field.type}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeField(field.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Field settings */}
        <div className="w-72 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 overflow-y-auto">
          {selectedField ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Field Settings</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Label</label>
                  <input
                    type="text"
                    value={selectedField.label}
                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Placeholder
                  </label>
                  <input
                    type="text"
                    value={selectedField.placeholder}
                    onChange={(e) =>
                      updateField(selectedField.id, { placeholder: e.target.value })
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="required-toggle"
                    checked={selectedField.required}
                    onChange={(e) =>
                      updateField(selectedField.id, { required: e.target.checked })
                    }
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="required-toggle" className="text-sm text-gray-700 dark:text-gray-300">
                    Required
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Maps to task field
                  </label>
                  <select
                    value={selectedField.maps_to ?? ''}
                    onChange={(e) =>
                      updateField(selectedField.id, {
                        maps_to: (e.target.value || null) as FormField['maps_to'],
                      })
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {MAPS_TO_OPTIONS.map((opt) => (
                      <option key={opt.value ?? 'none'} value={opt.value ?? ''}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedField.type === 'select' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Options (one per line)
                    </label>
                    <textarea
                      value={selectedField.options.join('\n')}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          options: e.target.value.split('\n'),
                        })
                      }
                      rows={4}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
              Select a field to edit its settings
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
