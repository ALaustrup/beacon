import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bath, Droplets, Home, Pill, ShowerHead, UtensilsCrossed } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DeviceStrip } from "@/components/device-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistance } from "@/lib/geo";
import { findPlaces } from "@/lib/server/places";
import { useDevice } from "@/lib/use-device";
import type { Place, PlaceKind } from "@/lib/types";
import { cn, formatCoord } from "@/lib/utils";

export const Route = createFileRoute("/places")({ component: PlacesPage });

const KINDS: Array<{ id: PlaceKind | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "restroom", label: "Restrooms" },
  { id: "shower", label: "Showers" },
  { id: "water", label: "Water" },
  { id: "food", label: "Food" },
  { id: "pharmacy", label: "Pharmacy" },
  { id: "shelter", label: "Shelter" },
];

function PlacesPage() {
  const device = useDevice();
  const [places, setPlaces] = useState<Place[]>([]);
  const [filter, setFilter] = useState<(typeof KINDS)[number]["id"]>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (device.lat == null || device.lng == null) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await findPlaces({
        data: { lat: device.lat, lng: device.lng, radiusM: 2500 },
      });
      setPlaces(rows);
    } catch {
      setError("Could not load nearby places.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (device.lat != null && device.lng != null) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device.lat, device.lng]);

  const visible = useMemo(
    () => (filter === "all" ? places : places.filter((p) => p.kind === filter)),
    [places, filter],
  );

  return (
    <AppShell>
      <header className="mb-4 space-y-2">
        <h1 className="font-display text-3xl tracking-tight">Nearby needs</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Restrooms, showers, drinking water, food, pharmacies, and shelters within
          walking distance. Names come from OpenStreetMap when the map knows this street.
        </p>
      </header>

      <DeviceStrip device={device} />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setFilter(k.id)}
            className={cn(
              "h-8 rounded-full border px-3 text-xs",
              filter === k.id
                ? "border-primary/50 bg-elevated text-fg"
                : "border-border text-muted-foreground",
            )}
          >
            {k.label}
          </button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {device.lat == null ? (
        <p className="mt-6 text-sm text-warn">
          {device.locating ? "Finding you…" : "Allow location to list places around you."}
        </p>
      ) : loading && places.length === 0 ? (
        <div className="mt-4 space-y-2">
          <div className="h-16 animate-pulse rounded-lg bg-surface" />
          <div className="h-16 animate-pulse rounded-lg bg-surface" />
        </div>
      ) : error ? (
        <p className="mt-6 text-sm text-destructive">{error}</p>
      ) : visible.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Nothing in this category nearby.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {visible.map((p) => (
            <li
              key={p.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface p-3.5"
            >
              <div className="flex gap-3">
                <KindIcon kind={p.kind} />
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistance(p.distanceKm)} · {formatCoord(p.lat, 4)}, {formatCoord(p.lng, 4)}
                  </p>
                  {p.source === "estimated" ? (
                    <Badge variant="outline" className="mt-1">
                      Estimated
                    </Badge>
                  ) : null}
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <a
                  href={`https://www.google.com/maps?q=${p.lat},${p.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Directions
                </a>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function KindIcon({ kind }: { kind: PlaceKind }) {
  const Icon =
    kind === "restroom"
      ? Bath
      : kind === "shower"
        ? ShowerHead
        : kind === "water"
          ? Droplets
          : kind === "pharmacy"
            ? Pill
            : kind === "shelter"
              ? Home
              : UtensilsCrossed;
  return (
    <span className="grid size-9 place-items-center rounded-md bg-elevated text-muted-foreground">
      <Icon className="size-4" />
    </span>
  );
}
