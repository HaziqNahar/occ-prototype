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

### Accounts

Everyone signs in. On the very first start the app asks for the **first
trainer**, who becomes the admin. The admin adds the other trainers and the
trainees on the **People** page (`/admin`): name, username, password and role.
Passwords need at least 8 characters; five wrong passwords lock a username for
30 seconds. Accounts are switched off, never deleted, so past runs keep their
names.

A sign-in is remembered by the browser for 7 days. On a monitor PC, signing in
on the trainee page also signs in the three monitor windows; one person per
browser at a time (use **Sign out** to change).

If the admin cannot sign in, reset the password on the host PC:

```powershell
npm.cmd run reset:password -- <username> <new password>
```

## How a Session Works

| Page | Who | Purpose |
| --- | --- | --- |
| `/` | Everyone | Sign in (or set up the first trainer), then the start page for your role. Also opens the three monitors on a monitor PC. |
| `/ios/modules` | Trainer | **Trainer Console**: one column per exercise (up to two). Each has its own code, trainee, monitors, scenario chooser (incident, mode, time target, timetable), checklist, trainee activity, pause/complete/stop and report. **Add Exercise 2** opens the second; trainees can be assigned or moved between exercises. |
| `/session/join` | Trainee | Join with your exercise's code from the console, then open the monitors. Shows exercise status but never names the incident. |
| `/screen/alarms` | Trainee | Monitor 01: alarm summary and acknowledgement, Calls panel. |
| `/screen/line-map` | Trainee | Monitor 02: SCADA line map, train commands (route, dispatch, HII hold), train inspector, Calls panel. |
| `/screen/timetable` | Trainee | Monitor 03: traffic current timetable and train regulation graph. |
| `/report` | Trainer | Post-session report: score, checklist, timeline, evidence log, trainer notes. |
| `/admin` | Admin trainer | **People**: add trainers and trainees, reset passwords, switch accounts off, make admins. |

`/ios`, `/ios/scenarios` and `/ios/assessment` are old addresses; they open the
Trainer Console.

### Run-through

1. Trainer opens `/`, signs in and opens the Trainer Console. For two trainees,
   click **Add Exercise 2**: each exercise has its own 4-character code (for
   example `K7M2`). **Reset whole session** issues a new code for that exercise.
2. Each trainee opens `/` on their PC, signs in with their own account, joins
   with their exercise's code and clicks **Open my monitors**. (The trainer can
   also pick the trainee in an exercise's **Assign** list, or **Move** them.)
3. Trainer picks a scenario in an exercise's column (for example **PSD Fault →
   Single PSD failed to close**) and clicks **Load scenario**; the other
   exercise is not affected.
4. The trainee finds the incident alarm on Monitor 01, acknowledges it, selects
   and holds the train on Monitor 02, makes the SOP calls from the **Calls**
   tab (Radio / Teleph.), and releases the train.
5. Trainer watches each checklist fill in, clicks **Complete**, then opens that
   exercise's **Report**.

A trainee's pages and monitors always show their own exercise, and follow them
when the trainer moves them. A trainee cannot see or act in the other exercise.
The console's **Open monitors** opens an exercise's monitors on the trainer's PC
(`/screen/...?session=<code>`).

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
`http://127.0.0.1:8787` and is the only writer of the session:

- Every page action is a **command** (`src/session-commands/types.ts`), for
  example `ACK_ALARMS`, `TRAIN_HOLD` or `LOAD_SCENARIO`. The server checks it,
  applies it with the same code the page uses (`applySessionCommand`), scores
  the session with the scenario definition and logs who sent it.
- Pages receive a snapshot, then small versioned deltas, over server-sent
  events. A page shows its own command at once and corrects itself when the
  server's version arrives.
- The Line Map's train movement is sent as `SIM_UPDATE`; it can move trains and
  routes but cannot change door faults, ITAMA, the checklist or evidence.
