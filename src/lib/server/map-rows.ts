import { asBool, asIso, asNumber } from "@/lib/utils";
import type {
  ChatMessage,
  Helper,
  Incident,
  IncidentUpdate,
  TransferRow,
} from "@/lib/types";

type Row = Record<string, unknown>;

export function mapIncident(row: Row): Incident {
  return {
    id: String(row.id),
    requesterId: row.requester_id == null ? null : String(row.requester_id),
    requesterName: String(row.requester_name ?? "Someone"),
    helpType: String(row.help_type ?? "other"),
    description: String(row.description ?? ""),
    lat: asNumber(row.lat),
    lng: asNumber(row.lng),
    locationLabel: String(row.location_label ?? "Unknown location"),
    countryCode: row.country_code == null ? null : String(row.country_code),
    accuracyM: row.accuracy_m == null ? null : asNumber(row.accuracy_m),
    batteryPct: row.battery_pct == null ? null : asNumber(row.battery_pct),
    charging: row.charging == null ? null : asBool(row.charging),
    canPay: asBool(row.can_pay),
    language: String(row.language ?? "en"),
    status: String(row.status ?? "open"),
    aidCents: asNumber(row.aid_cents),
    demo: asBool(row.demo),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at ?? row.created_at),
    resolvedAt: row.resolved_at == null ? null : asIso(row.resolved_at),
  };
}

export function mapUpdate(row: Row): IncidentUpdate {
  return {
    id: String(row.id),
    incidentId: String(row.incident_id),
    authorId: row.author_id == null ? null : String(row.author_id),
    authorName: String(row.author_name ?? "Someone"),
    kind: String(row.kind ?? "note"),
    body: String(row.body ?? ""),
    createdAt: asIso(row.created_at),
  };
}

export function mapHelper(row: Row): Helper {
  return {
    id: String(row.id),
    incidentId: String(row.incident_id),
    userId: row.user_id == null ? null : String(row.user_id),
    name: String(row.name ?? "Helper"),
    role: String(row.role ?? "local"),
    etaMinutes: row.eta_minutes == null ? null : asNumber(row.eta_minutes),
    createdAt: asIso(row.created_at),
  };
}

export function mapChat(row: Row): ChatMessage {
  return {
    id: String(row.id),
    channel: String(row.channel ?? "world"),
    incidentId: row.incident_id == null ? null : String(row.incident_id),
    authorId: row.author_id == null ? null : String(row.author_id),
    authorName: String(row.author_name ?? "Guest"),
    lang: String(row.lang ?? "en"),
    body: String(row.body ?? ""),
    createdAt: asIso(row.created_at),
  };
}

export function mapTransfer(row: Row): TransferRow {
  return {
    id: String(row.id),
    fromUserId: String(row.from_user_id),
    fromName: String(row.from_name ?? "Someone"),
    toUserId: row.to_user_id == null ? null : String(row.to_user_id),
    toIncidentId: row.to_incident_id == null ? null : String(row.to_incident_id),
    amountCents: asNumber(row.amount_cents),
    memo: row.memo == null ? null : String(row.memo),
    createdAt: asIso(row.created_at),
  };
}
