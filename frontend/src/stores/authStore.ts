import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '../types'

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isPatient: () => boolean;
  isCaregiver: () => boolean;
  isDoctor: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      isPatient: () => get().user?.role === 'patient',
      isCaregiver: () => get().user?.role === 'caregiver',
      isDoctor: () => get().user?.role === 'doctor',
      isAdmin: () => get().user?.role === 'admin',
    }),
    {
      name: 'medassist-auth-storage', // key name in LocalStorage
    }
  )
)
