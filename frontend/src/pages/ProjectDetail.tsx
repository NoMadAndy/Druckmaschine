import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FolderKanban, GitBranch, ExternalLink, Trash2,
  Loader2, ListTodo,
} from 'lucide-react';
import { cn, getStatusColor, formatDate, formatRelative } from '@/lib/utils';
import { useProjectStore } from '@/stores/projectStore';
import { useTasks } from '@/hooks/useTasks';
import TaskCard from '@/components/TaskCard';
import ProgressBar from '@/components/ProgressBar';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeProject, fetchProject, deleteProject, isLoading } = useProjectStore();
  const { tasks, fetchTasks } = useTasks();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProject(id);
      fetchTasks();
    }
  }, [id, fetchProject, fetchTasks]);

  const projectTasks = tasks.filter((t) => t.project_id === id);
  const progress = activeProject && activeProject.tasks_count > 0
    ? (activeProject.completed_tasks / activeProject.tasks_count) * 100
    : 0;

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this project?')) return;
    setDeleting(true);
    try {
      await deleteProject(id);
      navigate('/projects');
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading && !activeProject) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent-blue animate-spin" />
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Project not found</p>
        <button onClick={() => navigate('/projects')} className="glass-button mt-4 text-sm">
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => navigate('/projects')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </button>

      {/* Project header */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center shrink-0">
              <FolderKanban className="w-6 h-6 text-accent-purple" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-100">{activeProject.name}</h1>
                <span className={cn('status-badge border', getStatusColor(activeProject.status))}>
                  {activeProject.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{activeProject.description}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
                {activeProject.language && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-accent-cyan" />
                    {activeProject.language}
                  </span>
                )}
                {activeProject.repo_url && (
                  <a
                    href={activeProject.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-accent-blue hover:underline"
                  >
                    <GitBranch className="w-3 h-3" />
                    Repository
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <span>Created {formatDate(activeProject.created_at)}</span>
                <span>Updated {formatRelative(activeProject.updated_at)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="glass-button-danger flex items-center gap-2 text-sm shrink-0"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>

        {activeProject.tasks_count > 0 && (
          <div className="mt-5">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>{activeProject.completed_tasks} / {activeProject.tasks_count} tasks completed</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <ProgressBar value={progress} color="purple" />
          </div>
        )}
      </div>

      {/* Tasks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">Project Tasks</h2>
          <span className="text-xs text-gray-600">{projectTasks.length} tasks</span>
        </div>
        {projectTasks.length > 0 ? (
          <div className="space-y-2">
            {projectTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <ListTodo className="w-10 h-10 text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No tasks for this project</p>
          </div>
        )}
      </div>
    </div>
  );
}
