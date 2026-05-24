import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, Clock, Calendar, CheckCircle2, Circle, Search, Zap, X, Download, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { useAppStore, Task, Impact, Status } from '../store/useAppStore';
import { useSmartRefresh } from '../hooks/useSmartRefresh';
import { useLocalTick } from '../hooks/useLocalTick';

export function TasksPage() {
  const {
    tasks,
    isFetching,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
  } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'creation' | 'dueDate' | 'impact'>('creation');
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // 1. Initial Retrieval on Mount (SWR Caching Layer)
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // 2. Throttled Re-Fetching (Throttles WebSocket events by min 2000ms debounce window)
  useSmartRefresh(() => {
    console.log('[Tasks] Event received: running throttled tasks API sync.');
    fetchTasks();
  }, 2000);

  // 3. Client-Side Archiving Ticker (Runs locally every 60s, 0 API calls)
  useLocalTick();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setIsQuickAddOpen(false);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setEditingTask(null);
        setIsModalOpen(true);
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTitle.trim()) {
      setIsQuickAddOpen(false);
      return;
    }
    const now = new Date();
    now.setHours(now.getHours() + 1);

    try {
      await addTask({
        title: quickAddTitle,
        impact: 'medium',
        dueDate: now.toISOString(),
        effort: 1.0,
      });
      setQuickAddTitle('');
      setIsQuickAddOpen(false);
    } catch (err) {
      console.error('Failed to quick add task:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleOpenModal = (task?: Task) => {
    setEditingTask(task || null);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'isArchived'>) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: taskData.title,
          impact: taskData.impact,
          dueDate: taskData.dueDate,
          effort: taskData.effort,
          status: taskData.status,
        });
      } else {
        await addTask({
          title: taskData.title,
          impact: taskData.impact,
          dueDate: taskData.dueDate,
          effort: taskData.effort,
          status: taskData.status,
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      await toggleTaskStatus(id);
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const isArchived = task.isArchived || false;
    const matchesView = view === 'archived' ? isArchived : !isArchived;
    return matchesSearch && matchesView;
  }).sort((a, b) => {
    if (sortBy === 'creation') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'dueDate') {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    } else if (sortBy === 'impact') {
      const impactWeights = { high: 3, medium: 2, low: 1 };
      return impactWeights[b.impact] - impactWeights[a.impact];
    }
    return 0;
  });

  const handleExportTasks = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "obsidian_tasks_export.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-4 md:p-8 overflow-y-auto space-y-6 flex-1">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Tasks</h1>
          <p className="text-slate-500 mt-1">Manage your tasks.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportTasks}
            className="bg-[#111726] border border-white/[0.08] hover:border-white/[0.12] text-slate-300 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Tasks</span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            title="Press 'N' to provision task"
          >
            <Plus className="w-5 h-5" />
            Add Task
          </button>
        </div>
      </header>
      
      {/* Action Tabs */}
      <div className="flex border-b border-white/[0.08] mb-6">
        <button 
          onClick={() => setView('active')}
          className={cn("px-6 py-3 text-sm font-medium border-b-2 transition-colors", view === 'active' ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500 hover:text-slate-300")}
        >
          Active
        </button>
        <button 
          onClick={() => setView('archived')}
          className={cn("px-6 py-3 text-sm font-medium border-b-2 transition-colors", view === 'archived' ? "border-amber-500 text-amber-400" : "border-transparent text-slate-500 hover:text-slate-300")}
        >
          Archive
        </button>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks... (Press 'S' to focus)"
            className="w-full bg-[#111726] border border-white/[0.08] rounded-xl py-3.5 pl-12 pr-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
          />
        </div>
        <div className="sm:w-64 shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full h-full min-h-[52px] bg-[#111726] border border-white/[0.08] rounded-xl px-4 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 appearance-none outline-none"
            style={{ 
              backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, 
              backgroundPosition: `right 1rem center`, 
              backgroundRepeat: `no-repeat`, 
              backgroundSize: `1.5em 1.5em`, 
              paddingRight: `2.5rem` 
            }}
          >
            <option value="creation">Sort by Creation Time</option>
            <option value="dueDate">Sort by Due Date</option>
            <option value="impact">Sort by Priority (Impact)</option>
          </select>
        </div>
      </div>

      {/* Grid Layout (Desktop) / Stacked Cards (Mobile) */}
      {isFetching.tasks && tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-500 text-sm">Retrieving secure task payload...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/[0.06] rounded-2xl bg-[#111726]/20">
          <CheckCircle2 className="w-10 h-10 text-slate-600 mb-4" />
          <p className="text-slate-300 font-medium">No tasks found</p>
          <p className="text-slate-500 text-xs mt-1">Select a different view or add a new task to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <AnimatePresence>
            {filteredTasks.map(task => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                key={task.id}
                className="bg-[#111726] border border-white/[0.06] rounded-2xl p-5 flex flex-col hover:border-white/[0.12] transition-colors duration-200 group"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <button 
                    onClick={() => toggleStatus(task.id)}
                    className="mt-1 flex-shrink-0 text-slate-500 hover:text-blue-400 transition-colors"
                  >
                    {task.status === 'completed' ? (
                       <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : (
                       <Circle className="w-6 h-6" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className={cn("text-slate-100 font-medium leading-tight", {
                      "line-through text-slate-500": task.status === 'completed'
                    })}>
                      {task.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenModal(task)}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(task.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 border-t border-white/[0.04]">
                <Badge impact={task.impact} />
                <div className="flex items-center gap-1.5 text-slate-400 text-xs bg-[#0d121f] px-2.5 py-1 rounded-md border border-white/[0.04]">
                  <Clock className="w-3.5 h-3.5" />
                  {task.effort}h
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs bg-[#0d121f] px-2.5 py-1 rounded-md border border-white/[0.04] ml-auto">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(parseISO(task.dueDate), 'MMM d, ha')}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      )}

      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveTask}
        initialData={editingTask}
      />
      </div>

      {/* Quick Add FAB */}
      <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40">
        <AnimatePresence mode="wait">
          {!isQuickAddOpen ? (
            <motion.button
              key="quick-add-button"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsQuickAddOpen(true)}
              className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-500/20 hover:bg-blue-500 transition-colors custom-glow"
            >
              <Zap className="w-6 h-6" />
            </motion.button>
          ) : (
            <motion.form
              key="quick-add-form"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onSubmit={handleQuickSubmit}
              className="bg-[#111726] border border-blue-500/30 p-2 rounded-2xl shadow-2xl custom-glow flex items-center gap-2"
            >
              <input
                type="text"
                autoFocus
                value={quickAddTitle}
                onChange={(e) => setQuickAddTitle(e.target.value)}
                placeholder="Quick add..."
                className="bg-transparent border-none focus:outline-none text-slate-100 placeholder:text-slate-500 px-3 py-2 w-48 sm:w-64"
              />
              <button 
                type="button" 
                onClick={() => setIsQuickAddOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
              <button 
                type="submit" 
                disabled={!quickAddTitle.trim()}
                className="w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 rounded-xl flex items-center justify-center text-white transition-colors flex-shrink-0"
              >
                <Plus className="w-5 h-5" />
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Badge({ impact }: { impact: Impact }) {
  const styles = {
    high: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  }[impact];
  
  return (
    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border", styles)}>
      {impact}
    </span>
  );
}

function TaskModal({ isOpen, onClose, onSave, initialData }: { isOpen: boolean, onClose: () => void, onSave: (d: any) => void, initialData: Task | null }) {
  const [title, setTitle] = useState('');
  const [impact, setImpact] = useState<Impact>('medium');
  const [effort, setEffort] = useState('1.0');
  const [status, setStatus] = useState<Status>('pending');
  // Simple local timezone string for input type="datetime-local"
  const [dueDate, setDueDate] = useState('');

  React.useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setImpact(initialData.impact);
      setEffort(initialData.effort.toString());
      setStatus(initialData.status);
      
      // format to YYYY-MM-DDThh:mm
      try {
        const d = new Date(initialData.dueDate);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formatted = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setDueDate(formatted);
      } catch (e) {
        setDueDate('');
      }
    } else {
      setTitle('');
      setImpact('medium');
      setEffort('1.0');
      setStatus('pending');
      const now = new Date();
      now.setHours(now.getHours() + 1); // default 1 hour from now
      const pad = (n: number) => n.toString().padStart(2, '0');
      setDueDate(`${now.getFullYear()}-${pad(now.getMonth()+1)}-${now.getDate()}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    // Parse to ISO String
    const isoDate = new Date(dueDate).toISOString();

    onSave({
      title,
      impact,
      effort: parseFloat(effort) || 0,
      status,
      dueDate: isoDate
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-[#111726] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-100 mb-6 tracking-tight">
            {initialData ? 'Edit Task' : 'New Task'}
          </h2>
          
          <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block uppercase tracking-wider">Task Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Buy groceries"
                className="w-full bg-[#0d121f] border border-white/[0.08] rounded-lg py-2.5 px-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block uppercase tracking-wider">Priority</label>
                <select
                  value={impact}
                  onChange={(e) => setImpact(e.target.value as Impact)}
                  className="w-full bg-[#0d121f] border border-white/[0.08] rounded-lg py-2.5 px-4 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 appearance-none"
                >
                  <option value="low">Low Impact</option>
                  <option value="medium">Medium Impact</option>
                  <option value="high">High Impact</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block uppercase tracking-wider">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Status)}
                  className="w-full bg-[#0d121f] border border-white/[0.08] rounded-lg py-2.5 px-4 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 appearance-none"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block uppercase tracking-wider">Estimated Time (Hours)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={effort}
                  onChange={(e) => setEffort(e.target.value)}
                  className="w-full bg-[#0d121f] border border-white/[0.08] rounded-lg py-2.5 px-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block uppercase tracking-wider">Due Date</label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#0d121f] border border-white/[0.08] rounded-lg py-2.5 px-4 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 hide-calendar-icon [&::-webkit-calendar-picker-indicator]:invert-[0.6]"
                  required
                />
              </div>
            </div>
          </form>
        </div>
        
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-end gap-3 bg-[#0d121f]/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            form="task-form"
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200"
          >
            {initialData ? 'Save Changes' : 'Add Task'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
