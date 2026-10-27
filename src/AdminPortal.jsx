import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import {
  generateTimeSlots,
  formatTime12Hr,
  minutesToTime24,
  timeToMinutes,
  downloadIcsFile,
} from './constants';
import { Lock, Calendar, Trash2, PlusCircle, Clock, ArrowLeft } from 'lucide-react';

export default function AdminPortal({ onBack }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Time-off blocking state
  const [blockDate, setBlockDate] = useState('');
  const [blockAllDay, setBlockAllDay] = useState(true);
  const [blockStart, setBlockStart] = useState('09:00');
  const [blockEnd, setBlockEnd] = useState('16:30');
  const [blockReason, setBlockReason] = useState('Time Off / Unavailable');

  const allSlots = generateTimeSlots() || [];

  const handleLogin = (e) => {
    e.preventDefault();
    const expectedPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'lexi2026';
    if (passwordInput === expectedPassword) {
      setIsAuthenticated(true);
      setAuthError('');
      fetchAppointments();
    } else {
      setAuthError('Incorrect password.');
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        setFetchError(error.message);
      } else {
        setAppointments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setFetchError(err.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBlock = async (e) => {
    e.preventDefault();
    if (!blockDate) return;

    const start = blockAllDay ? '09:00' : blockStart;
    const end = blockAllDay ? '17:00' : blockEnd;

    if (timeToMinutes(end) <= timeToMinutes(start)) {
      alert('End time must be after start time.');
      return;
    }

    const { error } = await supabase.from('appointments').insert([
      {
        appointment_date: blockDate,
        start_time: start,
        end_time: end,
        client_name: blockReason || 'Blocked Time Off',
        client_email: 'lexi@lexi.hair',
        is_blocked: true,
        services: [],
        total_price: 0,
      },
    ]);

    if (error) {
      alert('Error saving time block: ' + error.message);
    } else {
      setBlockReason('Time Off / Unavailable');
      fetchAppointments();
    }
  };

  const handleDelete = async (id, label) => {
    if (!window.confirm(`Remove "${label}" from the schedule?`)) return;
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (!error) {
      fetchAppointments();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-cream-card border border-espresso/15 rounded-2xl p-8 max-w-md w-full shadow-sm">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-espresso-muted hover:text-espresso mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Website
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-full bg-cream-dark">
              <Lock className="w-5 h-5 text-espresso" />
            </div>
            <h1 className="font-serif text-3xl font-semibold">Lexi Admin Portal</h1>
          </div>
          <p className="text-sm text-espresso-light mb-6">
            Enter your admin password to view appointments and block off time away.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Admin password"
              className="w-full px-4 py-3 rounded-xl border border-espresso/20 bg-cream focus:outline-none focus:border-espresso"
              required
            />
            {authError && <p className="text-xs text-red-600">{authError}</p>}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-espresso text-cream font-medium hover:bg-espresso-light transition"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-espresso/15">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-espresso-muted hover:text-espresso mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Public Booking Site
          </button>
          <h1 className="font-serif text-4xl font-semibold">Schedule & Time-Off Manager</h1>
        </div>
        <button
          type="button"
          onClick={fetchAppointments}
          className="px-4 py-2 rounded-xl border border-espresso/20 text-sm hover:bg-cream-dark transition"
        >
          Refresh Schedule
        </button>
      </div>

      {fetchError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          Error loading schedule: {fetchError}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column: Block Time Off Form */}
        <div className="md:col-span-1">
          <div className="bg-cream-card border border-espresso/15 rounded-2xl p-6 shadow-sm sticky top-6">
            <h2 className="font-serif text-2xl font-semibold mb-1 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-terracotta" /> Block Time Away
            </h2>
            <p className="text-xs text-espresso-muted mb-5">
              Blocked times will immediately grey out on the public booking calendar.
            </p>

            <form onSubmit={handleCreateBlock} className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-espresso/20 bg-cream text-sm"
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={blockAllDay}
                  onChange={(e) => setBlockAllDay(e.target.checked)}
                  className="rounded border-espresso/30 text-espresso focus:ring-0"
                />
                Block Entire Day (9:00 AM – 5:00 PM)
              </label>

              {!blockAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-espresso-muted mb-1">From</label>
                    <select
                      value={blockStart}
                      onChange={(e) => setBlockStart(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-espresso/20 bg-cream text-sm"
                    >
                      {allSlots.map((s) => (
                        <option key={s.time24} value={s.time24}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-espresso-muted mb-1">Until</label>
                    <select
                      value={blockEnd}
                      onChange={(e) => setBlockEnd(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-espresso/20 bg-cream text-sm"
                    >
                      {allSlots.map((s) => {
                        const end24 = minutesToTime24(s.minutesFromMidnight + 90);
                        return (
                          <option key={end24} value={end24}>
                            {formatTime12Hr(end24)}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1">
                  Label / Reason (Internal)
                </label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g., Vacation, Lunch, School"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-espresso/20 bg-cream text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso-light transition"
              >
                Block Selected Time
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Upcoming Appointments & Blocks */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="font-serif text-2xl font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-terracotta" /> Upcoming Schedule ({appointments.length})
          </h2>

          {loading ? (
            <p className="text-sm text-espresso-muted py-8">Loading schedule...</p>
          ) : appointments.length === 0 ? (
            <div className="bg-cream-card border border-espresso/10 rounded-2xl p-8 text-center text-espresso-muted text-sm">
              No upcoming appointments or time blocks scheduled.
            </div>
          ) : (
            appointments.map((appt) => {
              const serviceList = Array.isArray(appt.services) ? appt.services : [];

              return (
                <div
                  key={appt.id}
                  className={`rounded-2xl p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    appt.is_blocked
                      ? 'bg-cream-dark/70 border-espresso/20'
                      : 'bg-cream-card border-espresso/15 shadow-sm'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-espresso text-cream">
                        {appt.appointment_date}
                      </span>
                      <span className="text-sm font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-terracotta" />
                        {appt.start_time ? formatTime12Hr(appt.start_time) : ''} –{' '}
                        {appt.end_time ? formatTime12Hr(appt.end_time) : ''}
                      </span>
                      {appt.is_blocked && (
                        <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-terracotta/25 text-espresso font-semibold">
                          Blocked Off
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif text-xl font-semibold">{appt.client_name}</h3>

                    {!appt.is_blocked && (
                      <>
                        <p className="text-xs text-espresso-light">
                          {appt.client_email} {appt.client_phone ? `• ${appt.client_phone}` : ''}
                        </p>
                        <p className="text-xs text-espresso font-medium pt-1">
                          Services:{' '}
                          {serviceList.map((s) => `${s.name} ($${s.price})`).join(', ')} —{' '}
                          <span className="font-semibold">
                            Est. ${Number(appt.total_price || 0).toFixed(2)}
                          </span>
                        </p>
                        {appt.notes && (
                          <p className="text-xs italic text-espresso-light bg-cream p-2 rounded-lg mt-1">
                            Notes: "{appt.notes}"
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-end gap-2 shrink-0">
                    {!appt.is_blocked && (
                      <button
                        type="button"
                        onClick={() => downloadIcsFile(appt)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-espresso/20 text-xs font-medium hover:bg-cream-dark transition"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Apple Calendar (.ics)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(appt.id, appt.client_name)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-red-700 hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Cancel / Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}