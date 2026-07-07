import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import { UploadedReport } from '../types';
import { FileText, Upload, Download, ArrowRight, Loader2, Sparkles } from 'lucide-react';

interface ReportsProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export default function Reports({ onSuccessToast, onErrorToast }: ReportsProps) {
  const [reports, setReports] = useState<UploadedReport[]>([]);
  const [activeReport, setActiveReport] = useState<UploadedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchReports = async () => {
    try {
      const data = await apiService.reports.list();
      setReports(data);
      if (data.length > 0) {
        setActiveReport(data[0]);
      }
    } catch (e) {
      onErrorToast("Failed to retrieve reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const newRep = await apiService.reports.upload(file.name, "metabolic details");
      setReports(prev => [newRep, ...prev]);
      setActiveReport(newRep);
      onSuccessToast(`Report '${file.name}' parsed and indexed successfully.`);
    } catch (err) {
      onErrorToast("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadSummary = (report: UploadedReport) => {
    if (!report.summaryCached) return;
    
    const element = document.createElement("a");
    const file = new Blob([report.summaryCached], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${report.filename.split('.')[0]}_summary.txt`;
    document.body.appendChild(element);
    element.click();
    onSuccessToast("Summary download started.");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-500 font-mono animate-pulse-soft">Loading medical data...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* File Upload & List panel */}
      <div className="space-y-6">
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="p-8 border border-dashed border-slate-800 hover:border-indigo-500 bg-slate-900/10 hover:bg-indigo-600/5 rounded-3xl cursor-pointer flex flex-col items-center justify-center text-center gap-3 transition-all duration-300"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUpload} 
            className="hidden" 
            accept=".pdf,.txt" 
          />
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
            {uploading ? <Loader2 className="animate-spin" /> : <Upload size={22} />}
          </div>
          <div>
            <p className="text-sm font-bold">Upload Lab Report</p>
            <p className="text-xs text-slate-500 mt-1">Select PDF or clinical text file</p>
          </div>
        </div>

        {/* Uploaded Files list */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Uploaded Files</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {reports.map((rep) => (
              <button
                key={rep.id}
                onClick={() => setActiveReport(rep)}
                className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  activeReport?.id === rep.id
                    ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-400 font-semibold'
                    : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <FileText size={18} className="shrink-0" />
                <span className="text-sm truncate flex-1">{rep.filename}</span>
                <ArrowRight size={14} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary View Panel */}
      <div className="lg:col-span-2">
        {activeReport ? (
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 relative overflow-hidden">
            {/* Ambient decoration */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-600/5 rounded-full blur-2xl"></div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-100">{activeReport.filename}</h3>
                  <p className="text-xs text-slate-500 mt-1">Uploaded on {new Date(activeReport.uploadedAt || activeReport.createdAt || '').toLocaleDateString()}</p>
                </div>
              </div>
              
              <button
                onClick={() => handleDownloadSummary(activeReport)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-800 hover:bg-indigo-950/20 hover:text-indigo-400 hover:border-indigo-900/35 text-xs font-semibold rounded-xl transition-colors shrink-0"
              >
                <Download size={14} />
                <span>Download Text Summary</span>
              </button>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold flex items-center gap-1.5 text-indigo-400">
                <Sparkles size={16} />
                <span>AI Clinical Summary</span>
              </h4>
              <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-line bg-slate-950/40 p-5 rounded-2xl border border-slate-900">
                {activeReport.summaryCached}
              </p>
            </div>
            
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
              <p className="text-[10px] text-slate-500 leading-normal">
                Notice: Summaries are compiled using ChromaDB RAG. Embeddings match semantic contexts from the original report file.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-[400px] border border-slate-850 bg-slate-950/30 rounded-3xl flex items-center justify-center text-slate-500 font-mono">
            No document selected. Upload a report to begin analysis.
          </div>
        )}
      </div>
    </div>
  );
}
