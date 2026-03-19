import { useState } from 'react';
import { useCustomFields, useCustomFieldValues, useCreateCustomField, useDeleteCustomField, useSetCustomFieldValue } from '@/hooks/useCustomFields';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Hash, Calendar, Type, CheckSquare, List, ChevronDown } from 'lucide-react';
import type { CustomField } from '@/types';

interface CustomFieldsSectionProps {
  taskId: string;
  projectId: string;
}

const FIELD_TYPES: { type: CustomField['field_type']; label: string; icon: typeof Type }[] = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'select', label: 'Dropdown', icon: List },
];

export function CustomFieldsSection({ taskId, projectId }: CustomFieldsSectionProps) {
  const { data: fields = [] } = useCustomFields(projectId);
  const { data: values = [] } = useCustomFieldValues(taskId);
  const setValue = useSetCustomFieldValue(taskId);
  const createField = useCreateCustomField(projectId);
  const deleteField = useDeleteCustomField(projectId);
  const [isAdding, setIsAdding] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomField['field_type']>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  const getFieldValue = (fieldId: string) => values.find(v => v.field_id === fieldId)?.value ?? null;

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    const options = newFieldType === 'select' || newFieldType === 'multi_select'
      ? newFieldOptions.split(',').map(o => ({ label: o.trim(), color: '#4B7C6F' })).filter(o => o.label)
      : null;
    createField.mutate({
      project_id: projectId,
      name: newFieldName.trim(),
      field_type: newFieldType,
      options,
      position: fields.length,
    });
    setNewFieldName('');
    setNewFieldOptions('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Custom Fields</span>
        <button onClick={() => setIsAdding(!isAdding)} className="text-xs text-[#4B7C6F] hover:underline flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add field
        </button>
      </div>

      {/* Add field form */}
      {isAdding && (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 space-y-2">
          <input
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            placeholder="Field name"
            className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-md outline-none text-gray-900 dark:text-white"
            autoFocus
          />
          <div className="flex gap-1 flex-wrap">
            {FIELD_TYPES.map(ft => {
              const Icon = ft.icon;
              return (
                <button
                  key={ft.type}
                  onClick={() => setNewFieldType(ft.type)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 text-xs rounded-md border',
                    newFieldType === ft.type
                      ? 'border-[#4B7C6F] bg-[#4B7C6F]/10 text-[#4B7C6F]'
                      : 'border-gray-200 dark:border-slate-600 text-gray-500'
                  )}
                >
                  <Icon className="w-3 h-3" /> {ft.label}
                </button>
              );
            })}
          </div>
          {(newFieldType === 'select' || newFieldType === 'multi_select') && (
            <input
              value={newFieldOptions}
              onChange={(e) => setNewFieldOptions(e.target.value)}
              placeholder="Options (comma separated)"
              className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-md outline-none text-gray-900 dark:text-white"
            />
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setIsAdding(false)} className="text-xs text-gray-500 px-2 py-1">Cancel</button>
            <button onClick={handleAddField} disabled={!newFieldName.trim()} className="text-xs text-white bg-[#4B7C6F] px-3 py-1 rounded-md hover:bg-[#3d6b5e] disabled:opacity-50">
              Create
            </button>
          </div>
        </div>
      )}

      {/* Field values */}
      {fields.length > 0 && (
        <div className="grid grid-cols-[120px_1fr] gap-y-2 gap-x-3 text-sm">
          {fields.map(field => (
            <FieldRow
              key={field.id}
              field={field}
              value={getFieldValue(field.id)}
              onChange={(val) => setValue.mutate({ fieldId: field.id, value: val })}
              onDelete={() => { if (confirm(`Delete field "${field.name}"?`)) deleteField.mutate(field.id); }}
            />
          ))}
        </div>
      )}

      {fields.length === 0 && !isAdding && (
        <p className="text-xs text-gray-400">No custom fields</p>
      )}
    </div>
  );
}

function FieldRow({ field, value, onChange, onDelete }: {
  field: CustomField;
  value: string | null;
  onChange: (val: string | null) => void;
  onDelete: () => void;
}) {
  const renderInput = () => {
    switch (field.field_type) {
      case 'text':
        return (
          <input
            value={value || ''}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="—"
            className="w-full text-sm bg-transparent outline-none text-gray-900 dark:text-white"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="—"
            className="w-full text-sm bg-transparent outline-none text-gray-900 dark:text-white"
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value || null)}
            className="text-sm bg-transparent outline-none text-gray-900 dark:text-white"
          />
        );
      case 'checkbox':
        return (
          <button
            onClick={() => onChange(value === 'true' ? 'false' : 'true')}
            className={cn(
              'w-4 h-4 rounded border-2 flex items-center justify-center',
              value === 'true' ? 'bg-[#4B7C6F] border-[#4B7C6F]' : 'border-gray-300 dark:border-slate-600'
            )}
          >
            {value === 'true' && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          </button>
        );
      case 'select':
      case 'multi_select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value || null)}
            className="text-sm bg-transparent outline-none cursor-pointer text-gray-900 dark:text-white"
          >
            <option value="">—</option>
            {field.options?.map(opt => (
              <option key={opt.label} value={opt.label}>{opt.label}</option>
            ))}
          </select>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <span className="text-gray-500 dark:text-slate-400 flex items-center gap-1.5 group">
        {field.name}
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500">
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      </span>
      <div>{renderInput()}</div>
    </>
  );
}
