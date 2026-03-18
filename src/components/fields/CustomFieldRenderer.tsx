import { useState } from 'react';
import { useCustomFieldValues, useSetCustomFieldValue } from '@/hooks/useCustomFields';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { CustomField } from '@/types';

interface CustomFieldRendererProps {
  taskId: string;
  field: CustomField;
  compact?: boolean;
}

export function CustomFieldRenderer({ taskId, field, compact }: CustomFieldRendererProps) {
  const { data: values = [] } = useCustomFieldValues(taskId);
  const setValue = useSetCustomFieldValue(taskId);
  const currentValue = values.find(v => v.field_id === field.id)?.value || '';

  const handleChange = (val: string) => {
    setValue.mutate({ fieldId: field.id, value: val || null });
  };

  if (field.field_type === 'text') {
    return (
      <input
        value={currentValue}
        onChange={e => handleChange(e.target.value)}
        className={cn(
          'bg-transparent outline-none text-gray-900 dark:text-white',
          compact ? 'text-xs px-1 py-0.5 w-full' : 'text-sm px-2 py-1 border border-gray-200 dark:border-slate-600 rounded-lg w-full'
        )}
        placeholder={compact ? '—' : field.name}
      />
    );
  }

  if (field.field_type === 'number') {
    return (
      <input
        type="number"
        value={currentValue}
        onChange={e => handleChange(e.target.value)}
        className={cn(
          'bg-transparent outline-none text-gray-900 dark:text-white',
          compact ? 'text-xs px-1 py-0.5 w-16' : 'text-sm px-2 py-1 border border-gray-200 dark:border-slate-600 rounded-lg w-full'
        )}
        placeholder={compact ? '—' : '0'}
      />
    );
  }

  if (field.field_type === 'date') {
    return (
      <input
        type="date"
        value={currentValue}
        onChange={e => handleChange(e.target.value)}
        className={cn(
          'bg-transparent outline-none text-gray-900 dark:text-white',
          compact ? 'text-xs px-1 py-0.5' : 'text-sm px-2 py-1 border border-gray-200 dark:border-slate-600 rounded-lg w-full'
        )}
      />
    );
  }

  if (field.field_type === 'checkbox') {
    const checked = currentValue === 'true';
    return (
      <button
        onClick={() => handleChange(checked ? 'false' : 'true')}
        className={cn(
          'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
          checked ? 'bg-coral border-coral' : 'border-gray-300 dark:border-slate-600'
        )}
      >
        {checked && <Check className="w-2.5 h-2.5 text-white" />}
      </button>
    );
  }

  if (field.field_type === 'select') {
    return (
      <select
        value={currentValue}
        onChange={e => handleChange(e.target.value)}
        className={cn(
          'bg-transparent outline-none cursor-pointer text-gray-900 dark:text-white',
          compact ? 'text-xs px-1 py-0.5' : 'text-sm px-2 py-1 border border-gray-200 dark:border-slate-600 rounded-lg w-full'
        )}
      >
        <option value="">—</option>
        {field.options?.map(opt => (
          <option key={opt.label} value={opt.label}>{opt.label}</option>
        ))}
      </select>
    );
  }

  if (field.field_type === 'multi_select') {
    const selectedValues = currentValue ? currentValue.split(',') : [];
    const toggleOption = (label: string) => {
      const next = selectedValues.includes(label)
        ? selectedValues.filter(v => v !== label)
        : [...selectedValues, label];
      handleChange(next.join(','));
    };

    if (compact) {
      return (
        <div className="flex flex-wrap gap-0.5">
          {field.options?.map(opt => {
            const selected = selectedValues.includes(opt.label);
            return (
              <button
                key={opt.label}
                onClick={() => toggleOption(opt.label)}
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full',
                  selected ? 'text-white' : 'text-gray-400 bg-gray-100 dark:bg-slate-700'
                )}
                style={selected ? { backgroundColor: opt.color } : undefined}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {field.options?.map(opt => {
          const selected = selectedValues.includes(opt.label);
          return (
            <button
              key={opt.label}
              onClick={() => toggleOption(opt.label)}
              className={cn(
                'text-xs px-2 py-1 rounded-full border transition-colors',
                selected ? 'text-white border-transparent' : 'text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600'
              )}
              style={selected ? { backgroundColor: opt.color } : undefined}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  return null;
}
