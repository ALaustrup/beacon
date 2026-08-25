import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(root, "../src/lib/help-taxonomy.ts"), "utf8");
const types = readFileSync(join(root, "../src/lib/help-types.ts"), "utf8");
const paths = readFileSync(join(root, "../src/lib/resolution-paths.ts"), "utf8");

function optionHelpType(id) {
  const match = src.match(
    new RegExp(`option\\(\\s*"${id}"\\s*,\\s*"[^"]+"\\s*,\\s*"[^"]+"\\s*,\\s*"([^"]+)"`),
  );
  return match?.[1] ?? null;
}

function categoryBlock(id) {
  const start = src.indexOf(`id: "${id}"`);
  assert.notEqual(start, -1, `missing category ${id}`);
  const next = src.indexOf("id: \"", start + 8);
  return src.slice(start, next === -1 ? src.length : next);
}

test("HELP ME unspecified maps to emergency, never medical", () => {
  assert.match(types, /SOS_HOLD_TYPE = "emergency"/);
  assert.match(types, /UNSPECIFIED_HELP_TYPE = SOS_HOLD_TYPE/);
  assert.match(src, /helpSubtype: "unspecified"/);
  assert.match(src, /helpType: UNSPECIFIED_HELP_TYPE/);
  assert.match(src, /unspecified: true/);
  assert.doesNotMatch(src, /helpType: "medical"[\s\S]{0,40}unspecified: true/);
});

test("emergency is the generic unspecified SOS fallback, not medical", () => {
  assert.match(types, /short: "Unspecified — sent from SOS"/);
  assert.match(types, /SOS_HOLD_TYPE = "emergency"/);
  assert.match(types, /generic unspecified SOS fallback/);
  assert.match(types, /Never remap this to medical/);
});

test("I Don’t Know at the first level is unspecified", () => {
  const block = categoryBlock("unknown");
  assert.match(block, /label: "I Don’t Know"/);
  assert.match(block, /unspecified: true/);
  assert.match(block, /helpType: UNSPECIFIED_HELP_TYPE/);
});

test("I Don’t Know at the second level is unspecified, never medical", () => {
  assert.match(
    src,
    /option\(\s*"unknown",\s*"I Don’t Know",\s*"unknown",\s*UNSPECIFIED_HELP_TYPE/,
  );
  assert.match(src, /if \(subtype\.id === "unknown"\)/);
  assert.match(src, /unspecifiedMapping\(category\.requestFor\)/);
});

test("every first-level category is present", () => {
  for (const id of [
    "stuck",
    "lost",
    "injured",
    "unsafe",
    "need",
    "report",
    "someone_else",
    "unknown",
  ]) {
    assert.match(src, new RegExp(`id: "${id}"`));
  }
  assert.match(categoryBlock("stuck"), /helpType: "stranded"/);
  assert.match(categoryBlock("lost"), /helpType: "lost"/);
  assert.match(categoryBlock("injured"), /helpType: "medical"/);
  assert.match(categoryBlock("unsafe"), /helpType: "safety"/);
  assert.match(categoryBlock("someone_else"), /requestFor: "someone_else"/);
});

test("every subtype maps to an existing help type", () => {
  const expected = {
    out_of_fuel: "fuel",
    flat_tire: "vehicle",
    dead_battery: "stranded",
    wont_start: "vehicle",
    locked_out: "stranded",
    mud_snow_sand: "stranded",
    walking: "lost",
    driving: "lost",
    hiking: "lost",
    separated: "lost",
    directions: "lost",
    missing_person: "lost",
    bleeding: "medical",
    fall: "medical",
    breathing: "medical",
    chest_pain: "medical",
    burn: "medical",
    broken_bone: "medical",
    unconscious: "medical",
    followed: "safety",
    threat: "safety",
    domestic: "safety",
    unsafe_location: "safety",
    stranded_unsafe: "safety",
    cannot_speak: "safety",
    ride: "other",
    food_water: "food",
    medication: "medicine",
    shelter: "shelter",
    phone_charge: "other",
    mechanical: "vehicle",
    hazard: "other",
    fire: "accident",
    stranded_person: "stranded",
    suspicious: "safety",
    road: "other",
    unresponsive: "medical",
    needs_assistance: "other",
  };

  for (const [id, helpType] of Object.entries(expected)) {
    assert.equal(optionHelpType(id), helpType, `${id} → ${helpType}`);
  }
});

test("Someone Else is first-class", () => {
  const block = categoryBlock("someone_else");
  assert.match(block, /requestFor: "someone_else"/);
  assert.match(block, /option\(\s*"injured"/);
  assert.match(block, /emergencyCall: true/);
});

test("emergency escalation metadata triggers on life-threatening options", () => {
  for (const id of [
    "unconscious",
    "breathing",
    "chest_pain",
    "bleeding",
    "cannot_speak",
    "threat",
    "fire",
    "unresponsive",
  ]) {
    const idx = src.indexOf(`option("${id}"`);
    assert.notEqual(idx, -1, id);
    assert.match(src.slice(idx, idx + 280), /emergencyCall: true/, id);
  }
  const battery = src.indexOf('option("dead_battery"');
  assert.doesNotMatch(src.slice(battery, battery + 260), /emergencyCall: true/);
});

test("cannot speak safely is a silent path", () => {
  const idx = src.indexOf('option("cannot_speak"');
  assert.match(src.slice(idx, idx + 280), /silent: true/);
});

test("resolution paths never stop at a missing membership", () => {
  assert.match(paths, /nearby_helper/);
  assert.match(paths, /roadside_membership/);
  assert.match(paths, /availability: "unknown"/);
  assert.match(paths, /ALWAYS_CONTINUE/);
  assert.doesNotMatch(paths, /availability: "available"/);
});
