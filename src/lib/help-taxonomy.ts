import {
  SOS_HOLD_TYPE,
  UNSPECIFIED_HELP_TYPE,
  type HelpTypeId,
} from "./help-types";

export type HelpRequestFor = "self" | "someone_else";
export type HelpIconId =
  | "stuck"
  | "lost"
  | "injured"
  | "unsafe"
  | "need"
  | "report"
  | "someone"
  | "unknown"
  | "fuel"
  | "tire"
  | "battery"
  | "engine"
  | "lock"
  | "terrain"
  | "crash"
  | "walk"
  | "drive"
  | "hike"
  | "group"
  | "directions"
  | "missing"
  | "bleed"
  | "fall"
  | "breath"
  | "chest"
  | "burn"
  | "bone"
  | "unconscious"
  | "follow"
  | "threat"
  | "home"
  | "place"
  | "silent"
  | "ride"
  | "food"
  | "medicine"
  | "shelter"
  | "phone"
  | "tools"
  | "hazard"
  | "fire"
  | "person"
  | "suspicious"
  | "road"
  | "help";

export type FollowUpOption = {
  id: string;
  label: string;
};

export type FollowUpQuestion = {
  id: string;
  prompt: string;
  options: readonly FollowUpOption[];
};

export type HelpSubtypeDef = {
  id: string;
  label: string;
  icon: HelpIconId;
  helpType: HelpTypeId;
  emergencyCall: boolean;
  silent: boolean;
  followUp: FollowUpQuestion | null;
  needKey: string;
};

export type HelpCategoryDef = {
  id: string;
  label: string;
  icon: HelpIconId;
  helpType: HelpTypeId;
  requestFor: HelpRequestFor;
  unspecified: boolean;
  options: readonly HelpSubtypeDef[];
};

export type HelpSelection = {
  categoryId: string | null;
  subtypeId: string | null;
};

export type IncidentMapping = {
  helpType: HelpTypeId;
  helpSubtype: string;
  requestFor: HelpRequestFor;
  categoryId: string | null;
  subtypeId: string | null;
  label: string;
  description: string;
  emergencyCall: boolean;
  silent: boolean;
  followUp: FollowUpQuestion | null;
  needKey: string;
  unspecified: boolean;
};

function none(): null {
  return null;
}

const SAFE_PLACE: FollowUpQuestion = {
  id: "safe_place",
  prompt: "Are you somewhere safe?",
  options: [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
    { id: "unsure", label: "I don’t know" },
  ],
};

const OFF_ROAD: FollowUpQuestion = {
  id: "off_roadway",
  prompt: "Are you off the roadway?",
  options: [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
    { id: "unsure", label: "I don’t know" },
  ],
};

const CONSCIOUS: FollowUpQuestion = {
  id: "conscious",
  prompt: "Is the person conscious?",
  options: [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
    { id: "unsure", label: "I don’t know" },
  ],
};

const FOOT_OR_VEHICLE: FollowUpQuestion = {
  id: "foot_or_vehicle",
  prompt: "Are you on foot or in a vehicle?",
  options: [
    { id: "foot", label: "On foot" },
    { id: "vehicle", label: "In a vehicle" },
    { id: "unsure", label: "I don’t know" },
  ],
};

const SPEAK_SAFE: FollowUpQuestion = {
  id: "speak_safe",
  prompt: "Can you speak safely?",
  options: [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
    { id: "later", label: "Not now" },
  ],
};

function option(
  id: string,
  label: string,
  icon: HelpIconId,
  helpType: HelpTypeId,
  extras: Partial<Pick<HelpSubtypeDef, "emergencyCall" | "silent" | "followUp" | "needKey">> = {},
): HelpSubtypeDef {
  return {
    id,
    label,
    icon,
    helpType,
    emergencyCall: extras.emergencyCall ?? false,
    silent: extras.silent ?? false,
    followUp: extras.followUp === undefined ? none() : extras.followUp,
    needKey: extras.needKey ?? `${helpType}.${id}`,
  };
}

function otherUnknown(helpType: HelpTypeId, prefix: string): HelpSubtypeDef[] {
  return [
    option("other", "Other", "unknown", helpType, { needKey: `${prefix}.other` }),
    option("unknown", "I Don’t Know", "unknown", UNSPECIFIED_HELP_TYPE, {
      needKey: `${prefix}.unknown`,
    }),
  ];
}

