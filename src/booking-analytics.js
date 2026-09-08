// Deliberately small, consent-gated funnel. No field values or customer IDs.
const EVENTS = new Set(['booking_open', 'booking_group', 'booking_availability', 'booking_no_slots', 'booking_date_selected', 'booking_slot_selected', 'booking_contact_view', 'booking_form_start', 'booking_validation_error', 'booking_submit', 'booking_error', 'booking_help', 'booking_filter', 'generate_lead']);
const PARAMETERS = {
  formula: ['commandant', 'explorateur'],
  stage: ['calendar', 'contact', 'submit'],
  reason: ['calendar_timeout', 'calendar_unavailable', 'slot_changed', 'validation', 'submit_failed', 'submit_uncertain', 'no_slot', 'phone', 'personalized', 'payment', 'sharing', 'other'],
  field: ['parentName', 'childName', 'email', 'phone', 'shareConsent', 'paymentConsent'],
  day_filter: ['all', 'friday', 'wednesday', 'weekend'],
  result: ['available', 'empty'],
  latency: ['under_2s', '2_5s', 'over_5s'],
};
export function hasAnalyticsConsent() {
  try {
    const consent = JSON.parse(localStorage.getItem('lgt-cookie-consent') || 'null');
    return consent?.choice === 'accepted' && Number.isFinite(consent.savedAt) && Date.now() >= consent.savedAt && Date.now() - consent.savedAt < 180 * 86400000;
  } catch { return false; }
}
export function trackBooking(event, values = {}) {
  // Never contaminate production figures with preview-host or local tests.
  if (!['lasergamestignieu.com', 'www.lasergamestignieu.com', 'www.lasergamesarcade.net', 'lasergamesarcade.net'].includes(location.hostname) || !hasAnalyticsConsent() || !EVENTS.has(event)) return false;
  const safe = { funnel_version: 'request_v1', send_to: 'G-19KH6R2W65', page_location: `${location.origin}${location.pathname}`, page_referrer: document.referrer ? new URL(document.referrer).origin : '' };
  for (const [key, allowed] of Object.entries(PARAMETERS)) if (allowed.includes(values[key])) safe[key] = values[key];
  // Use the existing Google tag loaded by GTM; no second gtag.js loader.
  try {
    if (typeof window.gtag !== 'function') return false;
    window.gtag('event', event, safe);
    return true;
  } catch { return false; } // Measurement must never interrupt a reservation request.
}
