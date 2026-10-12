# OCC Training Simulator Prototype

React/Vite prototype of an SBS Transit North East Line OCC training simulator.
A trainer runs SOP-based scenarios from a console while a trainee works on
three recreated OCC GWS monitors (Alarms, Line Map, Timetable). Both share one
live training session through a small local backend.

## Run Locally

```powershell
npm.cmd install
npm.cmd run backend
npm.cmd run dev
```

Keep the backend running in one terminal and the Vite app in another, then open
`http://localhost:5173/`.

### Across several PCs (trainer PC + trainee monitor PCs)

On the host PC:

```powershell
npm.cmd run backend:lan
npm.cmd run dev:lan
```

Other PCs open `http://<host-ip>:5173/`. Each page talks to the backend on the
same host at port 8787, so allow ports 5173 and 8787 through the host firewall.

## How a Session Works

| Page | Who | Purpose |
| --- | --- | --- |
| `/` | Everyone | Start page: choose **Trainer** or **Trainee**. Also opens the three monitors on a monitor PC. |
| `/ios/modules` | Trainer | **Trainer Console**: pick a scenario and incident, set mode, time target and timetable, load it, watch the checklist and trainee activity, pause/complete/stop. Shows the session code, joined trainees and open monitors. |
| `/session/join` | Trainee | Join with a name and the session code shown on the console, then open the monitors. Shows exercise status but never names the incident. |
| `/screen/alarms` | Trainee | Monitor 01: alarm summary and acknowledgement, Calls panel. |
| `/screen/line-map` | Trainee | Monitor 02: SCADA line map, train commands (route, dispatch, HII hold), train inspector, Calls panel. |
| `/screen/timetable` | Trainee | Monitor 03: traffic current timetable and train regulation graph. |
| `/report` | Trainer | Post-session report: score, checklist, timeline, evidence log, trainer notes. |

`/ios`, `/ios/scenarios` and `/ios/assessment` are old addresses; they open the
Trainer Console.

### Run-through

1. Trainer opens `/`, chooses **Trainer**, and reads out the 4-character
   session code (for example `K7M2`). **Reset whole session** issues a new code.
2. Trainee opens `/` on their PC, chooses **Trainee**, joins with the code and
   clicks **Open my monitors**.
3. Trainer picks a scenario (for example **PSD Fault → Single PSD failed to
   close**) and clicks **Load scenario**.
4. The trainee finds the incident alarm on Monitor 01, acknowledges it, selects
   and holds the train on Monitor 02, makes the SOP calls from the **Calls**
   tab (Radio / Teleph.), and releases the train.
5. Trainer watches the checklist fill in, clicks **Complete**, then opens the
   **Report**.

## Scenarios

| Scenario | Incidents |
| --- | --- |
| Train Launch | Launch a timetable train from the RT depot into SKG mainline service |
| Train Withdrawal | Withdraw a live train to the RT2 depot |
| Train Door Fault | Door failure (open/close), EHS activation, detrainment door cover open |
| PSD Fault | Obstructed, single PSD failed to open, single PSD failed to close, PSD summary light not available (override switch), manual PSD operation (RM train), multiple PSD failed to open |

- Fault scenarios follow the NEL OCC SOPs for train door faults
  (NEL/OPS/TRA/OP/TRN/07.001.34) and PSD faults (NEL/OPS/TRA/OP/DEG/09.001.18);
  Train Launch adds the coordination steps from NEL/OPS/TRA/OP/OCC/07.001.28.
- Each fault run picks a random train, station and bound. The train is placed
  and held at that platform, and the alarm text names the location.
- Only acknowledging the scenario's own incident alarm counts towards the score.
- Steps are scored from live actions: alarm acknowledgement, train selection,
  holds, door commands, routes, dispatch, and calls logged from the Calls panel
  (`src/comms/commsCatalog.ts`). Critical steps are marked with ★.
- Scenario definitions live in `src/training-scenarios/definitions.ts`.

## Timetables

Two NEL weekday timetables are bundled: `NEL_OTES_Weekday_03` (from 14 Jul 2025)
and `NEL_OTES_Weekday_04` (from 05 Jan 2026). The trainer chooses one in the
console; changing timetable resets all trains.

To import a new OTES "Full List" workbook (needs Python 3 with `openpyxl` and
`pdfplumber`: `py -m pip install openpyxl pdfplumber`):

```powershell
py scripts/extract_nel_timetable_xlsx.py "<path to NEL_OTES_Weekday_XX - Full List.xlsx>" --title NEL_OTES_Weekday_XX --effective-from YYYY-MM-DD --export-name nelOtesWeekdayXXServices --compact-ts-output src/data/nelOtesWeekdayXXServices.ts
```

Then register it in `src/data/nelTimetable.ts` and check that every trip maps to
a line-map route:

```powershell
node scripts/audit-timetable-routes.mjs NEL_OTES_Weekday_XX
```

The source PDFs, workbooks and SOPs are SBS Transit controlled documents and are
not stored in this repository.

## Backend

The backend is TypeScript in `server/` and shares the scenario, scoring and
session rules in `src/` with the app (see `docs/production-plan.md`). It runs at
`http://127.0.0.1:8787` and owns the shared session. All pages publish to it,
receive live updates over server-sent events, and fall back to a SharedWorker /
`BroadcastChannel` / local storage if it is unreachable.

| Command | Use |
| --- | --- |
| `npm.cmd run backend` | Development: runs `server/main.ts` through Vite, no build step |
| `npm.cmd run backend:lan` | Development, reachable from other PCs |
| `npm.cmd run build:server` | Bundles the backend into `dist-server/main.js` |
| `npm.cmd run start:server` | Runs the bundled backend (use this on the LAN host) |

Data is kept in one SQLite file, `server/data/occ-training.sqlite` (ignored by
Git), using the SQLite built into Node 24: the current session, an action log
(scored actions, screen joins, resets, report archives) and archived reports.
On first start it imports `session.json` / `reports.ndjson` from the old
backend and renames them `*.migrated`. `npm.cmd run reset:runtime` deletes all
backend data (stop the backend first).

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Readiness and connected screen count |
| `GET /api/session` | Current session state |
| `PUT /api/session` | Publish session state from a page |
| `GET /api/session/events` | Live server-sent event stream |
| `GET /api/session/status` | Session code, lifecycle and joined screens |
| `POST /api/session/screens` | Register or heartbeat a page |
| `POST /api/session/actions` | Validate a scored action (select train, acknowledge alarm, route, dispatch, complete) |
| `GET /api/session/actions` | Action log of the current session (or `?sessionId=`) |
| `POST /api/session/reset` | Replace the session with a fresh one |
| `POST /api/session/runtime` | Clear the runtime session |
| `GET /api/reports/latest` | Report summary of the current session |
| `POST /api/reports` | Archive a report snapshot |

## Tests

```powershell
npm.cmd test
npm.cmd run test:ui
npm.cmd run lint
npm.cmd run build
npm.cmd run build:server
```

- `npm.cmd test` runs the unit and integration tests in `scripts/tests/`,
  including round trips through a real backend.
- `npm.cmd run test:ui` runs the Playwright browser tests in `e2e/`. They start
  their own backend (port 8797) and app (port 5183), so they do not touch a
  running session.

## Known Limits

This is a prototype for demos and practice runs, not yet for formal assessment:

- The session state, including scores, is published by the browsers; the
  backend validates only the main scored actions.
- There is no sign-in. Anyone with the address can open the Trainer Console.
- One backend runs one session at a time.
- The 12-car rescue SOP is not modelled yet.
