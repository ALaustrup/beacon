import { Battery, Crosshair, Languages, Radio } from "lucide-react";
import { toast } from "sonner";
import type { DeviceTelemetry } from "@/lib/types";
import { formatCoord } from "@/lib/utils";

export function DeviceStrip({
  device,
}: {
  device: DeviceTelemetry & { locating: boolean; error: string | null };
}) {
  const coords =
    device.lat != null && device.lng != null
      ? `${formatCoord(device.lat)}, ${formatCoord(device.lng)}`
      : null;

  function copy() {
    if (!coords) return;
    void navigator.clipboard.writeText(coords).then(() => {
      toast.success("Coordinates copied.");
    });
  }

  return (
    <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
      <button type="button" className="text-left" onClick={copy} disabled={!coords}>
        <Stat
          icon={<Crosshair className="size-3.5" />}
          label="Coordinates"
          value={coords ?? (device.locating ? "Acquiring" : "Unavailable")}
        />
      </button>
      <Stat
        icon={<Radio className="size-3.5" />}
        label="Accuracy"
        value={device.accuracyM != null ? `${Math.round(device.accuracyM)} m` : "—"}
      />
      <Stat
        icon={<Battery className="size-3.5" />}
        label="Battery"
        value={
          device.batteryPct != null
            ? `${device.batteryPct}%${device.charging ? " charging" : ""}`
            : "Not reported"
        }
      />
      <Stat
        icon={<Languages className="size-3.5" />}
        label="Device language"
        value={device.language.toUpperCase()}
      />
    </dl>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <dt className="flex items-center gap-1.5 text-subtle">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 tabular text-sm text-fg">{value}</dd>
    </div>
  );
}
