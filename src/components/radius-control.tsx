import { RADIUS_PRESETS } from "@/lib/help-types";
import { useClientState } from "@/lib/client-state";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function RadiusControl() {
  const radiusKm = useClientState((s) => s.radiusKm);
  const setRadiusKm = useClientState((s) => s.setRadiusKm);
  const notifyOn = useClientState((s) => s.notifyOn);
  const setNotifyOn = useClientState((s) => s.setNotifyOn);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="flex flex-wrap gap-1">
        {RADIUS_PRESETS.map((p) => {
          const active = radiusKm === p.km;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setRadiusKm(p.km)}
              className={cn(
                "h-8 rounded-full border px-3 text-xs",
                active
                  ? "border-primary/50 bg-elevated text-fg"
                  : "border-border text-muted-foreground hover:text-fg",
              )}
            >
              {p.label}
              {p.km ? ` · ${p.km} km` : ""}
            </button>
          );
        })}
      </div>
      <label className="flex h-8 items-center gap-2 rounded-full border border-border px-2.5 text-xs text-muted-foreground">
        <Switch checked={notifyOn} onCheckedChange={setNotifyOn} className="scale-90" />
        Alerts
      </label>
    </div>
  );
}
