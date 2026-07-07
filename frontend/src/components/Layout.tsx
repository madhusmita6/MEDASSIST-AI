import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { 
  LayoutDashboard, 
  Calendar, 
  Pill, 
  FileText, 
  HeartPulse, 
  LogOut, 
  Menu, 
  X, 
  Bot,
  Users,
  Activity,
  ShieldCheck
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getNavItems = () => {
    if (user?.role === 'caregiver') {
      return [
        { id: 'caregiver_dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'chat', label: 'AI Concierge', icon: Bot }
      ];
    }
    if (user?.role === 'doctor') {
      return [
        { id: 'doctor_dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'chat', label: 'AI Concierge', icon: Bot },
        { id: 'appointments', label: 'Appointments', icon: Calendar },
        { id: 'reports', label: 'Medical Reports', icon: FileText }
      ];
    }
    if (user?.role === 'admin') {
      return [
        { id: 'admin_dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'chat', label: 'AI Concierge', icon: Bot },
        { id: 'admin_users', label: 'User Management', icon: Users },
        { id: 'admin_system_health', label: 'System Health', icon: Activity },
        { id: 'admin_logs', label: 'Audit Logs', icon: FileText },
        { id: 'admin_eval', label: 'Evaluation Center', icon: ShieldCheck }
      ];
    }
    // Default is patient
    return [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'chat', label: 'AI Concierge', icon: Bot },
      { id: 'appointments', label: 'Appointments', icon: Calendar },
      { id: 'reminders', label: 'Medications', icon: Pill },
      { id: 'reports', label: 'Health Reports', icon: FileText },
      { id: 'emergency', label: 'Emergency Guidance', icon: HeartPulse }
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar navigation panel */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 glass-panel border-r border-slate-800 transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🩺</span>
            <span className="text-lg font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-indigo-600">MEDASSIST AI</span>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`flex items-center w-full gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  active 
                    ? 'bg-indigo-600/25 border border-indigo-500/35 text-indigo-400 font-medium' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Icon size={20} className={active ? 'text-indigo-400' : 'text-slate-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User profile section */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-600/30 flex items-center justify-center border border-indigo-500/20 text-indigo-400 font-bold">
              {user?.fullName[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.fullName}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center justify-center w-full gap-2 px-4 py-2 border border-slate-800 hover:bg-red-950/20 hover:text-red-400 hover:border-red-900/35 rounded-xl transition-colors duration-200"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main app panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-16 px-6 glass-panel border-b border-slate-800">
          <button 
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          
          <div className="flex items-center gap-4 ml-auto">
            {/* Demo Role Switcher */}
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-2xl">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Demo Switch:</span>
              <select 
                value={user?.role}
                onChange={(e) => {
                  const targetRole = e.target.value as 'patient' | 'caregiver' | 'doctor' | 'admin';
                  let newUserObj = { ...user };
                  if (targetRole === 'patient') {
                    newUserObj = { id: 'usr_patient_1', email: 'patient@example.com', fullName: 'John Doe', role: 'patient', riskLevel: 'Medium', healthScore: 88, createdAt: new Date().toISOString() };
                    setActiveTab('dashboard');
                  } else if (targetRole === 'caregiver') {
                    newUserObj = { id: 'usr_caregiver_1', email: 'caregiver@example.com', fullName: 'Sarah Smith', role: 'caregiver', createdAt: new Date().toISOString() };
                    setActiveTab('caregiver_dashboard');
                  } else if (targetRole === 'doctor') {
                    newUserObj = { id: 'usr_doctor_1', email: 'doctor@example.com', fullName: 'Dr. Evelyn Adams', role: 'doctor', createdAt: new Date().toISOString() };
                    setActiveTab('doctor_dashboard');
                  } else if (targetRole === 'admin') {
                    newUserObj = { id: 'usr_admin_1', email: 'admin@example.com', fullName: 'Admin User', role: 'admin', createdAt: new Date().toISOString() };
                    setActiveTab('admin_dashboard');
                  }
                  useAuthStore.getState().login(newUserObj as any, 'mock_jwt_token_payload');
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-0.5 text-xs text-indigo-400 font-bold focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="patient">Patient</option>
                <option value="caregiver">Caregiver</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <span className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-2xl text-slate-400 font-mono flex items-center gap-1.5">
              <span>Role:</span>
              <span className="text-indigo-400 font-bold capitalize">{user?.role}</span>
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-950 px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
