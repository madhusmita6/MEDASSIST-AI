import React, { useState } from 'react';
import { apiService } from '../services/api';
import { Mail, User, ShieldCheck, Loader2 } from 'lucide-react';

interface RegisterProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
  onNavigateToLogin: () => void;
}

export default function Register({ onSuccessToast, onErrorToast, onNavigateToLogin }: RegisterProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'patient' | 'caregiver'>('patient');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiService.auth.register(email, fullName, role);
      onSuccessToast("Registration successful! Please login.");
      onNavigateToLogin();
    } catch (err: any) {
      onErrorToast("Registration failed. Please check entries.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
      
      <div className="max-w-md w-full glass-panel border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <span className="text-4xl">🩺</span>
          <h2 className="text-2xl font-bold mt-4 tracking-tight">Create Account</h2>
          <p className="text-sm text-slate-400 mt-1.5">Sign up to access MedAssist concierge</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600 transition-colors"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600 transition-colors"
                placeholder="patient@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Select Portal Role</label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                type="button"
                onClick={() => setRole('patient')}
                className={`py-3 px-4 border rounded-xl text-sm font-semibold transition-all duration-200 ${
                  role === 'patient'
                    ? 'bg-indigo-600/25 border-indigo-500 text-indigo-400'
                    : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:text-white'
                }`}
              >
                Patient
              </button>
              <button
                type="button"
                onClick={() => setRole('caregiver')}
                className={`py-3 px-4 border rounded-xl text-sm font-semibold transition-all duration-200 ${
                  role === 'caregiver'
                    ? 'bg-indigo-600/25 border-indigo-500 text-indigo-400'
                    : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:text-white'
                }`}
              >
                Caregiver
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            <span>Register</span>
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-900 pt-6">
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <button onClick={onNavigateToLogin} className="text-indigo-400 hover:underline font-semibold">
              Sign In Instead
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
