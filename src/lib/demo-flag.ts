/**
 * Explicit demo flag. Not inferred from DATABASE_URL.
 *
 *   BEACON_DEMO=true|1   → synthetic incidents on, must be labeled DEMO
 *   BEACON_DEMO=false|0  → no seed, no live emitter; hide demo rows
 *   unset                → on unless NODE_ENV is production
 */
export function isBeaconDemo(): boolean {
  const raw =
    typeof process !== "undefined" ? process.env.BEACON_DEMO?.trim().toLowerCase() : undefined;
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return typeof process !== "undefined" ? process.env.NODE_ENV !== "production" : true;
}
