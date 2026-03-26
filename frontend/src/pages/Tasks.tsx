import { useEffect, useState } from 'react';
import { Search, Filter, Loader2, ListTodo, Trash2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTasks } from '@/hooks/useTasks';
import { useTaskStore } from '@/stores/taskStore';
import TaskCard from '@/components/TaskCard';

const statuses = ['all', 'pending', 'running', 'completed', 'failed', 'cancelled', 'paused'] as const;

export default function Tasks() {
  const { tasks, fetchTasks, isLoading, cancelTask, deleteTask } = useTasks();
  const { filter, setFilter } = useTaskStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filtered = tasks.filter((t) => {
    if (filter.status && filter.status !== 'all' && t.status !== filter.status) return false;
    if (filter.search && !t.title.toLowerCase().includes(filter.search.toLowerCase()) && !t.description.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkCancel = async () => {
    for (const id of selectedIds) {
      await cancelTask(id).catch(() => {});
    }
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} tasks?`)) return;
    for (const id of selectedIds) {
      await deleteTask(id).catch(() => {});
    }
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">Tasks</h2>
          <p className="text-sm text-gray-500">{tasks.length} total, {tasks.filter((t) => t.status === 'running').length} running</p>
        </div>
        <button
          onClick={() => setBulkAction(!bulkAction)}
          className={cn('glass-button text-sm', bulkAction && 'bg-accent-blue/10 text-accent-blue border-accent-blue/20')}
        >
          {bulkAction ? 'Done' : 'Bulk Actions'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            className="glass-input w-full pl-9 text-sm"
            placeholder="Search tasks..."
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setFilter({ status: status === 'all' ? null : status })}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                (filter.status === status || (status === 'all' && !filter.status))
                  ? 'bg-white/[0.08] text-gray-200'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions bar */}
      {bulkAction && selectedIds.size > 0 && (
        <div className="glass-card p-3 flex items-center justify-between animate-slide-down">
          <span className="text-sm text-gray-400">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <button onClick={handleBulkCancel} className="glass-button text-xs flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Cancel
            </button>
            <button onClick={handleBulkDelete} className="glass-button-danger text-xs flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-accent-blue animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((task) => (
            <div key={task.id} className="flex items-start gap-3">
              {bulkAction && (
                <label className="mt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(task.id)}
                    onChange={() => toggleSelect(task.id)}
                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-accent-blue focus:ring-accent-blue/30"
                  />
                </label>
              )}
              <div className="flex-1">
                <TaskCard task={task} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <ListTodo className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {filter.search || filter.status ? 'No tasks match your filters' : 'No tasks yet'}
          </p>
        </div>
      )}
    </div>
  );
}
