import { buildAvailability, candidateStarts, quoteBooking, shiftDate } from "./booking-rules.mjs";

// Fictional fixtures only. No customer data enters a preview bundle.
export function demoEvents(firstDate, lastDate) {
  const events = [];
  for (let date = firstDate; date <= lastDate; date = shiftDate(date, 1)) {
    const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (day === 6 && Number(date.slice(-2)) <= 14) {
      events.push({ start: { date }, end: { date: shiftDate(date, 1) } });
    } else if (day === 0) {
      events.push({ summary: "Exemple fictif Commandant 8 ans 6 enfants", description: "Rotations : 14:00, 15:00 | Équipements prévus : 7/17 | Partage : autorisé", start: { dateTime: `${date}T14:00:00+02:00` }, end: { dateTime: `${date}T16:00:00+02:00` } });
    }
  }
  return events;
}

export async function readCalendar(firstDate, lastDate, context) {
  const preview = context.deploy?.context !== "production";
  const readGoogle = !preview || Netlify.env.get("BOOKING_PREVIEW_READ_CALENDAR") === "true";
  if (!readGoogle) return { events: demoEvents(firstDate, lastDate), source: "demo", preview: true };
  // Never replace a failed Google read with an empty, apparently free calendar.
  const { listEvents } = await import("./google.mjs");
  return { events: await listEvents(firstDate, lastDate), source: "google", preview };
}

export function calendarDays({ firstDate, lastDate, today, latest, formulaKey, age, children, events }) {
  const days = [];
  for (let date = firstDate; date <= lastDate; date = shiftDate(date, 1)) {
    const quote = quoteBooking(date, formulaKey, children);
    if (date <= today || date > latest) { days.push({ date, status: "outside_range", slots: [], quote }); continue; }
    if (!candidateStarts(date, formulaKey).length) { days.push({ date, status: "closed", slots: [], quote }); continue; }
    const slots = buildAvailability({ date, formulaKey, age, children, events }).filter((slot) => slot.status !== "unavailable")
      .map(({ startTime, status }) => ({ startTime, status }));
    const status = slots.some((slot) => slot.status === "instant" || slot.status === "instant_shared") ? "available" : slots.length ? "request" : "full";
    days.push({ date, status, slots, quote });
  }
  return days;
}
