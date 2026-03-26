import { create } from 'zustand';
import type { Task } from '@/lib/api';

interface TaskState {
  tasks: Task[];
  activeTask: Task | null;
  isLoading: boolean;
  filter: {
    status: string | null;
    projectId: string | null;
    search: string;
  };
  setTasks: (tasks: Task[]) => void;
  setActiveTask: (task: Task | null) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setFilter: (filter: Partial<TaskState['filter']>) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  activeTask: null,
  isLoading: false,
  filter: {
    status: null,
    projectId: null,
    search: '',
  },
  setTasks: (tasks) => set({ tasks }),
  setActiveTask: (activeTask) => set({ activeTask }),
  addTask: (task) =>
    set((state) => ({
      tasks: [task, ...state.tasks.filter((t) => t.id !== task.id)],
    })),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      activeTask: state.activeTask?.id === id ? { ...state.activeTask, ...updates } : state.activeTask,
    })),
  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      activeTask: state.activeTask?.id === id ? null : state.activeTask,
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setFilter: (filter) =>
    set((state) => ({
      filter: { ...state.filter, ...filter },
    })),
}));
