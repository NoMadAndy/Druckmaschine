import { useNavigate } from 'react-router-dom';
import { FolderKanban, ArrowRight, GitBranch } from 'lucide-react';
import { cn, getStatusColor, formatRelative } from '@/lib/utils';
import ProgressBar from './ProgressBar';
import type { Project } from '@/lib/api';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();
  const progress = project.tasks_count > 0 ? (project.completed_tasks / project.tasks_count) * 100 : 0;

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="glass-card p-5 cursor-pointer group transition-all duration-200 hover:bg-white/[0.05] hover:border-white/[0.1] hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center shrink-0">
          <FolderKanban className="w-5 h-5 text-accent-purple" />
        </div>
        <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>

      <div className="mt-3">
        <h3 className="text-base font-semibold text-gray-200 group-hover:text-white transition-colors">
          {project.name}
        </h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span className={cn('status-badge border text-[10px]', getStatusColor(project.status))}>
          {project.status}
        </span>
        {project.language && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-accent-cyan" />
            {project.language}
          </span>
        )}
        {project.repo_url && (
          <GitBranch className="w-3 h-3 text-gray-600" />
        )}
      </div>

      {project.tasks_count > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{project.completed_tasks}/{project.tasks_count} tasks</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <ProgressBar value={progress} size="sm" color="purple" />
        </div>
      )}

      <p className="text-[10px] text-gray-600 mt-3">
        Updated {formatRelative(project.updated_at)}
      </p>
    </div>
  );
}
