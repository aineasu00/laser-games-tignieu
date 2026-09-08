import test from 'node:test';
import assert from 'node:assert/strict';
import { trackBooking } from '../src/booking-analytics.js';

test('mesure : consentement obligatoire, paramètres limités, préversions exclues', () => {
  const captured = [];
  let consent = null;
  globalThis.location = { hostname: 'lasergamestignieu.com', origin: 'https://lasergamestignieu.com', pathname: '/reservation-anniversaire.html' };
  globalThis.document = { referrer: 'https://example.org/?email=private@example.com' };
  globalThis.localStorage = { getItem: () => JSON.stringify(consent) };
  globalThis.window = { gtag: (...args) => captured.push(args) };
  assert.equal(trackBooking('booking_open'), false);
  consent = { choice: 'rejected', savedAt: Date.now() };
  assert.equal(trackBooking('booking_open'), false);
  consent = { choice: 'accepted', savedAt: Date.now() - 181 * 86400000 };
  assert.equal(trackBooking('booking_open'), false);
  consent.savedAt = Date.now();
  assert.equal(trackBooking('booking_slot_selected', { formula: 'commandant', email: 'private@example.com', bookingId: 'DEM-SECRET', date: '2026-09-20', reason: 'free text private', childName: 'Child' }), true);
  assert.equal(captured.length, 1);
  assert.doesNotMatch(JSON.stringify(captured), /private|SECRET|2026-09-20|Child/);
  assert.equal(captured[0][2].formula, 'commandant');
  location.hostname = 'preview--laser-games-tignieu.netlify.app';
  assert.equal(trackBooking('generate_lead'), false);
  assert.equal(captured.length, 1);
  location.hostname = 'lasergamestignieu.com';
  consent.choice = 'rejected';
  assert.equal(trackBooking('booking_submit'), false);
  for (const key of ['location', 'document', 'localStorage', 'window']) delete globalThis[key];
});
