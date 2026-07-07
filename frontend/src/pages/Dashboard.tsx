import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Appointment, MedicationReminder, UploadedReport } from '../types';
import { 
  Calendar, 
  Pill, 
  FileText, 
  ShieldAlert, 
  Check, 
  Clock, 
  ChevronRight,
  UserCheck,
  HeartPulse,
  Activity,
  TrendingUp
} from 'lucide-react';

interface DashboardProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ onSuccessToast, onErrorToast, setActiveTab }: DashboardProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [reports, setReports] = useState<UploadedReport[]>([]);
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const aptData = await apiService.appointments.list();
        const remData = await apiService.reminders.list();
        const repData = await apiService.reports.list();
        const cgData = await apiService.caregivers.list();
        
        setAppointments(aptData.filter(a => a.status === 'scheduled').slice(0, 2));
        setReminders(remData.filter(r => r.active).slice(0, 3));
        setReports(repData.slice(0, 2));
        if (cgData.length > 0) {
          setCaregiverEmail(cgData[0].caregiver_email);
        }
      } catch (e) {
        onErrorToast("Failed to sync dashboard cards.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleTriggerSOS = async () => {
    try {
      const sosRes = await apiService.emergency.triggerSos(37.7749, -122.4194);
      onSuccessToast(`SOS Alarms Broadcasted to caregivers!`);
      setActiveTab('emergency');
    } catch (err) {
      onErrorToast("SOS Alert failure.");
    }
  };

  const handleTakeMedication = async (reminderId: string, medName: string) => {
    try {
      await apiService.reminders.delete(reminderId);
      setReminders(prev => prev.filter(r => r.id !== reminderId));
      onSuccessToast(`Logged intake success for: ${medName}!`);
    } catch (e) {
      onErrorToast("Compliance update failure.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-500 font-mono animate-pulse-soft">Loading patient records...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 glass-panel border border-slate-800 rounded-3xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Health Concierge</h1>
          <p className="text-slate-400 mt-2 text-sm">MedAssist AI is monitoring compliance schedules and clinic calendars.</p>
        </div>
        <button
          onClick={handleTriggerSOS}
          className="shrink-0 flex items-center justify-center gap-2.5 px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-xl shadow-red-950/20 active:scale-95 transition-all"
        >
          <ShieldAlert size={20} className="animate-pulse" />
          <span>TRIGGER PANIC SOS</span>
        </button>
      </div>

      {/* Health Insights Cards Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Personalized Health Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 flex flex-col gap-2 hover:border-indigo-500/35 transition-all duration-200 hover:scale-[1.01]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <HeartPulse size={16} />
              </div>
              <span className="text-xs font-bold text-slate-200 tracking-wide">Cardiovascular Performance</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Your Lisinopril medication is active. Consistent intake at 08:00 AM daily helps maintain optimal systolic levels.
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 flex flex-col gap-2 hover:border-purple-500/35 transition-all duration-200 hover:scale-[1.01]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Pill size={16} />
              </div>
              <span className="text-xs font-bold text-slate-200 tracking-wide">Metabolic Adherence</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Daily Metformin schedule is active. Spacing doses evenly supports stable glucose metabolism.
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 flex flex-col gap-2 hover:border-emerald-500/35 transition-all duration-200 hover:scale-[1.01]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <TrendingUp size={16} />
              </div>
              <span className="text-xs font-bold text-slate-200 tracking-wide">Lab Recommendation</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Based on your recent metabolic panel, reducing saturated fat intake can help lower your LDL cholesterol (currently 145 mg/dL).
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Appointments Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Calendar size={18} className="text-indigo-400" />
              <span>Upcoming Appointments</span>
            </h3>
            <button onClick={() => setActiveTab('appointments')} className="text-xs text-indigo-400 hover:underline flex items-center">
              <span>View All</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-4">
            {appointments.length === 0 ? (
              <div className="p-6 text-center text-slate-500 border border-slate-900 bg-slate-950/40 rounded-2xl">
                No scheduled checkups. Ask AI concierge to schedule one.
              </div>
            ) : (
              appointments.map((apt) => (
                <div key={apt.id} className="p-5 glass-card rounded-2xl flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="font-bold text-sm">{apt.doctorName}</p>
                    <p className="text-xs text-slate-400">{apt.clinicName}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5 justify-end">
                      <Clock size={12} />
                      {new Date(apt.scheduledTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(apt.scheduledTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Recent Lab Reports */}
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileText size={18} className="text-indigo-400" />
                <span>Recent Lab Panels</span>
              </h3>
              <button onClick={() => setActiveTab('reports')} className="text-xs text-indigo-400 hover:underline flex items-center">
                <span>Access Reports</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((rep) => (
                <div key={rep.id} className="p-5 glass-card rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400">
                      <FileText size={18} />
                    </div>
                    <p className="text-sm font-bold truncate">{rep.filename}</p>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {rep.summaryCached}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar compliance panel */}
        <div className="space-y-6">
          {/* Health Profile Status Card */}
          <div className="p-6 glass-card border border-slate-800 rounded-3xl space-y-4">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Activity size={16} className="text-indigo-400" />
              <span>Health Profile Status</span>
            </h4>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-slate-500 font-medium">Overall Health Score</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-emerald-400">88%</span>
                  <span className="text-[10px] text-slate-400">Good</span>
                </div>
              </div>
              <div className="h-1.5 w-24 bg-slate-900 border border-slate-800 rounded-full overflow-hidden shrink-0">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '88%' }}></div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
              <span className="text-xs text-slate-500">Risk Assessment</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-wider">
                Medium Risk
              </span>
            </div>
          </div>

          <h3 className="text-lg font-bold flex items-center gap-2 pt-2">
            <Pill size={18} className="text-indigo-400" />
            <span>Today's Med Intake</span>
          </h3>

          <div className="space-y-4">
            {reminders.length === 0 ? (
              <div className="p-6 text-center text-slate-500 border border-slate-900 bg-slate-950/40 rounded-2xl">
                No reminders due.
              </div>
            ) : (
              reminders.map((rem) => (
                <div key={rem.id} className="p-4 glass-card rounded-2xl flex items-center justify-between group">
                  <div className="space-y-1">
                    <p className="font-bold text-sm">{rem.medicationName}</p>
                    <p className="text-xs text-slate-400">{rem.dosage} • {rem.scheduledTimes[0]}</p>
                  </div>
                  <button
                    onClick={() => handleTakeMedication(rem.id, rem.medicationName)}
                    className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/25 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center text-indigo-400 transition-all active:scale-95"
                    title="Mark Taken"
                  >
                    <Check size={18} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Caregiver Details */}
          <div className="p-6 glass-card border border-slate-800 rounded-3xl space-y-4">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <UserCheck size={16} className="text-indigo-400" />
              <span>Registered Caregiver</span>
            </h4>
            {caregiverEmail ? (
              <div className="space-y-1">
                <p className="text-sm font-bold">Email Notifications Active</p>
                <p className="text-xs font-mono text-slate-400">{caregiverEmail}</p>
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                No caregiver linked. Set one in caregiver settings.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
