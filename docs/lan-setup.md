# OCC Training Simulator: LAN Install and Start-up Guide

For setting up the simulator on the OCC training network: one **host PC** runs
the training server; the **trainer PC** and up to two **trainee PCs** (each with
three monitors) open it in a browser. No internet connection is needed once it
is installed.

For day-to-day use, print the one-page
[host quick start](host-quick-start.html) and keep it next to the host PC.

## 1. What you need

| PC | Needs |
| --- | --- |
| Host PC (can also be the trainer PC) | Windows 10/11, **Node.js 24 LTS** (64-bit), this project folder, a fixed address on the LAN |
| Trainer PC | Google Chrome or Microsoft Edge |
| Trainee PCs | Chrome or Edge, three monitors |

Only the host needs Node.js. The other PCs only need a browser.

## 2. Install on the host PC (once)

1. Install Node.js 24 LTS from nodejs.org (default options). Check in a new
   Command Prompt: `node --version` shows `v24.x`.
2. Copy the project folder to the host, for example `C:\OCC\occ-prototype`.
   Avoid OneDrive or other synced folders for the live data.
3. In a Command Prompt in that folder, install and build:

   ```powershell
   npm.cmd ci
   npm.cmd run host:build
   ```

   `npm ci` needs internet access (or a copied `node_modules` folder from a PC
   that has it). After this step the host works offline.
4. Give the host a fixed address: either a reserved IP address from the
   network team, or use its computer name (for example `OCC-TRAIN-01`).
5. Allow the training server through Windows Firewall. In PowerShell **run as
   administrator**:

   ```powershell
   New-NetFirewallRule -DisplayName "OCC Training Server" -Direction Inbound -Protocol TCP -LocalPort 8787 -Action Allow -Profile Private,Domain
   ```

   Make sure the host's network is set to **Private** (or Domain), not Public.

## 3. Start the server

Double-click `scripts\start-occ-host.cmd`. A window opens and shows:

```
OCC training server listening on http://0.0.0.0:8787/
  Data:    C:\OCC\occ-prototype\server\data
  Backups: C:\OCC\occ-prototype\server\data\backups
  Open on the other PCs: http://192.168.1.20:8787/
```

Keep that window open: closing it stops the server. If the server stops for
any reason, the script starts it again after 10 seconds.

To start it automatically when the host PC signs in, press `Win + R`, type
`shell:startup`, and put a shortcut to `scripts\start-occ-host.cmd` in the folder
that opens.

From a Command Prompt, `npm.cmd run host:start` does the same without the
automatic restart.

## 4. First start: accounts

1. On the trainer PC open `http://<host address>:8787/` (the address the server
   window printed).
2. The page asks to **Set up the first trainer**. This account is the admin.
   Keep its password safe (see section 8 if it is lost).
3. Open **People** (Trainer Console, top right) and add the other trainers and
   each trainee: name, username, password (at least 8 characters), role.
   Give each person their username and password.

## 5. Set up the PCs

**Trainer PC:** bookmark `http://<host>:8787/`. Sign in; the Trainer Console
opens.

**Trainee PC (three monitors):**

1. Open `http://<host>:8787/` and sign in with the trainee's account.
2. Allow pop-ups for the host address (address bar → pop-up icon → *Always
   allow*). **Open my monitors** opens three windows.
3. Drag each window to its monitor: **Alarms** (Monitor 01), **Line Map**
   (Monitor 02), **Timetable** (Monitor 03), and press `F11` for full screen.
4. Keep the Line Map window visible. It runs that exercise's trains; browsers
   slow down hidden windows.

One person is signed in per browser. To use a PC for someone else, **Sign out**
first.

## 6. Running a class

1. Trainer: Trainer Console → for two trainees click **Add Exercise 2**. Each
   exercise shows its own 4-character code.
2. Each trainee: enter their exercise's code and **Join session**, then
   **Open my monitors**.
3. Trainer: choose a scenario and a **Mode** in each exercise's column and
   **Load scenario**. In **Practice** the trainee's monitors show a coach with
   the next step, **Show me** and **Locate**; **Aids on/off** on the console
   hides it. In **Assessment** no aids are shown.
4. Watch the checklists; **Complete** each run, then open its **Report** to add
   notes.
5. Afterwards: **History** shows every completed run with each action, and
   **Progress** each trainee's record. Both have **Export CSV** (opens in Excel)
   and **Print / PDF** (choose *Save as PDF* in the print dialog) for training files.

## 7. Backups

- The server copies its database **every day** into `server\data\backups` and
  keeps the newest 14 copies.
- Make one now on the host:
  `npm.cmd run backup`.
- Copy the `server\data\backups` folder to a USB drive or network share
  regularly; the copies on the host do not survive a disk failure.

**Restore a backup** (for example after a mistake or on a replacement host):

1. Close the server window.
2. In the project folder: `npm.cmd run restore` lists the backups; then
   `npm.cmd run restore -- occ-training-20261013-080000.sqlite` (or a full path
   to a copied file).
3. Start the server again. The data that was replaced is kept as
   `server\data\occ-training.before-restore-....sqlite`.

## 8. If the admin password is lost

On the host, with the server running or not:

```powershell
npm.cmd run reset:password -- <username> <new password>
```

This also switches the account back on and signs it out everywhere.

## 9. Updating the simulator

1. `npm.cmd run backup`.
2. Close the server window.
3. Replace the project files with the new version. Keep `server\data`.
4. `npm.cmd ci` and `npm.cmd run host:build`.
5. Start the server again and reload the pages on every PC.

## 10. Troubleshooting

| Symptom | Check |
| --- | --- |
| Other PCs cannot open the page | The server window is open; open `http://<host>:8787/api/health` on the other PC (it should show `"status": "ok"`); the firewall rule (section 2.5); the network profile is Private. |
| "Port 8787 is already in use" | The server is already running (another window, or the startup shortcut). Close the extra window. |
| A monitor shows "View only: trains run on another Line Map window" | Another Line Map window for that exercise is open. Close it, or click **Take control** on the one the trainee uses. |
| Trains move in jumps or stop | The Line Map window is minimised or hidden. Keep it on screen. |
| Only one monitor opened | Allow pop-ups for the host address, then **Open my monitors** again. |
| "You have been signed out" | The account's password was reset or it was switched off, or the sign-in is over 7 days old. Sign in again. |
| The page says the app is not built | Run `npm.cmd run host:build` on the host and start the server again. |
| No coach on a trainee's monitors | The run is in Assessment (no aids by design), or **Aids off** on the console in Practice. Click it to switch the aids on. |
| DISPATCH or HII says "No train at …" or "Train … is not at …" | Station panels act only on the train at their own station, as at the OCC. Use the panel at the train's station. |

The project's README describes the server's API and the development setup.
