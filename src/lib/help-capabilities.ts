export type HelperCapability = {
  id: string;
  label: string;
};

/** Need keys from the taxonomy → helper capabilities that may later match. */
export const NEED_TO_CAPABILITIES: Record<string, readonly HelperCapability[]> = {
  "vehicle.jump_start": [
    { id: "equipment.jumper_cables", label: "Have jumper cables" },
    { id: "vehicle.jump_start", label: "Can jump-start" },
    { id: "can_give_ride", label: "Can give a ride" },
    { id: "can_call_tow", label: "Can call a tow" },
  ],
  "vehicle.flat_tire": [
    { id: "have_jack", label: "Have a jack" },
    { id: "have_tools", label: "Have tools" },
    { id: "can_bring_tire", label: "Can bring a tire" },
    { id: "can_give_ride", label: "Can give a ride" },
    { id: "can_call_tow", label: "Can call a tow" },
  ],
  "vehicle.fuel": [
    { id: "can_bring_fuel", label: "Can bring fuel" },
    { id: "can_give_ride", label: "Can give a ride" },
    { id: "can_call_tow", label: "Can call a tow" },
  ],
  "vehicle.wont_start": [
    { id: "equipment.jumper_cables", label: "Have jumper cables" },
    { id: "have_tools", label: "Have tools" },
    { id: "can_call_tow", label: "Can call a tow" },
  ],
  "vehicle.terrain": [
    { id: "can_tow", label: "Can tow / pull out" },
    { id: "have_tools", label: "Have tools" },
    { id: "can_call_tow", label: "Can call a tow" },
  ],
  "vehicle.locked_out": [
    { id: "lockout_help", label: "Can help with a lockout" },
    { id: "can_call_tow", label: "Can call a tow" },
  ],
  "need.mechanical": [
    { id: "have_tools", label: "Have tools" },
    { id: "can_call_tow", label: "Can call a tow" },
  ],
  "need.ride": [{ id: "can_give_ride", label: "Can give a ride" }],
};

const HELP_TYPE_FALLBACK: Record<string, readonly HelperCapability[]> = {
  stranded: [
    { id: "i_can_help", label: "I can help" },
    { id: "can_give_ride", label: "Can give a ride" },
    { id: "can_call_tow", label: "Can call a tow" },
  ],
  vehicle: [
    { id: "i_can_help", label: "I can help" },
    { id: "have_tools", label: "Have tools" },
    { id: "can_call_tow", label: "Can call a tow" },
  ],
  fuel: [
    { id: "can_bring_fuel", label: "Can bring fuel" },
    { id: "can_give_ride", label: "Can give a ride" },
  ],
};

export function capabilitiesForNeed(
  needKey: string | null | undefined,
  helpType?: string,
): readonly HelperCapability[] {
  if (needKey && NEED_TO_CAPABILITIES[needKey]) return NEED_TO_CAPABILITIES[needKey];
  if (helpType && HELP_TYPE_FALLBACK[helpType]) return HELP_TYPE_FALLBACK[helpType];
  return [];
}
