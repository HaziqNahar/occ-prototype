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

### On the training LAN (host PC + trainer and trainee PCs)

**[docs/lan-setup.md](docs/lan-setup.md)** is the install and start-up guide.
In short, on the host PC:

```powershell
npm.cmd ci
npm.cmd run host:build
scripts\start-occ-host.cmd
```

The host serves the app and the API on one port: the other PCs open
`http://<host>:8787/`, and only port 8787 needs to be open in the firewall. The
start script restarts the server if it stops. Before first real use, run the
on-site rehearsal in [docs/lan-test-checklist.md](docs/lan-test-checklist.md).

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
| `/ios/modules` | Trainer | **Trainer Console**: one tab per exercise (up to two). Each has its own code (with Copy), trainee, monitors, scenario cards and settings (incident, mode, time target, timetable), run card (time, steps, score, wrong actions; pause/complete/stop/new run and the **Aids on/off** switch, Practice only), steps with the next one marked **Now**, a **Live** feed and its report. **Add Exercise 2** opens the second; trainees can be assigned or moved between exercises. |
| `/session/join` | Trainee | Join with your exercise's code from the console, then open the monitors. Shows exercise status but never names the incident. |
| `/screen/alarms` | Trainee | Monitor 01: alarm summary and acknowledgement, Calls panel. |
| `/screen/line-map` | Trainee | Monitor 02: SCADA line map, train commands (route, dispatch, HII hold), train inspector, Calls panel. |
| `/screen/timetable` | Trainee | Monitor 03: traffic current timetable and the train regulation graph (static display). |
| `/report` | Trainer | Post-session report: result and score, **To discuss** (refusals, missed or slow steps, time over target, hints used), steps and all actions as two tabs, trainer notes and sign-off. |
| `/admin` | Admin trainer | **People**: add trainers and trainees, reset passwords, switch accounts off, make admins. |
| `/history` | Trainer (trainee: own runs) | **Run history**: every archived run in one table to sort and filter (trainee, result, search). A run opens in a side panel: result, To discuss, steps, trainer notes and, from the action log, each action with who did it and when. **Export CSV** saves the run list or one run; **Print / PDF** prints the open run. |
| `/progress` | Trainer (trainee: own) | **Trainee progress**: totals (runs, completed, passed, average), a score-over-time chart, and pass rate, best, average and latest result per scenario. **Export CSV** and **Print / PDF** for training records. |

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
   Single PSD failed to close**), a **Mode** (Practice or Assessment) and clicks
   **Load scenario**; the other exercise is not affected.
4. The trainee finds the incident alarm on Monitor 01, selects its row and
   clicks **Ack. selection**, right-clicks the train on Monitor 02 to select it
   and holds it, makes the SOP calls from the **Calls** tab (Radio / Teleph.),
   and releases the train with **DISPATCH** on the panel at its station.
5. Trainer watches each checklist fill in, clicks **Complete**, then opens that
   exercise's **Report**.

A trainee's pages and monitors always show their own exercise, and follow them
when the trainer moves them. A trainee cannot see or act in the other exercise.
The console's **Open monitors** opens an exercise's monitors on the trainer's PC
(`/screen/...?session=<code>`).

### Practice aids

In a **Practice** run each trainee monitor shows a small **PRACTICE** coach at
the top right. It is drawn over the SCADA screen and never changes it; it can
be dragged elsewhere (remembered per monitor). Click it to open it:

- **Next step**: the next checklist step and how to do it, for example
  "Calls → Teleph. → Chief Controller (CC) → Alert CC of the incident". On the
  other monitors it says where the step is done.
- **Show me** outlines what to click: the train, the incident row, the Calls
  tab, the DISPATCH button on the train's station panel, or a timetable row.
- **Locate Train …** (Line Map) moves the map to the scenario train and puts a
  pulsing ring on it.
- A refused or out-of-order action shows why, for example "Select Train 337
  before acknowledging its alarm."

The trainer can switch the aids off with **Aids on/off**. In **Assessment**
nothing is shown and the switch is locked off (the server enforces it). Show
me and Locate uses are counted in the report and History but never taken off
the score. Hints come from the scenario definitions, so a new scenario gets
them without extra work. Design and status:
[docs/training-layer-plan.md](docs/training-layer-plan.md).

## Scenarios

| Scenario | Incidents |
| --- | --- |
| Train Launch | Launch a timetable train from the RT depot into SKG mainline service |
| Train Withdrawal | Withdraw a live train to the RT2 depot |
| Train Door Fault | Door failure (open/close), EHS activation, detrainment door cover open |
| PSD Fault | Obstructed, single PSD failed to open, single PSD failed to close, PSD summary light not available (override switch), manual PSD operation (RM train), multiple PSD failed to open |
| Train Loop & Shuttle Service | Single train loop, dual train loop, single loop with shuttle, dual loop with shuttle, loop with shuttle (single platform) |
| Unscheduled Train Withdrawal | Withdraw a train from service at a station on the Chief Controller's decision |

