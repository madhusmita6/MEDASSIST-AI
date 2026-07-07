import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Appointment } from '../types';
import { Calendar, Trash2, Edit2, Plus, Clock, MapPin, Loader2, CalendarOff } from 'lucide-react';

interface AppointmentsProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export default function Appointments({ onSuccessToast, onErrorToast }: AppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctor, setDoctor] = useState('Dr. Evelyn Adams (Cardiology)');
  const [clinic, setClinic] = useState('Metro Heart Institute');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [editingAptId, setEditingAptId] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      const data = await apiService.appointments.list();
      setAppointments(data);
    } catch (e) {
      onErrorToast("Failed to fetch appointments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const formatForDateTimeLocal = (dateStr: string) => {
    const date = new Date(dateStr);
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!time) {
      onErrorToast("Please select a date and time slot.");
      return;
    }
    setBooking(true);
    try {
      if (editingAptId) {
        await apiService.appointments.reschedule(editingAptId, new Date(time).toISOString());
        setAppointments(prev => prev.map(a => a.id === editingAptId ? { ...a, scheduledTime: new Date(time).toISOString() } : a));
        onSuccessToast(`Checkup successfully rescheduled with ${doctor}!`);
        setEditingAptId(null);
      } else {
        const newApt = await apiService.appointments.create(doctor, clinic, new Date(time).toISOString());
        setAppointments(prev => [...prev, newApt]);
        onSuccessToast(`Checkup successfully scheduled with ${doctor}!`);
      }
      setTime('');
    } catch (err: any) {
      onErrorToast(err.message || "Operation failed.");
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await apiService.appointments.cancel(id);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' as const } : a));
      onSuccessToast("Appointment successfully cancelled.");
    } catch (e) {
      onErrorToast("Cancellation failure.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.appointments.delete(id);
      setAppointments(prev => prev.filter(a => a.id !== id));
      onSuccessToast("Appointment permanently deleted.");
      if (editingAptId === id) {
        setEditingAptId(null);
        setTime('');
      }
    } catch (e) {
      onErrorToast("Deletion failure.");
    }
  };

  const startReschedule = (apt: Appointment) => {
    setEditingAptId(apt.id);
    setDoctor(apt.doctorName);
    setClinic(apt.clinicName);
    setTime(formatForDateTimeLocal(apt.scheduledTime));
  };

  const cancelReschedule = () => {
    setEditingAptId(null);
    setTime('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-500 font-mono animate-pulse-soft">Loading appointment calendars...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Appointment List */}
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Calendar size={22} className="text-indigo-400" />
          <span>Active Schedules</span>
        </h2>

        <div className="space-y-4">
          {appointments.filter(a => a.status === 'scheduled').length === 0 ? (
            <div className="p-10 text-center text-slate-500 border border-slate-900 bg-slate-950/40 rounded-2xl">
              No active schedules found. Use the form to book one.
            </div>
          ) : (
            appointments.filter(a => a.status === 'scheduled').map((apt) => (
              <div key={apt.id} className="p-6 glass-card rounded-2xl flex items-center justify-between">
                <div className="space-y-2">
                  <h4 className="font-bold text-base text-slate-100">{apt.doctorName}</h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-slate-500" />
                      {apt.clinicName}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} className="text-slate-500" />
                      {new Date(apt.scheduledTime).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startReschedule(apt)}
                    className="p-3 bg-indigo-650/10 border border-indigo-900/25 hover:bg-indigo-600 hover:text-white rounded-xl text-indigo-400 transition-colors active:scale-95"
                    title="Reschedule Appointment"
                  >
                    <Edit2 size={16} />
                  </button>

                  <button
                    onClick={() => handleCancel(apt.id)}
                    className="p-3 bg-amber-650/10 border border-amber-900/25 hover:bg-amber-600 hover:text-white rounded-xl text-amber-400 transition-colors active:scale-95"
                    title="Cancel Appointment"
                  >
                    <CalendarOff size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(apt.id)}
                    className="p-3 bg-red-650/10 border border-red-900/25 hover:bg-red-600 hover:text-white rounded-xl text-red-400 transition-colors active:scale-95"
                    title="Delete Appointment"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Booking Form panel */}
      <div className="glass-panel border border-slate-800 rounded-3xl p-6 h-fit space-y-6">
        <h3 className="text-base font-bold flex items-center gap-2">
          <Plus size={18} className="text-indigo-400" />
          <span>{editingAptId ? "Reschedule Checkup" : "Book Checkup Slot"}</span>
        </h3>

        <form onSubmit={handleBook} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Physician/Doctor</label>
            <select
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              disabled={!!editingAptId}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-850 disabled:opacity-50 border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="Dr. Evelyn Adams (Cardiology)">Dr. Evelyn Adams (Cardiology)</option>
              <option value="Dr. Michael Chang (Generalist)">Dr. Michael Chang (Generalist)</option>
              <option value="Dr. Sarah Johnson (Neurology)">Dr. Sarah Johnson (Neurology)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Clinic Location</label>
            <input
              type="text"
              required
              value={clinic}
              onChange={(e) => setClinic(e.target.value)}
              disabled={!!editingAptId}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-850 disabled:opacity-50 border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Select Date & Time</label>
            <input
              type="datetime-local"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={booking}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {booking ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{editingAptId ? "Confirm Reschedule" : "Confirm Booking"}</span>
            </button>
            {editingAptId && (
              <button
                type="button"
                onClick={cancelReschedule}
                className="px-4 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
