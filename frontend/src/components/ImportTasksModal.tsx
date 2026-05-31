import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, CheckCircle2, AlertCircle, FileJson, FileText, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { useAppStore, Impact, Status } from '../store/useAppStore';
import { cn } from '../lib/utils';

interface ImportTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedTask {
  title: string;
  impact: Impact;
  effort: number;
  dueDate: string;
  status?: Status;
}

export function ImportTasksModal({ isOpen, onClose }: ImportTasksModalProps) {
  const { bulkAddTasks } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [validTasks, setValidTasks] = useState<ParsedTask[]>([]);
  const [invalidCount, setInvalidCount] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewLimit, setPreviewLimit] = useState(5);

  // Reset state when closing
  React.useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setValidTasks([]);
      setInvalidCount(0);
      setIsParsing(false);
      setIsSaving(false);
      setPreviewLimit(5);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [isOpen]);

  const validateAndMapTask = (row: any): ParsedTask | null => {
    try {
      const title = String(row.title || '').trim();
      if (!title) return null;

      const impactRaw = String(row.impact || '').toLowerCase();
      const impact: Impact = ['low', 'medium', 'high'].includes(impactRaw) ? (impactRaw as Impact) : 'medium';

      const effort = parseFloat(row.effort);
      if (isNaN(effort) || effort <= 0) return null;

      const dueDate = new Date(row.deadline || row.dueDate);
      if (isNaN(dueDate.getTime())) return null;

      let status: Status | undefined;
      const statusRaw = String(row.status || '').toLowerCase();
      if (statusRaw === 'completed' || statusRaw === 'pending') {
        status = statusRaw as Status;
      }

      return {
        title,
        impact,
        effort,
        dueDate: dueDate.toISOString(),
        status
      };
    } catch {
      return null;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);
    setValidTasks([]);
    setInvalidCount(0);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();

      try {
        let rows: any[] = [];
        
        if (extension === 'json') {
          rows = JSON.parse(content);
          if (!Array.isArray(rows)) {
            rows = [rows]; // handle single object
          }
        } else if (extension === 'csv') {
          const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
          rows = parsed.data;
        }

        const valid: ParsedTask[] = [];
        let invalid = 0;

        rows.forEach(row => {
          const task = validateAndMapTask(row);
          if (task) {
            valid.push(task);
          } else {
            invalid++;
          }
        });

        setValidTasks(valid);
        setInvalidCount(invalid);
      } catch (err) {
        console.error('Failed to parse file:', err);
        setInvalidCount(1); // just show an error indicator
      } finally {
        setIsParsing(false);
      }
    };
    
    reader.onerror = () => {
      setIsParsing(false);
    };

    reader.readAsText(selectedFile);
  };

  const handleSave = async () => {
    if (validTasks.length === 0) return;
    
    setIsSaving(true);
    try {
      await bulkAddTasks(validTasks);
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
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
        className="relative w-full max-w-2xl bg-[#111726] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-white/[0.08]">
          <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center justify-between">
            Import Tasks
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors rounded">
              <X className="w-5 h-5" />
            </button>
          </h2>
          <p className="text-slate-500 mt-1 text-sm">Upload a .json or .csv file to import tasks.</p>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/[0.1] hover:border-blue-500/50 hover:bg-blue-500/5 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group"
            >
              <input 
                type="file" 
                accept=".json,.csv" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <div className="w-16 h-16 bg-[#0d121f] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-black/20">
                <Upload className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-slate-300 font-medium text-lg">Click to select file</p>
              <p className="text-slate-500 text-sm mt-1">Accepts CSV or JSON</p>
            </div>
          ) : isParsing ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-400">Parsing file...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-[#0d121f] p-4 rounded-xl border border-white/[0.04]">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  {file.name.endsWith('.json') ? (
                    <FileJson className="w-6 h-6 text-blue-400" />
                  ) : (
                    <FileText className="w-6 h-6 text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 font-medium truncate">{file.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button 
                  onClick={() => setFile(null)}
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 px-3 py-1.5 bg-blue-500/10 rounded-lg transition-colors"
                >
                  Change File
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-emerald-400 font-bold text-lg">{validTasks.length}</p>
                    <p className="text-emerald-500/80 text-sm font-medium">Valid Tasks</p>
                  </div>
                </div>
                
                {invalidCount > 0 && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-rose-400 font-bold text-lg">{invalidCount}</p>
                      <p className="text-rose-500/80 text-sm font-medium">Skipped (Invalid)</p>
                    </div>
                  </div>
                )}
              </div>

              {validTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Preview</h3>
                  <div className="space-y-2">
                    {validTasks.slice(0, previewLimit).map((task, idx) => (
                      <div key={idx} className="bg-[#0d121f] border border-white/[0.04] p-3 rounded-lg flex items-center justify-between gap-4">
                        <span className="text-slate-300 text-sm truncate font-medium">{task.title}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                            task.impact === 'high' ? "text-rose-400 bg-rose-500/10 border-rose-500/20" :
                            task.impact === 'low' ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                            "text-amber-400 bg-amber-500/10 border-amber-500/20"
                          )}>
                            {task.impact}
                          </span>
                          <span className="text-xs text-slate-500">{task.effort}h</span>
                        </div>
                      </div>
                    ))}
                    {validTasks.length > previewLimit && (
                      <button 
                        onClick={() => setPreviewLimit(prev => prev + 5)}
                        className="w-full text-xs text-center text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 py-2 rounded-lg transition-colors mt-2"
                      >
                        + {validTasks.length - previewLimit} more tasks
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/[0.06] flex items-center justify-end gap-3 bg-[#0d121f]/50 mt-auto">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={validTasks.length === 0 || isSaving}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:shadow-none"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? 'Saving...' : `Save ${validTasks.length} Tasks`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
