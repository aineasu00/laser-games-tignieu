import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import availability from '../netlify/functions/birthday-availability.mts';
import booking from '../netlify/functions/book-birthday.mts';
import { shiftDate } from '../netlify/functions/_shared/booking-rules.mjs';
import { listEvents } from '../netlify/functions/_shared/google.mjs';

const preview = { deploy: { context: 'deploy-preview' } };
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
const nextFriday = Array.from({ length: 8 }, (_, n) => shiftDate(today, n + 1)).find((date) => new Date(`${date}T12:00:00Z`).getUTCDay() === 5);
const nextWednesday = Array.from({ length: 8 }, (_, n) => shiftDate(today, n + 1)).find((date) => new Date(`${date}T12:00:00Z`).getUTCDay() === 3);
const env = new Map();
globalThis.Netlify = { env: { get: (key) => env.get(key) } };
const request = (data) => new Request('https://preview.example/api/book-birthday', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const valid = { parentName: 'Parent Test', childName: 'Enfant Test', email: 'preview@example.com', phone: '0600000000', formula: 'commandant', date: nextFriday, startTime: '17:00', age: 8, children: 6, shareConsent: true, paymentConsent: true, expectedUnitPrice: 15, idempotencyKey: 'test-calendar-preview-123456789' };

test('le calendrier mensuel renvoie uniquement les disponibilités et tarifs publics', async () => {
  const response = await availability(new Request(`https://preview.example/api/birthday-availability?month=${nextFriday.slice(0, 7)}&formula=commandant&age=8&children=6`), preview);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.source, 'demo');
  assert.equal(data.preview, true);
  const friday = data.days.find((day) => day.date === nextFriday);
  assert.equal(friday.quote.totalEstimate, 90);
  assert.ok(data.days.filter((day) => new Date(`${day.date}T12:00:00Z`).getUTCDay() === 4).every((day) => ['closed', 'outside_range'].includes(day.status)));
  for (const day of data.days) for (const slot of day.slots) assert.deepEqual(Object.keys(slot).sort(), ['startTime', 'status']);
  assert.doesNotMatch(JSON.stringify(data), /Exemple fictif|summary|description|@gmail/);
});

test('Google non configuré ne devient jamais un agenda vide disponible', async () => {
  env.set('BOOKING_PREVIEW_READ_CALENDAR', 'true');
  try {
    const response = await availability(new Request(`https://preview.example/api/birthday-availability?date=${nextFriday}&formula=commandant&age=8&children=6`), preview);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).source, 'unavailable');
  } finally { env.clear(); }
});

test('la simulation calcule le prix côté serveur et ne crée pas de doublon de référence', async () => {
  const first = await booking(request(valid), preview);
  assert.equal(first.status, 200);
  const receipt = await first.json();
  assert.equal(receipt.totalEstimate, 90);
  assert.equal(receipt.preview, true);
  const second = await (await booking(request(valid), preview)).json();
  assert.equal(second.bookingId, receipt.bookingId);
  assert.equal((await booking(request({ ...valid, expectedUnitPrice: 1 }), preview)).status, 409);
});

test('le jeudi est refusé même si une requête contourne le calendrier', async () => {
  const thursday = shiftDate(nextFriday, 6);
  assert.equal((await booking(request({ ...valid, date: thursday, expectedUnitPrice: 20 }), preview)).status, 409);
});

test('le mercredi est annoncé et revérifié à 15 € par enfant', async () => {
  const calendar = await availability(new Request(`https://preview.example/api/birthday-availability?date=${nextWednesday}&formula=commandant&age=8&children=6`), preview);
  const day = (await calendar.json()).days[0];
  assert.equal(day.quote.unitPrice, 15);
  assert.equal(day.quote.totalEstimate, 90);
  assert.equal(day.quote.discountedOffer, true);
  const data = { ...valid, date: nextWednesday, startTime: '13:30' };
  const response = await booking(request(data), preview);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).totalEstimate, 90);
  assert.equal((await booking(request({ ...data, expectedUnitPrice: 20 }), preview)).status, 409);
});

test('aucune écriture de production tant que la réservation réelle n’est pas validée', async () => {
  assert.equal((await booking(request(valid), { deploy: { context: 'production' } })).status, 503);
});

test('dates, mois et formats invalides sont refusés sans erreur serveur', async () => {
  for (const query of ['month=2026-13', 'date=2026-02-30', 'date=2026-09-00', `date=${nextFriday}&month=${nextFriday.slice(0, 7)}`]) {
    const response = await availability(new Request(`https://preview.example/api/birthday-availability?${query}&formula=commandant&age=8&children=6`), preview);
    assert.equal(response.status, 400);
  }
});

test('Google : toutes les pages, fuseau Paris et accès en lecture seule', async () => {
  const originalFetch = globalThis.fetch;
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  env.set('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'test@example.invalid');
  env.set('GOOGLE_PRIVATE_KEY', privateKey.export({ type: 'pkcs8', format: 'pem' }));
  const urls = [];
  globalThis.fetch = async (url, options) => {
    urls.push(String(url));
    if (String(url).includes('oauth2')) {
      const assertion = options.body.get('assertion');
      const claims = JSON.parse(Buffer.from(assertion.split('.')[1], 'base64url').toString());
      assert.equal(claims.scope, 'https://www.googleapis.com/auth/calendar.readonly');
      return Response.json({ access_token: 'fake-test-token' });
    }
    assert.equal(options.headers.authorization, 'Bearer fake-test-token');
    const params = new URL(String(url)).searchParams;
    assert.equal(params.get('timeMin'), '2026-10-01T00:00:00+02:00');
    assert.equal(params.get('timeMax'), '2026-11-01T00:00:00+01:00');
    return params.has('pageToken') ? Response.json({ items: [{ id: 'second' }] }) : Response.json({ items: [{ id: 'first' }], nextPageToken: 'page-two' });
  };
  try { assert.deepEqual((await listEvents('2026-10-01', '2026-10-31')).map((item) => item.id), ['first', 'second']); assert.equal(urls.length, 3); }
  finally { globalThis.fetch = originalFetch; env.clear(); }
});

test('production : une demande revérifiée ne réserve rien et ne poste jamais dans Google', async () => {
  const originalFetch = globalThis.fetch;
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  env.set('BOOKING_REQUESTS_ENABLED', 'true');
  env.set('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'test@example.invalid');
  env.set('GOOGLE_PRIVATE_KEY', privateKey.export({ type: 'pkcs8', format: 'pem' }));
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), method: options?.method || 'GET' });
    if (String(url).includes('oauth2')) return Response.json({ access_token: 'fake-test-token' });
    assert.equal(options?.method || 'GET', 'GET');
    return Response.json({ items: [] });
  };
  try {
    const response = await booking(request(valid), { deploy: { context: 'production' } });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.preview, false);
    assert.equal(data.bookingMode, 'request_only');
    assert.match(data.bookingId, /^DEM-/);
    assert.ok(calls.some((call) => call.url.includes('/calendar/')));
    assert.ok(calls.every((call) => call.method === 'GET' || call.url.includes('oauth2')));
  } finally { globalThis.fetch = originalFetch; env.clear(); }
});
