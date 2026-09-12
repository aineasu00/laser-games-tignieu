// The dated notice expires after the last exceptional morning (Paris time).
if (Date.now() >= Date.parse("2026-09-19T13:30:00+02:00")) {
  document.querySelectorAll(".exceptional-hours").forEach((notice) => { notice.hidden = true; });
}
