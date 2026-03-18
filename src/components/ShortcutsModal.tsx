import { useUIStore } from '@/stores/useUIStore';
import { X } from 'lucide-react';

const shortcuts = [
  { category: 'Navigation', items: [
    { keys: 'G then H', desc: 'Go to Home' },
    { keys: 'G then I', desc: 'Go to Inbox' },
    { keys: 'G then P', desc: 'Go to Portfolios' },
    { keys: 'G then R', desc: 'Go to Reports' },
    { keys: 'G then G', desc: 'Go to Goals' },
    { keys: 'G then W', desc: 'Go to Workload' },
    { keys: 'G then M', desc: 'Go to Members' },
    { keys: 'G then S', desc: 'Go to Settings' },
  ]},
  { category: 'Search', items: [
    { keys: 'Cmd K', desc: 'Command palette' },
    { keys: '/', desc: 'Search' },
  ]},
  { category: 'General', items: [
    { keys: 'Cmd \\', desc: 'Toggle sidebar' },
    { keys: '?', desc: 'Show shortcuts' },
    { keys: 'Esc', desc: 'Close panel / modal' },
  ]},
];

export function ShortcutsModal() {
  const { shortcutsModalOpen, setShortcutsModalOpen } = useUIStore();

  if (!shortcutsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={(e) => { if (e.key === 'Escape') setShortcutsModalOpen(false); }}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShortcutsModalOpen(false)} />
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6" role="dialog" aria-modal="true" aria-label="Keyboard Shortcuts">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h2>
          <button onClick={() => setShortcutsModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {shortcuts.map(({ category, items }) => (
            <div key={category}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-3">{category}</h3>
              <div className="space-y-2">
                {items.map(({ keys, desc }) => (
                  <div key={keys} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-600 dark:text-slate-300">{desc}</span>
                    <kbd className="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-gray-700 dark:text-slate-300 whitespace-nowrap">{keys}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
