# SCADA Monitor Parity Checklist

This checklist keeps the simulator's three trainee monitors (Alarms, Line Map,
Timetable) aligned with the SBS Transit OCC monitor references. The goal is a
functional recreation of the real SCADA screens, not a modern redesign.

Last audited: 13 Oct 2026, against the current build (screenshots of each
monitor at 1275 x 1019, with no scenario and with Train Door Fault loaded).

## Reference Files

The reference screenshots are controlled material and are not stored in this
repository.

| Reference | Shows |
| --- | --- |
| `Full Screen - GWS Traffic Schematic.JPG` | Whole line HBF to PGC on one wide screen, in normal service |
| `Full Screen - GWS View Setting.JPG` | The three monitors side by side: Timetable, Line Map, Alarms |
| `Screenshot 1.png` | Traffic current time table with the deviation graphs |
| `Screenshot 2.png` | Line Map, HBF to LTI, with the Calls panel |
| `Screenshot 3.png` | Alarm summary display, with the Alarms panel |
| `Screenshot 4-6.png` | Further captures from the same session |
| `Line 01-04 (... ).png`, `20260226_102707.jpg` | Earlier per-section traces and the ITAMA dialog photo |

## Score

Status values: **Done** (matches the reference), **Partial** (present but
different or incomplete), **Missing** (not there, or wrong).

| Monitor | Done | Partial | Missing | Items |
| --- | ---: | ---: | ---: | ---: |
| Shared frame (header, ribbon, footer) | 12 | 0 | 0 | 12 |
| Line Map | 14 | 0 | 0 | 14 |
| Alarms | 4 | 0 | 0 | 4 |
| Timetable | 5 | 0 | 0 | 5 |
| **Total** | **35** | **0** | **0** | **35** |

All 35 items now match the references (70% at the 13 Oct audit). Known
simplifications: trains are late only when held (no running-time variation),
and routine alarms come from a fixed set of six kinds.

## Shared Frame

| # | Area | Reference | Status | Notes |
| ---: | --- | --- | --- | --- |
| 1 | Canvas size | About 1275 x 1019 per monitor | Done | |
| 2 | Live surface | Hand-built SVG/DOM, no screenshot slices | Done | |
| 3 | Window chrome | The references are full screen: no title bar, menu row or status row | Done | In full screen (F11) the title, menu and status rows are hidden and the monitor fills the screen; in a window they stay. |
| 4 | `Alarms` / `Calls` side tabs | Vertical tabs at top left | Done | |
| 5 | Header alarm panel | `Not Ack`, `Total`, the latest alarms (newest at the bottom), `Display` | Done | New alarms push the shift's opening alarms up. |
| 6 | Header calls panel | `P E C 0`, `RATIS 0`, `Telepn. 0`, `Radio 0`, `Author. 0`, `P C P 0`, message pane | Done | `Teleph.` stays a working button: the disruption scenarios use it. |
| 7 | Station ribbon | Station dots HBF to PGC, `O C C DEPOT`, `OVERALL` | Done | |
| 8 | Bottom toolbar | LAYOUT, COMMAND, POWER, E C S, TRAFFIC, COMS, UTILITY, ADMIN, page arrows, help | Done | |
| 9 | Bottom mode buttons | Point No., Track No., FB No., Signal No., Car/Train, NorthBound/SouthBound, Temporary Speed Restriction | Done | |
| 10 | Bottom utility icons | Pan, zoom, window, system command, note, print | Done | |
| 11 | Operator box | Operator username over `[ TSR1 ] @ OCC` | Done | The signed-in username, in capitals. |
| 12 | Clock box | Time and date | Done | |

## Line Map

| # | Area | Reference | Status | Notes |
| ---: | --- | --- | --- | --- |
| 1 | Whole line | HBF to PGC as one continuous schematic | Done | Pans seamlessly from HBF to PGC. |
| 2 | Title and ATC blocks | `DETAIL SIGNALLING SYSTEM HBF TO PGC`, `CYCLE / NONE`, ATC01-ATC11 GGAMA/GTSR | Done | |
| 3 | Signals | Heads with S-numbers, red/white state | Done | |
| 4 | Points and crossovers | P-labels, crossovers, LTI and PTP centre sidings, BGK RT1-RT3 depot links | Done | |
| 5 | HBF siding | Track 100-102 to P101 | Done | |
| 6 | PGC tail | Tracks 1111-1113 and 1110-1112 to buffer stops, end signals S1111 and S1117 | Done | |
| 7 | Platforms | PSD/PH, SPKS/CD, ESB/ESP boxes per platform, green bars | Done | Green bars follow the platform doors; PSD faults flash the PSD box; PH lights while a train held by the operator is at the platform. |
| 8 | Track colours | Normal service: main line white, occupied blocks red, routes yellow; sidings and depot links yellow | Done | Idle main line blocks draw white; route and occupancy colours are unchanged. |
| 9 | Trains in service | Timetable trains on the training area | Done | Timetable trains run between SKG and PGC only, which is correct for this simulator (confirmed 13 Oct 2026). Elsewhere a scenario shows its own train. |
| 10 | Train tags | Green number tag with direction notch and red/yellow bar | Done | |
| 11 | Direction arrows | White arrows above and below the tracks | Done | |
| 12 | Command stacks | ROUTE/OCCA, DISPATCH/OCCA, HII/ISCS per station | Done | |
| 13 | `GH` button | Bottom left of the first section | Done | |
| 14 | Panning | Drag, wheel, keyboard (`Home`, `End`, arrows) | Done | |

