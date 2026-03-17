import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { formatFileSize } from '@/lib/utils';
import { Paperclip, Upload, Trash2, Download, FileIcon } from 'lucide-react';
import type { Attachment } from '@/types';
import { toast } from 'sonner';
import { useRef } from 'react';

interface AttachmentListProps {
  taskId: string;
}

export function AttachmentList({ taskId }: AttachmentListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attachments')
        .select('*, uploader:profiles!uploaded_by(*)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Attachment[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const path = `${taskId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(path);
      const { error } = await supabase.from('attachments').insert({
        task_id: taskId,
        uploaded_by: user?.id,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size_bytes: file.size,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', taskId] });
      toast.success('File uploaded');
    },
    onError: () => toast.error('Failed to upload file'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('attachments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', taskId] });
      toast.success('Attachment removed');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => uploadMutation.mutate(file));
    e.target.value = '';
  };

  const isImage = (type: string | null) => type?.startsWith('image/');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Attachments ({attachments.length})</span>
        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 text-xs text-coral hover:underline">
          <Upload className="w-3 h-3" /> Upload
        </button>
        <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleFileChange} />
      </div>

      {attachments.map((att) => (
        <div key={att.id} className="group flex items-center gap-3 p-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
          {isImage(att.file_type) ? (
            <img src={att.file_url} alt={att.file_name} className="w-10 h-10 rounded object-cover" />
          ) : (
            <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded flex items-center justify-center">
              <FileIcon className="w-5 h-5 text-gray-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{att.file_name}</p>
            <p className="text-xs text-gray-500">{att.file_size_bytes ? formatFileSize(att.file_size_bytes) : ''}</p>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
            <a href={att.file_url} target="_blank" rel="noreferrer" className="p-1 text-gray-400 hover:text-gray-600">
              <Download className="w-4 h-4" />
            </a>
            <button onClick={() => deleteMutation.mutate(att.id)} className="p-1 text-gray-400 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {attachments.length === 0 && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg p-4 text-center cursor-pointer hover:border-coral transition-colors"
        >
          <Paperclip className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <p className="text-xs text-gray-500">Drop files or click to upload</p>
        </div>
      )}
    </div>
  );
}
