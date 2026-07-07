import React, { useState, useEffect } from 'react';
import EvaluationDashboard from './EvaluationDashboard';
import { 
  Activity, 
  Users, 
  FileText, 
  ShieldCheck, 
  Server, 
  Database, 
  Bot, 
  Puzzle, 
  HardDrive, 
  Cloud,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Lock
} from 'lucide-react';

interface AdminDashboardProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function AdminDashboard({ onSuccessToast, onErrorToast, activeTab, setActiveTab }: AdminDashboardProps) {
  const activeSubTab = 
    activeTab === 'admin_users' ? 'users' :
    activeTab === 'admin_stats' ? 'stats' :
    activeTab === 'admin_system_health' ? 'system_health' :
    activeTab === 'admin_logs' ? 'logs' :
    activeTab === 'admin_eval' ? 'evaluation' :
    'overview';

  const setActiveSubTab = (subTab: string) => {
    const tabMap: Record<string, string> = {
      overview: 'admin_dashboard',
      users: 'admin_users',
      stats: 'admin_stats',
      system_health: 'admin_system_health',
      logs: 'admin_logs',
      evaluation: 'admin_eval'
    };
    setActiveTab(tabMap[subTab] || 'admin_dashboard');
  };

  const [usersList, setUsersList] = useState<any[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'patient' | 'caregiver' | 'doctor' | 'admin'>('patient');

  useEffect(() => {
    const localUsers = localStorage.getItem('med_users');
    if (localUsers) {
      setUsersList(JSON.parse(localUsers));
    } else {
      setUsersList([
        { id: 'usr_patient_1', email: 'patient@example.com', fullName: 'John Doe', role: 'patient', riskLevel: 'Medium', healthScore: 88 },
        { id: 'usr_caregiver_1', email: 'caregiver@example.com', fullName: 'Sarah Smith', role: 'caregiver' },
        { id: 'usr_doctor_1', email: 'doctor@example.com', fullName: 'Dr. Evelyn Adams', role: 'doctor' },
        { id: 'usr_admin_1', email: 'admin@example.com', fullName: 'Admin User', role: 'admin' }
      ]);
    }
  }, []);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserFullName.trim()) return;

    const newUser = {
      id: `usr_${Math.random().toString(36).substr(2, 9)}`,
      email: newUserEmail,
      fullName: newUserFullName,
      role: newUserRole,
      riskLevel: newUserRole === 'patient' ? 'Low' : undefined,
      healthScore: newUserRole === 'patient' ? 95 : undefined,
      createdAt: new Date().toISOString()
    };

