import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import { useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Link as LinkIcon, Heading2, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createMentionSuggestion } from './mentionSuggestion';

export interface RichTextEditorRef {
  clearContent: () => void;
  getHTML: () => string;
  focus: () => void;
}

interface RichTextEditorProps {
  content: string;
  onChange?: (html: string) => void;
  onBlur?: (html: string) => void;
  onSubmit?: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  minimal?: boolean;
  members?: { id: string; label: string }[];
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ content, onChange, onBlur, onSubmit, placeholder, editable = true, className, minimal = false, members = [] }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: minimal ? false : { levels: [2, 3] },
          blockquote: minimal ? false : undefined,
          codeBlock: minimal ? false : undefined,
          horizontalRule: false,
        }),
        Link.configure({
          openOnClick: true,
          autolink: true,
          HTMLAttributes: { class: 'text-[#4B7C6F] underline cursor-pointer' },
        }),
        Placeholder.configure({ placeholder: placeholder || 'Write something...' }),
        ...(members.length > 0
          ? [Mention.configure({
              HTMLAttributes: { class: 'mention bg-[#4B7C6F]/10 text-[#4B7C6F] rounded px-1 py-0.5 font-medium' },
              suggestion: createMentionSuggestion(members),
            })]
          : []),
      ],
      content,
      editable,
      editorProps: {
        attributes: {
          class: cn(
            'prose prose-sm dark:prose-invert max-w-none outline-none',
            'prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5',
            'prose-headings:my-2 prose-blockquote:my-2 prose-pre:my-2',
            minimal && 'min-h-[36px]',
            !minimal && 'min-h-[80px]',
          ),
        },
        handleKeyDown: (_view: any, event: KeyboardEvent) => {
          if (event.key === 'Enter' && !event.shiftKey && minimal && onSubmit) {
            event.preventDefault();
            const html = editor?.getHTML() || '';
            if (html && html !== '<p></p>') {
              onSubmit(html);
            }
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor }: { editor: any }) => {
        onChange?.(editor.getHTML());
      },
      onBlur: ({ editor }: { editor: any }) => {
        onBlur?.(editor.getHTML());
      },
    });

    useImperativeHandle(ref, () => ({
      clearContent: () => editor?.commands.clearContent(),
      getHTML: () => editor?.getHTML() || '',
      focus: () => editor?.commands.focus(),
    }));

    // Sync content from outside
    useEffect(() => {
      if (editor && content !== editor.getHTML()) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    }, [content, editor]);

    const addLink = useCallback(() => {
      if (!editor) return;
      const url = window.prompt('Enter URL:');
      if (url) {
        editor.chain().focus().setLink({ href: url }).run();
      }
    }, [editor]);

    if (!editor) return null;

    const ToolbarButton = ({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title: string }) => (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={cn(
          'p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors',
          active && 'bg-gray-200 dark:bg-slate-600 text-[#4B7C6F]',
          !active && 'text-gray-500 dark:text-slate-400'
        )}
      >
        {children}
      </button>
    );

    return (
      <div className={cn('rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden', className)}>
        {/* Minimal inline toolbar */}
        {editable && minimal && (
          <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-100 dark:border-slate-700">
            <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
              <Bold className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
              <Italic className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('link')} onClick={addLink} title="Link">
              <LinkIcon className="w-3.5 h-3.5" />
            </ToolbarButton>
          </div>
        )}

        {/* Static toolbar for full editor */}
        {editable && !minimal && (
          <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
            <ToolbarButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading">
              <Heading2 className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
              <Bold className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
              <Italic className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
              <Strikethrough className="w-3.5 h-3.5" />
            </ToolbarButton>
            <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1" />
            <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
              <List className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
              <ListOrdered className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
              <Quote className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block">
              <Code className="w-3.5 h-3.5" />
            </ToolbarButton>
            <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1" />
            <ToolbarButton active={editor.isActive('link')} onClick={addLink} title="Link">
              <LinkIcon className="w-3.5 h-3.5" />
            </ToolbarButton>
          </div>
        )}

        <div className="px-3 py-2">
          <EditorContent editor={editor} />
        </div>
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';
