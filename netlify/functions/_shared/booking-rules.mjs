export const CAPACITY = 17;
export const TIME_ZONE = "Europe/Paris";

export const FORMULAS = Object.freeze({
  explorateur: { label: "Explorateur", price: 16, durationMinutes: 50, rotationOffsets: [0] },
  commandant: { label: "Commandant", price: 20, durationMinutes: 120, rotationOffsets: [0, 60] },
});

const OPENING_WINDOWS = Object.freeze({
  0: [["10:30", "12:00"], ["13:30", "20:00"]],
  3: [["10:30", "12:00"], ["13:30", "20:00"]],
  4: [["17:00", "22:00"]],
  5: [["17:00", "22:00"]],
  6: [["10:30", "12:00"], ["13:30", "22:00"]],
});

export function getFormula(key) {
  return FORMULAS[key] || null;
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
  const weekday = new Date(`${date}T12:00:00+02:00`).getDay();
  const windows = OPENING_WINDOWS[weekday] || [];
  const candidates = [];

  for (const [opens, closes] of windows) {
    if (opens === "10:30" && closes === "12:00" && formulaKey === "commandant") {
      candidates.push("10:30");
      continue;
    }
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
  if (!event || event.status === "cancelled" || event.transparency === "transparent" || !event.start?.dateTime) return null;
  const text = `${event.summary || ""}\n${event.description || ""}`;
  const start = event.start.dateTime.slice(11, 16);
  const startMs = Date.parse(event.start.dateTime);
  const endMs = Date.parse(event.end?.dateTime || event.start.dateTime);
  const durationMinutes = Math.max(0, Math.round((endMs - startMs) / 60000));
  const explicitRotations = text.match(/Rotations?\s*:\s*([^\n|]+)/i)?.[1]
    ?.match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/g);
  const isExplorateur = /explorateur/i.test(text) || durationMinutes <= 70;
  const rotations = explicitRotations?.length
    ? [...new Set(explicitRotations)]
    : [start, ...(!isExplorateur && durationMinutes >= 90 ? [addMinutes(start, 60)] : [])];

  const equipmentText = text.match(/Équipements?\s+prévus?\s*:\s*([^\n|]+)/i)?.[1]?.split("/")[0] || "";
  const equipmentValues = equipmentText.match(/\d+/g)?.map(Number) || [];
  let equipment = equipmentValues.length ? Math.max(...equipmentValues.filter((value) => value <= CAPACITY)) : null;
  const children = extractNumber(text, /\b(\d{1,2})\s*(?:enfants?|joueurs?)\b/i);
  const accompanyingAdults = extractNumber(text, /\b(\d{1,2})\s*(?:adultes?\s+)?accompagn(?:ants?|ateurs?|atrices?)\b/i);
  const people = extractNumber(text, /\b(\d{1,2})\s*personnes?\b/i);
  const age = extractNumber(text, /\b(\d{1,2})\s*ans?\b/i);
  if (!equipment && children) equipment = accompanyingAdults ? children + accompanyingAdults : equipmentNeeded(children, age ?? 13);
  if (!equipment && people) equipment = people;

  return {
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
      const overlapping = normalized.filter((event) => event.rotations.includes(rotation));
      const occupied = overlapping.reduce((sum, event) => sum + event.equipment, 0);
      maxOccupied = Math.max(maxOccupied, occupied);
      compatible = compatible && overlapping.every((event) => event.age === null || groupsAreCompatible(age, event.age));
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date || "")) errors.push("Date invalide.");
  if (!/^\d{2}:\d{2}$/.test(input.startTime || "")) errors.push("Créneau invalide.");
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
