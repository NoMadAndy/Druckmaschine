import { useEffect, useState } from 'react';
import { Plus, Search, Filter, X, Loader2, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/stores/projectStore';
import ProjectCard from '@/components/ProjectCard';

export default function Projects() {
  const { projects, isLoading, fetchProjects, createProject } = useProjectStore();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'updated' | 'status'>('updated');
  const [newProject, setNewProject] = useState({ name: '', description: '', language: '', repo_url: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async () => {
    if (!newProject.name.trim()) return;
    setCreating(true);
    try {
      await createProject(newProject);
      setShowCreate(false);
      setNewProject({ name: '', description: '', language: '', repo_url: '' });
    } finally {
      setCreating(false);
    }
  };

  const filtered = projects
    .filter((p) =>
      search
        ? p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase())
        : true
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">Projects</h2>
          <p className="text-sm text-gray-500">{projects.length} projects total</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="glass-button-primary flex items-center gap-2 text-sm"
        >
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreate ? 'Cancel' : 'New Project'}
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="glass-card p-5 animate-slide-down">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Create New Project</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Project Name *</label>
              <input
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                className="glass-input w-full text-sm"
                placeholder="My awesome project"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Language</label>
              <input
                value={newProject.language}
                onChange={(e) => setNewProject({ ...newProject, language: e.target.value })}
                className="glass-input w-full text-sm"
                placeholder="Python, TypeScript, etc."
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <textarea
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              className="glass-input w-full text-sm resize-none h-20"
              placeholder="What is this project about?"
            />
          </div>
          <div className="mt-4">
            <label className="block text-xs text-gray-500 mb-1">Repository URL (optional)</label>
            <input
              value={newProject.repo_url}
              onChange={(e) => setNewProject({ ...newProject, repo_url: e.target.value })}
              className="glass-input w-full text-sm"
              placeholder="https://github.com/..."
            />
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleCreate}
              disabled={!newProject.name.trim() || creating}
              className="glass-button-primary flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input w-full pl-9 text-sm"
            placeholder="Search projects..."
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'updated' | 'status')}
          className="glass-input text-sm py-2"
        >
          <option value="updated">Recently updated</option>
          <option value="name">Name</option>
          <option value="status">Status</option>
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-accent-blue animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <FolderKanban className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {search ? 'No projects match your search' : 'No projects yet. Create your first one!'}
          </p>
        </div>
      )}
    </div>
  );
}
