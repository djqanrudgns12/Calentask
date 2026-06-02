import { create } from 'zustand';
import { 
  getAgendaTasks, 
  createAgendaTask, 
  updateAgendaTask, 
  hardDeleteAgendaTask, 
  createAgendaSubtask, 
  updateAgendaSubtask, 
  deleteAgendaSubtask,
  TaskStatus,
  AgendaTask,
  AgendaSubtask
} from '@/app/actions/agenda';

// re-export types so we don't break existing imports in components
export type { TaskStatus, AgendaTask, AgendaSubtask };

interface AgendaState {
  tasks: AgendaTask[];
  isLoading: boolean;
  isInitialized: boolean;
  fetchTasks: () => Promise<void>;
  addTask: (task: { title: string; memo?: string | null; deadline?: string | null; category_id?: string | null }) => Promise<void>;
  updateTask: (id: string, updates: Partial<AgendaTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>; // Hard delete
  setTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  updateSubtask: (taskId: string, subtaskId: string, updates: Partial<AgendaSubtask>) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
}

export const useAgendaStore = create<AgendaState>()((set, get) => ({
  tasks: [],
  isLoading: false,
  isInitialized: false,

  fetchTasks: async () => {
    set({ isLoading: true });
    try {
      const data = await getAgendaTasks();
      set({ tasks: data, isInitialized: true });
    } catch (error) {
      console.error('Failed to fetch agenda tasks:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addTask: async (task) => {
    try {
      const newTask = await createAgendaTask(task);
      set((state) => ({ tasks: [newTask, ...state.tasks] }));
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  },

  updateTask: async (id, updates) => {
    // 낙관적 업데이트
    const previousTasks = get().tasks;
    set((state) => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    }));

    try {
      const updatedTask = await updateAgendaTask(id, updates);
      // 서버 데이터로 덮어쓰기
      set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? updatedTask : t)
      }));
    } catch (error) {
      console.error('Failed to update task:', error);
      set({ tasks: previousTasks }); // 롤백
    }
  },

  deleteTask: async (id) => {
    const previousTasks = get().tasks;
    set((state) => ({ tasks: state.tasks.filter(t => t.id !== id) }));
    try {
      await hardDeleteAgendaTask(id);
    } catch (error) {
      console.error('Failed to delete task:', error);
      set({ tasks: previousTasks });
    }
  },

  setTaskStatus: async (id, status) => {
    const previousTasks = get().tasks;
    set((state) => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, status } : t)
    }));
    try {
      const updatedTask = await updateAgendaTask(id, { status });
      set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? updatedTask : t)
      }));
    } catch (error) {
      console.error('Failed to set task status:', error);
      set({ tasks: previousTasks });
    }
  },

  addSubtask: async (taskId, title) => {
    try {
      const newSubtask = await createAgendaSubtask(taskId, title);
      set((state) => ({
        tasks: state.tasks.map(t => {
          if (t.id === taskId) {
            return { ...t, subtasks: [...(t.subtasks || []), newSubtask] };
          }
          return t;
        })
      }));
    } catch (error) {
      console.error('Failed to add subtask:', error);
    }
  },

  updateSubtask: async (taskId, subtaskId, updates) => {
    const previousTasks = get().tasks;
    set((state) => ({
      tasks: state.tasks.map(t => {
        if (t.id === taskId) {
          return { ...t, subtasks: t.subtasks?.map(s => s.id === subtaskId ? { ...s, ...updates } : s) || [] };
        }
        return t;
      })
    }));

    try {
      const updatedSubtask = await updateAgendaSubtask(subtaskId, updates);
      set((state) => ({
        tasks: state.tasks.map(t => {
          if (t.id === taskId) {
            return { ...t, subtasks: t.subtasks?.map(s => s.id === subtaskId ? updatedSubtask : s) || [] };
          }
          return t;
        })
      }));
    } catch (error) {
      console.error('Failed to update subtask:', error);
      set({ tasks: previousTasks });
    }
  },

  deleteSubtask: async (taskId, subtaskId) => {
    const previousTasks = get().tasks;
    set((state) => ({
      tasks: state.tasks.map(t => {
        if (t.id === taskId) {
          return { ...t, subtasks: t.subtasks?.filter(s => s.id !== subtaskId) || [] };
        }
        return t;
      })
    }));

    try {
      await deleteAgendaSubtask(subtaskId);
    } catch (error) {
      console.error('Failed to delete subtask:', error);
      set({ tasks: previousTasks });
    }
  }
}));
