import type { Config, Context } from "@netlify/functions";
import { buildAvailability, getFormula, rotationTimes, validateBookingInput } from "./_shared/booking-rules.mjs";

type BookingData = {
  parentName: string;
  childName: string;
  email: string;
  phone: string;
  date: string;
  age: number;
  children: number;
  formula: string;
  startTime: string;
  shareConsent: boolean;
  paymentConsent: boolean;
  idempotencyKey: string;
  website?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function normalizeText(value: unknown, maxLength: number) {
  return String(value || "").trim().replace(/[\r\n\t]+/g, " ").slice(0, maxLength);
}

function normalizePayload(raw: Record<string, unknown>): BookingData {
  return {
    parentName: normalizeText(raw.parentName, 100),
    childName: normalizeText(raw.childName, 60),
    email: normalizeText(raw.email, 160).toLowerCase(),
    phone: normalizeText(raw.phone, 30),
    date: normalizeText(raw.date, 10),
    age: Number(raw.age),
    children: Number(raw.children),
    formula: normalizeText(raw.formula, 20),
    startTime: normalizeText(raw.startTime, 5),
    shareConsent: raw.shareConsent === true,
    paymentConsent: raw.paymentConsent === true,
    idempotencyKey: normalizeText(raw.idempotencyKey, 80),
    website: normalizeText(raw.website, 120),
  };
}

function previewStore() {
  const values = new Map<string, string>();
  return {
    async get(key: string, options?: { type?: string }) {
      const value = values.get(key);
      if (value === undefined) return null;
      return options?.type === "json" ? JSON.parse(value) : value;
    },
    async set(key: string, value: string) { values.set(key, value); },
    async setJSON(key: string, value: unknown) { values.set(key, JSON.stringify(value)); },
    async delete(key: string) { values.delete(key); },
  };
}

async function bookingStore(context: Context) {
  if (context.deploy?.context !== "production") return previewStore();
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "birthday-bookings", consistency: "strong" });
}

export default async (request: Request, context: Context) => {
  if (request.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Format de requête invalide." }, 415);

  let data: BookingData;
  try {
    data = normalizePayload(await request.json());
  } catch {
    return json({ error: "Requête invalide." }, 400);
  }
  if (data.website) return json({ ok: true });
  if (!/^[a-zA-Z0-9-]{20,80}$/.test(data.idempotencyKey)) return json({ error: "Identifiant de réservation invalide." }, 400);
  const errors = validateBookingInput(data);
  if (errors.length) return json({ error: errors[0], errors }, 400);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
  const latest = new Date(Date.now() + 120 * 86400000).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
  if (data.date <= today || data.date > latest) return json({ error: "La date n’est plus réservable en ligne." }, 400);

  const store = await bookingStore(context);
  const resultKey = `result/${data.idempotencyKey}`;
  const existing = await store.get(resultKey, { type: "json" });
  if (existing) return json(existing);

  const ipKey = `rate/${new Date().toISOString().slice(0, 10)}/${context.ip || "unknown"}`;
  const rate = Number((await store.get(ipKey)) || 0);
  if (rate >= 10) return json({ error: "Trop de tentatives. Appelez-nous au 06 07 72 81 64." }, 429);
  await store.set(ipKey, String(rate + 1));

  const rotations: string[] = rotationTimes(data.startTime, data.formula);
  const lockKeys = rotations.map((rotation: string) => `lock/${data.date}/${rotation}`);
  const lockId = data.idempotencyKey;
  try {
    for (const lockKey of lockKeys) {
      const lock = await store.get(lockKey, { type: "json" }) as { id?: string; expiresAt?: number } | null;
      if (lock && lock.id !== lockId && Number(lock.expiresAt) > Date.now()) return json({ error: "Ce créneau vient d’être choisi. Rechargez les disponibilités." }, 409);
    }
    await Promise.all(lockKeys.map((lockKey: string) => store.setJSON(lockKey, { id: lockId, expiresAt: Date.now() + 120000 })));

    const preview = context.deploy?.context !== "production";
    const previewReadsCalendar = Netlify.env.get("BOOKING_PREVIEW_READ_CALENDAR") === "true";
    let googleClient = null;
    let events: any[] = [];
    if (!preview || previewReadsCalendar) {
      googleClient = await import("./_shared/google.mjs");
      events = await googleClient.listEvents(data.date);
    }
    const slot = buildAvailability({ date: data.date, formulaKey: data.formula, age: data.age, children: data.children, events })
      .find((candidate) => candidate.startTime === data.startTime);
    if (!slot || !["instant", "instant_shared"].includes(slot.status)) return json({ error: "Ce créneau nécessite maintenant une validation de notre équipe. Appelez-nous au 06 07 72 81 64." }, 409);

    const formula = getFormula(data.formula)!;
    const bookingId = `WEB-${data.date.replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    if (preview) {
      const result = {
        ok: true,
        preview: true,
        bookingId: `TEST-${bookingId}`,
        date: data.date,
        startTime: data.startTime,
        formula: formula.label,
        durationMinutes: formula.durationMinutes,
        payment: "Simulation uniquement : aucun événement Agenda, aucune ligne Sheets et aucun paiement.",
      };
      await store.setJSON(resultKey, result);
      return json(result, 201);
    }
    googleClient ||= await import("./_shared/google.mjs");
    const event = await googleClient.createBirthdayEvent({ bookingId, data, formula, rotations });
    try {
      await googleClient.appendBirthdayRow({ bookingId, data, formula, rotations, eventId: event.id });
    } catch (sheetError) {
      console.error("birthday-sheet-sync", sheetError);
      await store.setJSON(`needs-sheet-sync/${bookingId}`, { bookingId, data, formula, rotations, eventId: event.id, createdAt: new Date().toISOString() });
    }

    const result = {
      ok: true,
      bookingId,
      date: data.date,
      startTime: data.startTime,
      formula: formula.label,
      durationMinutes: formula.durationMinutes,
      payment: "Paiement sur place après l’anniversaire, selon le nombre d’enfants réellement présents.",
    };
    await store.setJSON(resultKey, result);
    return json(result, 201);
  } catch (error) {
    console.error("book-birthday", error);
    return json({ error: "La réservation n’a pas pu être enregistrée. Aucun paiement n’a été effectué. Appelez-nous au 06 07 72 81 64." }, 503);
  } finally {
    await Promise.all(lockKeys.map(async (lockKey: string) => {
      const lock = await store.get(lockKey, { type: "json" }) as { id?: string } | null;
      if (lock?.id === lockId) await store.delete(lockKey);
    }));
  }
};

export const config: Config = {
  path: "/api/book-birthday",
  method: ["POST"],
};
