import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

test("la page de réservation ne contient pas d’identifiant HTML dupliqué", () => {
  const html = read("src/reservation-anniversaire.html");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});

test("les ressources locales de la page existent", () => {
  const html = read("src/reservation-anniversaire.html");
  const paths = [...html.matchAll(/(?:href|src)="(\/[^"]+)"/g)]
    .map((match) => match[1].split(/[?#]/)[0])
    .filter((path) => path !== "/" && !path.startsWith("/api/"));
  for (const path of paths) assert.ok(existsSync(join(root, "src", path)), `Ressource absente : ${path}`);
});

test("Consent Mode et GTM ne sont chargés qu’une fois", () => {
  const html = read("src/reservation-anniversaire.html");
  assert.equal((html.match(/googletagmanager\.com\/gtm\.js/g) || []).length, 1);
  assert.equal((html.match(/googletagmanager\.com\/ns\.html/g) || []).length, 1);
  assert.ok(html.indexOf("gtag('consent','default'") < html.indexOf("googletagmanager.com/gtm.js"));
});

test("les durées métier et le sitemap sont cohérents", () => {
  const birthdays = read("src/anniversaires.html");
  const booking = read("src/reservation-anniversaire.html");
  const sitemap = read("src/sitemap.xml");
  assert.doesNotMatch(birthdays, /1h30|1 h 30/);
  assert.match(birthdays, /1 h 45 à 2 h/);
  assert.match(birthdays, /parties? de 20 minutes/);
  assert.match(booking, /50 min/);
  assert.match(booking, /20 minutes de jeu/);
  assert.match(booking, /10 minutes pour équiper/);
  assert.doesNotMatch(booking, /rotations? de 30 minutes/);
  assert.match(sitemap, /reservation-anniversaire\.html/);
});
