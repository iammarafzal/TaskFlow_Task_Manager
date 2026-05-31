import { create } from 'zustand';
import api from '../services/api';

export type Impact = 'low' | 'medium' | 'high';
export type Status = 'pending' | 'completed';

export interface Task {
  id: string;
  title: string;
  impact: Impact;
  effort: number;
  status: Status;
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  isArchived?: boolean;
}

export interface DashboardAnalytics {
  completionProgress: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  burnoutWarning: boolean;
  analytics7Days: { date: string; count: number; percentage: number }[];
}



interface AppState {
  tasks: Task[];
  focusTasks: Task[];
  dashboardAnalytics: DashboardAnalytics | null;


  isFetching: {
    tasks: boolean;
    focusTasks: boolean;
    dashboardAnalytics: boolean;
  };

  // REST API Retrieval Actions (Supports Stale-While-Revalidate caching pattern)
  fetchTasks: () => Promise<void>;
  fetchDashboard: () => Promise<void>;
  fetchFocusTasks: () => Promise<void>;


  // REST API Mutation Actions (Supports Optimistic UI Updates)
  addTask: (taskData: { title: string; impact: Impact; dueDate: string; effort: number; status?: Status }) => Promise<void>;
  updateTask: (id: string, taskData: { title: string; impact: Impact; dueDate: string; effort: number; status?: Status }) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskStatus: (id: string) => Promise<void>;


  // Zero-API local task ticker for automated archiving states
  tickLocalRecalculations: () => void;

  // Bulk Operations
  bulkAddTasks: (tasksData: { title: string; impact: Impact; dueDate: string; effort: number; status?: Status }[]) => Promise<void>;
}

// Convert backend uppercase DB values to local camelCase structures
const mapToFrontend = (task: any): Task => {
  const isCompleted = task.status === 'COMPLETED';
  const completedAt = task.completedAt || undefined;
  const isArchived = isCompleted;

  return {
    id: task.id,
    title: task.title,
    impact: task.impact.toLowerCase() as Impact,
    effort: task.effort,
    status: task.status.toLowerCase() as Status,
    dueDate: task.deadline,
    createdAt: task.createdAt,
    completedAt,
    isArchived,
  };
};

