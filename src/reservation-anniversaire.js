const state = {
  formula: "commandant",
  age: 8,
  children: 8,
  date: "",
  startTime: "",
  visibleMonth: new Date(),
  idempotencyKey: crypto.randomUUID(),
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const formatDate = (date) => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const parseDate = (value) => new Date(`${value}T12:00:00`);
const formulaLabel = () => state.formula === "commandant" ? "Commandant · 20 € · 2 parties" : "Explorateur · 16 € · 1 partie";
const ageBand = () => state.age <= 7 ? "6_7" : state.age <= 10 ? "8_10" : state.age <= 12 ? "10_12" : state.age <= 14 ? "12_14" : "14_plus";

function track(event, parameters = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...parameters });
}

function showAlert(message) {
  const alert = $("#booking-alert");
  alert.textContent = message;
  alert.hidden = !message;
  if (message) alert.scrollIntoView({ behavior: "smooth", block: "center" });
}

function showStep(step) {
  $$('[data-step]').forEach((panel) => {
    const active = Number(panel.dataset.step) === step;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
  $$('[data-step-indicator]').forEach((indicator) => indicator.classList.toggle("active", Number(indicator.dataset.stepIndicator) <= Math.min(step, 3)));
  showAlert("");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateCapacity() {
  state.age = Number($("#age").value);
  state.children = Number($("#children").value);
  const adult = state.age < 14 ? 1 : 0;
  const total = state.children + adult;
  const note = $("#capacity-note");
  note.innerHTML = Number.isFinite(total)
    ? `<strong>${total} équipement${total > 1 ? "s" : ""} prévu${total > 1 ? "s" : ""} sur 17</strong> — ${state.children} enfant${state.children > 1 ? "s" : ""}${adult ? " + 1 adulte accompagnateur obligatoire dans le labyrinthe" : ""}.`
    : "";
  note.style.color = total > 17 ? "var(--danger)" : "";
  return total <= 17 && state.children >= 5 && state.age >= 6 && state.age <= 17;
}

function configureFromUrl() {
  const params = new URLSearchParams(location.search);
  const formula = params.get("formula");
  if (["commandant", "explorateur"].includes(formula)) {
    state.formula = formula;
    $(`input[name="formula"][value="${formula}"]`).checked = true;
  }
  const age = Number(params.get("age"));
  const children = Number(params.get("children"));
  if (age >= 6 && age <= 17) $("#age").value = age;
  if (children >= 5 && children <= 17) $("#children").value = children;
  state.date = /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") || "") ? params.get("date") : "";
  if (state.date) state.visibleMonth = parseDate(state.date);
}

function syncFormulaCards() {
  $$(".formula-card").forEach((card) => card.classList.toggle("selected", $("input", card).checked));
}

function renderCalendar() {
  const grid = $("#calendar-grid");
  grid.replaceChildren();
  const year = state.visibleMonth.getFullYear();
  const month = state.visibleMonth.getMonth();
  $("#calendar-month").textContent = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(year, month, 1));
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1);
  const latest = new Date(); latest.setHours(23, 59, 59, 999); latest.setDate(latest.getDate() + 120);

  for (let index = 0; index < firstWeekday; index += 1) {
    const empty = document.createElement("span"); empty.className = "calendar-day empty"; grid.append(empty);
  }
  for (let day = 1; day <= days; day += 1) {
    const date = new Date(year, month, day, 12);
    const key = dateKey(date);
    const weekday = date.getDay();
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.textContent = String(day);
    button.setAttribute("role", "gridcell");
    button.setAttribute("aria-label", formatDate(date));
    button.disabled = date < tomorrow || date > latest || weekday === 1 || weekday === 2;
    button.classList.toggle("selected", state.date === key);
    button.addEventListener("click", () => selectDate(key));
    grid.append(button);
  }
  const currentMonth = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1);
  $("#previous-month").disabled = new Date(year, month, 1) <= currentMonth;
  $("#next-month").disabled = new Date(year, month + 1, 1) > latest;
}

