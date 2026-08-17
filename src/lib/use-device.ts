import { useEffect, useState } from "react";
import { useClientState } from "./client-state";
import type { DeviceTelemetry } from "./types";

const empty: DeviceTelemetry = {
  lat: null,
  lng: null,
  accuracyM: null,
  batteryPct: null,
  charging: null,
  language: "en",
  locatedAt: null,
};

export function useDevice(): DeviceTelemetry & { locating: boolean; error: string | null } {
  const [state, setState] = useState<DeviceTelemetry>(empty);
  const [locating, setLocating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const manualFix = useClientState((s) => s.manualFix);

  useEffect(() => {
    const language =
      typeof navigator !== "undefined"
        ? (navigator.language || "en").slice(0, 2).toLowerCase()
        : "en";
    setState((s) => ({ ...s, language }));

    let watchId: number | null = null;
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setLocating(false);
          setError(null);
          setState((s) => ({
            ...s,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyM: pos.coords.accuracy,
            locatedAt: new Date().toISOString(),
          }));
        },
        (err) => {
          setLocating(false);
          setError(
            err.code === err.PERMISSION_DENIED
              ? "Location is blocked. Enable it or set a city below."
              : "Could not read location. Set a city if GPS is unavailable.",
          );
        },
        { enableHighAccuracy: true, maximumAge: 8_000, timeout: 18_000 },
      );
    } else {
      setLocating(false);
      setError("This device does not expose GPS. Set a city to send a signal.");
    }

    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{
        level: number;
        charging: boolean;
        addEventListener: (e: string, fn: () => void) => void;
        removeEventListener: (e: string, fn: () => void) => void;
      }>;
    };
    let battery: Awaited<ReturnType<NonNullable<typeof nav.getBattery>>> | null = null;
    const applyBattery = () => {
      if (!battery) return;
      setState((s) => ({
        ...s,
        batteryPct: Math.round(battery!.level * 100),
        charging: battery!.charging,
      }));
    };
    if (nav.getBattery) {
      void nav.getBattery().then((b) => {
        battery = b;
        applyBattery();
        b.addEventListener("levelchange", applyBattery);
        b.addEventListener("chargingchange", applyBattery);
      });
    }

    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      if (battery) {
        battery.removeEventListener("levelchange", applyBattery);
        battery.removeEventListener("chargingchange", applyBattery);
      }
    };
  }, []);

  if (manualFix && (state.lat == null || state.lng == null)) {
    return {
      ...state,
      lat: manualFix.lat,
      lng: manualFix.lng,
      accuracyM: state.accuracyM ?? 2500,
      locating: false,
      error: null,
    };
  }

  return { ...state, locating, error };
}
