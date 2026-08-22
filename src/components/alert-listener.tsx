import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useClientState } from "@/lib/client-state";
import { helpTypeById } from "@/lib/help-types";
import { pollIncidentsSince } from "@/lib/server/incidents";
import { inRadius } from "@/components/world-map";

function ping() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 640;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
    window.setTimeout(() => void ctx.close(), 400);
  } catch {
    /* audio optional */
  }
}

export function AlertListener({
  userLat,
  userLng,
  onNew,
}: {
  userLat: number | null;
  userLng: number | null;
  onNew?: () => void;
}) {
  const lastSeenIso = useClientState((s) => s.lastSeenIso);
  const markSeen = useClientState((s) => s.markSeen);
  const notifyOn = useClientState((s) => s.notifyOn);
  const radiusKm = useClientState((s) => s.radiusKm);
  const lastSeenRef = useRef(lastSeenIso);
  const primed = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    lastSeenRef.current = lastSeenIso;
  }, [lastSeenIso]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const since = lastSeenRef.current || new Date().toISOString();
      if (!lastSeenRef.current) {
        markSeen(since);
        primed.current = true;
        return;
      }
      try {
        const fresh = await pollIncidentsSince({ data: since });
        if (cancelled || fresh.length === 0) return;
        const visible = fresh.filter((inc) => inRadius(inc, userLat, userLng, radiusKm));
        const newest = fresh[fresh.length - 1];
        if (newest) markSeen(newest.createdAt);
        if (!primed.current) {
          primed.current = true;
          return;
        }
        if (!notifyOn || visible.length === 0) return;
        const inc = visible[visible.length - 1]!;
        const meta = helpTypeById(inc.helpType);
        toast.message(`${meta.label} · ${inc.locationLabel}`, {
          description: `${inc.requesterName} · ${inc.canPay ? "can pay" : "cannot pay"}${
            inc.batteryPct != null ? ` · battery ${inc.batteryPct}%` : ""
          }`,
          action: {
            label: "Open",
            onClick: () => void navigate({ to: "/incident/$id", params: { id: inc.id } }),
          },
        });
        ping();
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(`Beacon · ${meta.label}`, {
            body: `${inc.requesterName} in ${inc.locationLabel}. ${inc.description}`,
          });
        }
        onNew?.();
      } catch {
        /* keep polling */
      }
    };
    const id = window.setInterval(() => void tick(), 2800);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [markSeen, navigate, notifyOn, onNew, radiusKm, userLat, userLng]);

  return null;
}
