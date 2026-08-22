import { Link } from "@tanstack/react-router";
import { Battery, MapPin, Wallet } from "lucide-react";
import { formatDistance, haversineKm } from "@/lib/geo";
import { helpTypeById } from "@/lib/help-types";
import type { Incident } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn, formatCoord, timeAgo } from "@/lib/utils";

export function statusVariant(status: string) {
  if (status === "resolved") return "ok" as const;
  if (status === "assisting") return "warn" as const;
  return "critical" as const;
}

export function IncidentCard({
  incident,
  userLat,
  userLng,
  selected,
  compact,
}: {
  incident: Incident;
  userLat?: number | null;
  userLng?: number | null;
  selected?: boolean;
  compact?: boolean;
}) {
  const meta = helpTypeById(incident.helpType);
  const km =
    userLat != null && userLng != null
      ? haversineKm(userLat, userLng, incident.lat, incident.lng)
      : null;

  return (
    <Link
      to="/incident/$id"
      params={{ id: incident.id }}
      className={cn(
        "block rounded-lg border bg-surface p-3.5 transition-colors",
        selected ? "border-primary/50" : "border-border hover:border-primary/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{meta.label}</p>
            <Badge variant={statusVariant(incident.status)}>{incident.status}</Badge>
            {incident.demo ? <Badge variant="outline">DEMO</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {incident.requesterName}
            <span className="text-subtle"> · {timeAgo(incident.createdAt)}</span>
          </p>
        </div>
        {km != null ? (
          <p className="tabular text-xs text-muted-foreground">{formatDistance(km)}</p>
        ) : null}
      </div>
      {!compact ? (
        <p className="mt-2 line-clamp-2 text-sm leading-snug">{incident.description}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3" />
          {incident.locationLabel}
        </span>
        <span className="tabular">
          {formatCoord(incident.lat, 4)}, {formatCoord(incident.lng, 4)}
        </span>
        {incident.batteryPct != null ? (
          <span className="inline-flex items-center gap-1">
            <Battery className="size-3" />
            {incident.batteryPct}%
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <Wallet className="size-3" />
          {incident.canPay ? "Can pay" : "Cannot pay"}
        </span>
      </div>
    </Link>
  );
}
