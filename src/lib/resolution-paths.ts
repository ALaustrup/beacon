/**
 * Future-capable routing abstractions.
 * No provider is marked available unless a real integration exists.
 */

export type ResolutionKind =
  | "nearby_helper"
  | "trusted_contact"
  | "roadside_membership"
  | "insurance_roadside"
  | "manufacturer_roadside"
  | "local_roadside"
  | "towing"
  | "local_service"
  | "emergency_service";

export type ResolutionAvailability = "unknown" | "available" | "unavailable";

export type ResolutionPath = {
  kind: ResolutionKind;
  availability: ResolutionAvailability;
  preferred: boolean;
};

export type ResolutionNeed = {
  needKey: string;
  helpType: string;
  emergencyCall: boolean;
};

const ALWAYS_CONTINUE: ResolutionKind[] = ["nearby_helper", "trusted_contact", "local_service"];

const ROADSIDE_NEEDS = new Set([
  "vehicle.jump_start",
  "vehicle.flat_tire",
  "vehicle.fuel",
  "vehicle.wont_start",
  "vehicle.terrain",
  "vehicle.locked_out",
  "vehicle.collision",
  "need.mechanical",
]);

export function resolutionPathsFor(need: ResolutionNeed): ResolutionPath[] {
  const paths: ResolutionPath[] = [
    { kind: "nearby_helper", availability: "unknown", preferred: true },
    { kind: "trusted_contact", availability: "unknown", preferred: false },
  ];

  if (ROADSIDE_NEEDS.has(need.needKey) || need.helpType === "vehicle" || need.helpType === "fuel") {
    paths.push(
      { kind: "roadside_membership", availability: "unknown", preferred: false },
      { kind: "insurance_roadside", availability: "unknown", preferred: false },
      { kind: "manufacturer_roadside", availability: "unknown", preferred: false },
      { kind: "local_roadside", availability: "unknown", preferred: false },
      { kind: "towing", availability: "unknown", preferred: false },
    );
  }

  paths.push({ kind: "local_service", availability: "unknown", preferred: false });

  if (need.emergencyCall) {
    paths.unshift({
      kind: "emergency_service",
      availability: "unknown",
      preferred: true,
    });
  }

  return paths;
}

export function continuesIfPreferredUnavailable(paths: ResolutionPath[]): boolean {
  return paths.some((path) => ALWAYS_CONTINUE.includes(path.kind));
}
