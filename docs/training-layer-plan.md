# Training Layer Plan

Practice-mode aids drawn over the three trainee monitors (Alarms, Line Map,
Timetable). Agreed 14 Oct 2026. Pieces 1 and 2 done (`src/trainingAids.ts`,
`src/training-scenarios/hints.ts`, `src/components/TrainingCoach.tsx`).

## Rules

- **Overlays only.** The SCADA replica (layout, colours, fonts, interactions)
  does not change. Trainees must train on screens that match the real OCC
  workstation, so the aids sit on top and never redesign the monitors.
- **Practice only.** In Assessment nothing appears. The server enforces this
  from the session's `trainingMode`, so a trainee cannot switch aids on.
- **The training area is SKG–PGC.** Scenario trains, faults and hints stay
  there (see `FAULT_STATIONS` in `src/training-scenarios/faultLocation.ts`).

## Pieces

| # | Piece | What the trainee sees | Estimate |
| ---: | --- | --- | --- |
| 1 | Mode switch | Aids are on for Practice runs; an **Aids on/off** switch on the Trainer Console. Assessment forces them off. | ½ day |
| 2 | Next-step coach | A small panel on each monitor showing the next checklist step and how to do it, e.g. "Calls → Teleph. → Chief Controller → *Alert CC of the incident*". On the other monitors: "Next step is on Monitor 01 Alarms". | 1 day |
| 3 | Show me / Locate | **Show me** outlines what to click: the fault train, the red alarm row, the Calls tab, the station's ROUTE or DISPATCH button. On the Line Map, **Locate** pans to the scenario train, which gets a pulsing ring. | ½–1 day |
| 4 | Instant feedback | When an action is refused or out of order, a short message on that monitor, e.g. "Select Train 337 before acknowledging its alarm". | ½ day |
| 5 | Aids used in the report | The run report and History show how many times Show me and Locate were used; the score is not reduced. | ¼ day |
| 6 | Tests | Every step in all 17 scenarios has a hint; browser tests that aids show in Practice, nothing shows in Assessment, and a refused action shows its message. | ½ day |

Total: about 3–3½ days. Start with pieces 1 and 2.

## Defaults

- **Coach position:** top right of each monitor, collapsed to one line until
  clicked; it can be moved. On the Line Map it covers part of the Calls
  message pane.
- **Aids switch:** on by default for Practice runs.
- **Aids used:** recorded in the report, not taken off the score.

## How hints are generated

Hints come from what each checklist step already records
(`TrainingScenarioTaskDefinition` in `src/training-scenarios/types.ts`), not
from text written per step, so new scenarios get hints automatically:

| Task field | Hint |
| --- | --- |
| `mappedTaskId: 'selectTrain'` | Click the scenario train on the Line Map |
| `mappedTaskId: 'ackAlarm'` | Alarms: select the red incident row, then **Ack. selection** |
| `commsMessageIds` | Calls: channel, recipient and message, from `src/comms/commsCatalog.ts` |
| `completesOnHold` | Train inspector **Control page → Train Hold**, or **HII** on the station panel |
| `doorCommandLabels` | Control page → **Door Open/Close Request** → the command |
| `mappedTaskId: 'setRoute'` | **ROUTE** on the station panel (or the Arrival/Departure Time dialog where the step names one) |
| `mappedTaskId: 'dispatchTrain'` | **DISPATCH** on the station panel |
| `mappedTaskId: 'completeScenario'` | The trainer completes the run on the console |
| trainer-confirmed steps | "Wait for the trainer to confirm" |
| anything else | The step's label and monitor |

## Where things are

- **Next step:** `scoreTrainingScenario(session).taskResults` gives each task
  definition and whether it is done. `src/screens/ExercisePanel.tsx` uses it
  to find the next step, and every monitor has the session.
- **Mode:** `session.trainingMode` (`'PRACTICE' | 'ASSESSMENT'`), set by the
  `LOAD_SCENARIO` command.
- **Scenario train and location:** `getActiveTrainingScenarioTargetTrainId`
  and `session.activeScenario.faultLocation`.
- **Monitors:**
  - Line Map: `src/screens/line-map/LineMapDom.tsx`, panned through `panTo`
    in `src/App.tsx`.
  - Alarms: `src/screens/AlarmsMonitorContent.tsx`. Refusal reasons currently
    only reach the window title through `setStatusNote`.
  - Timetable: `src/screens/TimetableMonitorContent.tsx`.
- **Command results:** `dispatch` returns `{ accepted, reason }` (see
  `src/useOccSession.ts`); use it for instant feedback.
