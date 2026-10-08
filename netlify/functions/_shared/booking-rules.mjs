import { openingWindows } from '../../../src/opening-hours.js';
export const CAPACITY = 17;
export const TIME_ZONE = "Europe/Paris";

export const FORMULAS = Object.freeze({
  explorateur: { label: "Explorateur", price: 16, durationMinutes: 50, rotationOffsets: [0] },
  commandant: { label: "Commandant", price: 20, durationMinutes: 120, rotationOffsets: [0, 60] },
});

export function getFormula(key) {
  return FORMULAS[key] || null;
}

export function isValidDate(date) {
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && !Number.isNaN(Date.parse(`${date}T12:00:00Z`))
    && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
}

export function shiftDate(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function quoteBooking(date, formulaKey, children) {
  const formula = getFormula(formulaKey);
  if (!formula || !isValidDate(date)) throw new Error("Formule ou date invalide.");
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const discountedOffer = formulaKey === "commandant" && [3, 5].includes(weekday);
  const fridayOffer = discountedOffer && weekday === 5;
  const unitPrice = discountedOffer ? 15 : formula.price;
  return { unitPrice, totalEstimate: unitPrice * children, discountedOffer, fridayOffer, durationMinutes: formula.durationMinutes, label: formula.label };
}

export function ageBand(age) {
  if (age <= 7) return "6_7";
  if (age <= 10) return "8_10";
  if (age <= 12) return "10_12";
  if (age <= 14) return "12_14";
  return "14_plus";
}

export function groupsAreCompatible(firstAge, secondAge) {
  if (firstAge >= 14 && secondAge >= 14) return true;
  return Math.abs(firstAge - secondAge) <= 2;
}

export function equipmentNeeded(children, age) {
  return children + (age < 14 ? 1 : 0);
}

export function minutes(time) {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

export function timeFromMinutes(value) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function addMinutes(time, amount) {
  return timeFromMinutes(minutes(time) + amount);
}

export function rotationTimes(startTime, formulaKey) {
  const formula = getFormula(formulaKey);
  if (!formula) return [];
  return formula.rotationOffsets.map((offset) => addMinutes(startTime, offset));
}

export function candidateStarts(date, formulaKey) {
  const formula = getFormula(formulaKey);
  if (!formula) return [];
  if (!isValidDate(date)) return [];
  const windows = openingWindows(date, true);
  const candidates = [];

  for (const [opens, closes] of windows) {
    for (let cursor = minutes(opens); cursor + formula.durationMinutes <= minutes(closes); cursor += 30) {
      candidates.push(timeFromMinutes(cursor));
    }
  }
  return candidates;
}

function extractNumber(text, expression) {
  const match = text.match(expression);
  return match ? Number(match[1]) : null;
}

export function normalizeCalendarEvent(event) {
  if (!event || event.status === "cancelled" || event.transparency === "transparent") return null;
  if (event.start?.date) return { allDay: true, startDate: event.start.date, endDate: event.end?.date || shiftDate(event.start.date, 1), rotations: [], equipment: CAPACITY, age: null, shareAllowed: false };
  if (!event.start?.dateTime) return null;
  const text = `${event.summary || ""}\n${event.description || ""}`;
  const timeInParis = (value) => new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
  const dateInParis = (value) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(value));
  const start = timeInParis(event.start.dateTime);
  const startMs = Date.parse(event.start.dateTime);
  const endMs = Date.parse(event.end?.dateTime || event.start.dateTime);
  const durationMinutes = Math.max(0, Math.round((endMs - startMs) / 60000));
  const explicitRotations = text.match(/Rotations?\s*:\s*([^\n|]+)/i)?.[1]
    ?.match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/g);
  const knownFormula = /explorateur|commandant/i.test(text);
  const isExplorateur = /explorateur/i.test(text);
  const rotations = explicitRotations?.length
    ? [...new Set(explicitRotations)]
    : [start, ...(!isExplorateur && durationMinutes >= 90 ? [addMinutes(start, 60)] : [])];

  const equipmentText = text.match(/Équipements?\s+prévus?\s*:\s*([^\n|]+)/i)?.[1]?.split("/")[0] || "";
  const equipmentValues = equipmentText.match(/\d+/g)?.map(Number) || [];
  let equipment = equipmentValues.length ? (equipmentText.includes('+') ? equipmentValues.reduce((sum, value) => sum + value, 0) : Math.max(...equipmentValues)) : null;
  const children = extractNumber(text, /\b(\d{1,2})\s*(?:enfants?|joueurs?)\b/i);
  const accompanyingAdults = extractNumber(text, /\b(\d{1,2})\s*(?:adultes?\s+)?accompagn(?:ants?|ateurs?|atrices?)\b/i);
  const people = extractNumber(text, /\b(\d{1,2})\s*personnes?\b/i);
  const age = extractNumber(text, /\b(\d{1,2})\s*ans?\b/i);
  if (!equipment && children) equipment = accompanyingAdults ? children + accompanyingAdults : equipmentNeeded(children, age ?? 13);
  if (!equipment && people) equipment = people;

  const end = event.end?.dateTime || new Date(startMs + 30 * 60000).toISOString();
  return {
    startDate: dateInParis(event.start.dateTime),
    endDate: dateInParis(end),
    startMinute: minutes(start),
    endMinute: minutes(timeInParis(end)),
    uncertain: !explicitRotations?.length && !knownFormula,
    rotations,
    equipment: Math.min(equipment || CAPACITY, CAPACITY),
    age,
    shareAllowed: /Partage\s*:\s*autorisé/i.test(text),
  };
}

