# Beacon Constitution

Version **1.0.0** · 2026-08-22  
Status: binding  
Change rule: do not rewrite or expand this document unless explicitly asked. Amend only after a significant learning from testing or real users. Treat amendments like code: dated, versioned, committed.

This is the operating law for Beacon. Every review, plan, and implementation must conform to it. If a change would violate this file, the change is rejected.

---

## 1. What Beacon is

Beacon is a **human emergency coordination layer**. A person in trouble sends a signal. Nearby people, or a remote coordinator, use that signal to call **local official emergency services** and to assist with food, fuel, shelter, or presence.

Beacon is **not** 911, 112, 999, or any public-safety answering point. Beacon does not dispatch ambulances. Beacon does not guarantee that anyone will see a signal.

## 2. Mission

When a human needs help, Beacon gets a **usable signal out in seconds**: location, type, battery, language, and whether they can pay — then puts a nearby person or a remote coordinator on a path to call local official services.

Improve only what strengthens that mission. No new tabs, no visual-system rewrite, no feature packing, no “make it better” without a named problem.

## 3. Non-negotiables

1. **The large Hold-to-send SOS control stays central, always.** Home, panic, mobile. Same visual weight or larger. Never a secondary chip, never hidden behind a mode switch, never smaller than any adjacent control.
2. **Do not replace the app.** Refine this codebase. No greenfield rewrite.
3. **Official emergency services are first in policy. SOS is first in UI.** A way to call local numbers may sit *beside* SOS. It must never become the hero or shrink SOS.
4. **Guest SOS without an account.** Authentication cannot sit in front of a medical emergency. Helpers who *claim* a signal may be asked to sign in.
5. **Demo theater must never be confused with real distress.** Seeded incidents, synthetic “live” pins, play money, and estimated places are labeled DEMO or they are off. Production does not fake demand.
6. **Do not lie after send.** Do not say the network is being alerted unless a human or a service was actually notified.
7. **Precise victim data is not a public bulletin.** Exact coordinates, name, battery, pay flag, and panic notes are for the sender and for accepted helpers — not the world map.
8. **Only the sender can cancel or close their signal** (or a documented timeout). Strangers may *request* close. They may not bury a ticket.
9. **Hold SOS must not silently classify as medical.** The hold sends first. Type is unspecified emergency unless the requester has chosen otherwise. Correction happens after the signal is live, not as a form in front of the button.

## 4. Workflow (this is the method)

You are no longer asked to “make it better.” You are given **the rules**, **one problem**, and you **show a plan and wait**.

Sequence, always:

1. **Review** the named surface against this Constitution.
2. **Plan** — a focused implementation plan. No code.
3. **Stop. Wait for approval.**
4. **Implement** only the approved plan, smallest diff that preserves SOS.
5. **Commit** when the named problem is actually solved.

One focused task at a time. One screen at a time when reviewing UI. Checkpoints exist to stop scope creep before it starts.

Out of bounds unless a later task names them: NG911, KYC, real money rails, helper background checks, satellite, new navigation, new visual identity, extra tabs.

## 5. SOS law (the product center)

- One huge hold-to-send SOS. Location required (GPS or explicit city). Telemetry rides with the signal.
- “Request specific help” is a parallel, lesser path. It must never out-rank SOS.
- After send, the requester sees a **live ticket**: signal is live, cancel/I’m OK, call local emergency, helper count, honest status. Not a wiki of wallet, two chats, and world-writable resolve.
- False-alarm cancel is bound to the creating device/session.
- Create is rate-limited and sanity-checked. Duplicates from the same guest + pin in a short window merge; they do not spawn a new emergency.
- Consent is one sentence, once, before the first hold: location will be shown to people who can help; this is not 911. SOS stays on-screen while that line is visible.

## 6. Trust, safety, privacy (floor)

- Unauthenticated flood of medical pins is a weapon against the SOS button’s meaning. Rate-limit create.
- Helpers are not agents of Beacon. “I can help nearby” requires a signed-in account; location proof can come later; it is never a self-asserted public badge with no identity at all.
- `safety` / duress is not a world-map pin with a pay flag. Silent path is a later task; until then, do not make that type louder.
- Public map and feed: area + type + time + language. Precise lat/lng and pay flag wait for an accepted helper or the sender.
- Notification permission is not requested on first paint. Ask after someone opts into helping in a radius. Default helper radius is Nearby, not Worldwide.
- Production wallet is off or labeled **Demo credit — not real money**. Fake payout next to a real hold is a trust kill.
- Places never show estimated pins as real facilities.
- Translation of distress text through a public MT API is a later privacy task; do not expand it in SOS work.

## 7. What “done” means for a task

A task is done when:

- The named problem is fixed in this app, not redesigned away.
- SOS remains the visual and interactive center.
- No unapproved files, screens, or features shipped alongside it.
- Demo vs real is still honest.
- The change can be explained in one paragraph to a person who might hold SOS tonight.

## 8. Amendment log

| Version | Date | Why |
|---|---|---|
| 1.0.0 | 2026-08-22 | Initial constitution: SOS-central, review→plan→approve→code, no demo/real confusion. |
