import type { HelpTypeId, IncidentStatus } from "./help-types";

export type Incident = {
  id: string;
  requesterId: string | null;
  requesterName: string;
  helpType: HelpTypeId | string;
  description: string;
  lat: number;
  lng: number;
  locationLabel: string;
  countryCode: string | null;
  accuracyM: number | null;
  batteryPct: number | null;
  charging: boolean | null;
  canPay: boolean;
  language: string;
  status: IncidentStatus | string;
  aidCents: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type IncidentUpdate = {
  id: string;
  incidentId: string;
  authorId: string | null;
  authorName: string;
  kind: string;
  body: string;
  createdAt: string;
};

export type Helper = {
  id: string;
  incidentId: string;
  userId: string | null;
  name: string;
  role: string;
  createdAt: string;
};

export type IncidentDetail = Incident & {
  updates: IncidentUpdate[];
  helpers: Helper[];
};

export type ChatMessage = {
  id: string;
  channel: string;
  incidentId: string | null;
  authorId: string | null;
  authorName: string;
  lang: string;
  body: string;
  createdAt: string;
};

export type WalletSnapshot = {
  balanceCents: number;
  transfers: TransferRow[];
};

export type TransferRow = {
  id: string;
  fromUserId: string;
  fromName: string;
  toUserId: string | null;
  toIncidentId: string | null;
  amountCents: number;
  memo: string | null;
  createdAt: string;
};

export type DirectoryPerson = {
  userId: string;
  name: string;
};

export type PlaceKind = "restroom" | "shower" | "food" | "water" | "pharmacy" | "shelter";

export type Place = {
  id: string;
  name: string;
  kind: PlaceKind;
  lat: number;
  lng: number;
  distanceKm: number;
  source: "osm" | "estimated";
};

export type DeviceTelemetry = {
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  batteryPct: number | null;
  charging: boolean | null;
  language: string;
  locatedAt: string | null;
};

export type CityFix = {
  lat: number;
  lng: number;
  label: string;
  countryCode: string | null;
};
