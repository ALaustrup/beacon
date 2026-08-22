import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { geoGraticule, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import landTopo from "world-atlas/land-110m.json";
import { haversineKm } from "@/lib/geo";
import { helpTypeById } from "@/lib/help-types";
import type { Incident } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  userLat: number | null;
  userLng: number | null;
  radiusKm: number | null;
};

const WIDTH = 960;
const HEIGHT = 480;

const landFeature = feature(
  landTopo as never,
  (landTopo as { objects: { land: unknown } }).objects.land as never,
);

export function WorldMap({
  incidents,
  selectedId,
  onSelect,
  userLat,
  userLng,
  radiusKm,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: WIDTH, h: HEIGHT });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      const w = Math.max(320, cr.width);
      const h = Math.max(220, cr.height);
      setSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { projection, path, spherePath, graticulePath, landPath } = useMemo(() => {
    const projection = geoNaturalEarth1()
      .precision(0.5)
      .fitExtent(
        [
          [12, 10],
          [size.w - 12, size.h - 10],
        ],
        { type: "Sphere" },
      );
    const path = geoPath(projection);
    return {
      projection,
      path,
      spherePath: path({ type: "Sphere" }) ?? "",
      graticulePath: path(geoGraticule().step([20, 20])()) ?? "",
      landPath: path(landFeature as never) ?? "",
    };
  }, [size.w, size.h]);

  const points = incidents.map((inc) => {
    const p = projection([inc.lng, inc.lat]);
    return { inc, x: p?.[0] ?? -999, y: p?.[1] ?? -999 };
  });

  const userPt =
    userLat != null && userLng != null ? projection([userLng, userLat]) : null;

  const selected = points.find((p) => p.inc.id === selectedId);

  return (
    <div ref={wrapRef} className="relative h-full min-h-56 w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${size.w} ${size.h}`}
        className="h-full w-full"
        role="img"
        aria-label="Live world map of help requests"
      >
        <path d={spherePath} className="map-sphere" />
        <path d={graticulePath} className="map-graticule" />
        <path d={landPath} className="map-land" />

        {userPt && radiusKm && userLat != null && userLng != null ? (
          <RadiusRing
            projection={projection}
            lat={userLat}
            lng={userLng}
            km={radiusKm}
          />
        ) : null}

        {userPt ? (
          <g transform={`translate(${userPt[0]}, ${userPt[1]})`}>
            <circle r={5} className="fill-primary" />
            <circle r={9} className="fill-none stroke-primary/50" strokeWidth={1} />
          </g>
        ) : null}

        {points.map(({ inc, x, y }) => {
          if (x < -100 || y < -100) return null;
          const urgent = helpTypeById(inc.helpType).urgency === "critical";
          const resolved = inc.status === "resolved";
          const isSelected = inc.id === selectedId;
          return (
            <g
              key={inc.id}
              transform={`translate(${x}, ${y})`}
              className="cursor-pointer"
              onClick={() => onSelect(inc.id)}
            >
              {!resolved ? (
                <circle
                  r={isSelected ? 16 : 12}
                  className={cn(
                    "marker-pulse fill-none",
                    urgent ? "stroke-destructive/70" : "stroke-primary/50",
                  )}
                  strokeWidth={1}
                />
              ) : null}
              <circle
                r={isSelected ? 7 : 5}
                className={cn(
                  resolved
                    ? "fill-ok"
                    : urgent
                      ? "fill-destructive"
                      : inc.status === "assisting"
                        ? "fill-warn"
                        : "fill-primary",
                )}
              />
            </g>
          );
        })}
      </svg>

      {selected && selected.x > -100 ? (
        <Link
          to="/incident/$id"
          params={{ id: selected.inc.id }}
          className="absolute z-10 max-w-52 -translate-x-1/2 rounded-md border border-border bg-elevated px-3 py-2 text-left shadow-sm"
          style={{
            left: `${(selected.x / size.w) * 100}%`,
            top: `${(selected.y / size.h) * 100 + 3}%`,
          }}
        >
          <p className="text-xs font-medium">{helpTypeById(selected.inc.helpType).label}</p>
          {selected.inc.demo ? (
            <p className="text-[10px] tracking-wide text-subtle uppercase">Demo</p>
          ) : null}
          <p className="truncate text-xs text-muted-foreground">
            {selected.inc.requesterName} · {selected.inc.locationLabel}
          </p>
          <p className="mt-1 text-xs text-fg">Open signal</p>
        </Link>
      ) : null}
    </div>
  );
}

function RadiusRing({
  projection,
  lat,
  lng,
  km,
}: {
  projection: ReturnType<typeof geoNaturalEarth1>;
  lat: number;
  lng: number;
  km: number;
}) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 48; i++) {
    const bearing = (i / 48) * Math.PI * 2;
    const dest = destPoint(lat, lng, km, bearing);
    const p = projection([dest.lng, dest.lat]);
    if (p) pts.push(p);
  }
  if (pts.length < 3) return null;
  const d = `M${pts.map((p) => p.join(",")).join("L")}Z`;
  return <path d={d} className="fill-primary/5 stroke-primary/30" strokeWidth={1} />;
}

function destPoint(lat: number, lng: number, km: number, bearing: number) {
  const R = 6371;
  const δ = km / R;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(bearing),
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    );
  return { lat: (φ2 * 180) / Math.PI, lng: (λ2 * 180) / Math.PI };
}

export function inRadius(
  inc: Incident,
  userLat: number | null,
  userLng: number | null,
  radiusKm: number | null,
): boolean {
  if (radiusKm == null || userLat == null || userLng == null) return true;
  return haversineKm(userLat, userLng, inc.lat, inc.lng) <= radiusKm;
}
