import { useState } from 'react';
import { Eye, EyeOff, Plus, Search, X } from 'lucide-react';
import { useTaskFollowers, useFollowTask, useUnfollowTask } from '@/hooks/useTaskFollowers';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';

interface FollowersSectionProps {
  taskId: string;
}

export function FollowersSection({ taskId }: FollowersSectionProps) {
  const { user } = useAuth();
  const { members } = useWorkspaceStore();
  const { data: followers = [] } = useTaskFollowers(taskId);
  const followTask = useFollowTask(taskId);
  const unfollowTask = useUnfollowTask(taskId);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');

  const isFollowing = followers.some(f => f.user_id === user?.id);
  const followerIds = new Set(followers.map(f => f.user_id));

  const toggleFollow = () => {
    if (!user) return;
    if (isFollowing) {
      unfollowTask.mutate({ task_id: taskId, user_id: user.id });
    } else {
      followTask.mutate({ task_id: taskId, user_id: user.id });
    }
  };

  const availableMembers = members.filter(m => {
    if (followerIds.has(m.user_id)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (m.profiles?.full_name || '').toLowerCase().includes(q) || (m.profiles?.email || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" /> Followers ({followers.length})
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleFollow}
            className={cn(
              'text-xs flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors',
              isFollowing
                ? 'text-[#4B7C6F] bg-[#4B7C6F]/10 hover:bg-[#4B7C6F]/20'
                : 'text-gray-500 hover:text-[#4B7C6F] hover:bg-gray-100 dark:hover:bg-slate-800'
            )}
          >
            {isFollowing ? <><EyeOff className="w-3 h-3" /> Unfollow</> : <><Eye className="w-3 h-3" /> Follow</>}
          </button>
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="text-xs text-[#4B7C6F] hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      {/* Follower avatars */}
      {followers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {followers.map(f => (
            <div key={f.id} className="group relative">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium cursor-default"
                style={{ backgroundColor: getAvatarColor(f.user_id) }}
                title={f.user?.full_name || f.user?.email || ''}
              >
                {getInitials(f.user?.full_name || null)}
              </div>
              {f.user_id !== user?.id && (
                <button
                  onClick={() => unfollowTask.mutate({ task_id: taskId, user_id: f.user_id })}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2 h-2" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add follower picker */}
      {showPicker && (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg outline-none text-gray-900 dark:text-white"
              autoFocus
            />
          </div>
          <div className="max-h-32 overflow-y-auto space-y-0.5">
            {availableMembers.slice(0, 8).map(m => (
              <button
                key={m.user_id}
                onClick={() => {
                  followTask.mutate({ task_id: taskId, user_id: m.user_id });
                  setSearch('');
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 text-left"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium"
                  style={{ backgroundColor: getAvatarColor(m.user_id) }}
                >
                  {getInitials(m.profiles?.full_name || null)}
                </div>
                <span className="text-gray-900 dark:text-white truncate">{m.profiles?.full_name || m.profiles?.email}</span>
              </button>
            ))}
            {availableMembers.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">No more members to add</p>
            )}
          </div>
        </div>
      )}

      {followers.length === 0 && !showPicker && (
        <p className="text-xs text-gray-400">No followers yet</p>
      )}
    </div>
  );
}
