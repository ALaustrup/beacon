import { chromium } from "playwright";

const base = process.argv[2] || "http://127.0.0.1:8080";
const out = process.argv[3] || "/workspace/screenshots";

const browser = await chromium.launch({
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function shot(page, name, path) {
  await page.goto(base + path, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(600);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const text = (await page.locator("body").innerText()).slice(0, 200);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
  return { name, path, title: await page.title(), text, errors };
}

const results = [];

const desktop = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  geolocation: { latitude: 38.7906, longitude: -121.2358 },
  permissions: ["geolocation"],
});
const d = await desktop.newPage();
d.on("pageerror", (e) => console.error("pageerror", e));
d.on("console", (m) => {
  if (m.type() === "error") console.error("console", m.text());
});
results.push(await shot(d, "home-geo", "/"));
results.push(await shot(d, "chat", "/chat"));
results.push(await shot(d, "places", "/places"));
results.push(await shot(d, "login", "/login"));
results.push(await shot(d, "log", "/log"));
results.push(await shot(d, "wallet-redirect", "/wallet"));

const first = d.locator('a[href^="/incident/"]').first();
if (await first.count()) {
  await first.click();
  await d.waitForTimeout(800);
  await d.screenshot({ path: `${out}/incident.png` });
  results.push({ name: "incident", title: await d.title(), text: (await d.locator("body").innerText()).slice(0, 180) });
}

await desktop.close();

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  geolocation: { latitude: 38.7906, longitude: -121.2358 },
  permissions: ["geolocation"],
});
const m = await mobile.newPage();
await m.goto(base + "/", { waitUntil: "networkidle" });
await m.waitForTimeout(600);
const overflow = await m.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
await m.screenshot({ path: `${out}/mobile.png` });
results.push({ name: "mobile", overflow, title: await m.title(), text: (await m.locator("body").innerText()).slice(0, 180) });
await mobile.close();

await browser.close();
console.log(JSON.stringify(results, null, 2));
