import React, { useState, useEffect } from 'react';
import { evaluationService, EvaluationMetrics } from '../services/evaluation';
import { 
  Activity, 
  ShieldCheck, 
  Puzzle, 
  Database, 
  HeartPulse, 
  CheckCircle,
  HelpCircle,
  Bug
} from 'lucide-react';

interface EvaluationDashboardProps {
  onErrorToast: (msg: string) => void;
}

export default function EvaluationDashboard({ onErrorToast }: EvaluationDashboardProps) {
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    evaluationService.getMetrics()
      .then(res => setMetrics(res))
      .catch(() => onErrorToast("Failed to fetch evaluation metrics."))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-500 font-mono animate-pulse-soft">Loading evaluation dashboard...</div>
      </div>
    );
  }

  const statCards = [
    { label: 'Overall Quality Score', value: `${metrics.overallHealthScore}%`, desc: 'Average precision index', icon: Activity, color: 'text-indigo-400 border-indigo-500/20' },
    { label: 'Security Health', value: `${metrics.securityScore}%`, desc: 'PII leaks & isolation tests', icon: ShieldCheck, color: 'text-rose-400 border-rose-500/20' },
    { label: 'Tool Selection Accuracy', value: `${metrics.toolSelectionAccuracy}%`, desc: 'Graph routing routing success', icon: Puzzle, color: 'text-blue-400 border-blue-500/20' },
    { label: 'RAG Context Recall', value: `${metrics.ragRetrievalAccuracy}%`, desc: 'ChromaDB citation recall', icon: Database, color: 'text-emerald-400 border-emerald-500/20' }
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="p-8 glass-panel border border-slate-800 rounded-3xl">
        <h1 className="text-3xl font-bold tracking-tight">Agent Evaluation & Test Center</h1>
        <p className="text-slate-400 mt-2 text-sm">
          Real-time execution diagnostics, accuracy metrics, and security check verification dashboards.
        </p>
      </div>

      {/* Stats Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="p-6 glass-card rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</span>
                <Icon size={18} className={stat.color.split(' ')[0]} />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight">{stat.value}</h2>
              <p className="text-[10px] text-slate-500 leading-normal">{stat.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Core evaluation progress bars */}
        <div className="lg:col-span-2 glass-panel border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Activity size={18} className="text-indigo-400" />
            <span>Diagnostic Breakdown</span>
          </h3>

          <div className="space-y-5">
            {/* Tool selection bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-semibold">ADK Graph Tool Routing Accuracy</span>
                <span className="text-indigo-400 font-bold">{metrics.toolSelectionAccuracy}%</span>
              </div>
              <div className="h-2.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${metrics.toolSelectionAccuracy}%` }}></div>
              </div>
            </div>

            {/* Prompt injection bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-semibold">Prompt Injection Shields</span>
                <span className="text-rose-400 font-bold">{metrics.promptInjectionPassed}/{metrics.promptInjectionTotal} Passed</span>
              </div>
              <div className="h-2.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            {/* RAG recall bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-semibold">ChromaDB RAG Retrieval Recall</span>
                <span className="text-emerald-400 font-bold">{metrics.ragRetrievalAccuracy}%</span>
              </div>
              <div className="h-2.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${metrics.ragRetrievalAccuracy}%` }}></div>
              </div>
            </div>

            {/* Emergency triage accuracy */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-semibold">Emergency Triage Severity Classification</span>
                <span className="text-amber-400 font-bold">{metrics.emergencyTriageAccuracy}%</span>
              </div>
              <div className="h-2.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${metrics.emergencyTriageAccuracy}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed pass fail log */}
        <div className="glass-panel border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Bug size={16} className="text-indigo-400" />
            <span>Test Runner Suite Logs</span>
          </h3>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {metrics.testDetails.map((test, idx) => (
              <div key={idx} className="p-3.5 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-between text-xs">
                <div className="space-y-1 min-w-0">
                  <p className="font-mono text-slate-300 truncate">{test.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide capitalize">{test.category} test</p>
                </div>
                <span className="shrink-0 px-2 py-0.5 bg-emerald-950/20 border border-emerald-500/25 rounded text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                  {test.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
