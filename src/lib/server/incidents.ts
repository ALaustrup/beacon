import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { reverseGeocode } from "@/lib/geo";
import { HELP_TYPE_IDS } from "@/lib/help-types";
import { uid } from "@/lib/utils";
import { mapHelper, mapIncident, mapUpdate } from "./map-rows";
import { ensureSeeded, maybeEmitLiveIncident } from "./seed";
import type { Incident, IncidentDetail } from "@/lib/types";

export const listIncidents = createServerFn({ method: "GET" })
  .validator((input: { includeResolved?: boolean } | undefined) => input ?? {})
  .handler(async ({ data }) => {
    await ensureSeeded();
    await maybeEmitLiveIncident();
    const sql = await getSql();
    const rows = data.includeResolved
      ? await sql`select * from incidents order by created_at desc limit 200`
      : await sql`
          select * from incidents
          where status <> 'resolved'
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
    const helpType = HELP_TYPE_IDS.includes(data.helpType as (typeof HELP_TYPE_IDS)[number])
      ? data.helpType
      : "other";
    const name = data.requesterName.trim() || "Someone nearby";
    const description =
      data.description.trim() || "Help needed. Location attached from the device.";
    const geo = await reverseGeocode(data.lat, data.lng);
    const id = uid();
    const sql = await getSql();
    await sql`
      insert into incidents (
        id, requester_id, requester_name, help_type, description, lat, lng,
        location_label, country_code, accuracy_m, battery_pct, charging,
        can_pay, language, status
      ) values (
        ${id}, ${data.requesterId ?? null}, ${name}, ${helpType}, ${description},
        ${data.lat}, ${data.lng}, ${geo.label}, ${geo.countryCode},
        ${data.accuracyM ?? null}, ${data.batteryPct ?? null}, ${data.charging ?? null},
        ${data.canPay}, ${data.language || "en"}, ${"open"}
      )
    `;
    await sql`
      insert into incident_updates (id, incident_id, author_id, author_name, kind, body)
      values (
        ${uid()}, ${id}, ${data.requesterId ?? null}, ${name}, ${"status"},
        ${"Help requested. Coordinates broadcast to the network."}
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
  .validator((input: { incidentId: string; name: string; role: "local" | "remote" }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const existing = await sql`
      select id from helpers
      where incident_id = ${data.incidentId} and user_id = ${context.userId}
      limit 1
    `;
    if (existing.length === 0) {
      await sql`
        insert into helpers (id, incident_id, user_id, name, role)
        values (${uid()}, ${data.incidentId}, ${context.userId}, ${data.name}, ${data.role})
      `;
    }
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
        ${data.role === "local" ? "A nearby helper is on the way." : "A remote helper is coordinating local resources."}
      )
    `;
    return { ok: true as const };
  });

export const resolveIncident = createServerFn({ method: "POST" })
  .validator((input: { incidentId: string; authorName: string; authorId?: string | null }) => input)
  .handler(async ({ data }) => {
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

export const pollIncidentsSince = createServerFn({ method: "GET" })
  .validator((iso: string) => iso)
  .handler(async ({ data: iso }) => {
    await ensureSeeded();
    await maybeEmitLiveIncident();
    const sql = await getSql();
    const rows = await sql`
      select * from incidents
      where created_at > ${iso}
      order by created_at asc
      limit 50
    `;
    return rows.map(mapIncident);
  });
