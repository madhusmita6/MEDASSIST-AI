import React from 'react';
import { 
  Bot, 
  Cpu, 
  Database, 
  ShieldCheck, 
  UserCheck, 
  HardDrive, 
  Cloud,
  Puzzle
} from 'lucide-react';

export default function FeatureBadges() {
  const features = [
    { label: 'Google ADK', desc: 'Agent orchestrator & state transitions', icon: Bot, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    { label: 'Agent Skills', desc: 'Custom workspace clinical skills', icon: Cpu, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    { label: 'MCP Integration', desc: 'Calendar, Maps, and Gmail MCP servers', icon: Puzzle, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { label: 'ChromaDB RAG', desc: 'Blood panel chunk embeddings', icon: Database, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Security Guardrails', desc: 'Prompt injection & prescrip checks', icon: ShieldCheck, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    { label: 'Human-in-the-loop', desc: 'Interactive approval overrides', icon: UserCheck, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { label: 'Agent Session DB', desc: 'Persistent state serialization', icon: HardDrive, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
    { label: 'Cloud Run Ready', desc: 'Dockerized multi-container deploy', icon: Cloud, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
      {features.map((feat, idx) => {
        const Icon = feat.icon;
        return (
          <div 
            key={idx} 
            className={`p-4 rounded-2xl border flex flex-col gap-2 glass-panel hover:scale-[1.02] transition-transform duration-200 cursor-default`}
          >
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg border ${feat.color.split(' ')[1]} ${feat.color.split(' ')[2]} ${feat.color.split(' ')[0]}`}>
                <Icon size={16} />
              </div>
              <span className="text-xs font-bold text-slate-200 tracking-wide">{feat.label}</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-normal leading-relaxed">{feat.desc}</p>
          </div>
        );
      })}
    </div>
  );
}
