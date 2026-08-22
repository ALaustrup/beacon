import { getSql } from "@/lib/db";
import { isBeaconDemo } from "@/lib/demo-flag";
import { uid } from "@/lib/utils";

type SeedIncident = {
  name: string;
  type: string;
  description: string;
  lat: number;
  lng: number;
  label: string;
  country: string;
  battery: number;
  canPay: boolean;
  language: string;
  status: string;
  minutesAgo: number;
};

const SEEDS: SeedIncident[] = [
  {
    name: "Elena V.",
    type: "medical",
    description: "I fell in my kitchen and cannot stand. I am 78. The door is unlocked.",
    lat: 41.9028,
    lng: 12.4964,
    label: "Rome, Italy",
    country: "IT",
    battery: 22,
    canPay: false,
    language: "it",
    status: "open",
    minutesAgo: 4,
  },
  {
    name: "Marcus J.",
    type: "fuel",
    description: "Out of gas on the shoulder of I-80 westbound. White sedan, hazards on.",
    lat: 39.5296,
    lng: -119.8138,
    label: "Reno, Nevada, US",
    country: "US",
    battery: 48,
    canPay: true,
    language: "en",
    status: "open",
    minutesAgo: 11,
  },
  {
    name: "Amina K.",
    type: "vehicle",
    description: "Engine died after a loud noise. Two children in the car. We are warm but stuck.",
    lat: 6.5244,
    lng: 3.3792,
    label: "Lagos, Nigeria",
    country: "NG",
    battery: 61,
    canPay: false,
    language: "en",
    status: "assisting",
    minutesAgo: 27,
  },
  {
    name: "Hiroshi T.",
    type: "lost",
    description: "Missed the last train. Phone is in another language. I do not know this neighborhood.",
    lat: 35.6762,
    lng: 139.6503,
    label: "Tokyo, Japan",
    country: "JP",
    battery: 9,
    canPay: true,
    language: "ja",
    status: "open",
    minutesAgo: 8,
  },
  {
    name: "Sofia R.",
    type: "accident",
    description: "Two-car collision at the roundabout. One person is bleeding from the forehead.",
    lat: -34.6037,
    lng: -58.3816,
    label: "Buenos Aires, Argentina",
    country: "AR",
    battery: 73,
    canPay: true,
    language: "es",
    status: "assisting",
    minutesAgo: 6,
  },
  {
    name: "Daniel O.",
    type: "stranded",
    description: "Hiker off-trail after dusk. Ankle twisted. Headlamp still works.",
    lat: -41.1335,
    lng: -71.3103,
    label: "Bariloche, Argentina",
    country: "AR",
    battery: 34,
    canPay: false,
    language: "es",
    status: "open",
    minutesAgo: 41,
  },
  {
    name: "Priya S.",
    type: "food",
    description: "Traveling with a toddler. We have not eaten since yesterday. Need a safe meal.",
    lat: 28.6139,
    lng: 77.209,
    label: "New Delhi, India",
    country: "IN",
    battery: 18,
    canPay: false,
    language: "hi",
    status: "open",
    minutesAgo: 19,
  },
  {
    name: "Lukas M.",
    type: "shelter",
    description: "Wallet stolen at the station. No place to sleep tonight. It is raining.",
    lat: 52.52,
    lng: 13.405,
    label: "Berlin, Germany",
    country: "DE",
    battery: 41,
    canPay: false,
    language: "de",
    status: "open",
    minutesAgo: 33,
  },
  {
    name: "Fatima H.",
    type: "medical",
    description: "Father collapsed on the sidewalk. He is breathing but not answering.",
    lat: 33.5731,
    lng: -7.5898,
    label: "Casablanca, Morocco",
    country: "MA",
    battery: 55,
    canPay: false,
    language: "ar",
    status: "open",
    minutesAgo: 2,
  },
  {
    name: "James W.",
    type: "vehicle",
    description: "Flat tire, no spare, dark rural road. I can pay for a mobile mechanic.",
    lat: 51.5074,
    lng: -0.1278,
    label: "London, United Kingdom",
    country: "GB",
    battery: 80,
    canPay: true,
    language: "en",
    status: "resolved",
    minutesAgo: 180,
  },
];

const CHAT_SEEDS = [
  { name: "Nora", lang: "en", body: "I can stay on the line with Elena and call 112 in Rome. Who has Italian?" },
  { name: "Yusuf", lang: "en", body: "For Amina in Lagos: local roadside help often answers faster than a tow. I can draft what to say in Pidgin." },
  { name: "Mei", lang: "en", body: "Tokyo last-train situation is common. Nearest capsule hotels around Shinjuku if Hiroshi can share a station name." },
  { name: "Camila", lang: "es", body: "Puedo llamar al SAME en Buenos Aires si alguien confirma la rotonda exacta." },
  { name: "Owen", lang: "en", body: "If you are helping remotely: give the local dispatcher coordinates first, then the injury, then the language of the person in need." },
];

