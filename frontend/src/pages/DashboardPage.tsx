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
    focusTask,
    notifications,
    isFetching,
    fetchTasks,
    fetchDashboard,
    fetchFocusTask,
    fetchNotifications,
    toggleTaskStatus,
    markNotificationAsRead,
  } = useAppStore();

  // 1. Initial Retrieval on Mount (Utilizes cached memory slices instantly in SWR pattern)
  useEffect(() => {
    fetchTasks();
    fetchDashboard();
    fetchFocusTask();
    fetchNotifications();
  }, [fetchTasks, fetchDashboard, fetchFocusTask, fetchNotifications]);

  // 2. Throttled Re-Fetching (Throttles WebSocket-driven refreshes by at least 2000ms to avoid API spikes)
  useSmartRefresh(() => {
    console.log('[Dashboard] Event received: running throttled REST API sync.');
    fetchTasks();
    fetchDashboard();
    fetchFocusTask();
    fetchNotifications();
  }, 2000);

  const handleResolveTarget = async (id: string) => {
    try {
      await toggleTaskStatus(id);
      fetchFocusTask();
      fetchDashboard();
    } catch (err) {
      console.error('Failed to resolve focus task:', err);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationAsRead(id);
      fetchDashboard();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
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
        <p className="text-slate-500 text-sm">Synchronizing Command Center telemetry...</p>
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
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Command Center</h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-0.5">Real-time Telemetry Overview</p>
        </div>
        <div className="hidden md:flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>System Online</span>
          </div>
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
                <h3 className="text-sm font-semibold text-rose-100">Dynamic Burnout Alert</h3>
                <p className="text-xs text-rose-300 opacity-80 mt-0.5">Cumulative pending effort ({pendingLoad}h) exceeds safe operational thresholds. Prioritize offloading.</p>
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
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Logged</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-slate-100">{totalLogged}h</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">{activeAnalytics.completedTasks} tasks completed</p>
        </div>

        <div className="bg-[#111726] border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Pending Load</p>
          <div className="flex items-end gap-2">
             <span className="text-2xl font-bold text-amber-400">{pendingLoad}h</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">{pendingTasksCount} tasks pending</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Focus & Warning) - Uses more space on larger screens */ }
        <div className="space-y-6 lg:col-span-8">
          {/* Active Focus Target */}
          {focusTask ? (
            <div className="bg-blue-600/10 border border-blue-500/30 p-6 rounded-2xl custom-glow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <div className="relative z-10">
                <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Primary Focus Target</div>
                <h2 className="text-lg font-semibold text-slate-100 mb-2 leading-tight">{focusTask.title}</h2>
                <div className="flex items-center space-x-2 mb-4">
                  <div className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border", {
                    "text-rose-400 bg-rose-500/10 border-rose-500/20": focusTask.impact === 'high',
                    "text-amber-400 bg-amber-500/10 border-amber-500/20": focusTask.impact === 'medium',
                    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20": focusTask.impact === 'low',
                  })}>
                    {focusTask.impact} Impact
                  </div>
                  <div className="text-[10px] text-slate-500">Est. {focusTask.effort}h</div>
                </div>
                <button
                  onClick={() => handleResolveTarget(focusTask.id)}
                  className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all cursor-pointer"
                >
                  Resolve Target
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#111726]/40 border border-white/[0.06] p-6 rounded-2xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Primary Focus Target</div>
                <h2 className="text-lg font-semibold text-slate-400 mb-2 leading-tight">Workload fully clear</h2>
                <p className="text-xs text-slate-500">No pending focus tasks. Add tasks or take a break!</p>
              </div>
            </div>
          )}

          {/* 7-Day Velocity Chart */}
          <div className="bg-[#111726] border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest">7-Day Velocity</h3>
                <p className="text-[11px] text-slate-500 mt-1">Tasks completed per day</p>
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
                {/* Bar chart */}
                <div className="flex items-end justify-between gap-1 h-36 pb-0">
                  {timelineData.map((data) => {
                    const barHeight = Math.max(data.percentage, data.count > 0 ? 8 : 3);
                    const isToday = data.date === new Date().toISOString().slice(0, 10);
                    return (
                      <div key={data.date} className="flex-1 flex flex-col items-center justify-end group relative">
                        {/* Count label above bar */}
                        {data.count > 0 && (
                          <span className="text-[10px] font-bold text-blue-300 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            {data.count}
                          </span>
                        )}
                        {/* Bar */}
                        <div
                          className="w-full rounded-t-md transition-all duration-500 ease-out relative overflow-hidden cursor-default"
                          style={{
                            height: `${barHeight}%`,
                            background: data.count > 0
                              ? isToday
                                ? 'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)'
                                : 'linear-gradient(180deg, #3b82f6aa 0%, #1d4ed880 100%)'
                              : 'rgba(255,255,255,0.04)'
                          }}
                        >
                          {/* Shimmer on hover for active bars */}
                          {data.count > 0 && (
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          )}
                        </div>
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <div className="bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-center whitespace-nowrap shadow-xl">
                            <p className="text-[11px] font-bold text-slate-100">{data.count} task{data.count !== 1 ? 's' : ''}</p>
                            <p className="text-[10px] text-slate-400">{data.day}</p>
                          </div>
                          {/* Arrow */}
                          <div className="w-2 h-2 bg-slate-800 border-r border-b border-white/10 rotate-45 mx-auto -mt-1" />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Baseline */}
                <div className="h-px bg-white/[0.06] w-full mt-0" />
                {/* Day labels */}
                <div className="flex justify-between gap-1 mt-2">
                  {timelineData.map((data) => (
                    <div key={data.date} className="flex-1 text-center">
                      <span className={`text-[10px] font-medium ${
                        data.date === new Date().toISOString().slice(0, 10)
                          ? 'text-blue-400'
                          : 'text-slate-500'
                      }`}>{data.day}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Warnings Stream) */}
        <div className="bg-[#111726] p-6 rounded-2xl border border-white/[0.06] flex flex-col h-full lg:col-span-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Recent Warnings</h3>
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No recent warnings log found.</p>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className="flex items-start space-x-3 group/notif">
                   <div className={cn("w-1.5 h-1.5 mt-1.5 rounded-full flex-shrink-0", notif.isRead ? "bg-slate-700" : "bg-amber-500 animate-pulse")} />
                   <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-start gap-2">
                       <p className={cn("text-xs font-semibold truncate", notif.isRead ? "text-slate-500" : "text-slate-200")}>{notif.title}</p>
                       {!notif.isRead && (
                         <button
                           onClick={() => handleMarkAsRead(notif.id)}
                           className="text-[10px] text-blue-400 hover:text-blue-300 opacity-0 group-hover/notif:opacity-100 transition-opacity flex-shrink-0 cursor-pointer font-medium"
                         >
                           Dismiss
                         </button>
                       )}
                     </div>
                     <p className={cn("text-xs mt-0.5", notif.isRead ? "text-slate-600" : "text-slate-400")}>{notif.message}</p>
                     <p className="text-[10px] text-slate-500 mt-1">{formatTimeAgo(notif.createdAt)}</p>
                   </div>
                </div>
              ))
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
