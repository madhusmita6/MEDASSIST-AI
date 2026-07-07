import React from 'react';
import { Calendar, FileText, Pill, ShieldAlert } from 'lucide-react';

interface DemoScenariosProps {
  onSelectScenario: (text: string) => void;
}

export default function DemoScenarios({ onSelectScenario }: DemoScenariosProps) {
  const scenarios = [
    { label: 'Book Appointment', text: 'Book an appointment with Dr. Adams next Monday at 9:00 AM', icon: Calendar, color: 'hover:border-indigo-500/30 hover:bg-indigo-600/5 text-indigo-400 border-slate-800' },
    { label: 'Summarize Blood Report', text: 'Summarize metabolic_panel_june.pdf and check cholesterol levels', icon: FileText, color: 'hover:border-emerald-500/30 hover:bg-emerald-600/5 text-emerald-400 border-slate-800' },
    { label: 'Medication Reminder', text: 'Set medication reminder: Lisinopril 10mg daily at 8 AM', icon: Pill, color: 'hover:border-purple-500/30 hover:bg-purple-600/5 text-purple-400 border-slate-800' },
    { label: 'Chest Pain Emergency', text: 'Help, I am having chest pain and trouble breathing!', icon: ShieldAlert, color: 'hover:border-red-500/30 hover:bg-red-600/5 text-red-400 border-slate-800' }
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">One-Click Demo Flows</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {scenarios.map((sc, idx) => {
          const Icon = sc.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectScenario(sc.text)}
              className={`p-3.5 border rounded-2xl text-left bg-slate-900/30 flex items-center gap-3 transition-all duration-200 active:scale-[0.98] group ${sc.color}`}
            >
              <Icon size={18} className="shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{sc.label}</p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">{sc.text}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
