import { useNavigate } from 'react-router-dom';
import { Clock, ArrowRight, AlertCircle, CheckCircle2, Loader2, Pause, XCircle } from 'lucide-react';
import { cn, getStatusColor, formatRelative } from '@/lib/utils';
import ProgressBar from './ProgressBar';
import type { Task } from '@/lib/api';

interface TaskCardProps {
  task: Task;
  compact?: boolean;
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5" />,
  running: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5" />,
  failed: <AlertCircle className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
  paused: <Pause className="w-3.5 h-3.5" />,
};

export default function TaskCard({ task, compact = false }: TaskCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/tasks/${task.id}`)}
      className={cn(
        'glass-card p-4 cursor-pointer group transition-all duration-200',
        'hover:bg-white/[0.05] hover:border-white/[0.1] hover:shadow-xl',
        task.status === 'running' && 'animate-pulse-glow'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                'status-badge border text-[10px]',
                getStatusColor(task.status)
              )}
            >
              {statusIcons[task.status]}
              {task.status}
            </span>
            {task.project_name && (
              <span className="text-xs text-gray-500 truncate">{task.project_name}</span>
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
            {task.title}
          </h3>
          {!compact && task.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
      </div>

      {task.status === 'running' && (
        <div className="mt-3">
          <ProgressBar value={task.progress} size="sm" color="blue" />
          <p className="text-[10px] text-gray-500 mt-1">{task.progress}% complete</p>
        </div>
      )}

      {!compact && (
        <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-600">
          <span>Created {formatRelative(task.created_at)}</span>
          {task.completed_at && <span>Completed {formatRelative(task.completed_at)}</span>}
        </div>
      )}

      {task.error && !compact && (
        <div className="mt-2 px-2 py-1.5 rounded bg-red-500/5 border border-red-500/10 text-xs text-red-400 line-clamp-2">
          {task.error}
        </div>
      )}
    </div>
  );
}
