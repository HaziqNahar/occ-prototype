# OCC Training Simulator Prototype

Demo-ready React/Vite prototype for the SBS Transit OCC training simulator review.

## Run Locally

```powershell
npm.cmd install
npm.cmd run backend
npm.cmd run dev
```

Keep the backend running in one terminal and the Vite app running in another.
Open the app at the Vite URL, usually `http://localhost:5173/`.

## Review Entry Points

- `/guide` - presenter guide and golden-path walkthrough
- `/ios/modules` - trainer modules: users, sessions, scenarios, runtime, reports
- `/ios/scenarios` - scenario builder and incident template loading
- `/ios` - Instructor Operating Station runtime control
- `/screen/alarms` - Monitor 01, alarm summary and acknowledgement
- `/screen/line-map` - Monitor 02, SCADA line map and train commands
- `/screen/timetable` - Monitor 03, timetable coordination
- `/ios/assessment` - assessment rubric
- `/report` - post-session report

## Golden Demo Flow

1. Open `/guide` and click **Prepare Demo**.
2. Load **Train Launch / Withdrawal** from `/ios/scenarios`.
3. Open `/ios` and start the scenario.
4. Open the three monitors from the guide or login screen.
5. On Monitor 01, acknowledge the injected door fault.
6. On Monitor 02, select Train 317, apply route, then dispatch.
7. On Monitor 03, show timetable state and coordination action.
8. Return to `/ios`, complete trainer review, then open `/report`.

## Backend Session API

The demo now includes a small local backend at `http://127.0.0.1:8787`.

- `GET /api/health` - service readiness and connected screen count
- `GET /api/session` - latest authoritative OCC session state
- `PUT /api/session` - update the shared session state from IOS or a monitor
- `GET /api/session/events` - live server-sent event stream for all screens
- `GET /api/session/status` - session code, lifecycle, and joined screen roles
- `POST /api/session/screens` - register or heartbeat a monitor/IOS/report screen
- `POST /api/session/actions` - validate scored operator actions in sequence
- `POST /api/session/reset` - replace the current session with a fresh state
- `GET /api/reports/latest` - computed report summary from the latest session
- `POST /api/reports` - archive a report snapshot to local backend storage

Runtime state is written under `server/data/` and ignored by Git.

## Current Prototype Position

The build now has a lightweight backend session owner for the first-round demo.
The IOS and monitor screens publish to the backend, subscribe to its live event
stream, and still keep browser-local sync as a fallback. Authentication,
multi-crew permissions, database-backed reporting, and deeper scenario authoring
remain next-phase work.

## Multi-Screen Sync

- `server/server.mjs` owns the latest OCC session state and streams updates to
  connected IOS, alarm, line-map, timetable, and report screens.
- `src/sessionSharedWorker.ts` keeps the latest OCC session state in one shared
  browser worker for `/screen/alarms`, `/screen/line-map`, `/screen/timetable`,
  `/ios`, and reporting screens.
- `src/sessionTransport.ts` is the browser-side transport used by `App.tsx`.
  It connects to the backend first, then mirrors updates to the SharedWorker,
  `BroadcastChannel`, and storage fallback.
- Opening Monitor 02 Line Map now asks the SharedWorker to launch Monitor 01
  Alarms and Monitor 03 Timetable. If browser pop-up policy blocks the automatic
  attempt, use the `Open 01 + 03` button in the Line Map header.
- Each screen also registers with the backend, so the shared session can show
  `OCC-DEMO-001`, lifecycle state, joined monitor roles, and report archive ids.
- The scored golden-path actions now go through backend validation:
  select train, acknowledge alarm, set route, dispatch train, and complete review.
- Backend assessment metrics track per-task response time, threshold status,
  rejected action penalties, score, and result for the report.
- Session updates are timestamped with `updatedAt`, so duplicate messages from
  multiple transports are ignored by older windows.

## Verification

```powershell
npm.cmd run lint
npm.cmd run build
```
