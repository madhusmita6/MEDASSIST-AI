import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { 
  Users, 
  ShieldAlert, 
  Pill, 
  Clock, 
  Mail,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  Activity,
  FileText,
  Calendar
} from 'lucide-react';

interface CaregiverDashboardProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

const patientsData: Record<string, {
  name: string;
  healthScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  complianceRate: string;
  compliance: Array<{ id: string; medName: string; dosage: string; status: 'taken' | 'missed'; time: string }>;
  alerts: Array<{ id: string; type: string; timestamp: string; details: string }>;
  appointments: Array<{ id: string; doctorName: string; clinicName: string; date: string }>;
  reports: Array<{ id: string; filename: string; date: string; summary: string }>;
}> = {
  usr_patient_1: {
    name: 'John Doe',
    healthScore: 88,
    riskLevel: 'Medium',
    complianceRate: '85%',
    compliance: [
      { id: '1', medName: 'Metformin', dosage: '500mg', status: 'taken', time: '08:00 AM' },
      { id: '2', medName: 'Lisinopril', dosage: '10mg', status: 'missed', time: '08:00 AM' }
    ],
    alerts: [
      { id: '1', type: 'SOS_TRIGGERED', timestamp: new Date(Date.now() - 3600000).toLocaleString(), details: 'Critical chest pain triaged. Alert dispatched.' },
      { id: '2', type: 'COMPLIANCE_FAILURE', timestamp: new Date(Date.now() - 86400000).toLocaleString(), details: 'Missed Lisinopril dose by 30 mins.' }
    ],
    appointments: [
      { id: 'apt_1', doctorName: 'Dr. Evelyn Adams (Cardiology)', clinicName: 'Metro Heart Institute', date: 'Next Tuesday at 09:00 AM' },
      { id: 'apt_2', doctorName: 'Dr. Michael Chang (Generalist)', clinicName: 'City Health Center', date: 'Next Friday at 11:00 AM' }
    ],
    reports: [
      { id: 'rep_1', filename: 'metabolic_panel_june.pdf', date: '10 days ago', summary: 'Elevated LDL cholesterol (145 mg/dL), normal thyroid values.' }
    ]
  },
  usr_patient_2: {
    name: 'Alice Johnson',
    healthScore: 96,
    riskLevel: 'Low',
    complianceRate: '98%',
    compliance: [
      { id: '1', medName: 'Atorvastatin', dosage: '20mg', status: 'taken', time: '09:00 PM' },
      { id: '2', medName: 'Aspirin', dosage: '81mg', status: 'taken', time: '08:00 AM' }
    ],
    alerts: [],
    appointments: [
      { id: 'apt_3', doctorName: 'Dr. Sarah Patel (Orthopedics)', clinicName: 'Joint Specialist Center', date: 'Next Monday at 02:00 PM' }
    ],
    reports: [
      { id: 'rep_2', filename: 'lipid_profile_june.pdf', date: '3 days ago', summary: 'Total cholesterol 180 mg/dL, HDL 55 mg/dL, LDL 105 mg/dL.' }
    ]
  },
  usr_patient_3: {
    name: 'Bob Vance',
    healthScore: 54,
    riskLevel: 'High',
    complianceRate: '45%',
    compliance: [
      { id: '1', medName: 'Insulin', dosage: '10 Units', status: 'missed', time: '07:30 AM' },
      { id: '2', medName: 'Warfarin', dosage: '5mg', status: 'missed', time: '06:00 PM' }
    ],
    alerts: [
      { id: '3', type: 'COMPLIANCE_FAILURE', timestamp: new Date(Date.now() - 1200000).toLocaleString(), details: 'Missed morning Insulin intake window.' },
      { id: '4', type: 'COMPLIANCE_FAILURE', timestamp: new Date(Date.now() - 7200000).toLocaleString(), details: 'Missed evening Warfarin intake window.' }
    ],
    appointments: [
      { id: 'apt_4', doctorName: 'Dr. Robert Chen (Endocrinology)', clinicName: 'Diabetes Care Center', date: 'Tomorrow at 10:30 AM' }
    ],
    reports: [
      { id: 'rep_3', filename: 'renal_function_test.pdf', date: '1 day ago', summary: 'Creatinine 1.8 mg/dL (Elevated), BUN 24 mg/dL (Elevated).' }
    ]
  }
};

