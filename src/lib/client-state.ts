import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "./utils";

type ManualFix = { lat: number; lng: number; label: string };

type ClientState = {
  guestId: string;
  displayName: string;
  language: string;
  radiusKm: number | null;
  notifyOn: boolean;
  lastSeenIso: string;
  manualFix: ManualFix | null;
  sosConsentAt: string | null;
  setDisplayName: (name: string) => void;
  setLanguage: (language: string) => void;
  setRadiusKm: (km: number | null) => void;
  setNotifyOn: (on: boolean) => void;
  setManualFix: (fix: ManualFix | null) => void;
  markSeen: (iso: string) => void;
  recordSosConsent: () => void;
};

export const useClientState = create<ClientState>()(
  persist(
    (set, get) => ({
      guestId: uid(),
      displayName: "",
      language: "en",
      radiusKm: null,
      notifyOn: true,
      lastSeenIso: "",
      manualFix: null,
      sosConsentAt: null,
      setDisplayName: (displayName) => set({ displayName }),
      setLanguage: (language) => set({ language }),
      setRadiusKm: (radiusKm) => set({ radiusKm }),
      setNotifyOn: (notifyOn) => set({ notifyOn }),
      setManualFix: (manualFix) => set({ manualFix }),
      markSeen: (iso) => {
        if (!get().lastSeenIso || iso > get().lastSeenIso) set({ lastSeenIso: iso });
      },
      recordSosConsent: () => {
        if (!get().sosConsentAt) set({ sosConsentAt: new Date().toISOString() });
      },
    }),
    {
      name: "beacon-client",
      partialize: (s) => ({
        guestId: s.guestId,
        displayName: s.displayName,
        language: s.language,
        radiusKm: s.radiusKm,
        notifyOn: s.notifyOn,
        lastSeenIso: s.lastSeenIso,
        manualFix: s.manualFix,
        sosConsentAt: s.sosConsentAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!state.guestId || state.guestId === "guest") {
          state.guestId = uid();
        }
        if (!state.lastSeenIso) {
          state.lastSeenIso = new Date().toISOString();
        }
      },
    },
  ),
);

export function useActorName(authedName?: string | null) {
  const stored = useClientState((s) => s.displayName);
  return authedName?.trim() || stored.trim() || "Guest";
}
