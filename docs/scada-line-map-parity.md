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
| Shared frame (header, ribbon, footer) | 9 | 3 | 0 | 12 |
| Line Map | 10 | 4 | 0 | 14 |
| Alarms | 3 | 0 | 1 | 4 |
| Timetable | 4 | 1 | 0 | 5 |
| **Total** | **26** | **8** | **1** | **35** |

Fidelity by item: (26 + 8 x 0.5) / 35 = **about 86%** (70% at the 13 Oct
audit, before the alarm and timetable fixes). The layout and drawing of every
screen are close to the references; the remaining gap is mostly what the Line
Map shows while running. In live use it looks emptier than the score suggests,
because of the train coverage gap (Line Map item 9).

## Shared Frame

| # | Area | Reference | Status | Notes |
| ---: | --- | --- | --- | --- |
| 1 | Canvas size | About 1275 x 1019 per monitor | Done | |
| 2 | Live surface | Hand-built SVG/DOM, no screenshot slices | Done | |
| 3 | Window chrome | The references are full screen: no title bar, menu row or status row | Partial | Our blue title bar, menu row and "SCADA window ready" row use about 70 px of height. Hide them in full screen (F11). |
| 4 | `Alarms` / `Calls` side tabs | Vertical tabs at top left | Done | |
| 5 | Header alarm panel | `Not Ack`, `Total`, the latest alarms (newest at the bottom), `Display` | Done | New alarms push the shift's opening alarms up. |
| 6 | Header calls panel | `P E C 0`, `RATIS 0`, `Telepn. 0` (greyed), `Radio 0`, `Author. 0`, `P C P 0`, message pane | Partial | Labels read `PECO` and `RATS 0`, and the greyed button is RATS rather than Telepn. |
| 7 | Station ribbon | Station dots HBF to PGC, `O C C DEPOT`, `OVERALL` | Done | |
| 8 | Bottom toolbar | LAYOUT, COMMAND, POWER, E C S, TRAFFIC, COMS, UTILITY, ADMIN, page arrows, help | Done | |
| 9 | Bottom mode buttons | Point No., Track No., FB No., Signal No., Car/Train, NorthBound/SouthBound, Temporary Speed Restriction | Done | |
| 10 | Bottom utility icons | Pan, zoom, window, system command, note, print | Done | |
| 11 | Operator box | Operator username over `[ TSR1 ] @ OCC` | Partial | The username line is empty; show the signed-in trainee's username. |
| 12 | Clock box | Time and date | Done | |

## Line Map

| # | Area | Reference | Status | Notes |
| ---: | --- | --- | --- | --- |
| 1 | Whole line | HBF to PGC as one continuous schematic | Done | Pans seamlessly from HBF to PGC. |
| 2 | Title and ATC blocks | `DETAIL SIGNALLING SYSTEM HBF TO PGC`, `CYCLE / NONE`, ATC01-ATC11 GGAMA/GTSR | Done | |
| 3 | Signals | Heads with S-numbers, red/white state | Done | |
| 4 | Points and crossovers | P-labels, crossovers, LTI and PTP centre sidings, BGK RT1-RT3 depot links | Done | |
| 5 | HBF siding | Track 100-102 to P101 | Done | |
| 6 | PGC tail | Crossovers past PGC to S1111 and the sidings | Partial | Our map stops at the 1115 crossover. |
| 7 | Platforms | PSD/PH, SPKS/CD, ESB/ESP boxes per platform, green bars | Partial | Drawn correctly. PSD fault scenarios mark the PSD box; train door faults and the other indicators never change. |
| 8 | Track colours | Normal service: main line white, occupied blocks red, routes yellow | Partial | With no route set, the whole main line is drawn yellow, so the screen looks very different from the reference at a glance. |
| 9 | Trains in service | About 30 train tags spread over the whole line | Partial | **Biggest gap.** Timetable trains only run between SKG and PGC (the timetable route audit finds routes for those stations only), so HBF to HGN never shows a train. A loaded scenario adds its own train. |
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
| 4 | Background alarm traffic | Train holds, emergency brakes, skip-stop demands, route abandoned, arriving during the shift | Missing | Only the scenario's alarm arrives; the list is otherwise static. |

## Timetable Monitor

| # | Area | Reference | Status | Notes |
| ---: | --- | --- | --- | --- |
| 1 | Layout | Loaded time table, Station, Direction, ORIGIN / SELECTED STATION / DESTINATION, six action buttons, Help/Print/Close | Done | Our extra `LIVE hh:mm:ss` box is not in the reference. |
| 2 | `Stat.` column | `R`, `>`, `M>` and similar per train | Done | Shows each train's state (`I>`, `W>`, `>`, `H>`, `R`). |
| 3 | `Run` column | Run time to the next station (`02:21`) | Done | From the full timetable; times and durations two-digit as in the reference. |
| 4 | Rev., Speed inc., Min. dwell, Crew # | `Y` flags; Crew # blank | Done | |
| 5 | Deviation graphs | Train numbers, early/late bars in green/yellow, times under each train | Partial | Axes and train numbers are drawn; bars and times stay at zero because trains never run early or late. |

## Interactions

Unchanged since the last audit and covered by the browser tests
(`npm run test:ui`).

| Interaction | Behaviour | Status |
| --- | --- | --- |
| Click train | Selects the train and updates the status bar | Done |
| Right-click train | SCADA-style command menu with inspection, readiness and ITAMA options | Done |
| ITAMA | `SIG Arrival Time for Train` dialog; applying it records the task | Done |
| Route / Dispatch / Hold | SCADA command request dialog, recorded as scenario actions | Done |
| Alarms / Calls tabs | Switch the header panel; Calls opens the comms dialog | Done |
| Acknowledge alarms | Ack all / Ack selection; only the incident alarm scores | Done |
| Timetable row select | Selects the train for the scenario | Done |

## To Do, in Priority Order

| # | Work | Fixes | Estimate |
| ---: | --- | --- | --- |
| 1 | Run timetable trains over the whole line (route definitions HBF to SKG, both directions, from the full timetable) | Line Map 9 | 4-5 days |
| 2 | ~~New alarms show `N`, count as Not Acknowledged and appear in the header panel~~ | Done | |
| 3 | ~~Timetable `Stat.` and `Run` columns and the Rev./Speed/Min. dwell/Crew flags~~ | Done | |
| 4 | Main line white in normal service; yellow only for a set route | Line Map 8 | 0.5 day |
| 5 | PSD and door states on the platform boxes (with the PSD and door fault scenarios) | Line Map 7 | 1-2 days |
| 6 | Train delays, so the deviation graphs move | Timetable 5 | 1 day, after 1 |
| 7 | Background alarm traffic during a run | Alarms 4 | 1 day |
| 8 | Small items: hide window chrome in full screen, operator username, `RATIS`/`P E C` labels, PGC tail, remove `LIVE` box | Frame 3, 6, 11; Line Map 6 | 1 day |

Items 4 and 8 (about 1.5 days) raise the item score to about 93%, but item 1
is what makes the Line Map look like the real line.

## Line Map Keys

| Key | Behaviour |
| --- | --- |
| `Home` / `End` | Jump to the first or last line section. |
| `ArrowLeft` / `ArrowRight` | Pan to the previous or next section. |
