import React, { useState, useEffect } from 'react';
import { Save, Shield, Check, User, Lock, Eye, EyeOff, Edit2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export function SettingsPage() {
  const { toast } = useToast();
  const { user, login, token } = useAuth();

  // Profile State
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isProfileSaved, setIsProfileSaved] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  const handleSaveProfile = async () => {
    setIsProfileSaving(true);
    try {
      const payload: any = {};
      if (email !== user?.email) payload.email = email;
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        setIsProfileSaving(false);
        return;
      }

      const response = await api.put('/user/profile', payload);
      
      setIsProfileSaved(true);
      toast({
        title: 'Profile Updated',
        description: 'Your account information has been successfully updated.',
        type: 'success',
      });
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');

      // Update AuthContext if a new token was returned (e.g. email or password changed)
      if (response.data?.data?.token && token) {
        // We reuse the existing name, just update the email/token
        const updatedUser = {
          ...user!,
          email: response.data.data.email
        };
        login(response.data.data.token, updatedUser);
      }

      setTimeout(() => {
        setIsProfileSaved(false);
        setIsEditingProfile(false);
      }, 2000);
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.response?.data?.message || 'Could not update profile information.',
        type: 'error',
      });
    } finally {
      setIsProfileSaving(false);
    }
  };



  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl space-y-6">
          <header className="mb-6">
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Settings</h1>
            <p className="text-slate-500 mt-1">Manage your preferences.</p>
          </header>

      {/* Account Profile Section */}
      <div className="bg-[#111726] border border-white/[0.06] rounded-2xl overflow-hidden mb-6 transition-all duration-300">
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Account Profile
            </h2>
            <p className="text-sm text-slate-500 mt-1">Update your email address and password.</p>
          </div>
          <button
            onClick={() => {
              setIsEditingProfile(!isEditingProfile);
              if (!isEditingProfile && user?.email) {
                setEmail(user.email);
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.15] bg-[#0d121f] text-slate-300 hover:text-slate-100 text-xs font-medium transition-colors"
          >
            {isEditingProfile ? (
              <>
                <X className="w-3.5 h-3.5" />
                Cancel
              </>
            ) : (
              <>
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </>
            )}
          </button>
        </div>
        
        <AnimatePresence>
          {isEditingProfile && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 space-y-6">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full sm:max-w-md bg-[#0d121f] border border-white/[0.08] rounded-lg py-2.5 px-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
            />
          </div>

          <div className="border-t border-white/[0.04] pt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block uppercase tracking-wider">Current Password</label>
              <div className="relative sm:max-w-md">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Required if changing password"
                  className="w-full bg-[#0d121f] border border-white/[0.08] rounded-lg py-2.5 pl-10 pr-10 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block uppercase tracking-wider">New Password</label>
              <div className="relative sm:max-w-md">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full bg-[#0d121f] border border-white/[0.08] rounded-lg py-2.5 pl-10 pr-10 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
          <div className="p-6 border-t border-white/[0.06] bg-[#0d121f]/50 flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={isProfileSaved || isProfileSaving || (email === user?.email && !newPassword)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                isProfileSaved 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white'
              }`}
            >
              {isProfileSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isProfileSaving ? 'Saving...' : 'Save Profile'}
                </>
              )}
            </button>
          </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      
          <div className="mt-8 flex items-center justify-center gap-2 text-slate-500 text-xs">
            <Shield className="w-4 h-4 opacity-50" />
            Your data is secure.
          </div>
        </div>
      </div>
    </div>
  );
}
