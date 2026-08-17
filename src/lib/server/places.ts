import { createServerFn } from "@tanstack/react-start";
import { haversineKm } from "@/lib/geo";
import type { Place, PlaceKind } from "@/lib/types";

type OverpassElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: { name?: string; amenity?: string; shop?: string };
};

function kindFromTags(tags?: OverpassElement["tags"]): PlaceKind | null {
  const a = tags?.amenity;
  const shop = tags?.shop;
  if (a === "toilets") return "restroom";
  if (a === "shower" || a === "public_bath") return "shower";
  if (a === "drinking_water" || a === "water_point") return "water";
  if (a === "pharmacy" || shop === "chemist") return "pharmacy";
  if (a === "shelter" || a === "social_facility") return "shelter";
  if (
    a === "restaurant" ||
    a === "fast_food" ||
    a === "cafe" ||
    a === "food_court" ||
    a === "community_kitchen" ||
    a === "marketplace"
  ) {
    return "food";
  }
  return null;
}

function fallbackName(kind: PlaceKind): string {
  switch (kind) {
    case "restroom":
      return "Public restroom";
    case "shower":
      return "Public shower";
    case "water":
      return "Drinking water";
    case "pharmacy":
      return "Pharmacy";
    case "shelter":
      return "Shelter";
    default:
      return "Food";
  }
}

function fallbackPlaces(lat: number, lng: number): Place[] {
  const offsets: Array<{ kind: PlaceKind; name: string; dLat: number; dLng: number }> = [
    { kind: "restroom", name: "Public restroom (estimated)", dLat: 0.0042, dLng: 0.0018 },
    { kind: "restroom", name: "Transit station toilets (estimated)", dLat: -0.0031, dLng: 0.0055 },
    { kind: "shower", name: "Community showers (estimated)", dLat: 0.0068, dLng: -0.0024 },
    { kind: "water", name: "Drinking fountain (estimated)", dLat: 0.0026, dLng: -0.0038 },
    { kind: "pharmacy", name: "Pharmacy (estimated)", dLat: -0.0051, dLng: 0.0029 },
    { kind: "shelter", name: "Night shelter (estimated)", dLat: 0.0082, dLng: 0.0044 },
    { kind: "food", name: "Open kitchen / cafe (estimated)", dLat: -0.0022, dLng: -0.0046 },
    { kind: "food", name: "Grocery / prepared food (estimated)", dLat: 0.0014, dLng: 0.0071 },
    { kind: "food", name: "24-hour diner (estimated)", dLat: -0.0074, dLng: 0.0011 },
  ];
  return offsets.map((o, i) => {
    const plat = lat + o.dLat;
    const plng = lng + o.dLng;
    return {
      id: `est-${o.kind}-${i}`,
      name: o.name,
      kind: o.kind,
      lat: plat,
      lng: plng,
      distanceKm: haversineKm(lat, lng, plat, plng),
      source: "estimated" as const,
    };
  });
}

export const findPlaces = createServerFn({ method: "GET" })
  .validator((input: { lat: number; lng: number; radiusM?: number }) => input)
  .handler(async ({ data }): Promise<Place[]> => {
    const { lat, lng } = data;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const radius = Math.min(Math.max(data.radiusM ?? 2200, 400), 5000);

    const query = `
      [out:json][timeout:18];
      (
        node["amenity"="toilets"](around:${radius},${lat},${lng});
        way["amenity"="toilets"](around:${radius},${lat},${lng});
        node["amenity"="shower"](around:${radius},${lat},${lng});
        node["amenity"="public_bath"](around:${radius},${lat},${lng});
        node["amenity"="drinking_water"](around:${radius},${lat},${lng});
        node["amenity"="pharmacy"](around:${radius},${lat},${lng});
        node["amenity"="shelter"](around:${radius},${lat},${lng});
        node["amenity"="social_facility"](around:${radius},${lat},${lng});
        node["amenity"="restaurant"](around:${radius},${lat},${lng});
        node["amenity"="fast_food"](around:${radius},${lat},${lng});
        node["amenity"="cafe"](around:${radius},${lat},${lng});
        node["amenity"="food_court"](around:${radius},${lat},${lng});
      );
      out center 80;
    `;

    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          Accept: "application/json",
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) throw new Error("overpass");
      const json = (await res.json()) as { elements?: OverpassElement[] };
      const places: Place[] = [];
      for (const el of json.elements ?? []) {
        const plat = el.lat ?? el.center?.lat;
        const plng = el.lon ?? el.center?.lon;
        const kind = kindFromTags(el.tags);
        if (plat == null || plng == null || !kind) continue;
        const name = el.tags?.name?.trim() || fallbackName(kind);
        places.push({
          id: `osm-${el.id}`,
          name,
          kind,
          lat: plat,
          lng: plng,
          distanceKm: haversineKm(lat, lng, plat, plng),
          source: "osm",
        });
      }
      places.sort((a, b) => a.distanceKm - b.distanceKm);
      const seen = new Set<string>();
      const deduped: Place[] = [];
      for (const p of places) {
        const key = `${p.kind}:${p.name}:${p.lat.toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(p);
      }
      if (deduped.length >= 3) return deduped.slice(0, 48);
      return [...deduped, ...fallbackPlaces(lat, lng)].slice(0, 48);
    } catch {
      return fallbackPlaces(lat, lng);
    }
  });
