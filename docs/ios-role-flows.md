# IOS Role Flows

This document defines the finished-product IOS structure for the current
BGK -> SKG -> PGL -> PGC training-module scope.

It separates the system into two connected user experiences:

- Instructor flow
- Student / trainee flow

The goal is to make the existing scenario engine support two real operating
roles instead of one combined control page.

## Scope

This role-flow spec currently covers:

- Train Launch
- Train Withdrawal
- Train Door Fault

It assumes:

- the line map remains the operating surface for route and train actions
- the timetable monitor remains the reference monitor for service movement
- IOS is the scenario supervision and assessment layer

## Product Principle

Instructor does not perform the trainee's operating task.

Instructor:

- arms the scenario
- supervises progress
- confirms outcomes
- scores performance
- resets or completes the session

Student / trainee:

- performs the operational task
- uses the line map and train control dialogs
- advances scenario steps through actual OCC actions

This keeps IOS aligned to training behavior instead of becoming a second
control console that duplicates the line map.

## Current Screen Mapping

Current screens already in the project:

- `src/screens/IosModulesScreen.tsx`
- `src/screens/TraineeLobbyScreen.tsx`
- `src/screens/ScenarioBuilderScreen.tsx`
- `src/screens/AssessmentRubricScreen.tsx`
- `src/screens/ReportScreen.tsx`
- `src/screens/line-map/LineMapDom.tsx`

These already give us the skeleton we need. The remaining work is to split
behavior and permissions by role.

## Instructor Information Architecture

Instructor IOS should have these areas:

### 1. Session Management

Purpose:

- create session
- choose training mode
- assign or join monitors
- reset full session

Current home:

- `Session Management` tab in `IosModulesScreen`

Required finished behavior:

- choose `Practice` or `Assessment`
- view joined monitor count
- view connected trainee count
- reset all scenario state cleanly
- preserve session code and audit trail

### 2. Scenario Setup

Purpose:

- choose scenario family
- arm the live session
- define whether target is auto-selected or trainee-selected

Current home:

- `Scenario Management` tab in `IosModulesScreen`
- `Scenario Builder` screen

Required finished behavior:

- pick `Train Launch`, `Train Withdrawal`, or `Train Door Fault`
- see scenario objective, target, and duration
- arm scenario into live OCC session
- for withdrawal, default to `Select train to withdraw`
- for launch, default to `Select train to launch` or `Next eligible launch`

### 3. Runtime Supervision

Purpose:

- see target train
- see next expected operator task
- see checklist progress
- see critical misses

Current home:

- `Scenario Runtime` tab in `IosModulesScreen`

Required finished behavior:

- show active scenario
- show active target
- show next IOS task
- show completed and open checklist steps
- show scenario score
- show runtime evidence feed

### 4. Assessment and Review

Purpose:

- supervise scoring
- review rejected actions
- determine pass / fail / needs review

Current home:

- `AssessmentRubricScreen`
- `ReportScreen`

Required finished behavior:

- score by actual trainee actions
- distinguish critical vs standard tasks
- show rejected attempts
- show time-to-completion
- allow instructor review comments

### 5. Report Management

Purpose:

- close out the run
- preserve the evidence
- generate final report

Current home:

- `Report Management` tab
- `ReportScreen`

Required finished behavior:

- end summary
- actions completed
- evidence log
- final score
- instructor sign-off

## Student / Trainee Information Architecture

Student flow should be much simpler.

The student should not see all instructor controls.

Student IOS should have these areas:

### 1. Task Assignment

Purpose:

- tell trainee what the current scenario is
- tell trainee which train is relevant

Required behavior:

- show assigned scenario title
- show current target train
- show current objective
- show current monitor to use

Example:

- `Withdraw Train 347 to RT2 depot`
- `Launch next RT1-origin train to mainline service`
- `Respond to train door fault on Train 317`

### 2. Guided Runtime

Purpose:

- tell trainee the next expected action
- do not expose scoring/admin controls

Required behavior:

- show next action only
- show completed steps
- show blocked reason if action is invalid

Examples:

- `Select train to withdraw`
- `Set route to last station / depot path`
- `Declare depot destination in Arrival Time`
- `Apply Departure Time to start movement`

### 3. Result

Purpose:

- show completion and outcome

Required behavior:

- completed tasks
- pending tasks
- final result once instructor closes scenario

