import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { MedicationReminder } from '../types';
import { Pill, Trash2, Plus, Clock, Info, CheckCircle2 } from 'lucide-react';

interface RemindersProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export default function Reminders({ onSuccessToast, onErrorToast }: RemindersProps) {
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [time, setTime] = useState('08:00');
  const [loading, setLoading] = useState(true);

  const fetchReminders = async () => {
    try {
      const data = await apiService.reminders.list();
      setReminders(data);
    } catch (e) {
      onErrorToast("Failed to fetch reminders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName || !dosage) {
      onErrorToast("Please enter medication name and dosage.");
      return;
    }
    
    // Convert HH:MM time to readable AM/PM format
    const [hrs, mins] = time.split(':');
    const hour = parseInt(hrs);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    const time12 = `${hour12}:${mins} ${ampm}`;

    try {
      const newRem = await apiService.reminders.create({
        medicationName: medName,
        dosage,
        frequency,
        scheduledTimes: [time12],
        caregiverEscalationWindowMins: 30
      });
      setReminders(prev => [...prev, newRem]);
      onSuccessToast(`Medication reminder set for ${medName}!`);
      setMedName('');
      setDosage('');
    } catch (err) {
      onErrorToast("Failed to save medication reminder.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.reminders.delete(id);
      setReminders(prev => prev.filter(r => r.id !== id));
      onSuccessToast("Medication reminder removed.");
    } catch (e) {
      onErrorToast("Deactivation failure.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-500 font-mono animate-pulse-soft">Loading medication schedules...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Active reminders list */}
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Pill size={22} className="text-indigo-400" />
          <span>Medication Registries</span>
        </h2>

        <div className="space-y-4">
          {reminders.filter(r => r.active).length === 0 ? (
            <div className="p-10 text-center text-slate-500 border border-slate-900 bg-slate-950/40 rounded-2xl">
              No configured reminders found. Set up medication schedules using the config panel.
            </div>
          ) : (
            reminders.filter(r => r.active).map((rem) => (
              <div key={rem.id} className="p-6 glass-card rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400">
                    <Pill size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-100">{rem.medicationName}</h4>
                    <p className="text-xs text-slate-400 mt-1">Dosage: {rem.dosage} • {rem.frequency}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-indigo-400">
                    <Clock size={12} />
                    {rem.scheduledTimes.join(', ')}
                  </span>
                  
                  <button
                    onClick={() => handleDelete(rem.id)}
                    className="p-3 bg-slate-900 border border-slate-800 hover:border-red-900/35 hover:text-red-400 rounded-xl transition-colors active:scale-95"
                    title="Delete Reminder"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Reminder Panel */}
      <div className="glass-panel border border-slate-800 rounded-3xl p-6 h-fit space-y-6">
        <h3 className="text-base font-bold flex items-center gap-2">
          <Plus size={18} className="text-indigo-400" />
          <span>Add Reminder</span>
        </h3>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Medication Name</label>
            <input
              type="text"
              required
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Lisinopril"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Dosage Description</label>
            <input
              type="text"
              required
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
              placeholder="e.g. 10mg / 1 tablet"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="daily">Daily</option>
              <option value="twice daily">Twice Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Set Intake Time</label>
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span>Activate Reminder</span>
          </button>
        </form>

        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-start gap-2.5">
          <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-500 leading-normal">
            If compliance logging is missed by more than 30 minutes, an automated alert email will be dispatched to your linked caregiver contacts.
          </p>
        </div>
      </div>
    </div>
  );
}