async function selectDate(date) {
  state.date = date;
  state.startTime = "";
  renderCalendar();
  $("#selected-date-label").textContent = formatDate(parseDate(date));
  const status = $("#slots-status");
  const list = $("#slot-list");
  status.textContent = "Lecture du planning en cours…";
  list.replaceChildren();

  try {
    const query = new URLSearchParams({ date, formula: state.formula, age: String(state.age), children: String(state.children) });
    const response = await fetch(`/api/birthday-availability?${query}`, { headers: { Accept: "application/json" } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Planning indisponible.");
    status.textContent = payload.slots.length ? `Horaires disponibles${payload.preview ? " · mode prévisualisation" : ""}` : "Aucun créneau direct pour cette date.";
    for (const slot of payload.slots) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `slot ${slot.status === "request" ? "request" : ""}`;
      button.innerHTML = `${slot.startTime}<small>${slot.status === "request" ? "sur demande" : "réservation immédiate"}</small>`;
      if (slot.status === "request") {
        button.disabled = true;
      } else {
        button.addEventListener("click", () => selectSlot(slot.startTime));
      }
      list.append(button);
    }
    track("booking_slot_view", { formula: state.formula, age_band: ageBand(), date_bucket: "next_120_days" });
  } catch (error) {
    status.textContent = error.message;
  }
}

function selectSlot(startTime) {
  state.startTime = startTime;
  $("#booking-summary").textContent = `${formatDate(parseDate(state.date))} à ${startTime} — ${formulaLabel()} — environ ${state.children} enfants.`;
  track("booking_slot_selected", { formula: state.formula, age_band: ageBand() });
  showStep(3);
}

async function submitBooking(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const button = $("#confirm-booking");
  button.disabled = true;
  button.textContent = "Vérification du planning…";
  const values = new FormData(form);
  const body = {
    parentName: values.get("parentName"), childName: values.get("childName"), email: values.get("email"), phone: values.get("phone"),
    date: state.date, age: state.age, children: state.children, formula: state.formula, startTime: state.startTime,
    shareConsent: values.get("shareConsent") === "on", paymentConsent: values.get("paymentConsent") === "on",
    website: values.get("website"), idempotencyKey: state.idempotencyKey,
  };
  try {
    const response = await fetch("/api/book-birthday", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "La réservation n’a pas pu être enregistrée.");
    $("#success-summary").textContent = `${payload.preview ? "Simulation réussie pour " : "Réservation confirmée pour "}${form.elements.childName.value}, ${formatDate(parseDate(payload.date))} à ${payload.startTime}, formule ${payload.formula}.`;
    $("#booking-reference").textContent = payload.bookingId;
    track("generate_lead", { lead_type: "birthday_booking", formula: state.formula, age_band: ageBand() });
    showStep(4);
  } catch (error) {
    showAlert(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Confirmer la réservation";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  configureFromUrl();
  syncFormulaCards();
  updateCapacity();
  renderCalendar();
  $("#booking-form").addEventListener("focusin", () => track("form_start", { form_name: "birthday_booking" }), { once: true });
  $("#booking-form").addEventListener("submit", submitBooking);
  $$("input[name='formula']").forEach((input) => input.addEventListener("change", () => { state.formula = input.value; state.date = ""; syncFormulaCards(); }));
  [$("#age"), $("#children")].forEach((input) => input.addEventListener("input", updateCapacity));
  $("#to-calendar").addEventListener("click", () => {
    if (!updateCapacity()) return showAlert("Ce groupe dépasse la réservation directe. Faites une demande personnalisée ou appelez-nous.");
    state.formula = $("input[name='formula']:checked").value;
    $("#mission-summary").textContent = `${formulaLabel()} — environ ${state.children} enfants de ${state.age} ans.`;
    track("booking_click", { booking_type: "birthday", formula: state.formula });
    showStep(2); renderCalendar(); if (state.date) selectDate(state.date);
  });
  $$('[data-back]').forEach((button) => button.addEventListener("click", () => showStep(Number(button.dataset.back))));
  $("#previous-month").addEventListener("click", () => { state.visibleMonth = new Date(state.visibleMonth.getFullYear(), state.visibleMonth.getMonth() - 1, 1); renderCalendar(); });
  $("#next-month").addEventListener("click", () => { state.visibleMonth = new Date(state.visibleMonth.getFullYear(), state.visibleMonth.getMonth() + 1, 1); renderCalendar(); });
});
