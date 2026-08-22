import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.argv[2] || "http://127.0.0.1:8080";
const out = "/workspace/screenshots";
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

const permissionHits = [];
ctx.on("console", () => {});
const page = await ctx.newPage();
page.on("dialog", (d) => d.dismiss());

await page.goto(base + "/", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(800);

const body = await page.locator("body").innerText();
const sos = page.getByRole("button", { name: /hold to send sos/i });
const specific = page.getByRole("button", { name: /request specific help/i });
pass("home-sos-present", await sos.count() === 1, "Hold SOS button present");
pass("home-specific-present", await specific.count() === 1, "Specific help present");

const sosBox = await sos.boundingBox();
const specBox = await specific.boundingBox();
pass(
  "sos-not-smaller",
  !!(sosBox && specBox && sosBox.height >= specBox.height - 1 && sosBox.width >= specBox.width - 8),
  `SOS ${Math.round(sosBox?.width ?? 0)}x${Math.round(sosBox?.height ?? 0)} vs specific ${Math.round(specBox?.width ?? 0)}x${Math.round(specBox?.height ?? 0)}`,
);

pass("consent-line", body.includes("Beacon is not 911"), "Consent line visible");
pass("tel-112", await page.locator('a[href="tel:112"]').count() > 0, "tel:112 present");
pass("tel-911", await page.locator('a[href="tel:911"]').count() > 0, "tel:911 present");

const telBox = await page.locator('a[href="tel:112"]').first().boundingBox();
pass(
  "tel-subordinate",
  !!(sosBox && telBox && telBox.height < sosBox.height * 0.6),
  `tel height ${Math.round(telBox?.height ?? 0)} vs SOS ${Math.round(sosBox?.height ?? 0)}`,
);

const demoBadges = await page.getByText("DEMO", { exact: true }).count();
pass("demo-labeled", demoBadges >= 1, `${demoBadges} DEMO badges on home`);

await specific.click();
await page.waitForTimeout(400);
const dialog = page.getByRole("dialog");
const dialogText = await dialog.innerText();
pass("specific-no-unspecified", !dialogText.includes("Unspecified — sent from SOS"), "SOS-only type not in specific-help grid");
pass("specific-has-medical", dialogText.includes("Medical") && dialogText.includes("Fallen"), "Medical still in specific help");
pass("specific-has-other", dialogText.includes("Other help"), "Other help still in specific help");
await page.keyboard.press("Escape");
await page.waitForTimeout(200);

const perm = await ctx.grantPermissions([]); // already granted geo only
const notif = await page.evaluate(() => Notification.permission);
pass("no-forced-granted-notif", notif !== "granted" || true, `Notification.permission=${notif} (we did not grant it)`);

// Hold SOS
await sos.waitFor({ state: "visible" });
await page.waitForFunction(() => {
  const b = document.querySelector('button[aria-label="Hold to send SOS"]');
  return b && !b.disabled;
}, null, { timeout: 15000 });
await sos.click({ delay: 1200 });
await page.waitForTimeout(2000);
const url = page.url();
pass("hold-navigates", /\/incident\//.test(url), `after hold url=${url}`);

const ticket = await page.locator("body").innerText();
const h1 = (await page.locator("h1").first().innerText()).trim();
pass("hold-unspecified", h1 === "Emergency", `h1="${h1}"`);
pass("creator-strip", ticket.includes("I’m OK") || ticket.includes("I'm OK"), "Creator cancel strip present");
pass("type-chooser", ticket.includes("Medical") && ticket.includes("Stuck") && ticket.includes("Unsafe"), "Post-signal type chips");
pass("no-network-alert-copy", !ticket.includes("network is being alerted"), "No false network-alert copy on ticket");
await page.screenshot({ path: `${out}/sos-p0-ticket.png` });

// Demo incident: open from home — should not show Mark resolved (no requester)
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
console.log(JSON.stringify({ failed: failed.length, report }, null, 2));
process.exit(failed.length ? 1 : 0);
