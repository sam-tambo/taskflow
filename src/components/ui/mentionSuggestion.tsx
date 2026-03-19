import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance } from 'tippy.js';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { getInitials, getAvatarColor } from '@/lib/utils';
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';

interface MentionItem {
  id: string;
  label: string;
}

interface MentionListProps {
  items: MentionItem[];
  command: (item: MentionItem) => void;
}

const MentionList = forwardRef<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((selectedIndex + items.length - 1) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((selectedIndex + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          const item = items[selectedIndex];
          if (item) command(item);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) return null;

    return (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden py-1 min-w-[180px]">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => command(item)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left ${
              index === selectedIndex ? 'bg-gray-100 dark:bg-slate-700' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
            }`}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-medium flex-shrink-0"
              style={{ backgroundColor: getAvatarColor(item.id) }}
            >
              {getInitials(item.label)}
            </div>
            <span className="text-gray-900 dark:text-white truncate">{item.label}</span>
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = 'MentionList';

export function createMentionSuggestion(members: MentionItem[]): Omit<SuggestionOptions<MentionItem>, 'editor'> {
  return {
    items: ({ query }: { query: string }) => {
      return members
        .filter(m => m.label.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);
    },
    render: () => {
      let component: ReactRenderer<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }>;
      let popup: Instance[];

      return {
        onStart: (props: SuggestionProps<MentionItem>) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) return;

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          });
        },
        onUpdate: (props: SuggestionProps<MentionItem>) => {
          component?.updateProps(props);
          if (props.clientRect) {
            popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect });
          }
        },
        onKeyDown: (props: { event: KeyboardEvent }) => {
          if (props.event.key === 'Escape') {
            popup?.[0]?.hide();
            return true;
          }
          return component?.ref?.onKeyDown(props) ?? false;
        },
        onExit: () => {
          popup?.[0]?.destroy();
          component?.destroy();
        },
      };
    },
  };
}
