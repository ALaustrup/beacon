export type HelpTelemetryEvent =
  | "help_control_opened"
  | "unspecified_request_sent"
  | "category_selected"
  | "subtype_selected"
  | "question_answered"
  | "incident_created"
  | "emergency_cta_surfaced"
  | "emergency_cta_used"
  | "helper_matched"
  | "request_resolved";

type HelpTelemetryRow = {
  t: number;
  e: HelpTelemetryEvent;
  k?: string;
};

const KEY = "beacon-help-events";
const MAX = 80;

function canStore(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function trackHelpEvent(event: HelpTelemetryEvent, key?: string): void {
  if (!canStore()) return;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const rows: HelpTelemetryRow[] = raw ? (JSON.parse(raw) as HelpTelemetryRow[]) : [];
    rows.push({ t: Date.now(), e: event, k: key });
    window.sessionStorage.setItem(KEY, JSON.stringify(rows.slice(-MAX)));
  } catch {
    /* private mode / quota */
  }
}

export function readHelpEvents(): HelpTelemetryRow[] {
  if (!canStore()) return [];
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HelpTelemetryRow[]) : [];
  } catch {
    return [];
  }
}
