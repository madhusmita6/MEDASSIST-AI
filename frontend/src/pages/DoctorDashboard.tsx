import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  FileText, 
  ShieldAlert, 
  Activity, 
  CheckCircle2, 
  Plus, 
  ArrowRight,
  Sparkles,
  HeartPulse
} from 'lucide-react';

interface DoctorDashboardProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

const assignedPatients = [
  { id: 'usr_patient_1', name: 'John Doe', age: 48, condition: 'Hypertension', healthScore: 88, riskLevel: 'Medium', alerts: 1, lastVisit: '12 days ago' },
  { id: 'usr_patient_2', name: 'Alice Johnson', age: 34, condition: 'Post-Op Recovery', healthScore: 96, riskLevel: 'Low', alerts: 0, lastVisit: '3 days ago' },
  { id: 'usr_patient_3', name: 'Bob Vance', age: 62, condition: 'Type-2 Diabetes', healthScore: 54, riskLevel: 'High', alerts: 2, lastVisit: 'Yesterday' }
];

const pendingAppointments = [
  { id: 'apt_10', patientName: 'John Doe', requestedTime: 'Next Tuesday at 09:00 AM', reason: 'Blood pressure review', status: 'pending' },
  { id: 'apt_11', patientName: 'Bob Vance', requestedTime: 'Tomorrow at 10:30 AM', reason: 'Insulin dosage adjustments', status: 'pending' }
];

const recentReports = [
  { id: 'rep_1', patientName: 'John Doe', filename: 'metabolic_panel_june.pdf', uploadedAt: '10 days ago', status: 'unread' },
  { id: 'rep_2', patientName: 'Alice Johnson', filename: 'lipid_profile_june.pdf', uploadedAt: '3 days ago', status: 'read' },
  { id: 'rep_3', patientName: 'Bob Vance', filename: 'renal_function_test.pdf', uploadedAt: '1 day ago', status: 'unread' }
];

