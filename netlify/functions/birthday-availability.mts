import type { Config, Context } from "@netlify/functions";
import { buildAvailability, equipmentNeeded, getFormula } from "./_shared/booking-rules.mjs";

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

export default async (request: Request, context: Context) => {
  if (request.method !== "GET") return json({ error: "Méthode non autorisée." }, 405);
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || "";
  const formulaKey = url.searchParams.get("formula") || "";
  const age = Number(url.searchParams.get("age"));
  const children = Number(url.searchParams.get("children"));
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
  const latest = new Date(Date.now() + 120 * 86400000).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date <= today || date > latest) return json({ error: "Choisissez une date comprise entre demain et les quatre prochains mois." }, 400);
  if (!getFormula(formulaKey)) return json({ error: "Formule inconnue." }, 400);
  if (!Number.isInteger(age) || age < 6 || age > 17) return json({ error: "Âge invalide." }, 400);
  if (!Number.isInteger(children) || children < 5 || equipmentNeeded(children, age) > 17) return json({ error: "Ce groupe nécessite une organisation personnalisée. Appelez-nous au 06 07 72 81 64." }, 400);

  try {
    const previewReadsCalendar = Netlify.env.get("BOOKING_PREVIEW_READ_CALENDAR") === "true";
    let events: any[] = [];
    if (context.deploy?.context === "production" || previewReadsCalendar) {
      const { listEvents } = await import("./_shared/google.mjs");
      events = await listEvents(date);
    }
    const slots = buildAvailability({ date, formulaKey, age, children, events });
    return json({
      date,
      formula: formulaKey,
      slots: slots.filter((slot) => slot.status !== "unavailable"),
      manualRequestAvailable: true,
      preview: context.deploy?.context !== "production",
    });
  } catch (error) {
    console.error("birthday-availability", error);
    return json({ error: "Le planning n’est momentanément pas accessible. Vous pouvez nous appeler au 06 07 72 81 64." }, 503);
  }
};

export const config: Config = {
  path: "/api/birthday-availability",
  method: ["GET"],
};
