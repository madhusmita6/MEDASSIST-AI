import React, { useState, useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import Toast, { ToastMessage } from './components/Toast';

// Import Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Reminders from './pages/Reminders';
import Reports from './pages/Reports';
import Emergency from './pages/Emergency';
import CaregiverDashboard from './pages/CaregiverDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ChatWidget from './components/ChatWidget';
import EvaluationDashboard from './pages/EvaluationDashboard';

export default function App() {
  const { user } = useAuthStore();
  
  // Navigation & Authentication tab states
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRegistering, setIsRegistering] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toggle default tabs based on authenticated role
  useEffect(() => {
    if (user) {
      if (user.role === 'caregiver') {
        setActiveTab('caregiver_dashboard');
      } else if (user.role === 'doctor') {
        setActiveTab('doctor_dashboard');
      } else if (user.role === 'admin') {
        setActiveTab('admin_dashboard');
      } else {
        setActiveTab('dashboard');
      }
    }
  }, [user]);

  // Toast Helpers
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast_${Date.now()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    
    // Auto remove toast after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Render auth screens if no session token exists
  if (!user) {
    if (isRegistering) {
      return (
        <>
          <Register 
            onSuccessToast={(msg) => addToast(msg, 'success')}
            onErrorToast={(msg) => addToast(msg, 'error')}
            onNavigateToLogin={() => setIsRegistering(false)}
          />
          <Toast toasts={toasts} removeToast={removeToast} />
        </>
      );
    }
    return (
      <>
        <Login 
          onSuccessToast={(msg) => addToast(msg, 'success')}
          onErrorToast={(msg) => addToast(msg, 'error')}
          onNavigateToRegister={() => setIsRegistering(true)}
        />
        <Toast toasts={toasts} removeToast={removeToast} />
      </>
    );
  }

  // Render tab content inside layout wrapper
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            onSuccessToast={(msg) => addToast(msg, 'success')}
            onErrorToast={(msg) => addToast(msg, 'error')}
            setActiveTab={setActiveTab}
          />
        );
      case 'chat':
        return (
          <ChatWidget 
            onSuccessToast={(msg) => addToast(msg, 'success')}
            onErrorToast={(msg) => addToast(msg, 'error')}
          />
        );
      case 'appointments':
        return (
          <Appointments 
            onSuccessToast={(msg) => addToast(msg, 'success')}
            onErrorToast={(msg) => addToast(msg, 'error')}
          />
        );
      case 'reminders':
        return (
          <Reminders 
            onSuccessToast={(msg) => addToast(msg, 'success')}
            onErrorToast={(msg) => addToast(msg, 'error')}
          />
        );
      case 'reports':
        return (
          <Reports 
            onSuccessToast={(msg) => addToast(msg, 'success')}
            onErrorToast={(msg) => addToast(msg, 'error')}
          />
        );
      case 'emergency':
        return (
          <Emergency 
            onSuccessToast={(msg) => addToast(msg, 'success')}
            onErrorToast={(msg) => addToast(msg, 'error')}
          />
        );
      case 'evaluation':
        return (
          <EvaluationDashboard 
            onErrorToast={(msg) => addToast(msg, 'error')}
          />
        );
      case 'caregiver_dashboard':
        return (
          <CaregiverDashboard 
            onSuccessToast={(msg) => addToast(msg, 'success')}
            onErrorToast={(msg) => addToast(msg, 'error')}
          />
        );
      case 'doctor_dashboard':
        return (
          <DoctorDashboard 
            onSuccessToast={(msg) => addToast(msg, 'success')}
            onErrorToast={(msg) => addToast(msg, 'error')}
          />
        );
      case 'admin_dashboard':
      case 'admin_users':
      case 'admin_system_health':
      case 'admin_logs':
      case 'admin_eval':
        return (
          <AdminDashboard 
            onSuccessToast={(msg) => addToast(msg, 'success')}
            onErrorToast={(msg) => addToast(msg, 'error')}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        );
      default:
        return (
          <div className="text-center py-20 text-slate-500 font-mono">
            Tab View Not Found.
          </div>
        );
    }
  };

  return (
    <>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {renderTabContent()}
      </Layout>
      
      {/* Global float toasts */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </>
  );
}
