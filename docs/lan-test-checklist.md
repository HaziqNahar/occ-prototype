# On-site LAN Rehearsal: One Trainer, Two Trainees

Run this once on the OCC training network before the simulator is used for real
training, and again after moving the host or changing the network. It checks
what the automated rehearsal (`npm run test:lan`) cannot: real PCs, monitors,
the firewall and the network.

**People and PCs:** host PC (can be the trainer PC), trainer PC, two trainee PCs
with three monitors each. Allow about 75 minutes. Note the result of each step;
anything that fails goes to the troubleshooting table in
[lan-setup.md](lan-setup.md).

Date: ____________  Host address: ____________  Tester: ____________

## A. Host

| # | Step | Expected | OK? |
| --- | --- | --- | --- |
| A1 | Start `scripts\start-occ-host.cmd` | Window shows the listening address and "Open on the other PCs" | |
| A2 | On the host, open `http://localhost:8787/api/health` | `"status": "ok"` | |
| A3 | Close the server window, start it again | Starts again; nothing lost | |

## B. Network

| # | Step | Expected | OK? |
| --- | --- | --- | --- |
| B1 | On each PC open `http://<host>:8787/api/health` | `"status": "ok"` on all three PCs | |
| B2 | On each PC open `http://<host>:8787/` | Sign-in page | |

## C. Accounts

| # | Step | Expected | OK? |
| --- | --- | --- | --- |
| C1 | Trainer signs in (or sets up the first trainer) | Trainer Console | |
| C2 | People: add two test trainees | Both listed as Active | |
| C3 | Trainee PC 1 signs in as trainee 1, PC 2 as trainee 2 | Trainee page, "Hello, <name>" | |
| C4 | On a trainee PC open `http://<host>:8787/ios/modules` | "Not available" (console is for trainers) | |

## D. Two exercises

| # | Step | Expected | OK? |
| --- | --- | --- | --- |
| D1 | Trainer: **Add Exercise 2** | Two columns, two different codes | |
| D2 | Trainee 1 joins Exercise 1's code, trainee 2 Exercise 2's | Each console column shows its trainee | |
| D3 | Each trainee: **Open my monitors**, place on the three monitors, `F11` | Alarms / Line Map / Timetable full screen; console shows 3/3 monitors per exercise | |
| D4 | Line Maps | No "View only" notice on either | |
| D5 | Trainer loads **PSD Fault** in Exercise 1 and **Train Door Fault** in Exercise 2 | Each trainee's page shows "Exercise running"; the other exercise is unchanged | |

## E. Working the incident

| # | Step | Expected | OK? |
| --- | --- | --- | --- |
| E1 | Each trainee acknowledges the incident alarm on Monitor 01 | The console's checklist ticks within a second | |
| E2 | Each trainee holds the train on Monitor 02 and makes the SOP calls (Calls tab) | Checklist and Trainee activity update live | |
| E3 | Trains keep moving smoothly on both Line Maps for 5 minutes | No jumps, no freezing | |
| E4 | Unplug trainee PC 2's network cable for 30 s, plug it back | Its monitors catch up within a minute without reloading | |
| E5 | Trainee releases the train; trainer clicks **Complete** in each column | Both show COMPLETE; trainee pages show "Exercise complete" | |

## F. Afterwards

| # | Step | Expected | OK? |
| --- | --- | --- | --- |
| F1 | Each column: **Report**, add a note, save | "Saved as …" | |
| F2 | **History** | Both runs, each with the right trainee and every action | |
| F2a | History: open a run, **Export CSV**, then **Print / PDF** | CSV opens in Excel with the checklist and actions; the print preview is black on white | |
| F3 | **Progress** for each trainee | One run each | |
| F4 | People → **Back up now** | "Latest: <now>" | |
| F5 | Close the server window, wait, start it again, reload the console | Both exercises and the history are still there | |

## G. The other scenarios

One run of each, so every scenario has been tried on the real PCs. Use both
exercises side by side to save time.

| # | Step | Expected | OK? |
| --- | --- | --- | --- |
| G1 | Trainer loads **Train Loop & Shuttle Service → Dual train loop with shuttle** in Exercise 1 | Trainee sees the loops, shuttle, bridging buses and intermediate terminals; console shows "line-wide" and no train is held | |
| G2 | Trainee 1 makes the calls from the Calls tab: **Broadcast to all Stations & Trains**, Station Staff (FRP or HGN), CoC disruption PA, shuttle PA and disruption notice | Each call ticks its checklist step; trainer reviews and completes: PASS | |
| G3 | Trainer loads **Unscheduled Train Withdrawal** in Exercise 2 | Trainee sees "CC has decided to withdraw Train … at …"; that train is held at that platform on Monitor 02 | |
| G4 | Trainee 2 selects the train and calls the driver, station staff, CoC and DTC; trainer ticks **Close all train doors & PSDs**; trainee logs Train Clear, sets a route and moves the train off | Checklist complete; trainer completes: PASS | |
| G5 | Trainer loads **Train Withdrawal** in either exercise | Checklist includes the CoC PA, DTC alert, doors & PSDs closed and Train Clear before the route | |
| G6 | Trainee withdraws the train to the RT2 depot without the CoC / DTC / Train Clear calls; trainer clicks **Complete** | Refused: "Cannot complete yet. Open: …" lists those steps | |
| G7 | Trainee makes the missing calls, trainer ticks doors & PSDs, then completes | PASS | |
| G8 | Trainer loads **Train Launch** in either exercise and the trainee launches a train from the depot | Train enters SKG mainline service; trainer completes: PASS | |

## H. Clean up

- Switch off the two test trainee accounts on the People page.
- Copy `server\data\backups` to the backup location.

Signed off: ____________
