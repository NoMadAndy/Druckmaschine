import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, XCircle, CheckCircle2, Clock,
  Loader2, AlertCircle, ChevronDown, ChevronRight,
} from 'lucide-react';
import { cn, getStatusColor, formatDateTime, formatRelative } from '@/lib/utils';
import { useTasks } from '@/hooks/useTasks';
import ProgressBar from '@/components/ProgressBar';
import LogViewer from '@/components/LogViewer';

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeTask, fetchTask, cancelTask, retryTask, isLoading } = useTasks();
  const [showSubtasks, setShowSubtasks] = useState(true);

  useEffect(() => {
    if (id) fetchTask(id);
  }, [id, fetchTask]);

  if (isLoading && !activeTask) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent-blue animate-spin" />
      </div>
    );
  }

  if (!activeTask) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Task not found</p>
        <button onClick={() => navigate('/tasks')} className="glass-button mt-4 text-sm">
          Back to Tasks
        </button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'text-amber-400',
    running: 'text-blue-400',
    completed: 'text-emerald-400',
    failed: 'text-red-400',
    cancelled: 'text-gray-400',
    paused: 'text-purple-400',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={() => navigate('/tasks')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tasks
      </button>

      {/* Task header */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className={cn('status-badge border', getStatusColor(activeTask.status))}>
                {activeTask.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                {activeTask.status}
              </span>
              {activeTask.project_name && (
                <span className="text-xs text-gray-500">{activeTask.project_name}</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-100">{activeTask.title}</h1>
            {activeTask.description && (
              <p className="text-sm text-gray-400 mt-2">{activeTask.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(activeTask.status === 'failed' || activeTask.status === 'cancelled') && (
              <button
                onClick={() => id && retryTask(id)}
                className="glass-button flex items-center gap-2 text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            )}
            {(activeTask.status === 'running' || activeTask.status === 'pending') && (
              <button
                onClick={() => id && cancelTask(id)}
                className="glass-button-danger flex items-center gap-2 text-sm"
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-5">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Progress</span>
            <span>{activeTask.progress}%</span>
          </div>
          <ProgressBar
            value={activeTask.progress}
            color={activeTask.status === 'failed' ? 'red' : activeTask.status === 'completed' ? 'green' : 'blue'}
            size="md"
          />
        </div>

        {/* Timestamps */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Created {formatDateTime(activeTask.created_at)}
          </span>
          {activeTask.started_at && (
            <span>Started {formatRelative(activeTask.started_at)}</span>
          )}
          {activeTask.completed_at && (
            <span>Completed {formatRelative(activeTask.completed_at)}</span>
          )}
        </div>

        {/* Error */}
        {activeTask.error && (
          <div className="mt-4 px-4 py-3 rounded-lg bg-red-500/5 border border-red-500/10 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-400">{activeTask.error}</p>
          </div>
        )}
      </div>

      {/* Subtasks */}
      {activeTask.subtasks && activeTask.subtasks.length > 0 && (
        <div className="glass-card overflow-hidden">
          <button
            onClick={() => setShowSubtasks(!showSubtasks)}
            className="flex items-center justify-between w-full px-5 py-3 border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors"
          >
            <span className="text-sm font-semibold text-gray-300">
              Subtasks ({activeTask.subtasks.length})
            </span>
            {showSubtasks ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
          </button>
          {showSubtasks && (
            <div className="p-4 space-y-2 animate-slide-down">
              {activeTask.subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02]">
                  <span className={cn('status-badge border text-[10px]', getStatusColor(sub.status))}>
                    {sub.status}
                  </span>
                  <span className="text-sm text-gray-300 flex-1">{sub.title}</span>
                  <div className="w-24">
                    <ProgressBar value={sub.progress} size="sm" color="blue" />
                  </div>
                  <span className="text-xs text-gray-500">{sub.progress}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Live logs */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Live Logs</h3>
        <LogViewer
          initialLogs={activeTask.logs || []}
          source={id}
          className="h-[400px]"
        />
      </div>
    </div>
  );
}
