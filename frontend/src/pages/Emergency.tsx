import React, { useState } from 'react';
import { apiService } from '../services/api';
import { ShieldAlert, MapPin, Phone, AlertTriangle, Send, Loader2, CheckCircle2 } from 'lucide-react';

interface Hospital {
  name: string;
  distance_miles: number;
  address: string;
  phone: string;
}

interface EmergencyProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export default function Emergency({ onSuccessToast, onErrorToast }: EmergencyProps) {
  const [symptoms, setSymptoms] = useState('');
  const [severity, setSeverity] = useState<'NONE' | 'ROUTINE' | 'CRITICAL'>('NONE');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);

  const handleTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) return;
    
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise(res => setTimeout(res, 1200));
      
      const lower = symptoms.toLowerCase();
      const isCritical = ["chest pain", "breathing", "bleeding", "unconscious", "stroke", "heart attack"].some(k => lower.includes(k));
      
      if (isCritical) {
        setSeverity('CRITICAL');
        const res = await apiService.emergency.triggerSos(37.7749, -122.4194);
        setHospitals(res.nearby_hospitals);
        onSuccessToast("SOS Broadcasted! Caregivers notified via Gmail MCP.");
      } else {
        setSeverity('ROUTINE');
        setHospitals([
          { name: "City Health Walk-in Clinic", distance_miles: 1.8, address: "205 Medical Plaza", phone: "+15550180" }
        ]);
        onSuccessToast("Symptoms triaged. Non-critical status.");
      }
    } catch (err) {
      onErrorToast("Triage pipeline failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSOSDirect = async () => {
    setLoading(true);
    try {
      const res = await apiService.emergency.triggerSos(37.7749, -122.4194);
      setSeverity('CRITICAL');
      setHospitals(res.nearby_hospitals);
      onSuccessToast("Direct SOS dispatched! Caregivers alerted.");
    } catch (e) {
      onErrorToast("SOS activation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Triage symptoms input */}
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-panel border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-red-500">
            <ShieldAlert size={22} className="animate-pulse text-red-500" />
            <span>Symptom Triage & SOS</span>
          </h2>
          
          <p className="text-sm text-slate-400 leading-normal">
            Describe symptoms below. Our safety filter scans inputs for critical markers, schedules emergency caregiver notifications, and lists nearby ER centers.
          </p>

          <form onSubmit={handleTriage} className="space-y-4">
            <textarea
              required
              rows={4}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 placeholder-slate-700 leading-relaxed"
              placeholder="e.g. 'I am having chest tightness and mild breathing difficulty...'"
            />
            
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || !symptoms.trim()}
                className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                <span>Evaluate Symptoms</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerSOSDirect}
                className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors"
              >
                Trigger Direct SOS
              </button>
            </div>
          </form>
        </div>

        {/* Severity Indicator alert panels */}
        {severity === 'CRITICAL' && (
          <div className="p-6 bg-red-950/20 border border-red-500/25 rounded-3xl space-y-4 animate-pulse-soft">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-500 shrink-0 mt-1" size={24} />
              <div className="space-y-1">
                <h3 className="text-red-400 font-bold text-base">CRITICAL THRESHOLD TRIGGERED</h3>
                <p className="text-xs text-red-300/80 leading-normal">
                  Symptom inputs represent high-risk indices. Registered caregivers have been notified via emergency Gmail dispatches containing GPS locations. Please call local emergency services (911) immediately.
                </p>
              </div>
            </div>
            
            <div className="text-xs text-red-300 font-medium pl-9 leading-relaxed">
              <strong>First Aid Directions:</strong><br />
              - Sit upright to ease breathing. Avoid lying flat.<br />
              - Loosen clothing around neck and chest.<br />
              - Rest and minimize body movements until emergency personnel arrive.
            </div>
          </div>
        )}

        {severity === 'ROUTINE' && (
          <div className="p-6 bg-emerald-950/20 border border-emerald-500/25 rounded-3xl flex items-start gap-3">
            <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
            <div className="space-y-1">
              <h3 className="text-emerald-400 font-bold text-sm">Non-Critical Symptoms</h3>
              <p className="text-xs text-emerald-300/80 leading-normal">
                No high-risk indices detected. Caregivers have not been alarmed. Consider scheduling a routine checkup or speaking with a consultant if issues persist.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Hospital Listings panel */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-2">Closest Healthcare Providers</h3>
        
        <div className="space-y-4">
          {hospitals.length === 0 ? (
            <div className="p-8 text-center text-slate-500 border border-slate-900 bg-slate-950/40 rounded-2xl text-xs font-mono">
              Describe symptoms or trigger SOS to look up nearby emergency clinics.
            </div>
          ) : (
            hospitals.map((hosp, idx) => (
              <div key={idx} className="p-5 glass-card rounded-2xl space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-sm text-slate-100">{hosp.name}</h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <MapPin size={12} className="text-slate-500" />
                    {hosp.address} ({hosp.distance_miles} miles away)
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <a
                    href={`tel:${hosp.phone}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-900 border border-slate-800 hover:text-white text-xs font-semibold rounded-xl text-slate-400 transition-colors"
                  >
                    <Phone size={12} />
                    <span>Call Clinic</span>
                  </a>
                  
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hosp.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600 text-xs font-semibold rounded-xl text-indigo-400 hover:text-white transition-all"
                  >
                    <span>Get Directions</span>
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
// End of Emergency component