    const updated = [...usersList, newUser];
    setUsersList(updated);
    localStorage.setItem('med_users', JSON.stringify(updated));
    onSuccessToast(`User ${newUserFullName} added successfully!`);
    setNewUserEmail('');
    setNewUserFullName('');
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (id === 'usr_admin_1') {
      onErrorToast("Cannot delete primary administrator account.");
      return;
    }
    const updated = usersList.filter(u => u.id !== id);
    setUsersList(updated);
    localStorage.setItem('med_users', JSON.stringify(updated));
    onSuccessToast(`User ${name} removed successfully.`);
  };

  // Stats Breakdown data
  const appointmentStats = [
    { label: 'Scheduled Appointments', count: 18, color: 'text-indigo-400', percentage: '60%' },
    { label: 'Completed Consultations', count: 9, color: 'text-emerald-400', percentage: '30%' },
    { label: 'Cancelled Checks', count: 3, color: 'text-red-400', percentage: '10%' }
  ];

  const auditLogs = [
    { timestamp: new Date().toLocaleString(), action: 'Admin session started', author: 'admin@example.com', type: 'security' },
    { timestamp: new Date(Date.now() - 3600000).toLocaleString(), action: 'Patient John Doe triggered SOS panic alarm', author: 'patient@example.com', type: 'critical' },
    { timestamp: new Date(Date.now() - 7200000).toLocaleString(), action: 'Medication database updated - Lisinopril scheduled time altered', author: 'doctor@example.com', type: 'clinical' },
    { timestamp: new Date(Date.now() - 86400000).toLocaleString(), action: 'New caregiver link initialized with Sarah Smith', author: 'patient@example.com', type: 'system' }
  ];

  // Architecture Badges to show
  const architectureBadges = [
    { label: 'Google ADK', desc: 'Agent state orchestration', icon: Bot, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    { label: 'MCP Integration', desc: 'Model Context Protocol server gateway', icon: Puzzle, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { label: 'ChromaDB', desc: 'Blood panel chunk vector database', icon: Database, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Agent Session DB', desc: 'Zustand & LocalStorage sync state', icon: HardDrive, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
    { label: 'Security Guardrails', desc: 'Triage filters & clinical protections', icon: ShieldCheck, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    { label: 'Cloud Run Ready', desc: 'Dockerized multi-service configuration', icon: Cloud, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' }
  ];

  // Sub Tab Navigation
  const subTabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'stats', label: 'Appointment Stats', icon: Calendar },
    { id: 'system_health', label: 'System Health', icon: Server },
    { id: 'logs', label: 'Audit Logs', icon: FileText },
    { id: 'evaluation', label: 'Evaluation Center', icon: ShieldCheck }
  ] as const;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-8 glass-panel border border-slate-800 rounded-3xl">
        <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
        <p className="text-slate-400 mt-2 text-sm">
          Coordinate system configuration, audit compliance timelines, monitor active clinical sessions, and evaluate agent diagnostics.
        </p>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-slate-850 overflow-x-auto gap-2">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 tracking-wide uppercase ${
                active 
                  ? 'border-indigo-500 text-indigo-400 font-semibold' 
                  : 'border-transparent text-slate-500 hover:text-slate-350'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content tabs rendering */}
      {activeSubTab === 'overview' && (
        <div className="space-y-8">
          {/* Healthcare Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="p-5 glass-card rounded-2xl border border-slate-850 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Avg Compliance</span>
              <h3 className="text-2xl font-extrabold tracking-tight text-indigo-400">87%</h3>
              <p className="text-[9px] text-slate-500">Target value is &gt;90%</p>
            </div>
            <div className="p-5 glass-card rounded-2xl border border-slate-850 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">SOS Response</span>
              <h3 className="text-2xl font-extrabold tracking-tight text-red-400">4.2m</h3>
              <p className="text-[9px] text-slate-500">Average dispatcher contact</p>
            </div>
            <div className="p-5 glass-card rounded-2xl border border-slate-850 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Monitored</span>
              <h3 className="text-2xl font-extrabold tracking-tight text-slate-200">24</h3>
              <p className="text-[9px] text-slate-500">Patients with active trackers</p>
            </div>
            <div className="p-5 glass-card rounded-2xl border border-slate-850 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Reports Processed</span>
              <h3 className="text-2xl font-extrabold tracking-tight text-emerald-400">142</h3>
              <p className="text-[9px] text-slate-500">Blood panel files ingested</p>
            </div>
            <div className="p-5 glass-card rounded-2xl border border-slate-850 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Fulfillment Rate</span>
              <h3 className="text-2xl font-extrabold tracking-tight text-purple-400">94%</h3>
              <p className="text-[9px] text-slate-500">Calendar slots fulfilled</p>
            </div>
          </div>

          {/* System Health Overview Cards */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-200 px-1">Critical Clinical Status checks</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="p-5 glass-card rounded-2xl border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">API Services</p>
                  <p className="text-xs font-bold text-slate-200 mt-1">Operational</p>
                </div>
                <CheckCircle size={24} className="text-emerald-500" />
              </div>
              <div className="p-5 glass-card rounded-2xl border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">ChromaDB Node</p>
                  <p className="text-xs font-bold text-slate-200 mt-1">24.2k Chunks</p>
                </div>
                <CheckCircle size={24} className="text-emerald-500" />
              </div>
              <div className="p-5 glass-card rounded-2xl border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Gemini Orchestrator</p>
                  <p className="text-xs font-bold text-slate-200 mt-1">Operational</p>
                </div>
                <CheckCircle size={24} className="text-emerald-500" />
              </div>
              <div className="p-5 glass-card rounded-2xl border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">SOS Dispatcher</p>
                  <p className="text-xs font-bold text-slate-200 mt-1">Active</p>
                </div>
                <CheckCircle size={24} className="text-emerald-500" />
              </div>
            </div>
          </div>

          {/* Technology Architecture Badges */}
          <div className="space-y-4 pt-2">
            <h3 className="text-base font-bold text-slate-200 px-1">Active System Architecture Modules</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {architectureBadges.map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div 
                    key={idx} 
                    className="p-5 rounded-2xl border border-slate-850 flex flex-col gap-2.5 bg-slate-900/10 hover:border-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg border ${feat.color.split(' ')[1]} ${feat.color.split(' ')[2]} ${feat.color.split(' ')[0]}`}>
                        <Icon size={16} />
                      </div>
                      <span className="text-xs font-bold text-slate-200 tracking-wide">{feat.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-550 leading-relaxed">{feat.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User List Table */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-base font-bold text-slate-200">Registered Users</h3>
            <div className="glass-panel border border-slate-800 rounded-3xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 bg-slate-900/40 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    <th className="py-4 px-5">Name / Email</th>
                    <th className="py-4 px-4">Role</th>
                    <th className="py-4 px-4 text-center">Health Score</th>
                    <th className="py-4 px-4 text-center">Risk level</th>
                    <th className="py-4 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs">
                  {usersList.map((usr) => (
                    <tr key={usr.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="py-4 px-5 font-bold text-slate-200">
                        <div>{usr.fullName}</div>
                        <div className="text-[10px] text-slate-500 font-mono font-normal">{usr.email}</div>
                      </td>
                      <td className="py-4 px-4 capitalize font-semibold text-indigo-400">
                        {usr.role}
                      </td>
                      <td className="py-4 px-4 text-center font-extrabold text-slate-300">
                        {usr.healthScore ? `${usr.healthScore}%` : '—'}
                      </td>
                      <td className="py-4 px-4 text-center font-bold">
                        {usr.riskLevel ? (
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase border ${
                            usr.riskLevel === 'High' ? 'text-red-400 border-red-500/20 bg-red-500/10' :
                            usr.riskLevel === 'Medium' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' :
                            'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                          }`}>
                            {usr.riskLevel}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button 
                          onClick={() => handleDeleteUser(usr.id, usr.fullName)}
                          className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-900 transition-colors"
                          title="Remove User"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add User form panel */}
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 h-fit space-y-6">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Plus size={18} className="text-indigo-400" />
              <span>Register User</span>
            </h3>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserFullName}
                  onChange={(e) => setNewUserFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Portal Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  <option value="patient">Patient</option>
                  <option value="caregiver">Caregiver</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}

      {activeSubTab === 'stats' && (
        <div className="space-y-6">
          <h3 className="text-base font-bold text-slate-200">Appointment Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {appointmentStats.map((stat, idx) => (
              <div key={idx} className="p-6 glass-card rounded-2xl border border-slate-850 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-extrabold tracking-tight ${stat.color}`}>{stat.count}</span>
                  <span className="text-[10px] text-slate-550">({stat.percentage} of total requests)</span>
                </div>
                <div className="h-1.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full bg-indigo-500 rounded-full`} style={{ width: stat.percentage }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'system_health' && (
        <div className="space-y-6">
          <h3 className="text-base font-bold text-slate-200">System Health Diagnostics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Checks List */}
            <div className="p-6 glass-panel border border-slate-800 rounded-3xl space-y-4">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Server size={16} className="text-indigo-400" />
                <span>Service Audits</span>
              </h4>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-900 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-slate-300">MedAssist Backend API Server</p>
                    <p className="text-[10px] text-slate-500 font-mono">http://localhost:8080</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950/20 border border-emerald-500/25 text-emerald-400">ONLINE</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-900 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-slate-300">ChromaDB Collection Nodes</p>
                    <p className="text-[10px] text-slate-500 font-mono">collection: medical_reports_rag</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950/20 border border-emerald-500/25 text-emerald-400">ACTIVE</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-900 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-slate-300">Gemini Orchestrator</p>
                    <p className="text-[10px] text-slate-500 font-mono">API Key Configuration: Verified</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950/20 border border-emerald-500/25 text-emerald-400">READY</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-900 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-slate-300">Agent Session Storage</p>
                    <p className="text-[10px] text-slate-500 font-mono">key: medassist-auth-storage</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950/20 border border-emerald-500/25 text-emerald-400">CONNECTED</span>
                </div>
              </div>
            </div>

            {/* Health Logs */}
            <div className="p-6 glass-panel border border-slate-800 rounded-3xl space-y-4">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Lock size={16} className="text-indigo-400" />
                <span>Security Guardrails Engine Logs</span>
              </h4>

              <div className="space-y-3 font-mono text-[10px] max-h-[220px] overflow-y-auto pr-1">
                <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl text-slate-400">
                  <span className="text-emerald-400">[PASS]</span> Prompt injection assessment checklist cleared.
                </div>
                <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl text-slate-400">
                  <span className="text-emerald-400">[PASS]</span> Diagnostic prescription safeguard block verified.
                </div>
                <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl text-slate-400">
                  <span className="text-amber-400">[WARN]</span> Attempted patient query containing medical diagnosis keywords routed. Safeguard override injected.
                </div>
                <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl text-slate-400">
                  <span className="text-emerald-400">[PASS]</span> PII leak protection filters: 100% compliant.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'logs' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-200">System Activity Logs</h3>
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="space-y-4">
              {auditLogs.map((log, idx) => (
                <div key={idx} className="flex gap-4 items-start p-4 bg-slate-900/10 border border-slate-850 rounded-2xl text-xs">
                  <span className={`px-2.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold border ${
                    log.type === 'critical' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                    log.type === 'security' ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' :
                    log.type === 'clinical' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' :
                    'text-slate-450 bg-slate-800/10 border-slate-800'
                  }`}>
                    {log.type}
                  </span>
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="font-bold text-slate-200 leading-normal">{log.action}</p>
                    <p className="text-[10px] text-slate-500">Initiated by: {log.author} • {log.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'evaluation' && (
        <EvaluationDashboard onErrorToast={onErrorToast} />
      )}

    </div>
  );
}