export async function ensureSeeded(): Promise<void> {
  if (!isBeaconDemo()) return;
  const sql = await getSql();
  await sql`update incidents set demo = true where requester_id is null and demo = false`;
  const countRows = await sql<{ n: number }>`select count(*)::int as n from incidents`;
  const n = Number(countRows[0]?.n ?? 0);
  if (n > 0) return;

  for (const seed of SEEDS) {
    const id = uid();
    const created = new Date(Date.now() - seed.minutesAgo * 60_000).toISOString();
    const resolved =
      seed.status === "resolved" ? new Date(Date.now() - 20 * 60_000).toISOString() : null;
    await sql`
      insert into incidents (
        id, requester_name, help_type, description, lat, lng, location_label,
        country_code, battery_pct, charging, can_pay, language, status, demo,
        created_at, updated_at, resolved_at
      ) values (
        ${id}, ${seed.name}, ${seed.type}, ${seed.description}, ${seed.lat}, ${seed.lng},
        ${seed.label}, ${seed.country}, ${seed.battery}, ${false}, ${seed.canPay},
        ${seed.language}, ${seed.status}, ${true}, ${created}, ${created}, ${resolved}
      )
    `;
    await sql`
      insert into incident_updates (id, incident_id, author_name, kind, body, created_at)
      values (
        ${uid()}, ${id}, ${"Beacon"}, ${"status"},
        ${`DEMO signal opened from ${seed.label}.`}, ${created}
      )
    `;
    if (seed.status !== "open") {
      await sql`
        insert into helpers (id, incident_id, name, role)
        values (${uid()}, ${id}, ${"Remote coordinator"}, ${"remote"})
      `;
    }
  }

  const chatCount = await sql<{ n: number }>`select count(*)::int as n from chat_messages`;
  if (Number(chatCount[0]?.n ?? 0) === 0) {
    let offset = 40;
    for (const msg of CHAT_SEEDS) {
      const created = new Date(Date.now() - offset * 60_000).toISOString();
      offset -= 7;
      await sql`
        insert into chat_messages (id, channel, author_name, lang, body, created_at)
        values (${uid()}, ${"world"}, ${msg.name}, ${msg.lang}, ${msg.body}, ${created})
      `;
    }
  }
}

const LIVE_POOL: SeedIncident[] = [
  {
    name: "Claire B.",
    type: "fuel",
    description: "Empty tank just after an exit ramp. I have a can but cannot walk to a station safely.",
    lat: 45.5152,
    lng: -122.6784,
    label: "Portland, Oregon, US",
    country: "US",
    battery: 27,
    canPay: true,
    language: "en",
    status: "open",
    minutesAgo: 0,
  },
  {
    name: "Omar N.",
    type: "lost",
    description: "Tourist, phone map failed. I am near a river and a large stone bridge.",
    lat: 48.8566,
    lng: 2.3522,
    label: "Paris, France",
    country: "FR",
    battery: 6,
    canPay: true,
    language: "fr",
    status: "open",
    minutesAgo: 0,
  },
  {
    name: "Hana L.",
    type: "medical",
    description: "Grandmother slipped in the bathroom. She is conscious but in pain.",
    lat: 37.5665,
    lng: 126.978,
    label: "Seoul, South Korea",
    country: "KR",
    battery: 44,
    canPay: false,
    language: "ko",
    status: "open",
    minutesAgo: 0,
  },
  {
    name: "Ibrahim S.",
    type: "stranded",
    description: "Bus left without my bag and papers. I am at a rural stop after dark.",
    lat: 30.0444,
    lng: 31.2357,
    label: "Cairo, Egypt",
    country: "EG",
    battery: 15,
    canPay: false,
    language: "ar",
    status: "open",
    minutesAgo: 0,
  },
];

export async function maybeEmitLiveIncident(): Promise<boolean> {
  if (!isBeaconDemo()) return false;
  const sql = await getSql();
  const recent = await sql<{ n: number }>`
    select count(*)::int as n from incidents
    where created_at > now() - interval '90 seconds'
  `;
  if (Number(recent[0]?.n ?? 0) > 0) return false;
  if (Math.random() > 0.35) return false;

  const existing = await sql<{ requester_name: string }>`select requester_name from incidents`;
  const used = new Set(existing.map((r) => r.requester_name));
  const pick = LIVE_POOL.find((s) => !used.has(s.name));
  if (!pick) return false;

  const id = uid();
  const created = new Date().toISOString();
  const jitterLat = pick.lat + (Math.random() - 0.5) * 0.04;
  const jitterLng = pick.lng + (Math.random() - 0.5) * 0.04;
  await sql`
    insert into incidents (
      id, requester_name, help_type, description, lat, lng, location_label,
      country_code, battery_pct, charging, can_pay, language, status, demo,
      created_at, updated_at
    ) values (
      ${id}, ${pick.name}, ${pick.type}, ${pick.description}, ${jitterLat}, ${jitterLng},
      ${pick.label}, ${pick.country}, ${pick.battery}, ${false}, ${pick.canPay},
      ${pick.language}, ${"open"}, ${true}, ${created}, ${created}
    )
  `;
  await sql`
    insert into incident_updates (id, incident_id, author_name, kind, body)
    values (${uid()}, ${id}, ${"Beacon"}, ${"status"}, ${`DEMO live signal from ${pick.label}.`})
  `;
  return true;
}
