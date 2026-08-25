import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";

const base = process.argv[2] || "http://127.0.0.1:8080";
const out =
  process.argv[3] ||
  (existsSync("/workspace") ? "/workspace/screenshots" : join(tmpdir(), "beacon-qa-sos"));
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const report = [];

function pass(id, ok, detail) {
  report.push({ id, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${id} — ${detail}`);
}

const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  geolocation: { latitude: 38.7906, longitude: -121.2358 },
  permissions: ["geolocation"],
});

const page = await ctx.newPage();
page.on("dialog", (d) => d.dismiss());

await page.goto(base + "/", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(800);

const body = await page.locator("body").innerText();
const helpMe = page.getByRole("button", {
  name: /help me\. activate to choose what you need\. hold to send for help now/i,
});
const details = page.getByRole("button", { name: /add details first/i });
pass("home-help-present", (await helpMe.count()) === 1, "Dominant HELP ME control present");
pass("home-details-present", (await details.count()) === 1, "Optional details path still present");

const helpBox = await helpMe.boundingBox();
const detailsBox = await details.boundingBox();
pass(
  "help-me-dominant",
  !!(
    helpBox &&
    detailsBox &&
    helpBox.height >= detailsBox.height &&
    helpBox.width >= detailsBox.width
  ),
  `HELP ME ${Math.round(helpBox?.width ?? 0)}x${Math.round(helpBox?.height ?? 0)} vs details ${Math.round(detailsBox?.width ?? 0)}x${Math.round(detailsBox?.height ?? 0)}`,
);

pass("consent-line", body.includes("Beacon is not 911"), "Consent line visible");
pass("tel-112", (await page.locator('a[href="tel:112"]').count()) > 0, "tel:112 present");
pass("tel-911", (await page.locator('a[href="tel:911"]').count()) > 0, "tel:911 present");

const telBox = await page.locator('a[href="tel:112"]').first().boundingBox();
pass(
  "tel-subordinate",
  !!(helpBox && telBox && telBox.height < helpBox.height * 0.6),
  `tel height ${Math.round(telBox?.height ?? 0)} vs HELP ME ${Math.round(helpBox?.height ?? 0)}`,
);

const demoBadges = await page.getByText("DEMO", { exact: true }).count();
pass("demo-labeled", demoBadges >= 1, `${demoBadges} DEMO badges on home`);

await details.click();
await page.waitForTimeout(400);
const dialog = page.getByRole("dialog");
const dialogText = await dialog.innerText();
pass(
  "specific-no-unspecified",
  !dialogText.includes("Unspecified — sent from SOS"),
  "SOS-only type not in details grid",
);
pass(
  "specific-has-medical",
  dialogText.includes("Medical") && dialogText.includes("Fallen"),
  "Medical still in details help",
);
pass("specific-has-other", dialogText.includes("Other help"), "Other help still in details help");
await page.keyboard.press("Escape");
await page.waitForTimeout(200);

const city = page.getByLabel("City or address");
if ((await city.count()) > 0) {
  await city.fill("Roseville, CA");
  await page.getByRole("button", { name: /use place/i }).click();
  await page.getByText(/using /i).waitFor({ timeout: 10000 }).catch(() => {});
}

await helpMe.waitFor({ state: "visible" });
await page.waitForFunction(() => {
  const buttons = [...document.querySelectorAll("button")];
  const help = buttons.find((b) => /hold to send for help now/i.test(b.getAttribute("aria-label") || ""));
  return help && !help.disabled;
}, null, { timeout: 15000 });
await page.waitForTimeout(400);

await helpMe.click({ delay: 1300 });
const navigated = await page
  .waitForURL(/\/incident\//, { timeout: 12000 })
  .then(() => true)
  .catch(() => false);
const url = page.url();
pass("hold-navigates", navigated && /\/incident\//.test(url), `after hold url=${url}`);

await page.locator("main h1").waitFor({ state: "visible", timeout: 8000 });
await page.getByRole("button", { name: /i[’']m ok/i }).waitFor({ timeout: 8000 }).catch(() => {});
const ticket = await page.locator("main").innerText();
const h1 = (await page.locator("main h1").first().innerText()).trim();
pass(
  "hold-unspecified",
  h1 === "Help needed" || h1 === "Emergency",
  `h1="${h1}" (unspecified SOS, not a medical classification)`,
);
pass("hold-not-medical", h1 !== "Medical", `unspecified hold must not become Medical (h1="${h1}")`);
pass("creator-strip", ticket.includes("I’m OK") || ticket.includes("I'm OK"), "Creator cancel strip present");
pass(
  "type-chooser",
  ticket.includes("Medical") && ticket.includes("Stuck") && ticket.includes("Unsafe"),
  "Post-signal type chips",
);
pass("no-network-alert-copy", !ticket.includes("network is being alerted"), "No false network-alert copy on ticket");
pass("emergency-call-access", /tel:(112|911)/.test(await page.locator("a[href^='tel:']").first().getAttribute("href") || ""), "Emergency-call access remains on ticket");
await page.screenshot({ path: `${out}/sos-p0-ticket.png` });

if (navigated) {
  await page.setViewportSize({ width: 390, height: 640 });
  const convo = page.locator("#incident-conversation summary");
  if (await convo.count()) {
    const open = await page.locator("#incident-conversation").getAttribute("open");
    if (open == null) await convo.click();
  }
  await page.locator("#incident-composer").waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  await page.locator("#incident-composer").evaluate((el) => el.scrollIntoView({ block: "end" }));
  await page.waitForTimeout(400);
  const composer = await page.evaluate(() => {
    const form = document.getElementById("incident-composer");
    const send = form?.querySelector("button");
    const input = document.getElementById("incident-message-input");
    const nav = document.querySelector("nav.fixed");
    if (!form || !send || !input || !nav) {
      return { ok: false, reason: "missing composer or nav" };
    }
    const s = send.getBoundingClientRect();
    const i = input.getBoundingClientRect();
    const n = nav.getBoundingClientRect();
    const gap = n.top - Math.max(s.bottom, i.bottom);
    const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    return {
      ok: s.height > 0 && i.height > 0 && gap >= 0 && !overflow,
      gap,
      overflow,
      sendBottom: Math.round(s.bottom),
      navTop: Math.round(n.top),
    };
  });
  pass(
    "composer-above-nav",
    composer.ok,
    composer.ok
      ? `Send ${composer.sendBottom} above nav ${composer.navTop} (gap ${Math.round(composer.gap)}px)`
      : `composer occluded or missing ${JSON.stringify(composer)}`,
  );
}

await page.goto(base + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(600);
const demoCard = page.locator("a[href^='/incident/']").filter({ hasText: "DEMO" }).first();
if (await demoCard.count()) {
  await demoCard.click();
  await page.waitForTimeout(800);
  const demoBody = await page.locator("body").innerText();
  pass("demo-incident-badge", demoBody.includes("DEMO"), "Demo incident labeled");
  pass("demo-no-resolve", !demoBody.includes("Mark resolved"), "Mark resolved hidden on demo (no creator)");
  await page.screenshot({ path: `${out}/sos-p0-demo-incident.png` });
} else {
  pass("demo-incident-badge", false, "No DEMO card link found");
}

await browser.close();
const failed = report.filter((r) => !r.ok);
console.log(JSON.stringify({ failed: failed.length, report, screenshots: out }, null, 2));
process.exit(failed.length ? 1 : 0);
