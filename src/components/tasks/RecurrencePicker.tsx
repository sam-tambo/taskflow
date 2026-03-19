import { useState } from 'react';
import { Repeat, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecurrencePattern } from '@/types';

interface RecurrencePickerProps {
  value: RecurrencePattern | null;
  onChange: (pattern: RecurrencePattern | null) => void;
}

const FREQUENCIES = [
  { value: 'daily' as const, label: 'Daily' },
  { value: 'weekly' as const, label: 'Weekly' },
  { value: 'monthly' as const, label: 'Monthly' },
  { value: 'yearly' as const, label: 'Yearly' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pattern, setPattern] = useState<RecurrencePattern>(
    value || { frequency: 'weekly', interval: 1 }
  );

  const handleSave = () => {
    onChange(pattern);
    setIsOpen(false);
  };

  const handleRemove = () => {
    onChange(null);
    setIsOpen(false);
  };

  const toggleDay = (day: number) => {
    const current = pattern.days_of_week || [];
    const next = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort();
    setPattern({ ...pattern, days_of_week: next.length > 0 ? next : undefined });
  };

  const getRecurrenceLabel = (p: RecurrencePattern) => {
    const prefix = p.interval > 1 ? `Every ${p.interval}` : 'Every';
    const unit = p.interval > 1
      ? { daily: 'days', weekly: 'weeks', monthly: 'months', yearly: 'years' }[p.frequency]
      : { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }[p.frequency];

    let extra = '';
    if (p.frequency === 'weekly' && p.days_of_week?.length) {
      extra = ` on ${p.days_of_week.map(d => DAYS[d]).join(', ')}`;
    }
    return `${prefix} ${unit}${extra}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 px-1.5 py-1 -ml-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-sm',
          value ? 'text-[#4B7C6F]' : 'text-gray-400'
        )}
      >
        <Repeat className="w-3.5 h-3.5" />
        {value ? getRecurrenceLabel(value) : 'None'}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-3 space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Repeat Task</h4>

            {/* Frequency */}
            <div className="flex gap-1">
              {FREQUENCIES.map(f => (
                <button
                  key={f.value}
                  onClick={() => setPattern({ ...pattern, frequency: f.value })}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-md border',
                    pattern.frequency === f.value
                      ? 'border-[#4B7C6F] bg-[#4B7C6F]/10 text-[#4B7C6F]'
                      : 'border-gray-200 dark:border-slate-600 text-gray-500'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Interval */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Every</span>
              <input
                type="number"
                min={1}
                max={99}
                value={pattern.interval}
                onChange={(e) => setPattern({ ...pattern, interval: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-14 px-2 py-1 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-md outline-none text-gray-900 dark:text-white text-center"
              />
              <span className="text-xs text-gray-500">
                {pattern.interval > 1
                  ? { daily: 'days', weekly: 'weeks', monthly: 'months', yearly: 'years' }[pattern.frequency]
                  : { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }[pattern.frequency]}
              </span>
            </div>

            {/* Weekly day picker */}
            {pattern.frequency === 'weekly' && (
              <div className="flex gap-1">
                {DAYS.map((day, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    className={cn(
                      'w-8 h-8 text-[11px] rounded-full border font-medium',
                      pattern.days_of_week?.includes(i)
                        ? 'bg-[#4B7C6F] text-white border-[#4B7C6F]'
                        : 'border-gray-200 dark:border-slate-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700'
                    )}
                  >
                    {day.charAt(0)}
                  </button>
                ))}
              </div>
            )}

            {/* Monthly day */}
            {pattern.frequency === 'monthly' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">On day</span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={pattern.day_of_month || 1}
                  onChange={(e) => setPattern({ ...pattern, day_of_month: parseInt(e.target.value) || 1 })}
                  className="w-14 px-2 py-1 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-md outline-none text-gray-900 dark:text-white text-center"
                />
              </div>
            )}

            <div className="flex gap-2 justify-between pt-1">
              {value && (
                <button onClick={handleRemove} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                  <X className="w-3 h-3" /> Remove
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button onClick={() => setIsOpen(false)} className="text-xs text-gray-500 px-2 py-1">Cancel</button>
                <button onClick={handleSave} className="text-xs text-white bg-[#4B7C6F] px-3 py-1 rounded-md hover:bg-[#3d6b5e]">
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
