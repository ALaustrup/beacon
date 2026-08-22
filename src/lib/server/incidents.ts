import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { isBeaconDemo } from "@/lib/demo-flag";
import { authMiddleware } from "@/lib/auth/middleware";
import { reverseGeocode, haversineKm } from "@/lib/geo";
import { HELP_TYPE_IDS, OFFER_ETA_MINUTES, SOS_TYPE_CORRECTIONS } from "@/lib/help-types";
import { uid } from "@/lib/utils";
import { mapHelper, mapIncident, mapUpdate } from "./map-rows";
import { ensureSeeded, maybeEmitLiveIncident } from "./seed";
import type { Incident, IncidentDetail } from "@/lib/types";

const MERGE_METERS = 200;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_CREATES_IN_WINDOW = 3;

async function recentForRequester(requesterId: string) {
  const sql = await getSql();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  return sql`
    select * from incidents
    where requester_id = ${requesterId}
      and created_at > ${since}
    order by created_at desc
  `;
}

async function requireCreator(incidentId: string, authorId: string | null | undefined) {
  if (!authorId) {
    throw new Error("Only the person who sent this signal can change it.");
  }
  const sql = await getSql();
  const rows = await sql<{ requester_id: string | null }>`
    select requester_id from incidents where id = ${incidentId} limit 1
  `;
  const rid = rows[0]?.requester_id;
  if (!rid || String(rid) !== authorId) {
    throw new Error("Only the person who sent this signal can change it.");
  }
}

export const listIncidents = createServerFn({ method: "GET" })
  .validator((input: { includeResolved?: boolean } | undefined) => input ?? {})
  .handler(async ({ data }) => {
    await ensureSeeded();
    await maybeEmitLiveIncident();
    const sql = await getSql();
    const demo = isBeaconDemo();
    const rows = data.includeResolved
      ? demo
        ? await sql`select * from incidents order by created_at desc limit 200`
        : await sql`select * from incidents where demo = false order by created_at desc limit 200`
      : demo
        ? await sql`
            select * from incidents
            where status <> 'resolved'
            order by created_at desc
            limit 200
          `
        : await sql`
            select * from incidents
            where status <> 'resolved' and demo = false
            order by created_at desc
            limit 200
          `;
    return rows.map(mapIncident);
  });

export const getIncident = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<IncidentDetail | null> => {
    const sql = await getSql();
    const rows = await sql`select * from incidents where id = ${id} limit 1`;
    const incident = rows[0] ? mapIncident(rows[0]) : null;
    if (!incident) return null;
    if (incident.demo && !isBeaconDemo()) return null;
    const updates = await sql`
      select * from incident_updates where incident_id = ${id} order by created_at asc
    `;
    const helpers = await sql`
      select * from helpers where incident_id = ${id} order by created_at asc
    `;
    return {
      ...incident,
      updates: updates.map(mapUpdate),
      helpers: helpers.map(mapHelper),
    };
  });

export type CreateIncidentInput = {
  requesterId?: string | null;
  requesterName: string;
  helpType: string;
  description: string;
  lat: number;
  lng: number;
  accuracyM?: number | null;
  batteryPct?: number | null;
  charging?: boolean | null;
  canPay: boolean;
  language: string;
};

export const createIncident = createServerFn({ method: "POST" })
  .validator((input: CreateIncidentInput) => input)
  .handler(async ({ data }): Promise<Incident> => {
    if (!Number.isFinite(data.lat) || !Number.isFinite(data.lng)) {
      throw new Error("A live location is required to request help.");
    }
    if (data.lat < -90 || data.lat > 90 || data.lng < -180 || data.lng > 180) {
      throw new Error("That location is not valid.");
    }
    const helpType = HELP_TYPE_IDS.includes(data.helpType as (typeof HELP_TYPE_IDS)[number])
      ? data.helpType
      : "other";
    const name = data.requesterName.trim() || "Someone nearby";
    const description =
      data.description.trim() || "Help needed. Location attached from the device.";
    const requesterId = data.requesterId ?? null;

    if (requesterId) {
      const recent = (await recentForRequester(requesterId)).map(mapIncident);
      const nearbyOpen = recent.find(
        (row) =>
          row.status !== "resolved" &&
          haversineKm(row.lat, row.lng, data.lat, data.lng) * 1000 <= MERGE_METERS,
      );
      if (nearbyOpen) return nearbyOpen;
      if (recent.length >= MAX_CREATES_IN_WINDOW) {
        throw new Error("Too many signals. Open your existing ticket or wait a few minutes.");
      }
    }

    const geo = await reverseGeocode(data.lat, data.lng);
    const id = uid();
    const sql = await getSql();
    await sql`
      insert into incidents (
        id, requester_id, requester_name, help_type, description, lat, lng,
        location_label, country_code, accuracy_m, battery_pct, charging,
        can_pay, language, status, demo
      ) values (
        ${id}, ${requesterId}, ${name}, ${helpType}, ${description},
        ${data.lat}, ${data.lng}, ${geo.label}, ${geo.countryCode},
        ${data.accuracyM ?? null}, ${data.batteryPct ?? null}, ${data.charging ?? null},
        ${data.canPay}, ${data.language || "en"}, ${"open"}, ${false}
      )
    `;
    await sql`
      insert into incident_updates (id, incident_id, author_id, author_name, kind, body)
      values (
        ${uid()}, ${id}, ${requesterId}, ${name}, ${"status"},
        ${"Help requested. Coordinates attached to this signal."}
      )
    `;
    const rows = await sql`select * from incidents where id = ${id} limit 1`;
    return mapIncident(rows[0]!);
  });

