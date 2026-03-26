import { create } from 'zustand';
import type { Project } from '@/lib/api';
import api from '@/lib/api';

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  setProjects: (projects: Project[]) => void;
  setActiveProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setLoading: (loading: boolean) => void;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<Project>;
  createProject: (data: { name: string; description: string; language?: string; repo_url?: string }) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProject: null,
  isLoading: false,
  setProjects: (projects) => set({ projects }),
  setActiveProject: (activeProject) => set({ activeProject }),
  addProject: (project) =>
    set((state) => ({
      projects: [project, ...state.projects.filter((p) => p.id !== project.id)],
    })),
  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      activeProject: state.activeProject?.id === id ? { ...state.activeProject, ...updates } : state.activeProject,
    })),
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProject: state.activeProject?.id === id ? null : state.activeProject,
    })),
  setLoading: (isLoading) => set({ isLoading }),
  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const projects = await api.get<Project[]>('/projects');
      set({ projects });
    } finally {
      set({ isLoading: false });
    }
  },
  fetchProject: async (id: string) => {
    set({ isLoading: true });
    try {
      const project = await api.get<Project>(`/projects/${id}`);
      set({ activeProject: project });
      return project;
    } finally {
      set({ isLoading: false });
    }
  },
  createProject: async (data) => {
    const project = await api.post<Project>('/projects', data);
    get().addProject(project);
    return project;
  },
  deleteProject: async (id: string) => {
    await api.delete(`/projects/${id}`);
    get().removeProject(id);
  },
}));