- Fault scenarios follow the NEL OCC SOPs for train door faults
  (NEL/OPS/TRA/OP/TRN/07.001.34) and PSD faults (NEL/OPS/TRA/OP/DEG/09.001.18).
  Train Launch, Train Withdrawal and Train Door Fault keep the trainer's own
  steps.
- Train Loop & Shuttle Service follows the OCC actions in
  NEL/OPS/TRA/OP/DEG/14.001.46 (one incident per service pattern in section 7);
  it is line-wide, with no scenario train, and is scored on the calls logged.
- Unscheduled Train Withdrawal follows section 7.2 of NEL/OPS/TRA/OP/OCC/03.001.9.
  Like a fault run, the train is placed and held at a random platform. Closing
  the train doors and PSDs for train clear is confirmed by the trainer.
- Each fault run picks a random train, station and bound. The train is placed
  and held at that platform, and the alarm text names the location.
- Only acknowledging the scenario's own incident alarm counts towards the score.
  While a run is in progress, routine alarms (train holds, emergency brakes,
  routes abandoned and similar, for SKG-PGC) arrive every 1.5-3 minutes, as in
  a real shift; they are not scored (`src/backgroundAlarms.ts`).
- PH lights on the platform where a held train stands. The Timetable's
  regulation graphs are a static display (every train on time).
- Steps are scored from live actions: alarm acknowledgement, train selection,
  holds, door commands, routes, dispatch, and calls logged from the Calls panel
  (`src/comms/commsCatalog.ts`). Critical steps are marked with ★.
- As at the OCC, a station panel's **DISPATCH** and **HII** act only on the
  train at that panel's station (the dialog names it; a panel with no train is
  refused). The panel's **ROUTE** switches it between Central AUTO and MANUAL;
  a train's route is set from a signal (right-click → **Define Route**). On the
  Line Map, right-click a train for its menu and double-click it for its
  inspector; a left click does nothing. See
  [docs/scada-line-map-parity.md](docs/scada-line-map-parity.md).
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
| `npm.cmd run start:server` | Runs the bundled backend on this PC only |
| `npm.cmd run host:build` | Builds the app and the backend for the LAN host |
| `npm.cmd run host:start` | Runs the LAN host: app and API on port 8787, reachable from other PCs |
| `scripts\start-occ-host.cmd` | As `host:start`, builds first if needed and restarts the server if it stops |
| `npm.cmd run backup` | Copies the database into `server/data/backups` |
| `npm.cmd run restore -- <file>` | Puts a backup back (server stopped); keeps the replaced data |
| `npm.cmd run reset:password -- <user> <password>` | Sets a password and switches the account on |

Data is kept in one SQLite file, `server/data/occ-training.sqlite` (ignored by
Git), using the SQLite built into Node 24: the sessions, an action log (every
command with its sender and result, screen joins, new sessions, report
archives) and archived reports. Train movement is not logged. The server copies
the database daily into `server/data/backups` (newest 14 kept; `OCC_BACKUP_DIR`,
`OCC_BACKUP_KEEP`).
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
| `GET /api/history`, `GET /api/history/<run id>` | Past runs (`?trainee=` to filter), and one run with its checklist and actions. Trainees get their own only |
| `GET /api/progress?trainee=<id>` | A trainee's progress (a trainee gets their own) |
| `GET /api/admin/backups`, `POST /api/admin/backups` | Admin: list backups, make one now |
| `GET /api/reports/latest` | Report summary of the current run, built by the server |
| `GET /api/reports` | Archived reports |
| `POST /api/reports` | Save trainer notes with the current run's report (the server scores it) |

Any other address is the app itself, served from `dist/` (`OCC_STATIC_DIR`); a
production build talks to the server it was loaded from.

A run is archived (and appears in the history) when it is completed, or when
the trainer saves notes on its report; runs stopped without either are not kept.

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
- `npm.cmd run test:lan` is the LAN rehearsal: it builds the production app
  into `.lan-build/` (never the `dist/` a running host serves), runs the
  bundled server on port 8799 with fresh data, and takes one trainer and two
  trainees (separate browser profiles) through both exercises, from sign-in to
  history and a backup: Exercise 1 in Practice, Exercise 2 in Assessment.

## Known Limits

This is a prototype for demos and practice runs, not yet for formal assessment:

- The app is served over plain HTTP on the LAN, so passwords and tokens are
  not encrypted in transit. Keep it on the training network.
- One trainer console runs at most two exercises, one trainee each.
- The 12-car rescue SOP is not modelled yet.
