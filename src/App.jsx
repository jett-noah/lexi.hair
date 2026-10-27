import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import {
  SALON_INFO,
  SERVICE_CATEGORIES,
  PLACEHOLDER_GALLERY,
  generateTimeSlots,
  formatTime12Hr,
  timeToMinutes,
  minutesToTime24,
  isSlotBookedOrOverlapping,
  createGoogleCalendarUrl,
  downloadIcsFile,
} from './constants';
import AdminPortal from './AdminPortal';
import InstagramFeed from './InstagramFeed';
import {
  Scissors,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
} from 'lucide-react';

export default function App() {
  // Toggle Admin Portal if URL has #admin or button clicked
  const [showAdmin, setShowAdmin] = useState(window.location.hash === '#admin');

  // Step 1: Date & Time State
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime24, setSelectedTime24] = useState('');
  const [dayBookings, setDayBookings] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [dateError, setDateError] = useState('');

  // Step 2: Selected Services State
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  // Step 3: Guest Details State
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Step 4: Confirmed Booking Receipt
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // Compute minimum selectable date (today)
  const todayStr = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Fetch existing bookings from Supabase whenever the user picks a valid Monday-Friday date
  useEffect(() => {
    if (!selectedDate) return;

    // Check if weekend (Monday = 1 ... Friday = 5, Saturday = 6, Sunday = 0)
    const [year, month, day] = selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      setDateError('Lexi takes appointments Monday through Friday. Please select a weekday.');
      setSelectedTime24('');
      setDayBookings([]);
      return;
    }

    setDateError('');
    setSelectedTime24('');
    fetchBookingsForDate(selectedDate);
  }, [selectedDate]);

  const fetchBookingsForDate = async (dateStr) => {
    setLoadingSlots(true);
    const { data, error } = await supabase
      .from('appointments')
      .select('start_time, end_time, is_blocked')
      .eq('appointment_date', dateStr);

    if (!error && data) {
      setDayBookings(data);
    }
    setLoadingSlots(false);
  };

  // Toggle service selection
  const toggleService = (id) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Flatten selected service objects and calculate running price
  const selectedServicesList = useMemo(() => {
    const allItems = SERVICE_CATEGORIES.flatMap((cat) => cat.items);
    return allItems.filter((item) => selectedServiceIds.includes(item.id));
  }, [selectedServiceIds]);

  const estimatedTotal = useMemo(() => {
    return selectedServicesList.reduce((sum, item) => sum + item.price, 0);
  }, [selectedServicesList]);

  // Submit the booking
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!selectedDate || !selectedTime24) {
      setSubmitError('Please select a date and available time slot first.');
      return;
    }
    if (selectedServicesList.length === 0) {
      setSubmitError('Please select at least one service.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Re-fetch latest bookings for that date to guarantee no race-condition double booking
      const { data: latestBookings, error: checkError } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('appointment_date', selectedDate);

      if (checkError) {
        console.error('Supabase Error:', checkError);
        throw new Error(`Database error: ${checkError.message}`);
      }

      if (isSlotBookedOrOverlapping(selectedTime24, latestBookings || [])) {
        await fetchBookingsForDate(selectedDate);
        setSelectedTime24('');
        throw new Error(
          'Sorry, that time slot was just reserved by another guest! Please choose a different time.'
        );
      }

      const endTime24 = minutesToTime24(timeToMinutes(selectedTime24) + SALON_INFO.durationMinutes);

      const newBookingPayload = {
        appointment_date: selectedDate,
        start_time: selectedTime24,
        end_time: endTime24,
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim(),
        services: selectedServicesList,
        total_price: estimatedTotal,
        notes: clientNotes.trim(),
        is_blocked: false,
      };

      // 2. Insert booking into Supabase
      const { data: insertedData, error: insertError } = await supabase
        .from('appointments')
        .insert([newBookingPayload])
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);

      // 3. Trigger our Serverless Email API and log the result in Console
      fetch('/api/send-booking-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(insertedData),
      })
        .then(async (res) => {
          const result = await res.json();
          if (!res.ok) {
            console.error('❌ Email API Error:', result);
          } else {
            console.log('✅ Confirmation emails sent successfully!');
          }
        })
        .catch((err) => {
          console.error('❌ Could not reach /api/send-booking-email:', err);
        });

      setConfirmedBooking(insertedData);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  if (showAdmin) {
    return (
      <AdminPortal
        onBack={() => {
          window.location.hash = '';
          setShowAdmin(false);
          if (selectedDate) fetchBookingsForDate(selectedDate);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-cream/90 backdrop-blur-md border-b border-espresso/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5">
            <Scissors className="w-5 h-5 text-terracotta -rotate-45" />
            <span className="font-serif text-2xl sm:text-3xl font-semibold tracking-wide">
              HAIR BY LEXI
            </span>
          </a>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <a href="#book" className="hover:text-terracotta transition">
              Book Appointment
            </a>
            <a href="#services" className="hidden sm:inline hover:text-terracotta transition">
              Service Menu
            </a>
            <a href="#gallery" className="hidden sm:inline hover:text-terracotta transition">
              Client Results
            </a>
            <a
              href="#book"
              className="px-4 py-2 rounded-full bg-espresso text-cream text-xs sm:text-sm hover:bg-espresso-light transition"
            >
              Reserve Slot
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative py-14 sm:py-20 px-4 border-b border-espresso/10 bg-gradient-to-b from-cream to-cream-dark/50">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cream-card border border-espresso/15 text-xs uppercase tracking-widest text-espresso-light">
            <Sparkles className="w-3.5 h-3.5 text-terracotta" /> Normal, Illinois • Mon–Fri
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl font-semibold tracking-tight text-espresso leading-none">
            Custom Color, Styling & Texture Care
          </h1>
          <p className="text-base sm:text-lg text-espresso-light max-w-xl mx-auto">
            Reserve your 90-minute session online. Select your preferred date and time slot, customize
            your service menu, and receive instant calendar confirmation.
          </p>

          {/* Location Pills */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-espresso-light">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-terracotta" />
              {SALON_INFO.address}
            </span>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center gap-3">
              <a
                href={SALON_INFO.appleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-espresso inline-flex items-center gap-1"
              >
                Apple Maps <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={SALON_INFO.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-espresso inline-flex items-center gap-1"
              >
                Google Maps <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Booking Section */}
      <main id="book" className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
        {confirmedBooking ? (
          /* STEP 4: Confirmation Screen */
          <div className="bg-cream-card border border-espresso/20 rounded-3xl p-8 sm:p-12 max-w-2xl mx-auto shadow-sm text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-100 text-green-800 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-widest text-terracotta font-semibold">
                Booking Confirmed
              </span>
              <h2 className="font-serif text-4xl font-semibold">
                We Can’t Wait to See You, {confirmedBooking.client_name}!
              </h2>
              <p className="text-sm text-espresso-light">
                A confirmation email with your appointment details has been sent to{' '}
                <span className="font-semibold text-espresso">{confirmedBooking.client_email}</span>{' '}
                and to Lexi.
              </p>
            </div>

            {/* Appointment Summary Box */}
            <div className="bg-cream rounded-2xl p-6 text-left border border-espresso/10 space-y-3 text-sm">
              <div className="flex justify-between border-b border-espresso/10 pb-2">
                <span className="text-espresso-muted">Date</span>
                <span className="font-semibold">{confirmedBooking.appointment_date}</span>
              </div>
              <div className="flex justify-between border-b border-espresso/10 pb-2">
                <span className="text-espresso-muted">Time (90 Mins)</span>
                <span className="font-semibold">
                  {formatTime12Hr(confirmedBooking.start_time)} –{' '}
                  {formatTime12Hr(confirmedBooking.end_time)}
                </span>
              </div>
              <div className="border-b border-espresso/10 pb-2">
                <span className="text-espresso-muted block mb-1">Reserved Services</span>
                <ul className="space-y-1">
                  {confirmedBooking.services.map((s) => (
                    <li key={s.id} className="flex justify-between font-medium">
                      <span>{s.name}</span>
                      <span>${s.price.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-between text-base font-semibold pt-1">
                <span>Estimated Base Total</span>
                <span>${Number(confirmedBooking.total_price).toFixed(2)}</span>
              </div>
              <div className="pt-2 text-xs text-espresso-muted flex flex-wrap items-center justify-between gap-2">
                <span>{SALON_INFO.address}</span>
                <div className="space-x-3">
                  <a
                    href={SALON_INFO.appleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-espresso"
                  >
                    Apple Maps
                  </a>
                  <a
                    href={SALON_INFO.googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-espresso"
                  >
                    Google Maps
                  </a>
                </div>
              </div>
            </div>

            {/* One-Click Calendar Buttons */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-espresso-muted">
                Add to Your Calendar
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => downloadIcsFile(confirmedBooking)}
                  className="px-6 py-3.5 rounded-xl bg-espresso text-cream font-medium text-sm hover:bg-espresso-light transition flex items-center justify-center gap-2"
                >
                  <CalendarIcon className="w-4 h-4" /> Add to Apple Calendar (.ics)
                </button>
                <a
                  href={createGoogleCalendarUrl(confirmedBooking)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3.5 rounded-xl border border-espresso/25 bg-cream-card text-espresso font-medium text-sm hover:bg-cream-dark transition flex items-center justify-center gap-2"
                >
                  <CalendarIcon className="w-4 h-4" /> Add to Google Calendar
                </a>
              </div>
            </div>

            <p className="text-xs italic text-espresso-muted pt-2">{SALON_INFO.disclaimer}</p>

            <button
              onClick={() => {
                setConfirmedBooking(null);
                setSelectedTime24('');
                setSelectedServiceIds([]);
                setClientNotes('');
                fetchBookingsForDate(selectedDate);
              }}
              className="text-xs underline text-espresso-light hover:text-espresso pt-4"
            >
              Book Another Appointment
            </button>
          </div>
        ) : (
          /* STEPS 1 - 3: Interactive Booking Form */
          <form onSubmit={handleBookingSubmit} className="space-y-12">
            {/* STEP 1: Select Date & Time */}
            <div className="bg-cream-card border border-espresso/15 rounded-3xl p-6 sm:p-10 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-8 h-8 rounded-full bg-espresso text-cream flex items-center justify-center text-sm font-semibold">
                  1
                </span>
                <div>
                  <h2 className="font-serif text-3xl font-semibold">
                    Select Your Date & Time Slot
                  </h2>
                  <p className="text-xs sm:text-sm text-espresso-light">
                    Appointments are 1 hour 30 minutes long, available Monday–Friday from 9:00 AM to
                    3:00 PM.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-12 gap-8 items-start">
                {/* Date Picker */}
                <div className="md:col-span-5 space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-espresso-light">
                    Choose a Weekday (Mon–Fri)
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="block w-full max-w-[240px] sm:max-w-xs px-3.5 py-2.5 min-h-[46px] appearance-none rounded-xl border border-espresso/25 bg-cream text-espresso text-sm font-medium focus:outline-none focus:border-espresso"
                    required
                  />
                  {dateError && (
                    <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50/80 p-3 rounded-xl mt-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{dateError}</span>
                    </div>
                  )}
                </div>

                {/* Time Slots Grid */}
                <div className="md:col-span-7">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-espresso-light mb-2">
                    Available Start Times (15-Min Increments)
                  </label>

                  {!selectedDate || dateError ? (
                    <div className="border border-dashed border-espresso/20 rounded-2xl p-8 text-center text-sm text-espresso-muted">
                      Select a Monday–Friday date on the left to view live time slots.
                    </div>
                  ) : loadingSlots ? (
                    <div className="border border-espresso/10 rounded-2xl p-8 text-center text-sm text-espresso-muted">
                      Checking Lexi’s live availability...
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                      {timeSlots.map((slot) => {
                        const isBooked = isSlotBookedOrOverlapping(slot.time24, dayBookings);
                        const isSelected = selectedTime24 === slot.time24;

                        return (
                          <button
                            type="button"
                            key={slot.time24}
                            disabled={isBooked}
                            onClick={() => setSelectedTime24(slot.time24)}
                            className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-medium border transition flex flex-col items-center justify-center ${
                              isBooked
                                ? 'bg-cream-dark/60 border-espresso/10 text-espresso-muted/50 line-through cursor-not-allowed'
                                : isSelected
                                ? 'bg-espresso text-cream border-espresso shadow-sm scale-[1.02]'
                                : 'bg-cream border-espresso/20 text-espresso hover:border-espresso'
                            }`}
                          >
                            <span>{slot.label}</span>
                            {isBooked && (
                              <span className="text-[10px] no-underline font-normal">Booked</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {selectedTime24 && (
                    <p className="mt-3 text-xs text-espresso-light flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-terracotta" />
                      Selected session:{' '}
                      <strong className="text-espresso">
                        {formatTime12Hr(selectedTime24)} –{' '}
                        {formatTime12Hr(
                          minutesToTime24(timeToMinutes(selectedTime24) + SALON_INFO.durationMinutes)
                        )}
                      </strong>{' '}
                      (1 hr 30 min)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* STEP 2: Select Services */}
            <div
              id="services"
              className="bg-cream-card border border-espresso/15 rounded-3xl p-6 sm:p-10 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-espresso text-cream flex items-center justify-center text-sm font-semibold">
                    2
                  </span>
                  <div>
                    <h2 className="font-serif text-3xl font-semibold">
                      Choose Your Services
                    </h2>
                    <p className="text-xs sm:text-sm text-espresso-light">
                      Select one or multiple services for your appointment.
                    </p>
                  </div>
                </div>

                {selectedServicesList.length > 0 && (
                  <div className="px-4 py-2 rounded-2xl bg-cream-dark border border-espresso/15 text-sm">
                    Selected ({selectedServicesList.length}):{' '}
                    <span className="font-semibold">${estimatedTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {SERVICE_CATEGORIES.map((group) => (
                  <div
                    key={group.category}
                    className="bg-cream rounded-2xl p-6 border border-espresso/10 flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="font-serif text-2xl font-semibold tracking-wide uppercase text-center border-b border-espresso/15 pb-3 mb-4">
                        {group.category}
                      </h3>
                      <div className="space-y-2.5">
                        {group.items.map((item) => {
                          const checked = selectedServiceIds.includes(item.id);
                          return (
                            <label
                              key={item.id}
                              onClick={() => toggleService(item.id)}
                              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                                checked
                                  ? 'bg-espresso text-cream border-espresso'
                                  : 'bg-cream-card border-espresso/10 hover:border-espresso/35'
                              }`}
                            >
                              <div className="flex items-center gap-3 pr-2">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {}}
                                  className="rounded border-espresso/30 text-terracotta focus:ring-0"
                                />
                                <span className="text-sm font-medium">{item.name}</span>
                              </div>
                              <span
                                className={`text-sm font-serif font-semibold shrink-0 ${
                                  checked ? 'text-cream' : 'text-espresso'
                                }`}
                              >
                                {item.price.toFixed(2)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {group.note && (
                      <p className="text-xs italic text-espresso-light text-center mt-4 pt-3 border-t border-espresso/10">
                        ({group.note})
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* STEP 3: Guest Details & Confirm */}
            <div className="bg-cream-card border border-espresso/15 rounded-3xl p-6 sm:p-10 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-8 h-8 rounded-full bg-espresso text-cream flex items-center justify-center text-sm font-semibold">
                  3
                </span>
                <div>
                  <h2 className="font-serif text-3xl font-semibold">Your Contact Information</h2>
                  <p className="text-xs sm:text-sm text-espresso-light">
                    We’ll send your confirmation and calendar invite right after booking.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-5 mb-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-espresso-light mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-4 py-3 rounded-xl border border-espresso/20 bg-cream text-sm focus:outline-none focus:border-espresso"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-espresso-light mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-espresso/20 bg-cream text-sm focus:outline-none focus:border-espresso"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-espresso-light mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(309) 555-0123"
                    className="w-full px-4 py-3 rounded-xl border border-espresso/20 bg-cream text-sm focus:outline-none focus:border-espresso"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-espresso-light mb-1.5">
                  Special Requests / Hair History Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Share any inspiration, previous color history, allergies, or special requests for Lexi..."
                  className="w-full px-4 py-3 rounded-xl border border-espresso/20 bg-cream text-sm focus:outline-none focus:border-espresso"
                />
              </div>

              {submitError && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Disclaimer & Submit Button */}
              <div className="bg-cream rounded-2xl p-5 border border-espresso/15 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left space-y-1">
                  <p className="text-xs font-medium text-espresso">
                    * Disclaimer: {SALON_INFO.disclaimer}
                  </p>
                  <p className="text-xs text-espresso-muted">
                    {selectedDate && selectedTime24
                      ? `Booking for ${selectedDate} at ${formatTime12Hr(selectedTime24)} • ${
                          selectedServicesList.length
                        } service(s) ($${estimatedTotal.toFixed(2)})`
                      : 'Please make sure you have selected a time slot and at least one service above.'}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-espresso text-cream font-medium text-sm hover:bg-espresso-light transition disabled:opacity-50 shrink-0"
                >
                  {submitting ? 'Confirming Appointment...' : 'Confirm Appointment'}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>

      {/* Client Results / Live Instagram Section */}
      <InstagramFeed />

      {/* Footer */}
      <footer className="bg-espresso text-cream py-12 px-4 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-1">
            <h3 className="font-serif text-2xl font-semibold tracking-wide">HAIR BY LEXI</h3>
            <p className="text-xs text-cream/75">{SALON_INFO.address}</p>
            <div className="flex items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-terracotta">
              <a href={SALON_INFO.appleMapsUrl} target="_blank" rel="noreferrer" className="hover:underline">
                Open in Apple Maps
              </a>
              <a href={SALON_INFO.googleMapsUrl} target="_blank" rel="noreferrer" className="hover:underline">
                Open in Google Maps
              </a>
              <a href={`mailto:${SALON_INFO.email}`} className="hover:underline">
                {SALON_INFO.email}
              </a>
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-end gap-2">
            <button
              onClick={() => {
                window.location.hash = 'admin';
                setShowAdmin(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 text-xs text-cream/60 hover:text-cream transition"
            >
              <Lock className="w-3.5 h-3.5" /> Stylist Admin Login
            </button>
            <p className="text-[11px] text-cream/50">
              © {new Date().getFullYear()} Hair By Lexi. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}