export const addIncidentNote = createServerFn({ method: "POST" })
  .validator((input: {
    incidentId: string;
    authorId?: string | null;
    authorName: string;
    kind?: string;
    body: string;
  }) => input)
  .handler(async ({ data }) => {
    const body = data.body.trim();
    if (!body) throw new Error("Write a short note.");
    const sql = await getSql();
    await sql`
      insert into incident_updates (id, incident_id, author_id, author_name, kind, body)
      values (
        ${uid()}, ${data.incidentId}, ${data.authorId ?? null},
        ${data.authorName.trim() || "Helper"}, ${data.kind ?? "note"}, ${body}
      )
    `;
    await sql`
      update incidents set updated_at = now() where id = ${data.incidentId}
    `;
    return { ok: true as const };
  });

export const offerHelp = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    incidentId: string;
    name: string;
    role: "local" | "remote";
    etaMinutes: number;
  }) => input)
  .handler(async ({ context, data }) => {
    const eta = data.etaMinutes;
    if (!OFFER_ETA_MINUTES.includes(eta as (typeof OFFER_ETA_MINUTES)[number])) {
      throw new Error("Choose 5, 10, or 20 minutes.");
    }
    const sql = await getSql();
    const existing = await sql<{ id: string }>`
      select id from helpers
      where incident_id = ${data.incidentId} and user_id = ${context.userId}
      limit 1
    `;
    if (existing.length === 0) {
      await sql`
        insert into helpers (id, incident_id, user_id, name, role, eta_minutes)
        values (${uid()}, ${data.incidentId}, ${context.userId}, ${data.name}, ${data.role}, ${eta})
      `;
    } else {
      await sql`
        update helpers
        set eta_minutes = ${eta}
        where id = ${existing[0]!.id}
      `;
    }
    const body =
      data.role === "local"
        ? `A nearby helper is on the way. ETA ${eta} minutes.`
        : `A remote helper is coordinating local resources. ETA ${eta} minutes.`;
    await sql`
      update incidents
      set status = case when status = 'resolved' then status else 'assisting' end,
          updated_at = now()
      where id = ${data.incidentId}
    `;
    await sql`
      insert into incident_updates (id, incident_id, author_id, author_name, kind, body)
      values (
        ${uid()}, ${data.incidentId}, ${context.userId}, ${data.name}, ${"offer"},
        ${body}
      )
    `;
    return { ok: true as const };
  });

export const resolveIncident = createServerFn({ method: "POST" })
  .validator((input: { incidentId: string; authorName: string; authorId?: string | null }) => input)
  .handler(async ({ data }) => {
    await requireCreator(data.incidentId, data.authorId);
    const sql = await getSql();
    await sql`
      update incidents
      set status = 'resolved', resolved_at = now(), updated_at = now()
      where id = ${data.incidentId}
    `;
    await sql`
      insert into incident_updates (id, incident_id, author_id, author_name, kind, body)
      values (
        ${uid()}, ${data.incidentId}, ${data.authorId ?? null},
        ${data.authorName || "Someone"}, ${"status"}, ${"Marked resolved. The signal is closed."}
      )
    `;
    return { ok: true as const };
  });

const CORRECTION_IDS = SOS_TYPE_CORRECTIONS.map((c) => c.id);

export const updateIncidentType = createServerFn({ method: "POST" })
  .validator((input: { incidentId: string; helpType: string; authorId?: string | null; authorName: string }) => input)
  .handler(async ({ data }) => {
    await requireCreator(data.incidentId, data.authorId);
    if (!CORRECTION_IDS.includes(data.helpType as (typeof CORRECTION_IDS)[number])) {
      throw new Error("Choose medical, stuck, or unsafe.");
    }
    const sql = await getSql();
    await sql`
      update incidents
      set help_type = ${data.helpType}, updated_at = now()
      where id = ${data.incidentId} and status <> 'resolved'
    `;
    await sql`
      insert into incident_updates (id, incident_id, author_id, author_name, kind, body)
      values (
        ${uid()}, ${data.incidentId}, ${data.authorId ?? null},
        ${data.authorName || "Someone"}, ${"status"},
        ${`Type updated to ${data.helpType}.`}
      )
    `;
    return { ok: true as const };
  });

export const pollIncidentsSince = createServerFn({ method: "GET" })
  .validator((iso: string) => iso)
  .handler(async ({ data: iso }) => {
    await ensureSeeded();
    await maybeEmitLiveIncident();
    const sql = await getSql();
    const demo = isBeaconDemo();
    const rows = demo
      ? await sql`
          select * from incidents
          where created_at > ${iso}
          order by created_at asc
          limit 50
        `
      : await sql`
          select * from incidents
          where created_at > ${iso} and demo = false
          order by created_at asc
          limit 50
        `;
    return rows.map(mapIncident);
  });
