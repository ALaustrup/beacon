import { createServerFn } from "@tanstack/react-start";
import type { CityFix } from "@/lib/types";

export const lookupCity = createServerFn({ method: "GET" })
  .validator((q: string) => q)
  .handler(async ({ data }): Promise<CityFix | null> => {
    const query = data.trim();
    if (query.length < 2) return null;
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "1");
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "BeaconHelp/1.0 (humanitarian aid map)",
        },
      });
      if (!res.ok) return null;
      const rows = (await res.json()) as Array<{
        lat?: string;
        lon?: string;
        display_name?: string;
        address?: { country_code?: string; city?: string; town?: string; village?: string; country?: string };
      }>;
      const row = rows[0];
      if (!row?.lat || !row?.lon) return null;
      const addr = row.address ?? {};
      const locality = addr.city ?? addr.town ?? addr.village;
      const label =
        locality && addr.country
          ? `${locality}, ${addr.country}`
          : (row.display_name ?? `${row.lat}, ${row.lon}`);
      return {
        lat: Number(row.lat),
        lng: Number(row.lon),
        label,
        countryCode: addr.country_code ? addr.country_code.toUpperCase() : null,
      };
    } catch {
      return null;
    }
  });