export const useAppStore = create<AppState>((set, get) => ({
  tasks: [],
  focusTasks: [],
  dashboardAnalytics: null,


  isFetching: {
    tasks: false,
    focusTasks: false,
    dashboardAnalytics: false,
  },

  // 1. Fetch Tasks (Stale-While-Revalidate Caching Layer)
  fetchTasks: async () => {
    if (get().isFetching.tasks) return; // Prevent double request spamming
    set((state) => ({ isFetching: { ...state.isFetching, tasks: true } }));

    try {
      const response = await api.get('/tasks');
      const mapped = response.data.data.map(mapToFrontend);
      set({ tasks: mapped });
    } catch (err) {
      console.error('[Zustand] Error retrieving tasks:', err);
    } finally {
      set((state) => ({ isFetching: { ...state.isFetching, tasks: false } }));
    }
  },

  // 2. Fetch Dashboard Analytics
  fetchDashboard: async () => {
    if (get().isFetching.dashboardAnalytics) return;
    set((state) => ({ isFetching: { ...state.isFetching, dashboardAnalytics: true } }));

    try {
      const response = await api.get('/dashboard');
      set({ dashboardAnalytics: response.data.data });
    } catch (err) {
      console.error('[Zustand] Error retrieving analytics:', err);
    } finally {
      set((state) => ({ isFetching: { ...state.isFetching, dashboardAnalytics: false } }));
    }
  },

  // 3. Fetch Focus Tasks
  fetchFocusTasks: async () => {
    if (get().isFetching.focusTasks) return;
    set((state) => ({ isFetching: { ...state.isFetching, focusTasks: true } }));

    try {
      const response = await api.get('/tasks/focus');
      // Backend now returns an array of up to 3 tasks
      const focus = Array.isArray(response.data.data)
        ? response.data.data.map(mapToFrontend)
        : [];
      set({ focusTasks: focus });
    } catch (err) {
      console.error('[Zustand] Error retrieving focus tasks:', err);
    } finally {
      set((state) => ({ isFetching: { ...state.isFetching, focusTasks: false } }));
    }
  },



  // 5. Add Task (Optimistic UI Update)
  addTask: async (taskData) => {
    const tempId = `temp_${Math.random().toString(36).substring(7)}`;
    const initialStatus = taskData.status || 'pending';
    const tempTask: Task = {
      id: tempId,
      title: taskData.title,
      impact: taskData.impact,
      effort: taskData.effort,
      status: initialStatus,
      dueDate: taskData.dueDate,
      createdAt: new Date().toISOString(),
      isArchived: initialStatus === 'completed',
    };

    // Pre-emptively append to the local UI state cache to eliminate latency
    const originalTasks = get().tasks;
    set({ tasks: [tempTask, ...originalTasks] });

    try {
      const response = await api.post('/tasks', {
        title: taskData.title,
        impact: taskData.impact.toUpperCase(),
        deadline: taskData.dueDate,
        effort: taskData.effort,
        status: initialStatus.toUpperCase(),
      });

      const actualTask = mapToFrontend(response.data.data);
      // Replace temporary record with fully sync'd backend model
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === tempId ? actualTask : t)),
      }));
    } catch (err) {
      // Revert state if the API fails
      set({ tasks: originalTasks });
      console.error('[Zustand] Optimistic add task failed, reverting state:', err);
      throw err;
    }
  },

  // Bulk Add Tasks
  bulkAddTasks: async (tasksData) => {
    try {
      const response = await api.post('/tasks/bulk', tasksData.map(t => ({
        title: t.title,
        impact: t.impact.toUpperCase(),
        deadline: t.dueDate,
        effort: t.effort,
        status: (t.status || 'pending').toUpperCase(),
      })));

      const actualTasks = response.data.data.map(mapToFrontend);
      const originalTasks = get().tasks;
      set({ tasks: [...actualTasks, ...originalTasks] });
    } catch (err) {
      console.error('[Zustand] Bulk add tasks failed:', err);
      throw err;
    }
  },

  // 6. Update Task (Optimistic UI Update)
  updateTask: async (id, taskData) => {
    const originalTasks = get().tasks;
    const target = originalTasks.find((t) => t.id === id);
    if (!target) return;

    // Apply patch optimistically
    const patchedTask: Task = {
      ...target,
      title: taskData.title,
      impact: taskData.impact,
      effort: taskData.effort,
      status: taskData.status || target.status,
      dueDate: taskData.dueDate,
      isArchived: (taskData.status || target.status) === 'completed',
    };

    set({
      tasks: originalTasks.map((t) => (t.id === id ? patchedTask : t)),
    });

    try {
      const response = await api.put(`/tasks/${id}`, {
        title: taskData.title,
        impact: taskData.impact.toUpperCase(),
        deadline: taskData.dueDate,
        effort: taskData.effort,
        status: (taskData.status || target.status).toUpperCase(),
      });
      const updated = mapToFrontend(response.data.data);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
      }));
    } catch (err) {
      set({ tasks: originalTasks });
      console.error('[Zustand] Optimistic update failed, reverting:', err);
      throw err;
    }
  },

  // 7. Delete Task (Optimistic UI Update)
  deleteTask: async (id) => {
    const originalTasks = get().tasks;
    set({ tasks: originalTasks.filter((t) => t.id !== id) });

    try {
      await api.delete(`/tasks/${id}`);
    } catch (err) {
      set({ tasks: originalTasks });
      console.error('[Zustand] Optimistic delete failed, reverting:', err);
      throw err;
    }
  },

  // 8. Toggle Task Status (Optimistic UI Update)
  toggleTaskStatus: async (id) => {
    const originalTasks = get().tasks;
    const target = originalTasks.find((t) => t.id === id);
    if (!target) return;

    const nextStatus = target.status === 'completed' ? 'pending' : 'completed';
    const patchedTask: Task = {
      ...target,
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
      isArchived: nextStatus === 'completed',
    };

    set({
      tasks: originalTasks.map((t) => (t.id === id ? patchedTask : t)),
    });

    try {
      const response = await api.put(`/tasks/${id}`, {
        status: nextStatus.toUpperCase(),
      });
      const updated = mapToFrontend(response.data.data);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
      }));
    } catch (err) {
      set({ tasks: originalTasks });
      console.error('[Zustand] Optimistic status toggle failed, reverting:', err);
      throw err;
    }
  },



  // 10. Local Task Archiving Recalculation (0 API Cost)
  tickLocalRecalculations: () => {
    let hasChanges = false;

    const updatedTasks = get().tasks.map((t) => {
      if (t.status === 'completed' && !t.isArchived) {
        hasChanges = true;
        return { ...t, isArchived: true };
      }
      return t;
    });

    if (hasChanges) {
      set({ tasks: updatedTasks });
      console.log('[Zustand] Recalculated task archiving states locally (0 API network calls).');
    }
  },
}));
