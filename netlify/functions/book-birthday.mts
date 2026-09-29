import type { Config, Context } from "@netlify/functions";
import { createHash } from "node:crypto";
import { buildAvailability, quoteBooking, shiftDate, validateBookingInput } from "./_shared/booking-rules.mjs";
import { readCalendar } from "./_shared/calendar-service.mjs";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
const text = (value: unknown, max: number) => String(value || "").trim().replace(/[\r\n\t]+/g, " ").slice(0, max);

export default async (request: Request, context: Context) => {
  if (request.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);
  const preview = context.deploy?.context !== "production";
  // Phase 1 validates a REQUEST only. It never reserves equipment or writes an
  // event. Netlify Forms receives the request after this final calendar check.
  if (!preview && Netlify.env.get("BOOKING_REQUESTS_ENABLED") !== "true") return json({ error: "Les demandes en ligne sont momentanément suspendues. Appelez-nous au 07 44 22 78 63." }, 503);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Format invalide." }, 415);
  let raw: Record<string, unknown>;
  try {
    const body = await request.text();
    if (body.length > 8000) return json({ error: "Requête trop volumineuse." }, 413);
    raw = JSON.parse(body);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error();
  } catch { return json({ error: "Requête invalide." }, 400); }
  const data = {
    parentName: text(raw.parentName, 100), childName: text(raw.childName, 60),
    email: text(raw.email, 160).toLowerCase(), phone: text(raw.phone, 30),
    date: text(raw.date, 10), startTime: text(raw.startTime, 5), formula: text(raw.formula, 20),
    age: Number(raw.age), children: Number(raw.children),
    shareConsent: raw.shareConsent === true, paymentConsent: raw.paymentConsent === true,
    idempotencyKey: text(raw.idempotencyKey, 80),
  };
  if (raw.website) return json({ error: "Requête invalide." }, 400);
  if (!/^[a-zA-Z0-9-]{20,80}$/.test(data.idempotencyKey)) return json({ error: "Identifiant invalide." }, 400);
  const errors = validateBookingInput(data);
  if (errors.length) return json({ error: errors[0], errors }, 400);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
  if (data.date <= today || data.date > shiftDate(today, 120)) return json({ error: "Cette date n’est plus réservable." }, 400);
  try {
    const { events, source } = await readCalendar(data.date, data.date, context);
    const slot = buildAvailability({ date: data.date, formulaKey: data.formula, age: data.age, children: data.children, events }).find((item) => item.startTime === data.startTime);
    if (!slot || slot.status === "unavailable") return json({ error: "Ce créneau n’est plus disponible pour votre groupe. Choisissez une autre heure ; vos coordonnées sont conservées." }, 409);
    const quote = quoteBooking(data.date, data.formula, data.children);
    if (raw.expectedUnitPrice !== quote.unitPrice) return json({ error: "Le tarif a changé. Consultez le récapitulatif actualisé avant de continuer." }, 409);
    // Deterministic test receipt; no personal data, event, email, or row stored.
    const reference = createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 12).toUpperCase();
    return json({ ok: true, preview, source, bookingMode: preview ? "simulation" : "request_only", bookingId: `${preview ? "TEST" : "DEM"}-${reference}`, date: data.date, startTime: data.startTime, formula: quote.label, ...quote, payment: preview ? "Simulation uniquement : aucune réservation réelle ni aucun e-mail créé." : "Paiement sur place après l’anniversaire. Demande à transmettre, réservation non confirmée." }, 200);
  } catch {
    return json({ error: "Impossible de vérifier le créneau. Réessayez ; vos informations sont conservées." }, 503);
  }
};

export const config: Config = { path: "/api/book-birthday", method: ["POST"] };
