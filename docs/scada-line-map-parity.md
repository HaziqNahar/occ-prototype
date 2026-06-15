# SCADA Line Map Parity Checklist

This checklist keeps the prototype aligned with the SBS Transit OCC monitor references. The goal is not a modern redesign; it is a functional recreation of the observed SCADA screens.

## Reference Files

| Reference | Native size | Coverage | Prototype status |
| --- | ---: | --- | --- |
| `Line 01 (HBF to LTI).png` | 1275 x 1015 | HBF, OTP, CNT, CQY, DBG, LTI | Partial |
| `Line 02 (LTI to SER).png` | 1279 x 1019 | LTI, FRP, BNK, PTP, WLH, SER | Partial |
| `Line 03 (SER to SKG).png` | 1275 x 1019 | SER, KVN, HGN, BGK, SKG | Active baseline |
| `Line 04 (SKG to PGC).png` | 1279 x 1017 | SKG, PGL, PGC, OCC depot | Partial |
| `20260226_102707.jpg` | photo reference | ITAMA popup / Win98 dialog style | Partial |

## Global SCADA Frame

| Area | Required details | Status |
| --- | --- | --- |
| Canvas size | Use approximately 1275 x 1019 monitor space | Done |
| Live monitor surface | Use hand-built SCADA SVG elements instead of screenshot-backed UI | Done |
| Interaction zones | Keep real SVG train, toolbar, command stack, and control hotspots under/over the traced SCADA visual layer | Done prototype-level |
| Reference assets | Generate vector SVG traces from Line 01-04 screenshots; do not render PNG screenshot slices in the live app | Done |
| Window chrome | Blue title bar, grey menu row, status row | Partial |
| Top vertical tabs | `Alarms`, `Calls` | Done |
| Top alarm state | `Not Ack`, `Total`, alarm rows, scrollbar, `Display` icon button | Partial |
| Top calls state | `P E C`, `RATIS`, `Teleph.`, `Radio`, `Author.`, `P C P`, large grey message pane | Partial |
| Station ribbon | Blue station dots, station codes, `O C C DEPOT`, `OVERALL` | Partial |
| Bottom toolbar | Layout/Command/Power/ECS/Traffic/Coms/Utility/Admin with icons | Partial |
| Bottom mode buttons | Point No., Track No., FB No., Signal No., Train, NorthBound, SouthBound | Partial |
| Bottom utility icons | Pan/select, zoom, page/window, system command, note, print, terminal, help | Partial |

## Line Map Schematic

| Area | Required details | Status |
| --- | --- | --- |
| Four horizontal segments | Four full 1275px vector-traced SVG panels for Line 01-04, with no screenshot seams | In progress |
| Tracks | Main NB/SB tracks with explicit white/red/yellow block data instead of generated/random repeats | In progress |
| Signals | Signal heads, labels, sub-labels, red/white state | Partial |
| Points | P labels, crossover geometry, turnback routes, and junction geometry | In progress |
| Platforms | Station blocks with PSD/PH/SPKS/CD/ESB/ESP labels | Partial |
| Command stacks | ROUTE/OCCA, DISPATCH/OCCA, HII/ISCS | Done visually, partial behavior |
| Trains | Train number markers and direction triangles, including the main reference train IDs | In progress |
| Yard/depot | BGK/SKG/PGC sidings and depot connectors drawn as vector geometry | In progress |
| Scroll behavior | Horizontal pan controls, draggable map, keyboard pan, and direct wheel/trackpad pan across traced panels | Done prototype-level |

## Interactions

| Interaction | Expected prototype behavior | Status |
| --- | --- | --- |
| Click train | Select train and update status bar | Done |
| Right-click train | Intercept native browser menu and open SCADA-style command context menu with inspection/readiness/ITAMA options | Done prototype-level |
| Open ITAMA | Show Win98-style `SIG Arrival Time for Train` dialog with nearest station/platform values | Done prototype-level |
| Apply ITAMA | Acknowledge scenario evidence/task | Done prototype-level |
| Route/Dispatch/Hold | Open Win98-style SCADA command request, then apply command into scenario task/evidence state | Done prototype-level |
| Top `Alarms` tab | Show alarm table state | Done prototype-level |
| Top `Calls` tab | Show communications panel state | Done prototype-level |
| Toolbar buttons | Show selected tool/mode feedback | Done prototype-level |
| SCADA status readout | Show selected train and latest command/notice in the SVG toolbar status area | Done prototype-level |

## Next Parity Passes

1. Keep the traced SCADA panels as the visual baseline, then add invisible/semantic hotspots for every operator action.
2. Add missing station-specific details for Line 01, Line 02, and Line 04.
3. Replace generic icon drawings with closer Win98 bitmap-style icons where necessary.
4. Add more exact popup menu/dialog options from the monitor photos.
5. Expand route, dispatch, HII, signal, and point interactions from prototype-level to scenario-level behavior.

## Demo Mode Controls

| Key | Behavior |
| --- | --- |
| `Home` / `End` | Jump to the first or last line section. |
| `ArrowLeft` / `ArrowRight` | Pan to previous or next section area. |
