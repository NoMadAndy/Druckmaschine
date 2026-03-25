import { useCallback, useEffect } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { useWSEvent } from './useWebSocket';
import api, { Task } from '@/lib/api';

export function useTasks() {
  const { tasks, activeTask, isLoading, setTasks, setActiveTask, updateTask, addTask, removeTask, setLoading } =
    useTaskStore();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Task[]>('/tasks');
      setTasks(data);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [setTasks, setLoading]);

  const fetchTask = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const data = await api.get<Task>(`/tasks/${id}`);
        setActiveTask(data);
        return data;
      } finally {
        setLoading(false);
      }
    },
    [setActiveTask, setLoading]
  );

  const createTask = useCallback(
    async (title: string, description: string, projectId?: string) => {
      const task = await api.post<Task>('/tasks', {
        title,
        description,
        project_id: projectId,
      });
      addTask(task);
      return task;
    },
    [addTask]
  );

  const cancelTask = useCallback(
    async (id: string) => {
      await api.post(`/tasks/${id}/cancel`);
      updateTask(id, { status: 'cancelled' });
    },
    [updateTask]
  );

  const retryTask = useCallback(
    async (id: string) => {
      const task = await api.post<Task>(`/tasks/${id}/retry`);
      updateTask(id, task);
      return task;
    },
    [updateTask]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      await api.delete(`/tasks/${id}`);
      removeTask(id);
    },
    [removeTask]
  );

  // Real-time updates
  useWSEvent<Task>('task:updated', (task) => {
    updateTask(task.id, task);
    if (activeTask?.id === task.id) {
      setActiveTask(task);
    }
  });

  useWSEvent<Task>('task:created', (task) => {
    addTask(task);
  });

  useWSEvent<{ id: string }>('task:deleted', (data) => {
    removeTask(data.id);
  });

  return {
    tasks,
    activeTask,
    isLoading,
    fetchTasks,
    fetchTask,
    createTask,
    cancelTask,
    retryTask,
    deleteTask,
  };
}
