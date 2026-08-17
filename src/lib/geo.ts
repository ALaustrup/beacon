export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h =
    s1 * s1 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function formatDistance(km: number): string {
  if (!Number.isFinite(km)) return "—";
  if (km < 0.1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  if (km < 1000) return `${Math.round(km)} km`;
  return `${(km / 1000).toFixed(1)}k km`;
}

export function bearingLabel(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): string {
  const y = Math.sin(toRad(toLng - fromLng)) * Math.cos(toRad(toLat));
  const x =
    Math.cos(toRad(fromLat)) * Math.sin(toRad(toLat)) -
    Math.sin(toRad(fromLat)) *
      Math.cos(toRad(toLat)) *
      Math.cos(toRad(toLng - fromLng));
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8] ?? "N";
}

/** Reverse-geocode via OpenStreetMap Nominatim. Server-only. */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ label: string; countryCode: string | null }> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("zoom", "14");
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "BeaconHelp/1.0 (humanitarian aid map)",
      },
    });
    if (!res.ok) throw new Error("geocode failed");
    const data = (await res.json()) as {
      display_name?: string;
      address?: { country_code?: string; city?: string; town?: string; village?: string; state?: string; country?: string };
    };
    const addr = data.address ?? {};
    const locality = addr.city ?? addr.town ?? addr.village ?? addr.state;
    const label = locality && addr.country
      ? `${locality}, ${addr.country}`
      : (data.display_name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    return {
      label,
      countryCode: addr.country_code ? addr.country_code.toUpperCase() : null,
    };
  } catch {
    return {
      label: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
      countryCode: null,
    };
  }
}
