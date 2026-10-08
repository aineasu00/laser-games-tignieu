import { trackBooking } from './booking-analytics.js';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const parisToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
const parseDate = (date) => new Date(`${date}T12:00:00Z`);
const shiftDate = (date, offset) => { const value = parseDate(date); value.setUTCDate(value.getUTCDate() + offset); return value.toISOString().slice(0, 10); };
const formatDate = (date) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parseDate(date));
const euro = (value) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
const endTime = (start, duration) => { const [h, m] = start.split(':').map(Number); const total = h * 60 + m + duration; return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`; };
const state = { formula: 'commandant', age: null, children: null, month: parisToday().slice(0, 7), date: '', filter: 'all', startTime: '', days: [], source: null, preview: true, bookingMode: 'simulation', loading: false, step: 1, quote: null, idempotencyKey: crypto.randomUUID() };
let activeRequest;
let revision = 0;
let debounce;
let submitting = false;
let submissionUncertain = false;
let formStarted = false;
let openTracked = false;
const track = (event, extra = {}) => trackBooking(event, { formula: state.formula, ...extra });
const submitLabel = () => state.preview ? 'Tester le parcours' : 'Envoyer ma demande';

function showAlert(message) { $('#booking-alert').textContent = message; $('#booking-alert').hidden = !message; }
function showStep(step) {
  state.step = step;
  $$('[data-step]').forEach((panel) => { panel.hidden = Number(panel.dataset.step) !== step; });
  $$('[data-step-indicator]').forEach((item) => { item.classList.toggle('active', Number(item.dataset.stepIndicator) <= step); if (Number(item.dataset.stepIndicator) === step) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current'); });
  showAlert('');
  const heading = $(`[data-step="${step}"] h2`);
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
  heading.scrollIntoView({ block: 'start', behavior: 'auto' });
}

function savePreferences() {
  try { sessionStorage.setItem('lgt-booking-preferences', JSON.stringify({ formula: state.formula, age: state.age, children: state.children, month: state.month, date: state.date, filter: state.filter })); } catch { /* Browsing still works when storage is blocked. */ }
}

function groupIsValid() {
  return Number.isInteger(state.age) && state.age >= 6 && state.age <= 17 && Number.isInteger(state.children) && state.children >= 5 && state.children + (state.age < 14 ? 1 : 0) <= 17;
}

function resetChoice() {
  state.startTime = '';
  state.quote = null;
  state.idempotencyKey = crypto.randomUUID();
  $('#slot-list').replaceChildren();
  $('#date-quote').hidden = true;
  $('#friday-suggestion').hidden = true;
  $('#commandant-price').textContent = '20 €';
  $('#mobile-formula option[value="commandant"]').textContent = '2 parties · Commandant · 20 € / enfant';
}

function updateGroup() {
  activeRequest?.abort();
  revision += 1;
  state.loading = false;
  state.formula = $('input[name="formula"]:checked').value;
  $('#mobile-formula').value = state.formula;
  state.age = $('#age').value ? Number($('#age').value) : null;
  state.children = $('#children').value ? Number($('#children').value) : null;
  state.days = [];
  state.source = null;
  resetChoice();
  $$('.formula-card').forEach((card) => card.classList.toggle('selected', card.querySelector('input').checked));
  if (state.age === null || state.children === null) {
    $('#capacity-note').textContent = 'Une estimation suffit. Vous pourrez nous signaler les changements.';
    $('#calendar-status').textContent = 'Indiquez l’âge et le nombre d’enfants pour afficher les disponibilités de votre groupe.';
  } else if (!groupIsValid()) {
    $('#capacity-note').textContent = 'Pour ce groupe, appelez-nous au 07 44 22 78 63 : nous étudierons une organisation adaptée.';
    $('#calendar-status').textContent = 'Le calendrier direct ne peut pas proposer de créneau pour cet effectif ou cet âge.';
  } else {
    $('#capacity-note').textContent = state.age < 14 ? 'Un adulte accompagne les enfants pendant les parties. Il est déjà compté dans la capacité.' : 'L’effectif indiqué comprend bien l’enfant qui fête son anniversaire.';
    $('#calendar-status').textContent = 'Recherche des créneaux adaptés à votre groupe…';
    track('booking_group');
  }
  renderCalendar();
  savePreferences();
  clearTimeout(debounce);
  if (groupIsValid()) debounce = setTimeout(loadMonth, 300);
}

function matchesFilter(date) {
  const day = parseDate(date).getUTCDay();
  return state.filter === 'all' || (state.filter === 'wednesday' && day === 3) || (state.filter === 'friday' && day === 5) || (state.filter === 'weekend' && (day === 6 || day === 0));
}

function renderCalendar() {
  const grid = $('#calendar-grid');
  grid.replaceChildren();
  grid.setAttribute('aria-busy', String(state.loading));
  const first = parseDate(`${state.month}-01`);
  const next = new Date(first); next.setUTCMonth(next.getUTCMonth() + 1);
  const totalDays = Number(shiftDate(next.toISOString().slice(0, 10), -1).slice(-2));
  $('#calendar-month').textContent = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
  const offset = (first.getUTCDay() + 6) % 7;
  for (let i = 0; i < offset; i += 1) { const spacer = document.createElement('span'); spacer.className = 'calendar-day empty'; grid.append(spacer); }
  for (let day = 1; day <= totalDays; day += 1) {
    const date = `${state.month}-${String(day).padStart(2, '0')}`;
    const weekday = parseDate(date).getUTCDay();
    const outside = date <= parisToday() || date > shiftDate(parisToday(), 120);
    const closed = [1, 2, 4].includes(weekday);
    const details = state.days.find((item) => item.date === date);
    const status = outside ? 'outside_range' : closed ? 'closed' : details?.status || 'unknown';
    const names = { outside_range: 'hors période de réservation', closed: 'aucun anniversaire', unknown: state.loading ? 'vérification en cours' : 'disponibilité à vérifier', available: 'créneaux disponibles', request: 'sur demande auprès de l’équipe', full: 'complet pour votre groupe' };
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `calendar-day ${status}`;
    button.dataset.date = date;
    button.classList.toggle('filtered', !matchesFilter(date));
    button.classList.toggle('selected', state.date === date);
    button.disabled = !matchesFilter(date) || !['available', 'request'].includes(status);
    const discountedDay = [3, 5].includes(weekday) && state.formula === 'commandant' && !outside && !closed;
    button.setAttribute('aria-label', `${formatDate(date)} : ${names[status]}${discountedDay ? ', Commandant à 15 € par enfant' : ''}`);
    button.setAttribute('aria-pressed', String(state.date === date));
    button.title = names[status];
    button.textContent = String(day);
    const hint = document.createElement('small');
    hint.textContent = status === 'full' ? '×' : status === 'closed' ? '—' : status === 'request' ? '?' : discountedDay ? '15 €' : status === 'available' ? '●' : '';
    button.append(hint);
    button.addEventListener('click', () => selectDate(date));
    grid.append(button);
  }
  $('#previous-month').disabled = state.month <= parisToday().slice(0, 7);
  $('#next-month').disabled = state.month >= shiftDate(parisToday(), 120).slice(0, 7);
}

async function loadMonth() {
  if (!groupIsValid()) return;
  activeRequest?.abort();
  const controller = new AbortController(); activeRequest = controller;
  const requestRevision = ++revision;
  state.loading = true;
  state.days = [];
  resetChoice();
  $('#slots-status').textContent = 'Vérification du planning…';
  $('#calendar-status').textContent = 'Recherche des disponibilités du mois…';
  renderCalendar();
  const timeout = setTimeout(() => controller.abort(), 25000);
  const startedAt = performance.now();
  try {
    const params = new URLSearchParams({ month: state.month, formula: state.formula, age: state.age, children: state.children });
    const response = await fetch(`/api/birthday-availability?${params}`, { signal: controller.signal, cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Planning momentanément indisponible.');
    if (requestRevision !== revision) return;
    state.days = payload.days;
    state.source = payload.source;
    state.preview = payload.preview;
    state.bookingMode = payload.bookingMode;
    $('#calendar-mode').textContent = payload.source === 'demo'
      ? 'PRÉVERSION DE TEST — Calendrier fictif pour essayer le parcours. Aucune réservation réelle.'
      : payload.preview ? 'PRÉVERSION — Lecture de Google Agenda. Les réservations restent simulées.'
      : 'Planning à jour — Choisissez un créneau, puis envoyez votre demande. Notre équipe vous confirmera la réservation par e-mail.';
    const available = state.days.filter((day) => day.status === 'available' && matchesFilter(day.date));
    $('#calendar-status').textContent = payload.source === 'demo'
      ? `${available.length} dates proposées dans ce calendrier fictif. Les jours complets servent aussi à tester le parcours.`
      : `${available.length} dates avec des créneaux possibles · Google Agenda vérifié à ${new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date(payload.checkedAt))}. Capacité d’accueil à confirmer avec l’équipe.`;
    if (!available.length) $('#calendar-status').textContent += ' Essayez un autre filtre ou le mois suivant.';
    track('booking_availability', { result: available.length ? 'available' : 'empty', latency: performance.now() - startedAt < 2000 ? 'under_2s' : performance.now() - startedAt < 5000 ? '2_5s' : 'over_5s' });
    if (!available.length) track('booking_no_slots');
    const selected = state.days.find((day) => day.date === state.date && matchesFilter(day.date) && ['available', 'request'].includes(day.status));
    state.date = selected?.date || '';
    if (state.date) renderSlots();
    else { $('#selected-date-label').textContent = 'Quel jour vous convient ?'; $('#slots-status').textContent = 'Choisissez une date dans le calendrier pour voir ses horaires.'; }
  } catch (error) {
    if (requestRevision !== revision) return;
    state.days = [];
    state.source = null;
    $('#calendar-mode').textContent = 'Planning indisponible — aucun créneau ne peut être confirmé.';
    $('#calendar-status').textContent = error.name === 'AbortError' ? 'La lecture prend trop de temps. Utilisez « Actualiser le planning » pour réessayer.' : error.message;
    $('#slots-status').textContent = 'Réessayez ou appelez-nous au 07 44 22 78 63.';
    track('booking_error', { stage: 'calendar', reason: error.name === 'AbortError' ? 'calendar_timeout' : 'calendar_unavailable' });
  } finally {
    clearTimeout(timeout);
    if (requestRevision === revision) { state.loading = false; renderCalendar(); }
  }
}

function selectDate(date) {
  track('booking_date_selected');
  state.date = date;
  resetChoice();
  renderCalendar();
  renderSlots();
  savePreferences();
}

function renderSlots() {
  const day = state.days.find((item) => item.date === state.date);
  if (!day) return;
  $('#selected-date-label').textContent = formatDate(day.date);
  $('#slots-status').textContent = state.source === 'demo' ? 'Horaires fictifs pour tester votre choix' : 'Horaires compatibles avec les passages connus de l’agenda';
  const list = $('#slot-list'); list.replaceChildren();
  for (const slot of day.slots) {
    const onRequest = slot.status === 'request' || state.bookingMode === 'request_only';
    const button = document.createElement('button');
    button.className = `slot ${onRequest ? 'request' : ''}`;
    button.textContent = slot.startTime;
    const detail = document.createElement('small');
    detail.textContent = `Fin vers ${endTime(slot.startTime, day.quote.durationMinutes)}${onRequest ? ' · sur demande' : ''}`;
    button.append(detail);
    button.type = 'button';
    button.addEventListener('click', () => selectSlot(slot.startTime, day.quote));
    list.append(button);
  }
  const quote = $('#date-quote'); quote.hidden = false;
  quote.textContent = `${day.quote.label} · ${euro(day.quote.unitPrice)} / enfant · ${euro(day.quote.totalEstimate)} estimés pour ${state.children} enfants. Goûter, boissons et friandises inclus.${day.quote.discountedOffer ? ' Tarif mercredi/vendredi appliqué.' : ''}`;
  const commandantPrice = [3, 5].includes(parseDate(day.date).getUTCDay()) ? 15 : 20;
  $('#commandant-price').textContent = `${commandantPrice} €`;
  $('#mobile-formula option[value="commandant"]').textContent = `2 parties · Commandant · ${commandantPrice} € / enfant`;
  const suggestion = $('#friday-suggestion'); suggestion.replaceChildren(); suggestion.hidden = true;
  if (state.formula === 'commandant' && !day.quote.discountedOffer) {
    const discountedDay = state.days.find((item) => item.quote.discountedOffer && item.status === 'available');
    if (discountedDay) {
      suggestion.hidden = false;
      suggestion.append(`La même formule le mercredi ou le vendredi : ${euro(state.children * 5)} d’économie pour votre groupe. `);
      const link = document.createElement('button'); link.type = 'button'; link.textContent = `Voir ${formatDate(discountedDay.date)}`;
      link.addEventListener('click', () => { state.filter = 'all'; syncFilters(); selectDate(discountedDay.date); }); suggestion.append(link);
    }
  }
}

function selectSlot(startTime, quote) {
  track('booking_slot_selected');
  state.startTime = startTime;
  state.quote = quote;
  state.idempotencyKey = crypto.randomUUID();
  $('#booking-summary').textContent = `${formatDate(state.date)} · arrivée à ${startTime}, fin vers ${endTime(startTime, quote.durationMinutes)} · ${quote.label} · environ ${state.children} enfants de ${state.age} ans.`;
  $('#booking-price').textContent = `${euro(quote.totalEstimate)} estimés · ${euro(quote.unitPrice)} par enfant${quote.discountedOffer ? ' · tarif mercredi/vendredi' : ''}`;
  $('#confirm-booking').textContent = submitLabel();
  $('#contact-mode').textContent = state.preview ? 'Test uniquement : aucune demande ne sera envoyée.' : 'Votre demande n’est pas encore une réservation confirmée. Nous vérifions l’organisation et vous répondons par e-mail.';
  showStep(2);
  track('booking_contact_view');
}

async function submitBooking(event) {
  event.preventDefault();
  if (submitting || submissionUncertain) return;
  const form = event.currentTarget;
  if (!form.reportValidity() || !state.quote) return;
  submitting = true;
  track('booking_submit');
  const button = $('#confirm-booking');
  button.disabled = true;
  $$('[data-back]').forEach((item) => { item.disabled = true; });
  button.textContent = 'Vérification du créneau…';
  const values = new FormData(form);
  const data = { parentName: values.get('parentName'), childName: values.get('childName'), email: values.get('email'), phone: values.get('phone'), website: values.get('website'), date: state.date, startTime: state.startTime, formula: state.formula, age: state.age, children: state.children, shareConsent: values.get('shareConsent') === 'on', paymentConsent: values.get('paymentConsent') === 'on', expectedUnitPrice: state.quote.unitPrice, idempotencyKey: state.idempotencyKey };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  let transmissionStarted = false;
  try {
    const response = await fetch('/api/book-birthday', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: controller.signal });
    const payload = await response.json();
    if (!response.ok) { if (response.status === 409) track('booking_error', { stage: 'submit', reason: 'slot_changed' }); throw new Error(payload.error || 'Impossible de vérifier ce créneau.'); }
    if (!payload.ok || !payload.bookingId || payload.preview !== state.preview || (!payload.preview && payload.bookingMode !== 'request_only')) throw new Error('Résultat inattendu : contactez notre équipe avant de recommencer.');
    if (!payload.preview) {
      button.textContent = 'Transmission de votre demande…';
      const fields = new URLSearchParams({
        'form-name': 'anniversaire', 'bot-field': String(values.get('website') || ''),
        nom: String(data.parentName), prenom_enfant: String(data.childName), email: String(data.email), telephone: String(data.phone),
        date_souhaitee: payload.date, heure_souhaitee: payload.startTime, age_enfant: String(data.age), nombre_enfants: String(data.children),
        formule: `${payload.formula} (${payload.unitPrice} € / enfant)`, tarif_estime: `${payload.totalEstimate} €`,
        reference_demande: payload.bookingId, source_demande: 'Calendrier en ligne — demande à confirmer',
        partage_accepte: 'Oui — groupe d’âge compatible, table séparée', paiement_accepte: 'Sur place après l’anniversaire, aucun acompte',
      });
      transmissionStarted = true;
      const sent = await fetch('/demande-recue', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: fields.toString(), signal: controller.signal });
      const receipt = await sent.text();
      if (!sent.ok || !receipt.includes('lgt-request-receipt-v1')) throw new Error('La réception n’a pas pu être vérifiée.');
      track('generate_lead');
    }
    $('#success-kicker').textContent = payload.preview ? 'Test du parcours' : 'Demande transmise';
    $('#success-title').textContent = payload.preview ? 'Simulation réussie.' : 'Merci, nous avons votre demande.';
    $('#success-summary').textContent = `${payload.preview ? 'Parcours testé' : 'Demande'} pour ${values.get('childName')} : ${formatDate(payload.date)} à ${payload.startTime}, ${payload.formula}, ${euro(payload.unitPrice)} par enfant, soit ${euro(payload.totalEstimate)} estimés.`;
    $('#success-promise').textContent = payload.preview ? 'Aucune réservation réelle : ce test n’ajoute rien à l’agenda ni au registre et n’envoie aucun e-mail.' : 'La réservation sera définitive après notre confirmation par e-mail. Le créneau n’est pas encore bloqué. Pas de paiement en ligne : vous réglerez sur place après l’anniversaire.';
    $('#booking-reference').textContent = payload.bookingId;
    // A preview must never emit a real lead/conversion event.
    showStep(3);
  } catch (error) {
    submissionUncertain = transmissionStarted;
    if (transmissionStarted) {
      showAlert('La réception de votre demande est incertaine. Pour éviter un doublon, ne la renvoyez pas : appelez-nous au 07 44 22 78 63 pour vérifier. Vos informations restent affichées ici.');
      $$('[data-back]').forEach((item) => { item.disabled = true; });
    } else showAlert(error.name === 'AbortError' ? 'La vérification prend trop de temps. Vos coordonnées sont conservées ; vous pouvez réessayer.' : error.message);
    track('booking_error', { stage: 'submit', reason: transmissionStarted ? 'submit_uncertain' : 'submit_failed' });
  }
  finally { clearTimeout(timeout); submitting = false; button.disabled = submissionUncertain || state.step === 3; button.textContent = submissionUncertain ? 'Réception à vérifier par téléphone' : submitLabel(); $$('[data-back]').forEach((item) => { item.disabled = submissionUncertain; }); }
}

function syncFilters() {
  $$('[data-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.filter === state.filter)));
}

function initialize() {
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem('lgt-booking-preferences') || '{}') || {}; } catch { /* Optional preferences only. */ }
  const params = new URLSearchParams(location.search);
  const formula = params.get('formula') || saved.formula;
  if (['commandant', 'explorateur'].includes(formula)) $(`input[name="formula"][value="${formula}"]`).checked = true;
  if (Number.isInteger(saved.age) && saved.age >= 6 && saved.age <= 17) $('#age').value = saved.age;
  if (Number.isInteger(saved.children) && saved.children >= 5 && saved.children <= 17) $('#children').value = saved.children;
  const filter = params.get('day') || saved.filter;
  if (['all', 'friday', 'wednesday', 'weekend'].includes(filter)) state.filter = filter;
  const date = params.get('date') || saved.date || '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) && date > parisToday() && date <= shiftDate(parisToday(), 120)) { state.date = date; state.month = date.slice(0, 7); }
  $('#calendar-mode').textContent = 'Choisissez votre groupe pour consulter le planning à jour. Aucun paiement en ligne.';
  const trackOpen = () => { if (!openTracked) openTracked = track('booking_open'); };
  trackOpen();
  window.addEventListener('lgt-consent-change', trackOpen);
  syncFilters();
  updateGroup();
  $('#booking-form').addEventListener('submit', submitBooking);
  $('#booking-form').addEventListener('input', () => { if (!formStarted) { formStarted = true; track('booking_form_start'); } });
  $('#booking-form').addEventListener('invalid', (event) => track('booking_validation_error', { stage: 'contact', field: event.target.name }), true);
  $$('a[href^="tel:"]').forEach((link) => link.addEventListener('click', () => track('booking_help', { stage: state.step === 1 ? 'calendar' : 'contact', reason: 'phone' })));
  $('.slot-help a').addEventListener('click', () => track('booking_help', { reason: 'personalized', stage: 'calendar' }));
  $$('[data-help-reason]').forEach((button) => button.addEventListener('click', () => { track('booking_help', { reason: button.dataset.helpReason, stage: state.step === 1 ? 'calendar' : 'contact' }); $('#help-response').textContent = 'Merci. Vous pouvez nous appeler au 07 44 22 78 63 ou utiliser la demande personnalisée si vous souhaitez une réponse.'; }));
  [$('#age'), $('#children')].forEach((input) => input.addEventListener('input', updateGroup));
  $$('input[name="formula"]').forEach((input) => input.addEventListener('change', updateGroup));
  $('#mobile-formula').addEventListener('change', (event) => { $(`input[name="formula"][value="${event.target.value}"]`).checked = true; updateGroup(); });
  $$('[data-back]').forEach((button) => button.addEventListener('click', () => { showStep(Number(button.dataset.back)); loadMonth(); }));
  for (const [selector, offset] of [['#previous-month', -1], ['#next-month', 1]]) $(selector).addEventListener('click', () => {
    const month = parseDate(`${state.month}-01`); month.setUTCMonth(month.getUTCMonth() + offset); state.month = month.toISOString().slice(0, 7); state.date = ''; state.days = []; resetChoice(); renderCalendar(); loadMonth();
  });
  $$('[data-filter]').forEach((button) => button.addEventListener('click', () => {
    state.filter = button.dataset.filter; syncFilters();
    track('booking_filter', { day_filter: state.filter });
    if (state.date && !matchesFilter(state.date)) { state.date = ''; resetChoice(); $('#selected-date-label').textContent = 'Choisissez une date'; $('#slots-status').textContent = 'Sélectionnez un jour dans le calendrier.'; }
    renderCalendar(); savePreferences();
    if (groupIsValid()) { const count = state.days.filter((day) => matchesFilter(day.date) && day.status === 'available').length; $('#calendar-status').textContent = `${count} dates proposées avec ce filtre${state.source === 'demo' ? ' · calendrier fictif' : ''}.`; }
  }));
  $('#refresh-calendar').addEventListener('click', loadMonth);
  // Refresh only while the calendar is being viewed, and never interrupt checkout.
  setInterval(() => { if (!document.hidden && state.step === 1 && !state.loading && groupIsValid()) loadMonth(); }, 60000);
}

document.addEventListener('DOMContentLoaded', initialize);