export function buildAvailability({ date, formulaKey, age, children, events }) {
  const required = equipmentNeeded(children, age);
  if (required > CAPACITY) return [];
  const normalized = events.map(normalizeCalendarEvent).filter(Boolean);

  return candidateStarts(date, formulaKey).map((startTime) => {
    const rotations = rotationTimes(startTime, formulaKey);
    let maxOccupied = 0;
    let compatible = true;
    let shareAllowed = true;

    for (const rotation of rotations) {
      const overlapsInterval = (event) => {
        if (event.allDay) return date >= event.startDate && date < event.endDate;
        if (date < event.startDate || date > event.endDate) return false;
        const from = date === event.startDate ? event.startMinute : 0;
        const until = date === event.endDate ? event.endMinute : 1440;
        return minutes(rotation) < until && minutes(rotation) + 30 > from;
      };
      const overlapping = normalized.filter((event) => event.allDay || event.uncertain
        ? overlapsInterval(event)
        : event.startDate === date && event.rotations.some((time) => minutes(rotation) < minutes(time) + 30 && minutes(rotation) + 30 > minutes(time)));
      if (overlapping.some((event) => event.allDay || event.uncertain)) {
        maxOccupied = CAPACITY;
        break;
      }
      const occupied = overlapping.reduce((sum, event) => sum + event.equipment, 0);
      maxOccupied = Math.max(maxOccupied, occupied);
      compatible = compatible && overlapping.every((event) => event.age !== null && groupsAreCompatible(age, event.age));
      shareAllowed = shareAllowed && overlapping.every((event) => event.shareAllowed);
    }

    const remaining = CAPACITY - maxOccupied;
    if (maxOccupied === 0) return { startTime, rotations, status: "instant", remaining: CAPACITY };
    if (remaining >= required && compatible) {
      return { startTime, rotations, status: shareAllowed ? "instant_shared" : "request", remaining };
    }
    return { startTime, rotations, status: "unavailable", remaining: Math.max(0, remaining) };
  });
}

export function validateBookingInput(input) {
  const errors = [];
  const formula = getFormula(input.formula);
  const age = Number(input.age);
  const children = Number(input.children);
  if (!formula) errors.push("Formule inconnue.");
  if (!isValidDate(input.date || "")) errors.push("Date invalide.");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.startTime || "")) errors.push("Créneau invalide.");
  if (!Number.isInteger(age) || age < 6 || age > 17) errors.push("L’âge doit être compris entre 6 et 17 ans.");
  if (!Number.isInteger(children) || children < 5 || children > 17) errors.push("Le groupe doit comprendre entre 5 et 17 enfants.");
  if (Number.isInteger(age) && Number.isInteger(children) && equipmentNeeded(children, age) > CAPACITY) errors.push("Le groupe dépasse la capacité de 17 équipements, adulte compris.");
  if (!String(input.parentName || "").trim()) errors.push("Le nom du parent est requis.");
  if (!String(input.childName || "").trim()) errors.push("Le prénom de l’enfant est requis.");
  if (!/^\S+@\S+\.\S+$/.test(input.email || "")) errors.push("Adresse e-mail invalide.");
  if (!/[0-9]{10}/.test(String(input.phone || "").replace(/\D/g, ""))) errors.push("Numéro de téléphone invalide.");
  if (input.shareConsent !== true) errors.push("L’accord concernant le partage éventuel de la partie est requis pour la réservation directe.");
  if (input.paymentConsent !== true) errors.push("La règle de paiement sur place doit être acceptée.");
  return errors;
}