## Alarms Monitor

| # | Area | Reference | Status | Notes |
| ---: | --- | --- | --- | --- |
| 1 | Layout | Archives/Events/Alarms tabs, Help/Filter/Print/Close, Ack all/Ack selection/Unselect, sort field, columns | Done | |
| 2 | Ack column and `Not Acknowledged` | A new alarm shows `N` and is counted until acknowledged | Done | |
| 3 | Total | The alarm archive count | Done | 63 at the start of the shift, plus each alarm raised since. |
| 4 | Background alarm traffic | Train holds, emergency brakes, skip-stop demands, route abandoned, arriving during the shift | Done | While an exercise runs, a routine alarm arrives every 1.5-3 minutes: grey, unacknowledged, SKG-PGC trains and routes only, not scored. The incident alarm is never pushed off the list. |

## Timetable Monitor

| # | Area | Reference | Status | Notes |
| ---: | --- | --- | --- | --- |
| 1 | Layout | Loaded time table, Station, Direction, ORIGIN / SELECTED STATION / DESTINATION, six action buttons, Help/Print/Close | Done | Our extra `LIVE` / `PLAYBACK` clock box is not in the reference; kept so the trainee can see when the trainer runs the clock faster. |
| 2 | `Stat.` column | `R`, `>`, `M>` and similar per train | Done | Shows each train's state (`I>`, `W>`, `>`, `H>`, `R`). |
| 3 | `Run` column | Run time to the next station (`02:21`) | Done | From the full timetable; times and durations two-digit as in the reference. |
| 4 | Rev., Speed inc., Min. dwell, Crew # | `Y` flags; Crew # blank | Done | |
| 5 | Deviation graphs | Train numbers, early/late bars in green/yellow, times under each train | Done | A held train runs late for as long as it is held, and stays late after it moves on; a late scenario train leads its direction's strip. |

## Interactions

Unchanged since the last audit and covered by the browser tests
(`npm run test:ui`).

| Interaction | Behaviour | Status |
| --- | --- | --- |
| Click train | Nothing, as at the OCC (confirmed 14 Oct 2026) | Done |
| Right-click train | Selects the train and opens the SCADA-style command menu with inspection, readiness and ITAMA options | Done |
| Double-click train | Selects the train and opens its inspector (Information page). Accepted as correct (14 Oct 2026) | Done |
| ITAMA | `SIG Arrival Time for Train` dialog; applying it records the task | Done |
| Route / Dispatch / Hold | The station panel's DISPATCH and HII act on the train at that station only (confirmed 14 Oct 2026); the command dialog names it, and a panel with no train there is refused. ROUTE switches the panel between Central AUTO and MANUAL; a train's route is set from a signal (right-click → Define Route) | Done |
| Alarms / Calls tabs | Switch the header panel; Calls opens the comms dialog | Done |
| Acknowledge alarms | No row is selected when the summary opens (confirmed 14 Oct 2026); select the row, then Ack selection, or Ack all; only the incident alarm scores | Done |
| Timetable row select | Selects the train for the scenario | Done |

## To Do, in Priority Order

| # | Work | Fixes | Estimate |
| ---: | --- | --- | --- |
| 1 | ~~Run timetable trains over the whole line~~ | Not needed: SKG-PGC only is correct | |
| 2 | ~~New alarms show `N`, count as Not Acknowledged and appear in the header panel~~ | Done | |
| 3 | ~~Timetable `Stat.` and `Run` columns and the Rev./Speed/Min. dwell/Crew flags~~ | Done | |
| 4 | ~~Main line white in normal service~~ | Done | |
| 5 | ~~Platform hold (PH) on the platform boxes~~ | Done | |
| 6 | ~~Train delays, so the deviation graphs move~~ | Done | |
| 7 | ~~Background alarm traffic during a run~~ | Done | |
| 8 | ~~Small items: window chrome in full screen, operator username, calls labels, PGC end signals~~ | Done | |
| 9 | ~~Confirm at OCC what a left click on a train does~~ | Done (14 Oct 2026): nothing, as in the simulator. Same check fixed the station panels (they commanded the selected train, wherever it was) and the alarm summary (it opened with the top row selected) | |
| 10 | ~~Confirm what a double-click on a train opens~~ | Done (14 Oct 2026): the train inspector, as now | |


## Line Map Keys

| Key | Behaviour |
| --- | --- |
| `Home` / `End` | Jump to the first or last line section. |
| `ArrowLeft` / `ArrowRight` | Pan to the previous or next section. |
