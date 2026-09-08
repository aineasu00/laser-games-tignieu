import type { Config, Context } from "@netlify/functions";
import { equipmentNeeded, getFormula, isValidDate, shiftDate } from "./_shared/booking-rules.mjs";
import { calendarDays, readCalendar } from "./_shared/calendar-service.mjs";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });

export default async (request: Request, context: Context) => {
  if (request.method !== "GET") return json({ error: "Méthode non autorisée." }, 405);
  const params = new URL(request.url).searchParams;
  const date = params.get("date") || "";
  const month = params.get("month") || "";
  const formulaKey = params.get("formula") || "";
  const age = Number(params.get("age"));
  const children = Number(params.get("children"));
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
  const latest = shiftDate(today, 120);
  if (!getFormula(formulaKey)) return json({ error: "Choisissez une formule." }, 400);
  if (!Number.isInteger(age) || age < 6 || age > 17) return json({ error: "Indiquez l’âge fêté, entre 6 et 17 ans." }, 400);
  if (!Number.isInteger(children) || children < 5 || equipmentNeeded(children, age) > 17) return json({ error: "Pour ce groupe, notre équipe vous propose une organisation adaptée au 06 07 72 81 64." }, 400);
  if ((date && month) || (!date && !month)) return json({ error: "Choisissez une date ou un mois." }, 400);
  let firstDate: string;
  let lastDate: string;
  if (date) {
    if (!isValidDate(date) || date <= today || date > latest) return json({ error: "Choisissez une date entre demain et les quatre prochains mois." }, 400);
    firstDate = lastDate = date;
  } else {
    if (!/^\d{4}-\d{2}$/.test(month) || !isValidDate(`${month}-01`) || month < today.slice(0, 7) || month > latest.slice(0, 7)) return json({ error: "Mois invalide." }, 400);
    firstDate = `${month}-01`;
    const nextMonth = new Date(`${firstDate}T12:00:00Z`);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    lastDate = shiftDate(nextMonth.toISOString().slice(0, 10), -1);
  }
  try {
    const { events, source, preview } = await readCalendar(firstDate, lastDate, context);
    const days = calendarDays({ firstDate, lastDate, today, latest, formulaKey, age, children, events });
    return json({
      source, preview, bookingMode: preview ? "simulation" : "request_only",
      checkedAt: new Date().toISOString(), month: firstDate.slice(0, 7), formula: formulaKey,
      days, ...(date ? { date, slots: days[0].slots, quote: days[0].quote } : {}),
    });
  } catch {
    return json({ error: "Le planning n’est pas accessible pour le moment. Réessayez ou appelez-nous au 06 07 72 81 64.", source: "unavailable" }, 503);
  }
};

export const config: Config = { path: "/api/birthday-availability", method: ["GET"] };
