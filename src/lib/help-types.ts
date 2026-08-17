export const HELP_TYPES = [
  {
    id: "medical",
    label: "Medical",
    short: "Fallen, injured, or unwell",
    urgency: "critical",
  },
  {
    id: "accident",
    label: "Accident",
    short: "Collision or crash",
    urgency: "critical",
  },
  {
    id: "safety",
    label: "Safety",
    short: "Threat or unsafe situation",
    urgency: "critical",
  },
  {
    id: "stranded",
    label: "Stranded",
    short: "Stuck, cannot move",
    urgency: "high",
  },
  {
    id: "vehicle",
    label: "Breakdown",
    short: "Car will not run",
    urgency: "high",
  },
  {
    id: "fuel",
    label: "Out of fuel",
    short: "Need gas or charge",
    urgency: "high",
  },
  {
    id: "lost",
    label: "Lost",
    short: "Cannot find the way",
    urgency: "high",
  },
  {
    id: "medicine",
    label: "Medicine",
    short: "Need medication",
    urgency: "high",
  },
  {
    id: "water",
    label: "Water",
    short: "Need drinking water",
    urgency: "high",
  },
  {
    id: "shelter",
    label: "Shelter",
    short: "Need a safe place",
    urgency: "medium",
  },
  {
    id: "food",
    label: "Food",
    short: "Hungry or thirsty",
    urgency: "medium",
  },
  {
    id: "other",
    label: "Other help",
    short: "Something else",
    urgency: "medium",
  },
] as const;

export type HelpTypeId = (typeof HELP_TYPES)[number]["id"];
export type HelpUrgency = (typeof HELP_TYPES)[number]["urgency"];

export const HELP_TYPE_IDS = HELP_TYPES.map((t) => t.id);

export function helpTypeById(id: string) {
  return HELP_TYPES.find((t) => t.id === id) ?? HELP_TYPES[HELP_TYPES.length - 1];
}

export const INCIDENT_STATUSES = ["open", "assisting", "resolved"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
  { id: "pt", label: "Português" },
  { id: "de", label: "Deutsch" },
  { id: "it", label: "Italiano" },
  { id: "ar", label: "العربية" },
  { id: "zh", label: "中文" },
  { id: "ja", label: "日本語" },
  { id: "ko", label: "한국어" },
  { id: "hi", label: "हिन्दी" },
  { id: "ru", label: "Русский" },
  { id: "uk", label: "Українська" },
  { id: "tr", label: "Türkçe" },
  { id: "pl", label: "Polski" },
  { id: "nl", label: "Nederlands" },
  { id: "vi", label: "Tiếng Việt" },
  { id: "th", label: "ไทย" },
  { id: "id", label: "Bahasa Indonesia" },
  { id: "sw", label: "Kiswahili" },
] as const;

export type LangId = (typeof LANGUAGES)[number]["id"];

export function langLabel(id: string): string {
  return LANGUAGES.find((l) => l.id === id)?.label ?? id;
}

export const RADIUS_PRESETS = [
  { id: "local", label: "Nearby", km: 25 },
  { id: "city", label: "City", km: 80 },
  { id: "region", label: "Region", km: 400 },
  { id: "world", label: "Worldwide", km: null },
] as const;
