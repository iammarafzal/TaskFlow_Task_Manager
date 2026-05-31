import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, Target, Zap, Clock, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';
import { useSmartRefresh } from '../hooks/useSmartRefresh';

export function DashboardPage() {
  const {
    tasks,
    dashboardAnalytics: analytics,
    focusTasks,
    isFetching,
    fetchTasks,
    fetchDashboard,
    fetchFocusTasks,
    toggleTaskStatus,
  } = useAppStore();

  // 1. Initial Retrieval on Mount (Utilizes cached memory slices instantly in SWR pattern)
  useEffect(() => {
    fetchTasks();
    fetchDashboard();
    fetchFocusTasks();
  }, [fetchTasks, fetchDashboard, fetchFocusTasks]);

  // 2. Throttled Re-Fetching (Throttles WebSocket-driven refreshes by at least 2000ms to avoid API spikes)
  useSmartRefresh(() => {
    console.log('[Dashboard] Event received: running throttled REST API sync.');
    fetchTasks();
    fetchDashboard();
    fetchFocusTasks();
  }, 2000);

  const handleResolveTarget = async (id: string) => {
    try {
      await toggleTaskStatus(id);
      fetchFocusTasks();
      fetchDashboard();
    } catch (err) {
      console.error('Failed to resolve focus task:', err);
    }
  };


  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60000);
      const diffDays = Math.floor(diffHrs / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return `${diffDays}d ago`;
    } catch (err) {
      return '';
    }
  };

  const getDayName = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(year, monthIndex, day);
        return date.toLocaleDateString([], { weekday: 'short' });
      }
      const date = new Date(dateStr);
      return date.toLocaleDateString([], { weekday: 'short' });
    } catch (err) {
      return dateStr;
    }
  };

  const totalLogged = tasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.effort, 0);
  const pendingLoad = tasks.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.effort, 0);
  const pendingTasksCount = tasks.filter(t => t.status === 'pending').length;

  const timelineData = analytics?.analytics7Days?.map((d: any) => ({
    day: getDayName(d.date),
    date: d.date,
    count: d.count as number,
    percentage: d.percentage as number
  })) || [];

  const totalVelocity = timelineData.reduce((s, d) => s + d.count, 0);

  // Show fallback loading spinner only on initial load when data is empty
  const isInitialLoad = !analytics && isFetching.dashboardAnalytics;

  if (isInitialLoad) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full py-20">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-500 text-sm">Loading your dashboard...</p>
      </div>
    );
  }

  // Safe default fallback structure
  const activeAnalytics = analytics || {
    completionProgress: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    burnoutWarning: false,
  };

  return (
    <div className="flex flex-col h-full w-full">
      <header className="h-20 shrink-0 px-4 md:px-8 border-b border-white/[0.06] flex items-center justify-between bg-[#090d16]">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Dashboard</h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-0.5">Your daily progress at a glance</p>
        </div>
      </header>

      <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-6">
        {/* Burnout Banner */}
        {activeAnalytics.burnoutWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 burnout-glow flex items-center justify-between animate-pulse group"
          >
            <div className="flex items-center space-x-4 relative z-10">
              <div className="w-10 h-10 flex items-center justify-center bg-rose-500/20 rounded-full text-rose-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-rose-100">Heavy Workload</h3>
                <p className="text-xs text-rose-300 opacity-80 mt-0.5">You have {pendingLoad} hours of pending tasks. Consider taking a break or asking for help.</p>
              </div>
            </div>
            <div className="text-rose-400 text-lg font-mono font-bold hidden sm:block">
              {pendingLoad} hrs
            </div>
          </motion.div>
        )}

        {/* Primary Telemetry */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-[#111726] border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Completion Rate</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-slate-100">{activeAnalytics.completionProgress}<span className="text-lg text-slate-500">%</span></span>
            </div>
            <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${activeAnalytics.completionProgress}%` }}></div>
            </div>
          </div>

          <div className="bg-[#111726] border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Hours Completed</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-slate-100">{totalLogged}h</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">{activeAnalytics.completedTasks} tasks completed</p>
          </div>

          <div className="bg-[#111726] border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Pending Hours</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-amber-400">{pendingLoad}h</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">{pendingTasksCount} tasks pending</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Active Focus Targets */}
            {focusTasks && focusTasks.length > 0 ? (
              <div className="space-y-4">
                <div className="text-xs font-bold text-blue-400 uppercase tracking-widest pl-1">Top Priorities</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {focusTasks.map((task) => (
                    <div key={task.id} className="bg-blue-600/10 border border-blue-500/30 p-5 rounded-2xl custom-glow relative overflow-hidden flex flex-col h-full justify-between group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 blur-2xl transition-all duration-500 group-hover:bg-blue-500/10"></div>
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex-1">
                          <h2 className="text-base font-semibold text-slate-100 mb-3 leading-tight line-clamp-2">{task.title}</h2>
                          <div className="flex items-center space-x-2 mb-4">
                            <div className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border", {
                              "text-rose-400 bg-rose-500/10 border-rose-500/20": task.impact === 'high',
                              "text-amber-400 bg-amber-500/10 border-amber-500/20": task.impact === 'medium',
                              "text-emerald-400 bg-emerald-500/10 border-emerald-500/20": task.impact === 'low',
                            })}>
                              {task.impact}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {task.effort}h
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleResolveTarget(task.id)}
                          className="w-full px-4 py-2 bg-blue-600/80 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 group-hover:bg-blue-500"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Complete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-[#111726]/40 border border-white/[0.06] p-6 rounded-2xl relative overflow-hidden h-full flex flex-col justify-center min-h-[140px]">
                <div className="relative z-10">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Top Priorities</div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-full">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-400 leading-tight">All caught up!</h2>
                      <p className="text-xs text-slate-500 mt-0.5">You don't have any pressing tasks right now.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7-Day Velocity Chart */}
            <div className="bg-[#111726] border border-white/[0.06] rounded-2xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest">Weekly Progress</h3>
                  <p className="text-[11px] text-slate-500 mt-1">Tasks you finished each day</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-blue-400">{totalVelocity}</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">past 7 days</p>
                </div>
              </div>
              {totalVelocity === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 border border-dashed border-white/[0.06] rounded-xl">
                  <Activity className="w-7 h-7 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500">No tasks completed in the last 7 days.</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Bar chart area — fixed pixel height so % heights resolve correctly */}
                  <div className="relative w-full" style={{ height: '144px' }}>
                    <div className="absolute inset-0 flex items-end gap-1.5">
                      {timelineData.map((data) => {
                        const barPct = data.count > 0 ? Math.max(data.percentage, 10) : 4;
                        const todayLocal = (() => {
                          const n = new Date();
                          return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
                        })();
                        const isToday = data.date === todayLocal;
                        return (
                          <div
                            key={data.date}
                            className="relative flex-1 group"
                            style={{ height: '100%' }}
                          >
                            {/* Bar — anchored at bottom with absolute positioning */}
                            <div
                              className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-500 ease-out"
                              style={{
                                height: `${barPct}%`,
                                background: data.count > 0
                                  ? isToday
                                    ? 'linear-gradient(180deg, #93c5fd 0%, #2563eb 100%)'
                                    : 'linear-gradient(180deg, #60a5fa88 0%, #1d4ed866 100%)'
                                  : 'rgba(255,255,255,0.04)',
                                boxShadow: data.count > 0 && isToday
                                  ? '0 0 12px rgba(59,130,246,0.4)'
                                  : 'none'
                              }}
                            >
                              {/* Shimmer overlay on hover */}
                              {data.count > 0 && (
                                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200 rounded-t-md" />
                              )}
                            </div>

                            {/* Count badge — always visible above bar when count > 0 */}
                            {data.count > 0 && (
                              <div
                                className="absolute left-0 right-0 flex items-center justify-center"
                                style={{ bottom: `${barPct + 1}%` }}
                              >
                                <span className={`text-[10px] font-bold leading-none ${isToday ? 'text-blue-300' : 'text-slate-400'}`}>
                                  {data.count}
                                </span>
                              </div>
                            )}

                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                              <div className="bg-[#1e2840] border border-blue-500/20 rounded-lg px-3 py-2 text-center whitespace-nowrap shadow-2xl">
                                <p className="text-[12px] font-bold text-slate-100">{data.count} task{data.count !== 1 ? 's' : ''}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{data.day}{isToday ? ' · Today' : ''}</p>
                              </div>
                              <div className="w-2 h-2 bg-[#1e2840] border-r border-b border-blue-500/20 rotate-45 mx-auto -mt-1.5" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Baseline rule */}
                  <div className="h-px bg-white/[0.08] w-full" />

                  {/* Day labels */}
                  <div className="flex gap-1.5 mt-2">
                    {timelineData.map((data) => {
                      const todayLocal = (() => {
                        const n = new Date();
                        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
                      })();
                      return (
                        <div key={data.date} className="flex-1 text-center">
                          <span className={`text-[10px] font-semibold ${data.date === todayLocal ? 'text-blue-400' : 'text-slate-600'
                            }`}>
                            {data.day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}

// Inline check square
function CheckSquareIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}