export const HELP_CATEGORIES: readonly HelpCategoryDef[] = [
  {
    id: "stuck",
    label: "Stuck",
    icon: "stuck",
    helpType: "stranded",
    requestFor: "self",
    unspecified: false,
    options: [
      option("out_of_fuel", "Out of Fuel", "fuel", "fuel", {
        needKey: "vehicle.fuel",
      }),
      option("flat_tire", "Flat Tire", "tire", "vehicle", {
        followUp: OFF_ROAD,
        needKey: "vehicle.flat_tire",
      }),
      option("dead_battery", "Dead Battery", "battery", "stranded", {
        followUp: SAFE_PLACE,
        needKey: "vehicle.jump_start",
      }),
      option("wont_start", "Vehicle Won’t Start", "engine", "vehicle", {
        followUp: SAFE_PLACE,
        needKey: "vehicle.wont_start",
      }),
      option("locked_out", "Locked Out", "lock", "stranded", {
        needKey: "vehicle.locked_out",
      }),
      option("mud_snow_sand", "Stuck in Mud / Snow / Sand", "terrain", "stranded", {
        followUp: SAFE_PLACE,
        needKey: "vehicle.terrain",
      }),
      option("accident", "Accident / Collision", "crash", "accident", {
        emergencyCall: true,
        followUp: CONSCIOUS,
        needKey: "vehicle.collision",
      }),
      ...otherUnknown("stranded", "vehicle"),
    ],
  },
  {
    id: "lost",
    label: "Lost",
    icon: "lost",
    helpType: "lost",
    requestFor: "self",
    unspecified: false,
    options: [
      option("walking", "Walking", "walk", "lost", { needKey: "lost.walking" }),
      option("driving", "Driving", "drive", "lost", { needKey: "lost.driving" }),
      option("hiking", "Hiking / Wilderness", "hike", "lost", {
        followUp: SAFE_PLACE,
        needKey: "lost.hiking",
      }),
      option("separated", "Separated From Group", "group", "lost", {
        needKey: "lost.separated",
      }),
      option("directions", "Need Directions", "directions", "lost", {
        followUp: FOOT_OR_VEHICLE,
        needKey: "lost.directions",
      }),
      option("missing_person", "Missing Person / Dependent", "missing", "lost", {
        emergencyCall: true,
        needKey: "lost.missing_person",
      }),
      ...otherUnknown("lost", "lost"),
    ],
  },
  {
    id: "injured",
    label: "Injured",
    icon: "injured",
    helpType: "medical",
    requestFor: "self",
    unspecified: false,
    options: [
      option("bleeding", "Bleeding", "bleed", "medical", {
        emergencyCall: true,
        followUp: CONSCIOUS,
        needKey: "medical.bleeding",
      }),
      option("fall", "Fall", "fall", "medical", {
        followUp: CONSCIOUS,
        needKey: "medical.fall",
      }),
      option("breathing", "Trouble Breathing", "breath", "medical", {
        emergencyCall: true,
        followUp: CONSCIOUS,
        needKey: "medical.breathing",
      }),
      option("chest_pain", "Chest Pain", "chest", "medical", {
        emergencyCall: true,
        followUp: CONSCIOUS,
        needKey: "medical.chest_pain",
      }),
      option("burn", "Burn", "burn", "medical", {
        followUp: CONSCIOUS,
        needKey: "medical.burn",
      }),
      option("broken_bone", "Possible Broken Bone", "bone", "medical", {
        followUp: CONSCIOUS,
        needKey: "medical.broken_bone",
      }),
      option("unconscious", "Unconscious / Not Responding", "unconscious", "medical", {
        emergencyCall: true,
        needKey: "medical.unconscious",
      }),
      ...otherUnknown("medical", "medical"),
    ],
  },
  {
    id: "unsafe",
    label: "Unsafe",
    icon: "unsafe",
    helpType: "safety",
    requestFor: "self",
    unspecified: false,
    options: [
      option("followed", "Being Followed", "follow", "safety", {
        emergencyCall: true,
        silent: true,
        followUp: SPEAK_SAFE,
        needKey: "safety.followed",
      }),
      option("threat", "Threat Nearby", "threat", "safety", {
        emergencyCall: true,
        silent: true,
        followUp: SPEAK_SAFE,
        needKey: "safety.threat",
      }),
      option("domestic", "Domestic / Personal Danger", "home", "safety", {
        emergencyCall: true,
        silent: true,
        followUp: SPEAK_SAFE,
        needKey: "safety.domestic",
      }),
      option("unsafe_location", "Unsafe Location", "place", "safety", {
        followUp: SPEAK_SAFE,
        needKey: "safety.location",
      }),
      option("stranded_unsafe", "Stranded Somewhere Unsafe", "stuck", "safety", {
        followUp: SPEAK_SAFE,
        needKey: "safety.stranded",
      }),
      option("cannot_speak", "Cannot Speak Safely", "silent", "safety", {
        emergencyCall: true,
        silent: true,
        needKey: "safety.silent",
      }),
      ...otherUnknown("safety", "safety"),
    ],
  },
  {
    id: "need",
    label: "Need Something",
    icon: "need",
    helpType: "other",
    requestFor: "self",
    unspecified: false,
    options: [
      option("ride", "Ride", "ride", "other", { needKey: "need.ride" }),
      option("food_water", "Food / Water", "food", "food", { needKey: "need.food_water" }),
      option("medication", "Medication Pickup", "medicine", "medicine", {
        needKey: "need.medication",
      }),
      option("shelter", "Shelter / Safe Place", "shelter", "shelter", {
        needKey: "need.shelter",
      }),
      option("phone_charge", "Phone / Charging", "phone", "other", {
        needKey: "need.phone",
      }),
      option("mechanical", "Mechanical Help", "tools", "vehicle", {
        needKey: "need.mechanical",
      }),
      ...otherUnknown("other", "need"),
    ],
  },
  {
    id: "report",
    label: "Report",
    icon: "report",
    helpType: "other",
    requestFor: "self",
    unspecified: false,
    options: [
      option("accident", "Accident", "crash", "accident", {
        emergencyCall: true,
        followUp: CONSCIOUS,
        needKey: "report.accident",
      }),
      option("hazard", "Hazard", "hazard", "other", { needKey: "report.hazard" }),
      option("fire", "Fire / Smoke", "fire", "accident", {
        emergencyCall: true,
        needKey: "report.fire",
      }),
      option("stranded_person", "Stranded Person", "person", "stranded", {
        needKey: "report.stranded_person",
      }),
      option("suspicious", "Suspicious Situation", "suspicious", "safety", {
        followUp: SPEAK_SAFE,
        needKey: "report.suspicious",
      }),
      option("road", "Road Problem", "road", "other", { needKey: "report.road" }),
      ...otherUnknown("other", "report"),
    ],
  },
  {
    id: "someone_else",
    label: "Someone Else",
    icon: "someone",
    helpType: "other",
    requestFor: "someone_else",
    unspecified: false,
    options: [
      option("injured", "Injured", "injured", "medical", {
        emergencyCall: true,
        followUp: CONSCIOUS,
        needKey: "other.injured",
      }),
      option("lost", "Lost", "lost", "lost", {
        needKey: "other.lost",
      }),
      option("unsafe", "Unsafe", "unsafe", "safety", {
        emergencyCall: true,
        silent: true,
        followUp: SPEAK_SAFE,
        needKey: "other.unsafe",
      }),
      option("stranded", "Stranded", "stuck", "stranded", {
        needKey: "other.stranded",
      }),
      option("unresponsive", "Unresponsive", "unconscious", "medical", {
        emergencyCall: true,
        needKey: "other.unresponsive",
      }),
      option("needs_assistance", "Needs Assistance", "help", "other", {
        needKey: "other.needs_assistance",
      }),
      ...otherUnknown("other", "other"),
    ],
  },
  {
    id: "unknown",
    label: "I Don’t Know",
    icon: "unknown",
    helpType: UNSPECIFIED_HELP_TYPE,
    requestFor: "self",
    unspecified: true,
    options: [],
  },
] as const;

