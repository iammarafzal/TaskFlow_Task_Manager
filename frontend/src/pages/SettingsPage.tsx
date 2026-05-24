import React, { useState, useEffect } from 'react';
import { Save, Bell, Clock, Shield, Check, Cloud, RefreshCw, Send } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import api from '../services/api';

export function SettingsPage() {
  const [digestTime, setDigestTime] = useState('08:00');
  const [alert1h, setAlert1h] = useState(true);
  const [alert3h, setAlert3h] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const response = await api.get('/user/settings');
      if (response.data?.success && response.data?.data) {
        const { dailyDigestTime, remind1h, remind3h } = response.data.data;
        setDigestTime(dailyDigestTime || '08:00');
        setAlert1h(remind1h !== undefined ? remind1h : true);
        setAlert3h(remind3h !== undefined ? remind3h : false);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error('Failed to load user configurations:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      await api.put('/user/settings', {
        dailyDigestTime: digestTime,
        remind1h: alert1h,
        remind3h: alert3h,
      });

      setIsSaved(true);
      toast({
        title: 'Configuration Saved',
        description: 'Your system preferences have been securely updated.',
        type: 'success',
      });
      setTimeout(() => {
        setIsSaved(false);
        setLastSyncTime(new Date());
      }, 2000);
    } catch (err: any) {
      toast({
        title: 'Configuration Error',
        description: err.response?.data?.message || 'Failed to save configuration preferences.',
        type: 'error',
      });
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetchSettings();
      toast({
        title: 'Cloud Sync Complete',
        description: 'Successfully synchronized data with the upstream server.',
        type: 'success',
      });
    } catch (err) {
      toast({
        title: 'Sync Failed',
        description: 'Could not synchronize data with the upstream server.',
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      await api.post('/notifications/test');
      // The socket connection will automatically receive the streamed notification, so no additional toast is required here.
    } catch (err: any) {
      toast({
        title: 'Alert Trigger Failed',
        description: err.response?.data?.message || 'Failed to send test alert.',
        type: 'error',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-4 md:p-8 overflow-y-auto space-y-6 max-w-3xl flex-1">
        <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your preferences.</p>
      </header>

      {/* Cloud Sync Status */}
      <div className="bg-[#111726] border border-blue-500/20 rounded-2xl overflow-hidden flex items-center justify-between p-4 px-6 relative group mb-6 shadow-lg shadow-black/20">
        <div className="absolute inset-0 bg-blue-500/[0.02] group-hover:bg-blue-500/[0.04] transition-colors" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-200">Cloud Sync</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Last saved: {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02] bg-[#0d121f] text-slate-300 hover:text-slate-100 text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      <div className="bg-[#111726] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400" />
              Alerts & Notifications
            </h2>
            <p className="text-sm text-slate-500 mt-1">Configure your notifications.</p>
          </div>
          <button
            onClick={handleTestNotification}
            disabled={isTesting}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.15] bg-[#0d121f] text-slate-300 hover:text-slate-100 text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isTesting ? 'Sending...' : 'Test Notification'}</span>
            <span className="sm:hidden">{isTesting ? '...' : 'Test'}</span>
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Digest Clock */}
          <div>
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Daily Summary Time
            </label>
            <p className="text-xs text-slate-500 mb-3">Set time for daily summary.</p>
            <input
              type="time"
              value={digestTime}
              onChange={(e) => setDigestTime(e.target.value)}
              className="w-full sm:w-48 bg-[#0d121f] border border-white/[0.08] rounded-lg py-2.5 px-4 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 [&::-webkit-calendar-picker-indicator]:invert-[0.6] cursor-pointer"
            />
          </div>

          <div className="border-t border-white/[0.04] pt-6 space-y-4">
            {/* 1h Alert Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-300">1 Hour Alert</div>
                <div className="text-xs text-slate-500">Notify me 1 hour before due date.</div>
              </div>
              <button 
                onClick={() => setAlert1h(!alert1h)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#090d16] ${alert1h ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${alert1h ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* 3h Alert Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-300">3 Hour Alert</div>
                <div className="text-xs text-slate-500">Notify me 3 hours before due date.</div>
              </div>
              <button 
                onClick={() => setAlert3h(!alert3h)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#090d16] ${alert3h ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${alert3h ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-white/[0.06] bg-[#0d121f]/50 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaved}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              isSaved 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' 
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="mt-8 flex items-center justify-center gap-2 text-slate-500 text-xs">
         <Shield className="w-4 h-4 opacity-50" />
         Your data is secure.
      </div>
      </div>
    </div>
  );
}
