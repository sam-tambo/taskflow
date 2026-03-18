import { useState } from 'react';
import { useCustomFields, useCreateCustomField, useDeleteCustomField } from '@/hooks/useCustomFields';
import { Plus, Trash2, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CustomField } from '@/types';

const FIELD_TYPES: { value: CustomField['field_type']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Single Select' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'checkbox', label: 'Checkbox' },
];

const OPTION_COLORS = ['#F97316', '#EF4444', '#EC4899', '#8B5CF6', '#3B82F6', '#14B8A6', '#10B981', '#F59E0B'];

interface CustomFieldBuilderProps {
  projectId: string;
}

export function CustomFieldBuilder({ projectId }: CustomFieldBuilderProps) {
  const { data: fields = [] } = useCustomFields(projectId);
  const createField = useCreateCustomField(projectId);
  const deleteField = useDeleteCustomField(projectId);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<CustomField['field_type']>('text');
  const [options, setOptions] = useState<{ label: string; color: string }[]>([]);
  const [newOptionLabel, setNewOptionLabel] = useState('');

  const needsOptions = newType === 'select' || newType === 'multi_select';

  const handleCreate = () => {
    if (!newName.trim()) return;
    createField.mutate(
      {
        project_id: projectId,
        name: newName.trim(),
        field_type: newType,
        options: needsOptions ? options : null,
        position: fields.length,
      },
      {
        onSuccess: () => {
          setShowAdd(false);
          setNewName('');
          setNewType('text');
          setOptions([]);
        },
      }
    );
  };

  const addOption = () => {
    if (!newOptionLabel.trim()) return;
    setOptions(prev => [...prev, { label: newOptionLabel.trim(), color: OPTION_COLORS[prev.length % OPTION_COLORS.length] }]);
    setNewOptionLabel('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Custom Fields</h3>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-xs text-coral hover:underline">
          <Plus className="w-3.5 h-3.5" /> Add Field
        </button>
      </div>

      {fields.length === 0 && !showAdd && (
        <p className="text-xs text-gray-400">No custom fields yet.</p>
      )}

      {fields.map(field => (
        <div key={field.id} className="flex items-center justify-between bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
          <div>
            <span className="text-sm text-gray-900 dark:text-white">{field.name}</span>
            <span className="text-xs text-gray-400 ml-2 capitalize">{field.field_type.replace('_', ' ')}</span>
          </div>
          <button
            onClick={() => deleteField.mutate(field.id)}
            className="p-1 text-gray-400 hover:text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {showAdd && (
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Field name"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg outline-none text-gray-900 dark:text-white"
            autoFocus
          />
          <select
            value={newType}
            onChange={e => setNewType(e.target.value as CustomField['field_type'])}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg outline-none text-gray-900 dark:text-white cursor-pointer"
          >
            {FIELD_TYPES.map(ft => (
              <option key={ft.value} value={ft.value}>{ft.label}</option>
            ))}
          </select>

          {needsOptions && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500">Options</p>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: opt.color }} />
                  <span className="text-sm text-gray-700 dark:text-slate-300 flex-1">{opt.label}</span>
                  <button onClick={() => setOptions(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  value={newOptionLabel}
                  onChange={e => setNewOptionLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addOption()}
                  placeholder="Option name"
                  className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded outline-none text-gray-900 dark:text-white"
                />
                <button onClick={addOption} className="px-2 py-1 text-xs text-coral hover:bg-coral/10 rounded">
                  Add
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => { setShowAdd(false); setNewName(''); setOptions([]); }} className="flex-1 px-3 py-1.5 text-xs text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-600 rounded-lg">
              Cancel
            </button>
            <button onClick={handleCreate} disabled={!newName.trim()} className="flex-1 px-3 py-1.5 text-xs text-white bg-coral rounded-lg disabled:opacity-50">
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
