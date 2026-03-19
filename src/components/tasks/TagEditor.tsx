import { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const TAG_COLORS = [
  { name: 'purple', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  { name: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  { name: 'green', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  { name: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  { name: 'red', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  { name: 'pink', bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300' },
  { name: 'teal', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300' },
  { name: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
];

function getTagColor(tag: string) {
  const hash = tag.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return TAG_COLORS[hash % TAG_COLORS.length];
}

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagEditor({ tags, onChange }: TagEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding) inputRef.current?.focus();
  }, [isAdding]);

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setNewTag('');
    setIsAdding(false);
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
  };

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {tags.map((tag) => {
        const color = getTagColor(tag);
        return (
          <span key={tag} className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full', color.bg, color.text)}>
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:opacity-70">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        );
      })}
      {isAdding ? (
        <input
          ref={inputRef}
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          onBlur={addTag}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); addTag(); }
            if (e.key === 'Escape') { setNewTag(''); setIsAdding(false); }
            if (e.key === ',' || e.key === 'Tab') { e.preventDefault(); addTag(); setIsAdding(true); }
          }}
          placeholder="Tag name..."
          className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-full outline-none text-gray-700 dark:text-slate-300 w-24"
        />
      ) : (
        <button onClick={() => setIsAdding(true)} className="text-xs px-1.5 py-0.5 text-gray-400 hover:text-[#4B7C6F] rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-0.5">
          <Plus className="w-3 h-3" /> Add
        </button>
      )}
    </div>
  );
}