- One Line Map window per session runs the train simulation (the clock owner,
  `sessionMeta.simulationOwner`). The first Line Map to open takes it; any other
  Line Map shows **View only** with a **Take control** button, and the server
  refuses its train movement. The clock passes on when the owner window closes,
  or after 45 s without its heartbeat. Keep the owner window visible: browsers
  slow down timers in hidden tabs.
- Every request except the health check and sign-in needs a signed-in account
  (`Authorization: Bearer <token>`; the event stream takes `?token=`). Commands
  act as that account, whatever the page sends, so the action log and evidence
  name the real person.
- Loading, completing and resetting scenarios, the action log and reports are
  for trainers; managing people is for admin trainers.
- Accounts (`server/auth.ts`): passwords are stored as salted scrypt hashes and
  sign-in tokens only as SHA-256 hashes, all in the SQLite file.
- Without a backend (`VITE_OCC_API_BASE=disabled`) there are no accounts and
  commands apply in the page only.

| Command | Use |
| --- | --- |
| `npm.cmd run backend` | Development: runs `server/main.ts` through Vite, no build step |
| `npm.cmd run backend:lan` | Development, reachable from other PCs |
| `npm.cmd run build:server` | Bundles the backend into `dist-server/main.js` |
| `npm.cmd run start:server` | Runs the bundled backend (use this on the LAN host) |

Data is kept in one SQLite file, `server/data/occ-training.sqlite` (ignored by
Git), using the SQLite built into Node 24: the sessions, an action log (every
command with its sender and result, screen joins, new sessions, report
archives) and archived reports. Train movement is not logged.
On first start it imports `session.json` / `reports.ndjson` from the old
backend and renames them `*.migrated`. `npm.cmd run reset:runtime` deletes all
backend data (stop the backend first).

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Readiness, current session code and id (no sign-in needed) |
| `GET /api/auth/status` | Whether the first trainer still has to be set up |
| `POST /api/auth/setup` | Create the first trainer (admin); only while there are no accounts |
| `POST /api/auth/login` | Sign in: `{ username, password }` gives `{ token, user }` |
| `POST /api/auth/logout` | End this sign-in |
| `GET /api/auth/me` | The signed-in account |
| `GET /api/users`, `POST /api/users`, `PATCH /api/users/<username>` | Admin: list, add and change accounts |
| `GET /api/session` | Session snapshot with its id and version |
| `POST /api/session/commands` | Send a command: `{ sessionId, commandId, actor, command }`. 409 if the session has ended (reset) |
| `GET /api/session/events` | Live stream: a snapshot, then `session:update` deltas |
| `GET /api/session/status` | Session code, lifecycle and joined screens |
| `POST /api/session/screens` | Register or heartbeat a page |
| `POST /api/session/simulation` | A Line Map window claims the train simulation: `{ sourceId, takeover }` |
| `GET /api/session/actions` | Action log of the current session (or `?sessionId=`) |
| `POST /api/session/runtime` | Start Exercise 1 afresh |
| `GET /api/sessions`, `POST /api/sessions`, `DELETE /api/sessions/<id>` | Trainer: list exercises, open Exercise 2, close it (once nobody is in it) |
| `GET /api/trainees` | Trainer: trainee accounts that can be assigned |
| `POST /api/class/join` | Trainee: join the exercise with `{ code }` |
| `POST /api/class/assign` | Trainer: put a trainee in an exercise, `{ traineeId, sessionId }` |
| `GET /api/reports/latest` | Report summary of the current run, built by the server |
| `GET /api/reports` | Archived reports |
| `POST /api/reports` | Save trainer notes with the current run's report (the server scores it) |

Session requests take an optional `?session=<code or id>`; without it a trainee
gets their own exercise and everyone else Exercise 1. Completed runs are archived automatically.

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

- The app is served over plain HTTP on the LAN, so passwords and tokens are
  not encrypted in transit. Keep it on the training network.
- One trainer console runs at most two exercises, one trainee each.
- The 12-car rescue SOP is not modelled yet.
