import nodemailer from 'nodemailer';

const SALON_ADDRESS = '1503 E College Ave Suite L, Normal, IL 61761';
const GOOGLE_MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=1503+E+College+Ave+Suite+L+Normal+IL+61761';
const APPLE_MAPS_URL =
  'https://maps.apple.com/?address=1503,E+College+Ave,Suite+L,Normal,IL,61761';
const DISCLAIMER = 'Appointments are subject to change at the discretion of Hair By Lexi';

function formatTime12Hr(time24) {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatCalendarTimestamp(dateStr, time24) {
  const cleanDate = dateStr.replace(/-/g, '');
  const cleanTime = time24.replace(':', '') + '00';
  return `${cleanDate}T${cleanTime}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const booking = req.body;
    const {
      id,
      appointment_date,
      start_time,
      end_time,
      client_name,
      client_email,
      client_phone,
      services = [],
      total_price,
      notes,
    } = booking;

    const formattedStart = formatTime12Hr(start_time);
    const formattedEnd = formatTime12Hr(end_time);
    const serviceNames = services.map((s) => `${s.name} ($${Number(s.price).toFixed(2)})`).join(', ');

    // 1. Build Google Calendar Link
    const startCal = formatCalendarTimestamp(appointment_date, start_time);
    const endCal = formatCalendarTimestamp(appointment_date, end_time);
    const gcalParams = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Hair By Lexi - ${client_name}`,
      dates: `${startCal}/${endCal}`,
      details: `Appointment at Hair By Lexi\nClient: ${client_name}\nPhone: ${client_phone || 'N/A'}\nServices: ${serviceNames}\nEstimated Base Total: $${Number(total_price).toFixed(2)}\nNotes: ${notes || 'None'}\n\n${DISCLAIMER}`,
      location: SALON_ADDRESS,
      ctz: 'America/Chicago',
    });
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?${gcalParams.toString()}`;

    // 2. Build .ics file content for Apple Calendar
    const icsDescription = `Client: ${client_name}\\nPhone: ${client_phone || 'N/A'}\\nEmail: ${client_email}\\nServices: ${serviceNames}\\nEstimated Total: $${Number(total_price).toFixed(2)}\\nNotes: ${(notes || 'None').replace(/\n/g, ' ')}\\n\\n${DISCLAIMER}`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Hair By Lexi//Booking System//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${id || Date.now()}@lexi.hair`,
      `DTSTAMP:${startCal}Z`,
      `DTSTART;TZID=America/Chicago:${startCal}`,
      `DTEND;TZID=America/Chicago:${endCal}`,
      `SUMMARY:Hair By Lexi - ${client_name}`,
      `DESCRIPTION:${icsDescription}`,
      `LOCATION:${SALON_ADDRESS}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    // 3. Configure Gmail Transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || 'hairbylexih@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const servicesHtmlList = services
      .map(
        (s) =>
          `<li style="margin-bottom: 4px;"><strong>${s.name}</strong> — $${Number(s.price).toFixed(2)}</li>`
      )
      .join('');

    // 4. Send Confirmation Email to the Guest
    const guestHtml = `
      <div style="font-family: Georgia, serif; background-color: #FAF6F0; color: #2C221E; padding: 32px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #E5DEC9;">
        <h1 style="margin-top: 0; font-size: 28px; text-align: center; letter-spacing: 1px;">HAIR BY LEXI</h1>
        <p style="text-align: center; font-size: 16px; color: #5C4D46;">Your appointment is confirmed, <strong>${client_name}</strong>!</p>
        
        <div style="background-color: #FFFDF9; padding: 20px; border-radius: 12px; border: 1px solid #E5DEC9; margin: 24px 0; font-family: sans-serif; font-size: 14px;">
          <p style="margin: 6px 0;"><strong>Date:</strong> ${appointment_date}</p>
          <p style="margin: 6px 0;"><strong>Time:</strong> ${formattedStart} – ${formattedEnd} (1 hr 30 min)</p>
          <p style="margin: 10px 0 4px 0;"><strong>Reserved Services:</strong></p>
          <ul style="margin: 4px 0 12px 0; padding-left: 20px;">${servicesHtmlList}</ul>
          <p style="margin: 6px 0; font-size: 15px;"><strong>Estimated Base Total:</strong> $${Number(total_price).toFixed(2)}</p>
          ${notes ? `<p style="margin: 10px 0 0 0; font-style: italic; color: #5C4D46;"><strong>Your Notes:</strong> "${notes}"</p>` : ''}
        </div>

        <div style="text-align: center; margin: 24px 0; font-family: sans-serif;">
          <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #8C7B73; margin-bottom: 12px;">
            Add to Your Calendar
          </p>
          <a href="${googleCalendarUrl}" target="_blank" style="display: inline-block; background-color: #2C221E; color: #FAF6F0; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; margin: 4px;">
            + Add to Google Calendar
          </a>
          <p style="font-size: 12px; color: #5C4D46; margin-top: 10px;">
            📱 <strong>Using Apple Calendar?</strong> Simply tap the attached <strong>HairByLexi-${appointment_date}.ics</strong> file at the bottom of this email to add it straight to your iPhone or Mac calendar!
          </p>
        </div>

        <div style="border-top: 1px solid #E5DEC9; padding-top: 16px; text-align: center; font-family: sans-serif; font-size: 13px; color: #5C4D46;">
          <p style="margin: 4px 0;"><strong>Location:</strong> ${SALON_ADDRESS}</p>
          <p style="margin: 8px 0;">
            <a href="${APPLE_MAPS_URL}" style="color: #2C221E; font-weight: bold; margin-right: 12px;">Open in Apple Maps</a>
            <a href="${GOOGLE_MAPS_URL}" style="color: #2C221E; font-weight: bold;">Open in Google Maps</a>
          </p>
          <p style="font-size: 11px; font-style: italic; color: #8C7B73; margin-top: 16px;">* ${DISCLAIMER}</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Hair By Lexi" <${process.env.GMAIL_USER || 'hairbylexih@gmail.com'}>`,
      replyTo: 'lexi@lexi.hair',
      to: client_email,
      subject: `Appointment Confirmed: Hair By Lexi (${appointment_date} at ${formattedStart})`,
      html: guestHtml,
      attachments: [
        {
          filename: `HairByLexi-${appointment_date}.ics`,
          content: icsContent,
          contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
        },
      ],
    });

    // 5. Send Notification Email to Lexi (lexi@lexi.hair)
    const lexiHtml = `
      <div style="font-family: sans-serif; background-color: #FAF6F0; color: #2C221E; padding: 28px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #E5DEC9;">
        <h2 style="font-family: Georgia, serif; margin-top: 0;">✨ New Booking Received!</h2>
        <div style="background-color: #FFFDF9; padding: 18px; border-radius: 12px; border: 1px solid #E5DEC9; font-size: 14px;">
          <p style="margin: 6px 0;"><strong>Client Name:</strong> ${client_name}</p>
          <p style="margin: 6px 0;"><strong>Client Email:</strong> <a href="mailto:${client_email}">${client_email}</a></p>
          <p style="margin: 6px 0;"><strong>Client Phone:</strong> <a href="tel:${client_phone}">${client_phone || 'Not provided'}</a></p>
          <hr style="border: none; border-top: 1px solid #E5DEC9; margin: 12px 0;" />
          <p style="margin: 6px 0;"><strong>Date:</strong> ${appointment_date}</p>
          <p style="margin: 6px 0;"><strong>Time:</strong> ${formattedStart} – ${formattedEnd} (90 mins)</p>
          <p style="margin: 10px 0 4px 0;"><strong>Selected Services:</strong></p>
          <ul style="margin: 4px 0 12px 0; padding-left: 20px;">${servicesHtmlList}</ul>
          <p style="margin: 6px 0;"><strong>Estimated Base Total:</strong> $${Number(total_price).toFixed(2)}</p>
          <p style="margin: 10px 0 0 0;"><strong>Client Notes / Hair History:</strong> ${notes || 'None'}</p>
        </div>
        <p style="font-size: 13px; margin-top: 16px;">
          📅 <strong>Add to Apple Calendar:</strong> Tap the attached <code>HairByLexi-${appointment_date}.ics</code> file on your iPhone/iPad/Mac to add this client directly to your Apple Calendar, or <a href="${googleCalendarUrl}">click here for Google Calendar</a>.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Hair By Lexi Booking Site" <${process.env.GMAIL_USER || 'hairbylexih@gmail.com'}>`,
      replyTo: client_email,
      to: 'lexi@lexi.hair',
      subject: `New Appointment: ${client_name} on ${appointment_date} at ${formattedStart}`,
      html: lexiHtml,
      attachments: [
        {
          filename: `HairByLexi-${appointment_date}.ics`,
          content: icsContent,
          contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
        },
      ],
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Email sending failed:', error);
    return res.status(500).json({ error: error.message });
  }
}