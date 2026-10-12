# Production Plan: From Prototype to Training Tool

Status: approved 12 Oct 2026; updated for two trainees (separate exercises). Work happens on branch `sop-scenarios-weekday04`.

## Goal

Make the OCC training simulator dependable for real training on the OCC LAN:
the server owns the session and the score, trainers and trainees sign in, and
every run is kept for later review.

## Decisions

| Topic | Decision |
| --- | --- |
| Deployment | One host PC on the OCC LAN runs the backend; trainer and trainee PCs connect over the LAN. No internet needed. |
| Sign-in | Local accounts stored by the app. An admin trainer adds trainers and trainees. |
| Records | Keep a history of every completed session. |
| Class size | At most one trainer with two trainees (confirmed Oct 2026). |
| Two trainees | **Separate exercises**: each trainee runs their own session (own monitors, trains and score), watched by one trainer from one console. No shared exercise, so the train simulation can stay with each trainee's single Line Map. |

## Why the current build is not enough

Findings from the architecture review (Oct 2026):

1. **Two scoring systems.** The backend only knows a legacy 5-step scheme; the
   real scenario scoring runs in the browser, and browsers can overwrite the
   backend score, including archived reports.
2. **About 20 places in the app change scoring-relevant state** (door commands,
   holds, calls, trainer confirmations, joining, timetable steps) by publishing
   the whole session. Only 5 action types go through backend checks.
3. **The train simulation runs in the browser.** Every open Line Map window runs
   its own timetable clock and publishes train positions; several windows fight,
   and PC clock differences decide who wins.
4. **Every change sends the whole session** to every screen and rewrites it to
   disk, including 15-second heartbeats.
5. **Rules are written twice** (task order checks, door-fault inference, session
   codes, line-map version) in `src/` and `server/`.

The scenario and scoring logic in `src/training-scenarios/` is already free of
browser code, so the server can reuse it instead of copying it.

## Design principles

- **The server is the only writer** of session state: trains, line map, tasks,
  evidence, score. Browsers send requests ("acknowledge this alarm"); the server
  validates them, applies them and broadcasts the result.
- **One shared core.** Scenario definitions, scoring and session rules live in a
  React-free module used by both the app and the server.
- **Action log.** The server records every action (who, what, when, result).
  The log is the history, supports debrief replay, and lets every score be
  traced back to the actions behind it.
- **No new runtime services.** Node 24 and a single SQLite file
  (`node:sqlite`); the server is TypeScript, run through the existing Vite
  toolchain in development and bundled for the LAN host.
- **Every phase leaves the app working.**

## Phases

| Phase | Delivers | Estimate |
| --- | --- | --- |
| 1. Shared core + TypeScript server + action log | React-free core module shared by app and server; server ported to TypeScript using it (no duplicated rules); SQLite database with the action log; same API so the app keeps working. | 4–5 days |
| 2. Server owns actions and scoring | Every trainee and trainer action becomes a request the server validates and scores with the definition-based scoring; browsers stop publishing whole sessions; reports cannot be overwritten. Every action records which trainee or trainer did it. | 6–8 days |
| 3. One clock owner | Only one Line Map window per session drives the train simulation; other windows display. | 1–2 days |
| 4. Accounts and sign-in | Trainer and trainee accounts with passwords, admin trainer manages people, console limited to trainers. | 2–3 days |
| 5. Two trainees, separate exercises | The server runs up to two sessions at once. The trainer assigns each joined trainee to their own session; each trainee's monitors open on their session. The console shows both exercises side by side (status, checklist, score) and can load a scenario into either. | 3–5 days |
| 6. History | Past runs and a trainee progress view, built on the action log. | 1–2 days |
| 7. LAN hardening | Install and start-up guide, data backup, multi-PC test with one trainer and two trainees. | 2 days |
| **Total** | | **19–27 working days (about 4–5½ weeks)** |

Design notes for phases 2–5 so two sessions need no rework:

- The server keeps sessions in a map keyed by session id, even while only one is
  used; every request and live-update stream names its session.
- Monitors, trainee pages and actions carry the session they belong to (for
  example a `?session=` code in the monitor addresses).
- Scores and the action log are per session, so each trainee's report is theirs.

## Later (not planned)

A **shared exercise** (two trainees on the same trains, in different OCC roles)
would need the train simulation on the server and per-role scoring: about
7–10 days on top. Not needed for separate exercises.

## Working practice

- Start each phase in a fresh Claude session with this document as the brief,
  to keep context (and token use) small.
- Run the full browser test suite once per phase; unit tests per change.
- Commit at the end of each phase; the app must pass `npm.cmd test`,
  `npm.cmd run test:ui`, `npm.cmd run lint` and `npm.cmd run build`.

## Progress

| Phase | Status |
| --- | --- |
| 1 | Done (12 Oct 2026): shared core (`src/sessionState.ts` is React-free; hook in `src/useOccSession.ts`), TypeScript backend in `server/`, SQLite database with action log, legacy data migration. |
| 2 | Done (12 Oct 2026): every page action is a typed command (`src/session-commands/`) applied, scored and logged by the server; pages receive versioned deltas over SSE; the Line Map's train movement is a whitelisted `SIM_UPDATE`; trainer-only commands; action log and evidence record who acted; reports are built by the server and only notes come from the browser; sessions kept in a map keyed by session id. |
| 3–7 | Not started |
