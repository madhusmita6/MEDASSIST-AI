import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { apiService } from '../services/api';
import FeatureBadges from '../components/FeatureBadges';
import { KeyRound, Mail, Loader2 } from 'lucide-react';

interface LoginProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
  onNavigateToRegister: () => void;
}

export default function Login({ onSuccessToast, onErrorToast, onNavigateToRegister }: LoginProps) {
  const loginStore = useAuthStore(state => state.login);
  const [email, setEmail] = useState('patient@example.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiService.auth.login(email, password);
      loginStore(response.user, response.token);
      onSuccessToast(`Welcome back, ${response.user.fullName}!`);
    } catch (err: any) {
      onErrorToast("Invalid email or password credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden gap-10">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
      
      <div className="max-w-md w-full glass-panel border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <span className="text-4xl">🩺</span>
          <h2 className="text-2xl font-bold mt-4 tracking-tight">MedAssist AI Portal</h2>
          <p className="text-sm text-slate-400 mt-1.5">Sign in to coordinate your health schedule</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <KeyRound size={18} className="absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            <span>Sign In</span>
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-900 pt-6">
          <p className="text-xs text-slate-500">
            Don't have an account?{' '}
            <button onClick={onNavigateToRegister} className="text-indigo-400 hover:underline font-semibold">
              Create an Account
            </button>
          </p>
        </div>
      </div>

      {/* Feature Badges listed prominently on bottom */}
      <div className="max-w-4xl w-full relative z-10">
        <div className="text-center mb-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Capabilities Built-In</h4>
        </div>
        <FeatureBadges />
      </div>
    </div>
  );
}
