import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAvailability,
  candidateStarts,
  equipmentNeeded,
  normalizeCalendarEvent,
  rotationTimes,
  validateBookingInput,
} from "../netlify/functions/_shared/booking-rules.mjs";

test("Explorateur occupe un seul bloc et Commandant deux blocs espacés", () => {
  assert.deepEqual(rotationTimes("14:00", "explorateur"), ["14:00"]);
  assert.deepEqual(rotationTimes("14:00", "commandant"), ["14:00", "15:00"]);
});

test("un adulte est compté pour un groupe de moins de 14 ans", () => {
  assert.equal(equipmentNeeded(6, 8), 7);
  assert.equal(equipmentNeeded(6, 14), 6);
});

test("les horaires respectent la durée réelle de chaque formule", () => {
  assert.deepEqual(candidateStarts("2026-09-12", "commandant").slice(0, 3), ["10:30", "13:30", "14:00"]);
  assert.equal(candidateStarts("2026-09-12", "commandant").at(-1), "20:00");
  assert.equal(candidateStarts("2026-09-12", "explorateur").at(-1), "21:00");
});

test("un événement Commandant occupe uniquement ses rotations documentées", () => {
  const event = normalizeCalendarEvent({
    summary: "Léandre 9 ans 7 enfants Commandant",
    description: "Rotations : 15:00, 16:00 | Équipements prévus : 8/17",
    start: { dateTime: "2026-09-20T15:00:00+02:00" },
    end: { dateTime: "2026-09-20T17:00:00+02:00" },
  });
  assert.deepEqual(event.rotations, ["15:00", "16:00"]);
  assert.equal(event.equipment, 8);
});

test("les accompagnateurs écrits dans l’agenda sont ajoutés à la charge", () => {
  const event = normalizeCalendarEvent({
    summary: "Basket 14 joueurs + 3 accompagnants",
    start: { dateTime: "2026-09-12T13:30:00+02:00" },
    end: { dateTime: "2026-09-12T15:30:00+02:00" },
  });
  assert.equal(event.equipment, 17);
});

test("un partage non autorisé reste sur demande", () => {
  const slots = buildAvailability({
    date: "2026-09-19",
    formulaKey: "explorateur",
    age: 8,
    children: 6,
    events: [{
      summary: "Emmy 7 ans 5 enfants Explorateur",
      description: "Rotations : 13:30 | Équipements prévus : 6/17",
      start: { dateTime: "2026-09-19T13:30:00+02:00" },
      end: { dateTime: "2026-09-19T14:20:00+02:00" },
    }],
  });
  assert.equal(slots.find((slot) => slot.startTime === "13:30").status, "request");
});

test("une réservation valide exige les deux consentements", () => {
  const valid = { formula: "explorateur", date: "2026-10-17", startTime: "10:30", age: 8, children: 6, parentName: "Julie Martin", childName: "Lina", email: "julie@example.fr", phone: "0601020304", shareConsent: true, paymentConsent: true };
  assert.deepEqual(validateBookingInput(valid), []);
  assert.match(validateBookingInput({ ...valid, paymentConsent: false })[0], /paiement/i);
});