export const FIRST_LEVEL_IDS = HELP_CATEGORIES.map((c) => c.id);

export function categoryById(id: string | null | undefined): HelpCategoryDef | undefined {
  if (!id) return undefined;
  return HELP_CATEGORIES.find((c) => c.id === id);
}

export function subtypeById(
  categoryId: string | null | undefined,
  subtypeId: string | null | undefined,
): HelpSubtypeDef | undefined {
  if (!categoryId || !subtypeId) return undefined;
  return categoryById(categoryId)?.options.find((o) => o.id === subtypeId);
}

export function unspecifiedMapping(requestFor: HelpRequestFor = "self"): IncidentMapping {
  return {
    helpType: UNSPECIFIED_HELP_TYPE,
    helpSubtype: "unspecified",
    requestFor,
    categoryId: null,
    subtypeId: null,
    label: "Help needed",
    description: "Emergency. Please send help now.",
    emergencyCall: false,
    silent: false,
    followUp: null,
    needKey: "unspecified",
    unspecified: true,
  };
}

function descriptionFor(mapping: Omit<IncidentMapping, "description">): string {
  if (mapping.unspecified) return "Emergency. Please send help now.";
  if (mapping.requestFor === "someone_else") {
    return `Someone else · ${mapping.label}. Please send help.`;
  }
  return `${mapping.label}. Please send help.`;
}

