export const SALON_INFO = {
  name: 'Hair By Lexi',
  email: 'lexi@lexi.hair',
  instagramHandle: '@hair.by.lexih_',
  instagramUrl: 'https://www.instagram.com/hair.by.lexih_/',
  address: '1503 E College Ave Suite L, Normal, IL 61761',
  googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=1503+E+College+Ave+Suite+L+Normal+IL+61761',
  appleMapsUrl: 'https://maps.apple.com/?address=1503,E+College+Ave,Suite+L,Normal,IL,61761',
  disclaimer: 'Appointments are subject to change at the discretion of Hair By Lexi',
  durationMinutes: 90, // 1.5 hours per appointment
};

export const SERVICE_CATEGORIES = [
  {
    category: 'Hair Services',
    note: null,
    items: [
      { id: 'haircut-blowdry', name: 'Haircut (Includes Blowdry)', price: 15 },
      { id: 'bang-trim', name: 'Bang Trim', price: 5 },
      { id: 'shampoo-blowdry', name: 'Shampoo & Blowdry', price: 12 },
      { id: 'updo', name: 'Updo', price: 20 },
      { id: 'fingerwaves', name: 'Fingerwaves', price: 20 },
      { id: 'pincurls', name: 'Pincurls', price: 30 },
    ],
  },
  {
    category: 'Hair Add-Ons',
    note: null,
    items: [
      { id: 'thermal-style', name: 'Thermal Style', price: 10 },
      { id: 'deep-conditioning', name: 'Deep Conditioning Treatment', price: 15 },
      { id: 'scalp-treatment', name: 'Scalp Treatment', price: 10 },
      { id: 'clarifying-treatment', name: 'Intense Clarifying Treatment', price: 10 },
    ],
  },
  {
    category: 'Color Services',
    note: null,
    items: [
      { id: 'all-over-color', name: 'All Over Color (Permanent or Semi/Demi)', price: 40 },
      { id: 'color-retouch', name: 'Color Retouch', price: 30 },
      { id: 'virgin-lightener', name: 'Virgin Lightener', price: 55 },
      { id: 'lightener-retouch', name: 'Lightener Retouch', price: 45 },
      { id: 'gloss-toner', name: 'Gloss/Toner/Refresh/Filler', price: 15 },
      { id: 'vivid-color', name: 'Vivid Color', price: 20 },
      { id: 'full-foil', name: 'Full Foil Highlight', price: 55 },
      { id: 'partial-foil', name: 'Partial Foil Highlight', price: 40 },
      { id: 'express-highlight', name: 'Express Highlight (7 foils or less)', price: 20 },
      { id: 'ombre', name: 'Ombre', price: 45 },
      { id: 'balayage', name: 'Balayage', price: 45 },
      { id: 'babylights', name: 'Babylights', price: 60 },
    ],
  },
  {
    category: 'Texture Services',
    note: 'Additional Product $10.00 Per Bottle/Bowl',
    items: [
      { id: 'perm-relaxer', name: 'Perm/Relaxer', price: 50 },
      { id: 'perm-retouch', name: 'Perm/Relaxer Retouch', price: 40 },
      { id: 'keratin-complex', name: 'Keratin Complex Service', price: 50 },
    ],
  },
];

export const PLACEHOLDER_GALLERY = [
  {
    id: 1,
    title: 'Dimensional Balayage & Waves',
    category: 'Color Services',
    image: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 2,
    title: 'Warm Brunette Gloss & Blowout',
    category: 'Hair & Gloss',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 3,
    title: 'Lived-In Blonde Highlights',
    category: 'Full Foil',
    image: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 4,
    title: 'Bridal & Event Updo Styling',
    category: 'Hair Services',
    image: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=800&q=80',
  },
];

// Generate 15-minute start slots from 09:00 (9:00 AM) to 15:00 (3:00 PM)
export function generateTimeSlots() {
  const slots = [];
  for (let mins = 9 * 60; mins <= 15 * 60; mins += 15) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const time24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    slots.push({
      time24,
      label: formatTime12Hr(time24),
      minutesFromMidnight: mins,
    });
  }
  return slots;
}

export function timeToMinutes(time24) {
  const [h, m] = time24.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime24(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime12Hr(time24) {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

// Check if a proposed 90-min slot starting at `slotStart24` overlaps with any existing booking
export function isSlotBookedOrOverlapping(slotStart24, existingBookings) {
  const proposedStart = timeToMinutes(slotStart24);
  const proposedEnd = proposedStart + SALON_INFO.durationMinutes; // +90 mins

  return existingBookings.some((booking) => {
    const existingStart = timeToMinutes(booking.start_time);
    const existingEnd = timeToMinutes(booking.end_time);
    // Two time intervals [A, B) and [C, D) overlap if A < D and B > C
    return proposedStart < existingEnd && proposedEnd > existingStart;
  });
}

// Build a Google Calendar template URL
export function createGoogleCalendarUrl(booking) {
  const startDateTime = formatCalendarTimestamp(booking.appointment_date, booking.start_time);
  const endDateTime = formatCalendarTimestamp(booking.appointment_date, booking.end_time);
  const serviceNames = (booking.services || []).map((s) => `${s.name} ($${s.price})`).join(', ');

  const details = `Appointment at Hair By Lexi\nClient: ${booking.client_name}\nServices: ${serviceNames}\nEstimated Total: $${booking.total_price}\nNotes: ${booking.notes || 'None'}\n\n${SALON_INFO.disclaimer}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Hair By Lexi - ${booking.client_name}`,
    dates: `${startDateTime}/${endDateTime}`,
    details,
    location: SALON_INFO.address,
    ctz: 'America/Chicago',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Generate and trigger an Apple Calendar / Universal .ics file download
export function downloadIcsFile(booking) {
  const startDateTime = formatCalendarTimestamp(booking.appointment_date, booking.start_time);
  const endDateTime = formatCalendarTimestamp(booking.appointment_date, booking.end_time);
  const serviceNames = (booking.services || []).map((s) => `${s.name} ($${s.price})`).join(', ');

  const description = `Client: ${booking.client_name}\\nPhone: ${booking.client_phone || 'N/A'}\\nServices: ${serviceNames}\\nEstimated Total: $${booking.total_price}\\nNotes: ${(booking.notes || 'None').replace(/\n/g, ' ')}\\n\\n${SALON_INFO.disclaimer}`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hair By Lexi//Booking System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.id || Date.now()}@lexi.hair`,
    `DTSTAMP:${startDateTime}Z`,
    `DTSTART;TZID=America/Chicago:${startDateTime}`,
    `DTEND;TZID=America/Chicago:${endDateTime}`,
    `SUMMARY:Hair By Lexi (${booking.client_name})`,
    `DESCRIPTION:${description}`,
    `LOCATION:${SALON_INFO.address}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `HairByLexi-${booking.appointment_date}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatCalendarTimestamp(dateStr, time24) {
  const cleanDate = dateStr.replace(/-/g, '');
  const cleanTime = time24.replace(':', '') + '00';
  return `${cleanDate}T${cleanTime}`;
}