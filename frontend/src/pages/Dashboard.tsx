import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, FolderKanban, ListTodo, Cpu, TrendingUp, ArrowRight,
  CheckCircle2, Clock, AlertCircle, Loader2,
} from 'lucide-react';
import { cn, formatRelative, getStatusColor } from '@/lib/utils';
import { useWSEvent } from '@/hooks/useWebSocket';
import { useTasks } from '@/hooks/useTasks';
import { useProjectStore } from '@/stores/projectStore';
import TaskInput from '@/components/TaskInput';
import TaskCard from '@/components/TaskCard';
import GPUStatus from '@/components/GPUStatus';

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

function StatCard({ icon: Icon, label, value, trend, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: string;
  color: string;
}) {
  return (
    <div className="glass-card p-4 group hover:bg-white/[0.05] transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', `bg-${color}/10 border border-${color}/20`)}>
          <Icon className={cn('w-4.5 h-4.5', `text-${color}`)} style={{ color }} />
        </div>
        {trend && (
          <span className="text-xs text-emerald-400">{trend}</span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-200">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { tasks, fetchTasks, createTask } = useTasks();
  const { projects, fetchProjects } = useProjectStore();
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [fetchTasks, fetchProjects]);

  useWSEvent<ActivityItem>('activity:new', (item) => {
    setActivity((prev) => [item, ...prev].slice(0, 20));
  });

  const activeTasks = tasks.filter((t) => t.status === 'running').length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const failedTasks = tasks.filter((t) => t.status === 'failed').length;
  const recentTasks = tasks.slice(0, 5);

  const handleTaskSubmit = async (title: string, description: string) => {
    await createTask(title, description);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ListTodo} label="Active Tasks" value={activeTasks} color="#3b82f6" />
        <StatCard icon={CheckCircle2} label="Completed" value={completedTasks} trend="+12 this week" color="#10b981" />
        <StatCard icon={FolderKanban} label="Projects" value={projects.length} color="#8b5cf6" />
        <StatCard icon={AlertCircle} label="Failed" value={failedTasks} color="#f43f5e" />
      </div>

      {/* Quick task input */}
      <TaskInput onSubmit={handleTaskSubmit} />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent tasks */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300">Recent Tasks</h2>
            <button
              onClick={() => navigate('/tasks')}
              className="flex items-center gap-1 text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {recentTasks.length > 0 ? (
            <div className="space-y-2">
              {recentTasks.map((task) => (
                <TaskCard key={task.id} task={task} compact />
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <ListTodo className="w-10 h-10 text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No tasks yet. Create one above!</p>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* GPU Status */}
          <GPUStatus compact />

          {/* Activity feed */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-accent-cyan" />
              <h3 className="text-sm font-semibold text-gray-300">Recent Activity</h3>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activity.length > 0 ? (
                activity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 py-1.5 border-b border-white/[0.03] last:border-0"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-blue mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 line-clamp-2">{item.message}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{formatRelative(item.timestamp)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-600 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