export function mapHelpSelection(selection: HelpSelection): IncidentMapping {
  const category = categoryById(selection.categoryId);

  if (!category || category.unspecified) {
    return unspecifiedMapping();
  }

  if (!selection.subtypeId) {
    const base = {
      helpType: category.helpType,
      helpSubtype: "unknown",
      requestFor: category.requestFor,
      categoryId: category.id,
      subtypeId: null,
      label: category.label,
      emergencyCall: false,
      silent: false,
      followUp: null,
      needKey: `${category.id}.unknown`,
      unspecified: false,
    };
    return { ...base, description: descriptionFor(base) };
  }

  const subtype = subtypeById(category.id, selection.subtypeId);
  if (!subtype) {
    return unspecifiedMapping(category.requestFor);
  }

  if (subtype.id === "unknown") {
    const mapped = unspecifiedMapping(category.requestFor);
    return {
      ...mapped,
      categoryId: category.id,
      subtypeId: "unknown",
      needKey: subtype.needKey,
    };
  }

  const base = {
    helpType: subtype.helpType,
    helpSubtype: subtype.id,
    requestFor: category.requestFor,
    categoryId: category.id,
    subtypeId: subtype.id,
    label:
      category.requestFor === "someone_else"
        ? `Someone else · ${subtype.label}`
        : subtype.label,
    emergencyCall: subtype.emergencyCall,
    silent: subtype.silent,
    followUp: subtype.followUp,
    needKey: subtype.needKey,
    unspecified: false,
  };
  return { ...base, description: descriptionFor(base) };
}

/** Direct HELP ME / hold-to-SOS with no category. */
export function mapUnspecifiedRequest(): IncidentMapping {
  return unspecifiedMapping();
}

export function isUnspecifiedHelpType(helpType: string): boolean {
  return helpType === SOS_HOLD_TYPE || helpType === "unspecified";
}

export function everyCategoryMapsToExistingHelpType(): boolean {
  return HELP_CATEGORIES.every((category) =>
    category.unspecified
      ? category.helpType === UNSPECIFIED_HELP_TYPE
      : category.options.every((option) => Boolean(option.helpType)),
  );
}

export type HelpLeaf = IncidentMapping & {
  id: string;
  microQuestion: string | null;
};

export function toHelpLeaf(mapping: IncidentMapping): HelpLeaf {
  return {
    ...mapping,
    id: mapping.subtypeId ?? mapping.categoryId ?? "unspecified",
    microQuestion: mapping.followUp?.prompt ?? null,
  };
}

export const UNSPECIFIED_LEAF = toHelpLeaf(unspecifiedMapping());

export function emergencyShouldSurface(leaf: HelpLeaf | IncidentMapping | null | undefined): boolean {
  return Boolean(leaf?.emergencyCall);
}

const ASK_KEY = "beacon-help-ask";

export function stashHelpAsk(leaf: HelpLeaf): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ASK_KEY, JSON.stringify(leaf));
  } catch {
    /* ignore */
  }
}

export function takeHelpAsk(): HelpLeaf | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ASK_KEY);
    window.sessionStorage.removeItem(ASK_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HelpLeaf;
  } catch {
    return null;
  }
}

export function recordHelpEvent(
  event:
    | "help_opened"
    | "unspecified_sent"
    | "category_selected"
    | "subtype_selected"
    | "question_answered"
    | "emergency_cta_shown"
    | "emergency_cta_used"
    | "incident_created"
    | "helper_matched"
    | "request_resolved",
  key?: string,
): void {
  const mapped =
    event === "help_opened"
      ? "help_control_opened"
      : event === "unspecified_sent"
        ? "unspecified_request_sent"
        : event === "emergency_cta_shown"
          ? "emergency_cta_surfaced"
          : event;
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem("beacon-help-events");
    const rows = raw ? (JSON.parse(raw) as { t: number; e: string; k?: string }[]) : [];
    rows.push({ t: Date.now(), e: mapped, k: key });
    window.sessionStorage.setItem("beacon-help-events", JSON.stringify(rows.slice(-80)));
  } catch {
    /* ignore */
  }
}

export const CATEGORY_HINTS: Record<string, string> = {
  stuck: "Cannot move",
  lost: "Cannot find the way",
  injured: "Hurt or unwell",
  unsafe: "Threat or danger",
  need: "A specific thing",
  report: "Something you see",
  someone_else: "Not about you",
  unknown: "Send help anyway",
};

export function listAllMappings(): IncidentMapping[] {
  const rows: IncidentMapping[] = [mapUnspecifiedRequest()];
  for (const category of HELP_CATEGORIES) {
    if (category.unspecified) {
      rows.push(mapHelpSelection({ categoryId: category.id, subtypeId: null }));
      continue;
    }
    for (const subtype of category.options) {
      rows.push(
        mapHelpSelection({ categoryId: category.id, subtypeId: subtype.id }),
      );
    }
  }
  return rows;
}