export default function CaregiverDashboard({ onSuccessToast, onErrorToast }: CaregiverDashboardProps) {
  const [selectedPatientId, setSelectedPatientId] = useState('usr_patient_1');
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const activePatient = patientsData[selectedPatientId] || patientsData.usr_patient_1;

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setSaving(true);
    try {
      await apiService.caregivers.link(newEmail, "primary");
      onSuccessToast(`Successfully linked alert contact: ${newEmail}!`);
      setNewEmail('');
    } catch (err) {
      onErrorToast("Configuration failed.");
    } finally {
      setSaving(false);
    }
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
      {/* Header Banner & Patient Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 glass-panel border border-slate-800 rounded-3xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Caregiver Monitor Console</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Access remote vitals, compliance metrics, and health records for linked patients.
          </p>
        </div>

        {/* Patient Selector */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5">
          <Users size={16} className="text-indigo-400" />
          <span className="text-xs text-slate-400 font-semibold font-mono">Select Patient:</span>
          <select 
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-1 text-sm font-bold text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="usr_patient_1">John Doe (Medium Risk)</option>
            <option value="usr_patient_2">Alice Johnson (Low Risk)</option>
            <option value="usr_patient_3">Bob Vance (High Risk)</option>
          </select>
        </div>
      </div>

      {/* Patient Health Vitals Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Health Score Card */}
        <div className="p-6 glass-card rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Health Score</span>
            <h2 className={`text-3xl font-extrabold tracking-tight ${getScoreColor(activePatient.healthScore)}`}>
              {activePatient.healthScore}%
            </h2>
            <p className="text-[10px] text-slate-500 leading-normal">Composite patient physiological rating</p>
          </div>
          <div className="w-14 h-14 rounded-full border-4 border-slate-800 flex items-center justify-center relative">
            <div className={`absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin-slow`}></div>
            <Activity size={20} className="text-indigo-400" />
          </div>
        </div>

        {/* Risk Assessment Indicator */}
        <div className="p-6 glass-card rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Vitals Risk Profile</span>
            <div className="pt-1">
              <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold border uppercase tracking-wider ${getRiskColor(activePatient.riskLevel)}`}>
                {activePatient.riskLevel} Risk
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-normal mt-1.5">Triage severity based on recent compliance & logs</p>
          </div>
          <ShieldAlert size={36} className={activePatient.riskLevel === 'High' ? 'text-red-500' : activePatient.riskLevel === 'Medium' ? 'text-amber-500' : 'text-emerald-500'} />
        </div>

        {/* Compliance Rating */}
        <div className="p-6 glass-card rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Medication Adherence</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-indigo-400">{activePatient.complianceRate}</h2>
            <p className="text-[10px] text-slate-500 leading-normal">Intake compliance rate (last 30 days)</p>
          </div>
          <Pill size={36} className="text-indigo-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Patient logs, appointments, reports */}
        <div className="lg:col-span-2 space-y-8">
          {/* Medication Logs & Compliance */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Pill size={18} className="text-indigo-400" />
              <span>Today's Medication Adherence List</span>
            </h3>

            <div className="space-y-3">
              {activePatient.compliance.map((item) => {
                const taken = item.status === 'taken';
                return (
                  <div key={item.id} className="p-4.5 glass-card rounded-2xl flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-slate-200">{item.medName}</p>
                      <p className="text-xs text-slate-400">Scheduled: {item.time} ({item.dosage})</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                      taken 
                        ? 'bg-emerald-950/20 border border-emerald-500/25 text-emerald-300' 
                        : 'bg-rose-950/20 border border-rose-500/25 text-rose-300'
                    }`}>
                      {taken ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                      <span className="capitalize">{item.status}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Critical Alerts / Incidents */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-red-500">
              <ShieldAlert size={18} className="text-red-500" />
              <span>Critical Patient Alerts</span>
            </h3>

            {activePatient.alerts.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-500 border border-slate-900 bg-slate-950/20 rounded-2xl">
                No active critical incidents or compliance warnings.
              </div>
            ) : (
              <div className="space-y-3">
                {activePatient.alerts.map((inc) => (
                  <div key={inc.id} className="p-4.5 bg-slate-900/20 border border-slate-800/80 rounded-2xl flex gap-3">
                    <AlertTriangle className={inc.type === 'SOS_TRIGGERED' ? 'text-red-500 shrink-0 mt-0.5' : 'text-amber-500 shrink-0 mt-0.5'} size={18} />
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-200">{inc.type}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{inc.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-normal">{inc.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Appointments */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Calendar size={18} className="text-indigo-400" />
              <span>Upcoming Clinical Appointments</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activePatient.appointments.map((apt) => (
                <div key={apt.id} className="p-4.5 glass-panel border border-slate-800/60 rounded-2xl space-y-2">
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm text-slate-200">{apt.doctorName}</p>
                    <p className="text-xs text-slate-400">{apt.clinicName}</p>
                  </div>
                  <p className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 pt-1 border-t border-slate-800/40">
                    <Clock size={12} />
                    <span>{apt.date}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Reports requiring review & settings */}
        <div className="space-y-8">
          {/* Reports Requiring Review */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText size={18} className="text-indigo-400" />
              <span>Reports Pending Review</span>
            </h3>

            <div className="space-y-3">
              {activePatient.reports.map((rep) => (
                <div key={rep.id} className="p-5 glass-card rounded-2xl border border-slate-800/60 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate text-slate-200">{rep.filename}</p>
                      <p className="text-[10px] text-slate-500">{rep.date}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal leading-relaxed pt-1.5 border-t border-slate-800/40">
                    {rep.summary}
                  </p>
                  <button 
                    onClick={() => onSuccessToast(`Verified and marked report ${rep.filename} as reviewed!`)}
                    className="w-full py-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-semibold transition-all"
                  >
                    Mark Reviewed
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Configurations panel */}
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 space-y-6">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Mail size={18} className="text-indigo-400" />
              <span>Alert Email Settings</span>
            </h3>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Configure target email addresses to receive real-time notifications for critical patient SOS and compliance alerts.
            </p>

            <form onSubmit={handleUpdateContact} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Notification Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-700"
                  placeholder="caregiver@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Update Alert Target
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
