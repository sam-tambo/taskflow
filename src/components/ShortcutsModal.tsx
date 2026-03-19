import { useUIStore } from '@/stores/useUIStore';
import { X } from 'lucide-react';

const shortcuts = [
  { category: 'Navigation', items: [
    { keys: 'G then H', desc: 'Go to Home' },
    { keys: 'G then T', desc: 'Go to My Tasks' },
    { keys: 'G then I', desc: 'Go to Inbox' },
    { keys: 'G then F', desc: 'Go to Favorites' },
    { keys: 'G then P', desc: 'Go to Portfolios' },
    { keys: 'G then R', desc: 'Go to Reports' },
    { keys: 'G then G', desc: 'Go to Goals' },
    { keys: 'G then S', desc: 'Go to Settings' },
  ]},
  { category: 'Search & Commands', items: [
    { keys: '⌘ K', desc: 'Command palette' },
    { keys: '/', desc: 'Focus search' },
  ]},
  { category: 'Tasks', items: [
    { keys: 'Enter', desc: 'Open selected task' },
    { keys: 'Esc', desc: 'Close task panel' },
    { keys: '⌘ Enter', desc: 'Mark task complete' },
    { keys: 'Tab', desc: 'Indent / make subtask' },
  ]},
  { category: 'Views & UI', items: [
    { keys: '⌘ \\', desc: 'Toggle sidebar' },
    { keys: '⌘ Shift D', desc: 'Toggle dark mode' },
    { keys: '?', desc: 'Show shortcuts' },
    { keys: 'Esc', desc: 'Close modal / panel' },
  ]},
];

export function ShortcutsModal() {
  const { shortcutsModalOpen, setShortcutsModalOpen } = useUIStore();

  if (!shortcutsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={(e) => { if (e.key === 'Escape') setShortcutsModalOpen(false); }}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShortcutsModalOpen(false)} />
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto" role="dialog" aria-modal="true" aria-label="Keyboard Shortcuts">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h2>
          <button onClick={() => setShortcutsModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {shortcuts.map(({ category, items }) => (
            <div key={category}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#4B7C6F] mb-3">{category}</h3>
              <div className="space-y-2.5">
                {items.map(({ keys, desc }) => (
                  <div key={keys + desc} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-600 dark:text-slate-300">{desc}</span>
                    <div className="flex items-center gap-1">
                      {keys.split(' ').map((k, i) => (
                        k === 'then' ? <span key={i} className="text-[10px] text-gray-400 mx-0.5">then</span> :
                        <kbd key={i} className="px-1.5 py-0.5 text-[11px] font-mono bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-gray-700 dark:text-slate-300 min-w-[24px] text-center">{k}</kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
          <p className="text-xs text-gray-400 text-center">Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-[10px]">?</kbd> anywhere to show this dialog</p>
        </div>
      </div>
    </div>
  );
}