export default function DoctorDashboard({ onSuccessToast, onErrorToast }: DoctorDashboardProps) {
  const [appointments, setAppointments] = useState(pendingAppointments);
  const [reports, setReports] = useState(recentReports);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const handleApproveAppointment = (id: string, name: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
    onSuccessToast(`Successfully approved appointment request for ${name}!`);
  };

  const handleDeclineAppointment = (id: string, name: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
    onSuccessToast(`Declined appointment request for ${name}.`);
  };

  const handleReviewReport = (id: string, filename: string) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'read' } : r));
    onSuccessToast(`Report '${filename}' marked as reviewed!`);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'Medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Low': default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-8 glass-panel border border-slate-800 rounded-3xl">
        <h1 className="text-3xl font-bold tracking-tight">Clinical Console</h1>
        <p className="text-slate-400 mt-2 text-sm">
          Welcome, <strong className="text-indigo-400">Dr. Evelyn Adams</strong>. Review patient vitals, approve calendars, and consult diagnostic summaries.
        </p>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Patients List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Users size={18} className="text-indigo-400" />
              <span>Assigned Patient Registry</span>
            </h3>
          </div>

          <div className="glass-panel border border-slate-800 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 bg-slate-900/40 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    <th className="py-4 px-6">Patient</th>
                    <th className="py-4 px-4 text-center">Health Score</th>
                    <th className="py-4 px-4 text-center">Risk Level</th>
                    <th className="py-4 px-4">Primary Condition</th>
                    <th className="py-4 px-4">Last Consultation</th>
                    <th className="py-4 px-4 text-center">Alerts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs">
                  {assignedPatients.map((p) => (
                    <tr 
                      key={p.id} 
                      onClick={() => setSelectedPatient(p)}
                      className="hover:bg-slate-900/30 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-6 font-bold text-slate-200">
                        <div>{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-normal">Age: {p.age}</div>
                      </td>
                      <td className={`py-4 px-4 text-center font-extrabold ${getScoreColor(p.healthScore)}`}>
                        {p.healthScore}%
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getRiskColor(p.riskLevel)}`}>
                          {p.riskLevel}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-400">{p.condition}</td>
                      <td className="py-4 px-4 text-slate-400">{p.lastVisit}</td>
                      <td className="py-4 px-4 text-center">
                        {p.alerts > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-red-950/20 border border-red-500/20 text-red-400 font-bold">
                            {p.alerts} Active
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Consultation Request Manager */}
          <div className="space-y-4 pt-2">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Calendar size={18} className="text-indigo-400" />
              <span>Pending Consultation Requests</span>
            </h3>

            {appointments.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-slate-900 bg-slate-950/20 rounded-2xl">
                No pending appointment requests to review.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appointments.map((apt) => (
                  <div key={apt.id} className="p-5 glass-card rounded-2xl space-y-3 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-sm text-slate-200">{apt.patientName}</p>
                        <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] uppercase tracking-wider font-bold rounded">Requested</span>
                      </div>
                      <p className="text-xs text-indigo-400 font-semibold">{apt.requestedTime}</p>
                      <p className="text-[11px] text-slate-400">Reason: {apt.reason}</p>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-slate-800/40">
                      <button 
                        onClick={() => handleApproveAppointment(apt.id, apt.patientName)}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleDeclineAppointment(apt.id, apt.patientName)}
                        className="flex-1 py-2 border border-slate-800 hover:bg-red-950/10 hover:text-red-400 hover:border-red-950 rounded-xl text-xs font-semibold text-slate-400 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Lab Reports Center & Clinical Vitals */}
        <div className="space-y-8">
          
          {/* Diagnostic Lab Reports Center */}
          <div className="space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2">
              <FileText size={18} className="text-indigo-400" />
              <span>Diagnostic Reports Center</span>
            </h3>

            <div className="space-y-3">
              {reports.map((rep) => (
                <div key={rep.id} className="p-4.5 glass-card border border-slate-800/60 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1 min-w-0 flex-1 mr-3">
                    <p className="font-bold text-xs truncate text-slate-200">{rep.filename}</p>
                    <p className="text-[10px] text-slate-500">Patient: {rep.patientName} • {rep.uploadedAt}</p>
                  </div>
                  {rep.status === 'unread' ? (
                    <button 
                      onClick={() => handleReviewReport(rep.id, rep.filename)}
                      className="shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold transition-all"
                    >
                      Review
                    </button>
                  ) : (
                    <span className="shrink-0 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-slate-500 font-bold flex items-center gap-1">
                      <CheckCircle2 size={10} className="text-emerald-500" />
                      <span>Reviewed</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Clinical Concierge Quick Access */}
          <div className="p-6 glass-panel border border-slate-800 rounded-3xl space-y-4">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-400" />
              <span>AI Clinical Research Assistant</span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Use natural language to search patient electronic health files, summarize pathology reports, and draft clinical action letters.
            </p>
            <div className="pt-2">
              <button 
                onClick={() => onSuccessToast("Routing to AI Concierge research page...")}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/30"
              >
                <span>Launch Clinical Concierge</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Active Patient Details Modal/Card */}
          {selectedPatient && (
            <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm text-slate-200">{selectedPatient.name}</h4>
                  <p className="text-[10px] text-slate-500">Condition: {selectedPatient.condition}</p>
                </div>
                <button 
                  onClick={() => setSelectedPatient(null)}
                  className="text-slate-500 hover:text-slate-300 text-xs font-bold"
                >
                  Clear Selection
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-850">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Health Score</span>
                  <span className={`font-extrabold ${getScoreColor(selectedPatient.healthScore)}`}>{selectedPatient.healthScore}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Triage Level</span>
                  <span className={`font-bold ${selectedPatient.riskLevel === 'High' ? 'text-red-400' : selectedPatient.riskLevel === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}>{selectedPatient.riskLevel} Risk</span>
                </div>
              </div>

              <div className="pt-3">
                <p className="text-[10px] text-slate-500 leading-normal">
                  Detailed vitals charts and history can be searched via the AI Concierge with context index ID: <strong className="text-indigo-400">{selectedPatient.id}</strong>.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
