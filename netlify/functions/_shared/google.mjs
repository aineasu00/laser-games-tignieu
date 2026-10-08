import { createSign, createHash } from "node:crypto";
import { shiftDate } from "./booking-rules.mjs";

const CALENDAR_ID = "lasergames38@gmail.com";
const SHEET_ID = "11O5vVGMv-X8T470FKd32e6zEqrKEbpJoCFftofFCegs";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SCOPE = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/spreadsheets",
].join(" ");

function requiredEnv(name) {
  const value = Netlify.env.get(name);
  if (!value) throw new Error(`Configuration serveur absente : ${name}`);
  return value;
}

function base64url(value) {
  const input = typeof value === "string" ? value : JSON.stringify(value);
  return Buffer.from(input).toString("base64url");
}

async function accessToken(scope = GOOGLE_SCOPE) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64url({ alg: "RS256", typ: "JWT" });
  const claims = base64url({
    iss: requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    scope,
    aud: GOOGLE_TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + 3600,
  });
  const unsignedToken = `${header}.${claims}`;
  const signature = createSign("RSA-SHA256")
    .update(unsignedToken)
    .end()
    .sign(requiredEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"), "base64url");
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsignedToken}.${signature}`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(`Authentification Google impossible (${response.status})`);
  }
  return payload.access_token;
}

async function googleRequest(url, options = {}, existingToken) {
  const token = existingToken || await accessToken();
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(10000),
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || `Erreur Google (${response.status})`;
    throw new Error(message);
  }
  return payload;
}

function parisDateTime(date, time) {
  const probe = new Date(`${date}T${time}:00Z`);
  const zoneName = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    timeZoneName: "shortOffset",
  }).formatToParts(probe).find((part) => part.type === "timeZoneName")?.value || "GMT+1";
  const match = zoneName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const sign = match?.[1] || "+";
  const hours = String(Number(match?.[2] || 1)).padStart(2, "0");
  const minutes = match?.[3] || "00";
  return `${date}T${time}:00${sign}${hours}:${minutes}`;
}

export async function listEvents(date, lastDate = date) {
  const calendarId = Netlify.env.get("GOOGLE_CALENDAR_ID") || CALENDAR_ID;
  const params = new URLSearchParams({
    timeMin: parisDateTime(date, "00:00"),
    timeMax: parisDateTime(shiftDate(lastDate, 1), "00:00"),
    singleEvents: "true",
    orderBy: "startTime",
    timeZone: "Europe/Paris",
    maxResults: "2500",
  });
  const token = await accessToken("https://www.googleapis.com/auth/calendar.readonly");
  const items = [];
  for (let page = 0; page < 10; page += 1) {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;
    const payload = await googleRequest(url, {}, token);
    items.push(...(payload.items || []));
    if (!payload.nextPageToken) return items;
    params.set("pageToken", payload.nextPageToken);
  }
  throw new Error("Planning trop volumineux : vérification manuelle nécessaire.");
}

export async function sessionSheetRequest(path, options={}) {
  const spreadsheetId=requiredEnv('GOOGLE_SESSION_SHEET_ID');
  const token=await accessToken('https://www.googleapis.com/auth/spreadsheets');
  return googleRequest(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}${path}`,options,token);
}

export async function findSessionRequest(bookingId) {
  // Only references, not the entire customer file, are read for retry detection.
  const payload=await sessionSheetRequest(`/values/${encodeURIComponent('Demandes!A2:A10000')}`);
  const index=(payload.values||[]).findIndex(row=>row[0]===bookingId);
  return index<0?null:index+2;
}

export async function appendSessionRow(row) {
  const result=await sessionSheetRequest(`/values/${encodeURIComponent('Demandes!A:AI')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,{method:'POST',body:JSON.stringify({values:[row]})});
  const match=result.updates?.updatedRange?.match(/!A(\d+):/);
  if (!match) throw new Error('Réception Sheets non vérifiée.');
  return Number(match[1]);
}

export async function sessionNotificationState(row) {
  const result=await sessionSheetRequest(`/values/${encodeURIComponent(`Demandes!AF${row}`)}`);
  return result.values?.[0]?.[0]||'';
}

export async function markSessionNotified(row) {
  await sessionSheetRequest(`/values/${encodeURIComponent(`Demandes!AF${row}`)}?valueInputOption=RAW`,{method:'PUT',body:JSON.stringify({values:[['Transmise']]})});
}

export async function createBirthdayEvent({ bookingId, data, formula, rotations }) {
  const calendarId = Netlify.env.get("GOOGLE_CALENDAR_ID") || CALENDAR_ID;
  const start = parisDateTime(data.date, data.startTime);
  const endDate = new Date(Date.parse(start) + formula.durationMinutes * 60000).toISOString();
  const equipment = Number(data.children) + (Number(data.age) < 14 ? 1 : 0);
  const description = [
    `Réservation directe site : ${bookingId}`,
    `Parent : ${data.parentName}`,
    `E-mail : ${data.email}`,
    `Téléphone : ${data.phone}`,
    `Enfant : ${data.childName}, ${data.age} ans`,
    `Effectif estimé : ${data.children} enfants${Number(data.age) < 14 ? " + 1 adulte accompagnateur" : ""}`,
    `Formule : ${formula.label} — ${formula.price} € par enfant`,
    `Rotations : ${rotations.join(", ")}`,
    `Équipements prévus : ${equipment}/17`,
    `Places complémentaires : ${17 - equipment}`,
    `Âge de référence : ${data.age}`,
    "Partage : autorisé avec un groupe d’âge compatible",
    "Paiement : sur place après l’anniversaire, selon le nombre d’enfants réellement présents. Aucun acompte ni paiement en ligne.",
  ].join("\n");
  const eventId = `b${createHash("sha256").update(bookingId).digest("hex")}`;
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  return googleRequest(url, {
    method: "POST",
    body: JSON.stringify({
      id: eventId,
      summary: `${data.childName} ${data.age} ans ${data.children} enfants ${formula.label} ${formula.price}€`,
      description,
      start: { dateTime: start, timeZone: "Europe/Paris" },
      end: { dateTime: endDate, timeZone: "Europe/Paris" },
      extendedProperties: { private: { bookingId, source: "site-reservation" } },
    }),
  });
}

export async function appendBirthdayRow({ bookingId, data, formula, rotations, eventId }) {
  const spreadsheetId = Netlify.env.get("GOOGLE_SHEET_ID") || SHEET_ID;
  const equipment = Number(data.children) + (Number(data.age) < 14 ? 1 : 0);
  const notes = [
    `Réservation directe confirmée sur le site. Événement Agenda : ${eventId}.`,
    `Rotations : ${rotations.join(", ")}`,
    `Équipements prévus : ${equipment}/17`,
    `Places complémentaires : ${17 - equipment}`,
    `Âge de référence : ${data.age}`,
    "Partage autorisé avec un groupe d’âge compatible.",
    "Paiement sur place après l’anniversaire selon les enfants présents.",
  ].join(" | ");
  const range = encodeURIComponent("Demandes!A:R");
  const params = new URLSearchParams({
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
  });
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}:append?${params}`;
  await googleRequest(url, {
    method: "POST",
    body: JSON.stringify({
      values: [[
        bookingId,
        new Date().toISOString(),
        data.parentName,
        data.email.toLowerCase(),
        data.phone,
        data.date,
        data.childName,
        Number(data.age),
        Number(data.children),
        `${formula.label} (${formula.price} €)`,
        data.startTime,
        data.startTime,
        "Confirmée",
        "Oui",
        "",
        "Aucune",
        "",
        notes,
      ]],
    }),
  });
}