## Workflow: Train Withdrawal

This is the recommended end-state for the withdrawal scenario.

### Instructor Flow

1. Open IOS runtime.
2. Select `Train Withdrawal`.
3. Arm scenario.
4. Runtime shows:
   - target: `Select train to withdraw`
   - next task: `Select train to withdraw`
5. Wait for trainee to perform live actions on line map/train control.
6. Observe checklist completion.
7. Complete scenario and review report.

### Student Flow

1. Receive assigned task:
   - `Select live train to withdraw`
2. Select train on line map.
3. Set route to final passenger station / withdrawal path.
4. Set route mode to manual when required.
5. Set train readiness as needed for withdrawal.
6. Declare destination in `Arrival Time`.
   - first leg may be `SKG / SKGS`
   - second leg depot leg may be `NED / RT2D`
7. Apply `Departure Time`.
8. Verify train reaches endpoint.
9. Return to IOS for result review.

### Checklist Ownership

Instructor confirms:

- final outcome
- report completion

Student drives completion of:

- train selection
- route setting
- arrival destination
- departure trigger
- endpoint verification

## Workflow: Train Launch

### Instructor Flow

1. Open IOS runtime.
2. Select `Train Launch`.
3. Arm scenario.
4. Runtime shows:
   - target: `Select train to launch`
   - next task: `Select train to launch`
5. Observe trainee launch sequence.
6. Score the run and complete scenario.

### Student Flow

1. Receive assigned task:
   - `Launch train from RT depot into mainline service`
2. Select launch train.
3. Set route from depot / reception path to first station entry.
4. Ensure service mode is suitable for entering mainline service.
5. Apply departure.
6. Verify train reaches first in-scope station and joins mainline behavior.

## Workflow: Train Door Fault

### Instructor Flow

1. Arm `Train Door Fault`.
2. Observe injected alarm and runtime state.
3. Track whether trainee acknowledges, applies procedure, and authorises recovery.
4. Review final result.

### Student Flow

1. Receive alarm-driven task.
2. Acknowledge alarm.
3. Open relevant monitors.
4. Apply required train-control procedure.
5. Authorise recovery when instructed by procedure.
6. Return to IOS for review.

## Role-Based Permissions

These permissions should be enforced explicitly.

### Instructor-only

- arm scenario
- pause scenario
- reset scenario
- complete scenario
- score / report controls
- scenario builder
- rubric editing / final review

### Student-only

- no scenario administration
- no score editing
- no report closing
- may open assigned screen
- may perform operational actions on line map and train control

### Shared visibility

- current scenario
- target train
- current progress
- next task
- final status

## Runtime Event Rules

To make both flows dependable, IOS should advance only from real actions.

Real actions include:

- train selected from line map
- route set from define-route dialog
- arrival time confirmed
- departure time confirmed
- depot endpoint reached
- alarm acknowledged
- door procedure command confirmed

Instructor buttons should not fake trainee progress except in explicit test modes.

## Scoring Rules

Recommended scoring split:

- standard tasks: informational / confirmation steps
- critical tasks: route, destination, movement, recovery

Recommended result states:

- `IN PROGRESS`
- `PASS`
- `NEEDS REVIEW`
- `FAIL`

Recommended penalties:

- rejected action while critical task open
- wrong train selected
- wrong route set
- wrong destination declared
- movement triggered before prerequisites are met

## Completion Definition

IOS for this module should be considered complete when:

1. Instructor and Student flows are visibly separate.
2. Scenario runtime advances from actual operator actions.
3. Withdrawal works end-to-end.
4. Launch works end-to-end.
5. Door fault works end-to-end.
6. Reports and scoring reflect the actor and outcome correctly.

## Build Order

Recommended order from here:

1. Split current runtime into Instructor vs Student role views.
2. Keep one shared scenario engine underneath.
3. Make student-side operational actions satisfy checklist steps.
4. Keep instructor-side controls for arm/pause/reset/complete/report only.
5. Finalize launch and withdrawal first.
6. Finalize door fault after launch/withdrawal behavior is stable.

## Practical Answer

Is the current role split concept enough to encompass what IOS does?

Answer:

- enough for the operational core, yes
- not enough for the full finished IOS product on its own

The full IOS product also needs:

- session lifecycle
- scenario setup
- runtime supervision
- scoring
- reporting
- role permissions

This document defines that full shape.
