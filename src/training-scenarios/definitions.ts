import type {
  TrainingScenarioDefinition,
  TrainingScenarioTaskDefinition,
  TrainingScenarioWorkflowAction,
  TrainingScenarioWorkflowDefinition,
} from './types'

// Building blocks for the SOP-based fault scenarios (train door and PSD faults).
// Fault text uses {train}, {station} and {bound}, filled in from the location
// chosen when the scenario is armed (see faultLocation.ts).
const FAULT_TRAIN_ID = '317'

function selectFaultTrainTask(id: string): TrainingScenarioTaskDefinition {
  return { id, label: 'Select affected train', mappedTaskId: 'selectTrain', monitor: 'Monitor 02 Line Map', weight: 5 }
}

function acknowledgeFaultTask(id: string, label: string): TrainingScenarioTaskDefinition {
  return { critical: true, id, label, mappedTaskId: 'ackAlarm', monitor: 'Alarms', weight: 10 }
}

function callTask(
  id: string,
  label: string,
  commsMessageIds: readonly string[],
  options: { critical?: boolean; weight?: number } = {},
): TrainingScenarioTaskDefinition {
  return { commsMessageIds, critical: options.critical, id, label, monitor: 'Calls', weight: options.weight ?? 10 }
}

// critical: false where the SOP holds the train only "if required" / "when applicable".
function holdTrainTask(id: string, label = 'Apply platform hold on the train', critical = true): TrainingScenarioTaskDefinition {
  return { completesOnHold: true, critical, id, label, monitor: 'Line Map', runtimeOnly: true, weight: 10 }
}

function releaseTrainTask(id: string, label: string, critical = false): TrainingScenarioTaskDefinition {
  return { critical, id, label, mappedTaskId: 'dispatchTrain', monitor: 'Line Map', weight: 10 }
}

function reviewFaultTask(id: string): TrainingScenarioTaskDefinition {
  return { id, label: 'Review final incident state', mappedTaskId: 'completeScenario', monitor: 'IOS', weight: 5 }
}

// Train loop & shuttle service during a disruption (NEL/OPS/TRA/OP/DEG/14.001.46).
// One definition per service pattern in section 7; OCC's part is 7.3 and 7.5.
type DisruptionPattern = {
  buses: string
  id: string
  incident: string
  loops: string
  shuttle?: string
  terminals: string
}

function serviceDisruptionDefinition(pattern: DisruptionPattern): TrainingScenarioDefinition {
  const service = [pattern.loops, pattern.shuttle].filter(Boolean).join('; ')

  return {
    armNotice: `Service disruption: ${service}. Free regular & bridging bus ${pattern.buses}. Intermediate terminal ${pattern.terminals}. Implement as per SOP.`,
    defaultTargetTrainId: FAULT_TRAIN_ID,
    duration: '06:00',
    id: pattern.id,
    incident: pattern.incident,
    kind: 'SERVICE_DISRUPTION',
    noTargetTrain: true,
    objective: `Implement the ${pattern.incident.toLowerCase()} (${service}) with free regular & bridging bus ${pattern.buses}: broadcast it, inform the intermediate terminal station, record the disruption PA and send the disruption notice.`,
    target: service,
    title: pattern.incident,
    tasks: [
      callTask(`broadcast-${pattern.id}`, 'Radio broadcast the loop service and bridging buses to stations & trains', ['broadcast-loop-service'], { critical: true, weight: 20 }),
      callTask(`inform-terminal-${pattern.id}`, 'Inform the intermediate terminal station(s) via PABX or Tetra', ['station-loop-terminal'], { critical: true, weight: 15 }),
      callTask(`disruption-pa-${pattern.id}`, 'Prepare and record the disruption PA for stations and trains', ['coc-disruption-pa'], { critical: true, weight: 15 }),
      ...(pattern.shuttle
        ? [callTask(`shuttle-pa-${pattern.id}`, 'Prepare and record the PA for the shuttle train service', ['coc-shuttle-pa'], { critical: true, weight: 15 })]
        : []),
      callTask(`disruption-notice-${pattern.id}`, 'Disseminate the Train Disruption Notice to all stations', ['coc-disruption-notice'], { weight: 15 }),
      callTask(`train-local-pa-${pattern.id}`, 'Instruct CSOs to make local PA every 4 minutes', ['broadcast-train-local-pa'], { weight: 5 }),
      reviewFaultTask(`review-${pattern.id}`),
    ],
  }
}

export const idleTrainingScenarioDefinition: TrainingScenarioDefinition = {
  defaultTargetTrainId: '317',
  duration: '00:00',
  id: 'idle',
  incident: 'None',
  kind: 'DOOR_FAULT',
  objective: 'Select a scenario to arm a training exercise.',
  target: 'No active scenario',
  title: 'Idle',
  tasks: [],
}

export const trainingScenarioDefinitions: readonly TrainingScenarioDefinition[] = [
  {
    defaultTargetTrainId: '306',
    duration: '06:00',
    id: 'train-launch',
    incident: 'Train launch',
    kind: 'TRAIN_LAUNCH',
    objective: 'Launch a train from the RT depot into live mainline service while timetable traffic continues.',
    target: 'RT1 / RT2 launch to SKG timetable service',
    title: 'Train Launch',
    tasks: [
      {
        id: 'select-launch-train',
        label: 'Select train to launch',
        mappedTaskId: 'selectTrain',
        monitor: 'Monitor 03 Timetable',
        weight: 15,
      },
      {
        critical: true,
        evidenceKeywords: ['route', 'launch'],
        id: 'set-launch-route',
        label: 'Set launch route from depot to SKG',
        mappedTaskId: 'setRoute',
        monitor: 'Line Map',
        weight: 30,
      },
      {
        evidenceKeywords: ['dispatch', 'departure'],
        id: 'dispatch-launch-train',
        label: 'Dispatch launch train',
        mappedTaskId: 'dispatchTrain',
        monitor: 'Line Map',
        weight: 35,
      },
      {
        id: 'review-launch-outcome',
        label: 'Review final launch state',
        mappedTaskId: 'completeScenario',
        monitor: 'IOS',
        weight: 20,
      },
    ],
  },
  {
    defaultTargetTrainId: '312',
    duration: '07:00',
    id: 'train-withdrawal',
    incident: 'Train withdrawal',
    kind: 'TRAIN_WITHDRAWAL',
    objective: 'Withdraw a live timetable train from mainline service to RT depot without stopping other services.',
    target: 'Mainline train to RT depot endpoint',
    title: 'Train Withdrawal',
    tasks: [
      {
        id: 'select-withdrawal-train',
        label: 'Select train to withdraw',
        mappedTaskId: 'selectTrain',
        monitor: 'Monitor 03 Timetable',
        weight: 10,
      },
      {
        critical: true,
        evidenceKeywords: ['route'],
        id: 'set-withdrawal-route',
        label: 'Set route to last station hold path',
        mappedTaskId: 'setRoute',
        monitor: 'Line Map',
        runtimeOnly: true,
        weight: 15,
      },
      {
        critical: true,
        evidenceKeywords: ['arrival time', 'skg', 'skgs', 'destination'],
        id: 'declare-last-station-destination',
        label: 'Declare SKG / SKGS destination in Arrival Time',
        monitor: 'Line Map Train Control',
        runtimeOnly: true,
        weight: 15,
      },
      {
        critical: true,
        evidenceKeywords: ['departure time', 's608', 'last station'],
        id: 'move-to-s608-hold',
        label: 'Apply Departure Time to move to S608 hold',
        monitor: 'Line Map Train Control',
        runtimeOnly: true,
        weight: 15,
      },
      {
        critical: true,
        evidenceKeywords: ['arrival time', 'ned', 'rt2d', 'destination'],
        id: 'declare-depot-destination',
        label: 'Declare NED / RT2D depot destination in Arrival Time',
        monitor: 'Line Map Train Control',
        runtimeOnly: true,
        weight: 15,
      },
      {
        critical: true,
        evidenceKeywords: ['departure time', 'depot', 'depart'],
        id: 'trigger-withdrawal-movement',
        label: 'Apply Departure Time to move to RT2 depot',
        mappedTaskId: 'dispatchTrain',
        monitor: 'Line Map Train Control',
        runtimeOnly: true,
        weight: 15,
      },
      {
        evidenceKeywords: ['depot endpoint', 'reached depot', 'endpoint'],
        id: 'verify-depot-endpoint',
        label: 'Verify train reaches depot endpoint',
        monitor: 'Line Map',
        runtimeOnly: true,
        weight: 10,
      },
      {
        id: 'review-withdrawal-outcome',
        label: 'Review final withdrawal state',
        mappedTaskId: 'completeScenario',
        monitor: 'IOS',
        weight: 5,
      },
    ],
  },
  {
    defaultTargetTrainId: FAULT_TRAIN_ID,
    duration: '05:00',
    fault: {
      alarm: {
        asset: `EMU/{train}/TRN/XXXXXX`,
        description: `Train {train} Car 3: Saloon Door Failure in Open/Close`,
        value: 'FAILURE',
      },
      trainDoorFault: true,
    },
    id: 'door-fault',
    incident: 'Door fault',
    kind: 'DOOR_FAULT',
    objective: 'Handle train door failure using alarm acknowledgement and controlled train commands.',
    target: 'Faulted train on mainline',
    title: 'Train Door Fault',
    tasks: [
      {
        id: 'select-door-fault-train',
        label: 'Select affected train',
        mappedTaskId: 'selectTrain',
        monitor: 'Monitor 02 Line Map',
        weight: 15,
      },
      {
        critical: true,
        id: 'acknowledge-door-fault',
        label: 'Acknowledge door fault alarm',
        mappedTaskId: 'ackAlarm',
        monitor: 'Alarms',
        weight: 25,
      },
      {
        critical: true,
        doorCommandLabels: ['Cycle Door', 'Confirm Closed/Locked', 'Authorize Door Isolation'],
        doorSummaryStatuses: ['CLOSED/LOCKED', 'DOOR ISOLATED'],
        evidenceKeywords: ['closed/locked', 'isolate'],
        id: 'apply-door-procedure',
        label: 'Apply door fault procedure',
        monitor: 'Line Map Train Control',
        weight: 30,
      },
      {
        id: 'route-after-door-fault',
        label: 'Apply movement route after recovery',
        mappedTaskId: 'setRoute',
        monitor: 'Line Map',
        weight: 15,
      },
      {
        id: 'review-door-fault-outcome',
        label: 'Review final door fault state',
        mappedTaskId: 'completeScenario',
        monitor: 'IOS',
        weight: 15,
      },
    ],
  },
  {
    defaultTargetTrainId: FAULT_TRAIN_ID,
    duration: '05:00',
    fault: {
      alarm: {
        asset: `EMU/{train}/TRN/XXXXXX`,
        description: `Train {train} Car 2: Emergency Handle Switch (EHS) Activation`,
        value: 'ACTIVATED',
      },
    },
    id: 'door-fault-ehs',
    incident: 'EHS activation',
    kind: 'DOOR_FAULT',
    objective: 'A passenger activated an Emergency Handle Switch. Alert, hold at the next platform, investigate, reset the EHS and release the train when safe.',
    target: 'Train with EHS activated',
    title: 'EHS Activation',
    tasks: [
      selectFaultTrainTask('select-ehs-train'),
      acknowledgeFaultTask('acknowledge-ehs-alarm', 'Acknowledge EHS activation alarm'),
      callTask('alert-cc-wc-ehs', 'Alert CC and WC', ['cc-alert-incident', 'wc-alert-fault'], { critical: true }),
      callTask('driver-investigate-ehs', 'Instruct driver to investigate', ['driver-investigate'], { critical: true }),
      holdTrainTask('hold-ehs-train', 'Apply platform hold at the next platform'),
      callTask('driver-reset-ehs', 'Instruct driver to reset the EHS', ['driver-reset-ehs'], { critical: true }),
      releaseTrainTask('release-ehs-train', 'Release the train when safe'),
      reviewFaultTask('review-ehs-outcome'),
    ],
  },
  {
    defaultTargetTrainId: FAULT_TRAIN_ID,
    duration: '05:00',
    fault: {
      alarm: {
        asset: `EMU/{train}/TRN/XXXXXX`,
        description: `Train {train} Car 1: DT Detrainment Door Cover Status`,
        value: 'OPENED (ACTIVE)',
      },
    },
    id: 'door-fault-detrainment',
    incident: 'Detrainment door cover open',
    kind: 'DOOR_FAULT',
    objective: 'The detrainment door cover is reported open. Alert, hold, investigate and keep the driver at the location until OSC is on board.',
    target: 'Train with detrainment door cover open',
    title: 'Detrainment Door Cover Open',
    tasks: [
      selectFaultTrainTask('select-detrainment-train'),
      acknowledgeFaultTask('acknowledge-detrainment-alarm', 'Acknowledge detrainment door cover alarm'),
      callTask('alert-cc-wc-detrainment', 'Alert CC and WC', ['cc-alert-incident', 'wc-alert-fault'], { critical: true }),
      callTask('driver-investigate-detrainment', 'Instruct driver to investigate', ['driver-investigate'], { critical: true }),
      holdTrainTask('hold-detrainment-train', 'Apply platform hold at the next platform', false),
      callTask('driver-standby-osc', 'Instruct driver to standby until OSC is on board', ['driver-standby-osc']),
      reviewFaultTask('review-detrainment-outcome'),
    ],
  },
  {
    defaultTargetTrainId: FAULT_TRAIN_ID,
    duration: '05:00',
    fault: {
      alarm: {
        asset: `SIG/{station}/B2/PSD0507`,
        description: `PSD: {station} {bound} Door 07 Obstructed`,
        value: 'OBSTRUCTED',
      },
      psdIndicator: true,
    },
    id: 'psd-fault-obstructed',
    incident: 'PSD obstructed',
    kind: 'PSD_FAULT',
    objective: `A platform screen door at {station} {bound} reports obstructed. Hold the train, send station staff to clear it and report the fault.`,
    target: `{station} {bound} platform, PSD 07`,
    title: 'PSD Obstructed',
    tasks: [
      selectFaultTrainTask('select-psd-obstructed-train'),
      acknowledgeFaultTask('acknowledge-psd-obstructed', 'Acknowledge PSD obstructed alarm'),
      holdTrainTask('hold-psd-obstructed-train', undefined, false),
      callTask('station-investigate-psd-obstructed', 'Send station staff to the affected PSD', ['station-investigate-psd'], { critical: true }),
      callTask('report-wc-cc-psd-obstructed', 'Report fault to WC and inform CC', ['wc-alert-fault', 'cc-alert-incident']),
      callTask('driver-standby-psd-obstructed', 'Driver to standby at leading cab, console open', ['driver-standby-console']),
      reviewFaultTask('review-psd-obstructed-outcome'),
    ],
  },
  {
    defaultTargetTrainId: FAULT_TRAIN_ID,
    duration: '06:00',
    fault: {
      alarm: {
        asset: `SIG/{station}/B2/PSD0504`,
        description: `PSD: {station} {bound} Door 04 Failed to Open`,
        value: 'NOT OPEN',
      },
      psdIndicator: true,
    },
    id: 'psd-fault-fail-open',
    incident: 'Single PSD failed to open',
    kind: 'PSD_FAULT',
    objective: `A single PSD at {station} {bound} failed to open. Investigate with station staff and, if it repeats, isolate it in the closed position.`,
    target: `{station} {bound} platform, PSD 04`,
    title: 'PSD Failed to Open',
    tasks: [
      selectFaultTrainTask('select-psd-fail-open-train'),
      acknowledgeFaultTask('acknowledge-psd-fail-open', 'Acknowledge PSD failed to open alarm'),
      holdTrainTask('hold-psd-fail-open-train', undefined, false),
      callTask('station-investigate-psd-fail-open', 'Send station staff to the affected PSD', ['station-investigate-psd'], { critical: true }),
      callTask('report-wc-cc-psd-fail-open', 'Report fault to WC and inform CC', ['wc-alert-fault', 'cc-alert-incident']),
      callTask('driver-standby-psd-fail-open', 'Driver to standby at leading cab, console open', ['driver-standby-console']),
      callTask('isolate-psd-closed', 'Authorise isolation of the PSD in closed position', ['station-isolate-psd-closed'], { critical: true }),
      reviewFaultTask('review-psd-fail-open-outcome'),
    ],
  },
  {
    defaultTargetTrainId: FAULT_TRAIN_ID,
    duration: '06:00',
    fault: {
      alarm: {
        asset: `SIG/{station}/B2/PSD0504`,
        description: `PSD: {station} {bound} Door 04 Failed to Close`,
        value: 'NOT CLOSED',
      },
      psdIndicator: true,
    },
    id: 'psd-fault-fail-close',
    incident: 'Single PSD failed to close',
    kind: 'PSD_FAULT',
    objective: `A single PSD at {station} {bound} failed to close. Investigate, isolate it in the open position, then issue IDT once the summary light is on.`,
    target: `{station} {bound} platform, PSD 04`,
    title: 'PSD Failed to Close',
    tasks: [
      selectFaultTrainTask('select-psd-fail-close-train'),
      acknowledgeFaultTask('acknowledge-psd-fail-close', 'Acknowledge PSD failed to close alarm'),
      holdTrainTask('hold-psd-fail-close-train', undefined, false),
      callTask('station-investigate-psd-fail-close', 'Send station staff to the affected PSD', ['station-investigate-psd'], { critical: true }),
      callTask('report-wc-cc-psd-fail-close', 'Report fault to WC and inform CC', ['wc-alert-fault', 'cc-alert-incident']),
      callTask('driver-standby-psd-fail-close', 'Driver to standby at leading cab, console open', ['driver-standby-console']),
      callTask('isolate-psd-open', 'Authorise isolation of the PSD in open position', ['station-isolate-psd-open'], { critical: true }),
      releaseTrainTask('release-psd-fail-close-train', 'Issue IDT once the PSD summary light is on', true),
      reviewFaultTask('review-psd-fail-close-outcome'),
    ],
  },
  {
    defaultTargetTrainId: FAULT_TRAIN_ID,
    duration: '05:00',
    fault: {
      alarm: {
        asset: `SIG/{station}/B2/PSDSUM`,
        description: `PSD: {station} {bound} PSD Summary Light Not Available`,
        value: 'NOT AVAILABLE',
      },
      psdIndicator: true,
    },
    id: 'psd-fault-override',
    incident: 'PSD summary light not available',
    kind: 'PSD_FAULT',
    objective: `The train at {station} {bound} cannot depart because the PSD summary light is not available after isolation. Use the PSD Override Switch, then issue IDT.`,
    target: `{station} {bound} platform headwall/tailwall`,
    title: 'PSD Override Switch',
    tasks: [
      selectFaultTrainTask('select-psd-override-train'),
      acknowledgeFaultTask('acknowledge-psd-override', 'Acknowledge PSD summary light alarm'),
      callTask('authorise-psd-override', 'Authorise PSD Override Switch to bypass', ['station-psd-override'], { critical: true }),
      releaseTrainTask('release-psd-override-train', 'Issue IDT once the PSD summary light is on', true),
      reviewFaultTask('review-psd-override-outcome'),
    ],
  },
  {
    defaultTargetTrainId: FAULT_TRAIN_ID,
    duration: '07:00',
    fault: {
      alarm: {
        asset: `EMU/{train}/TRN/XXXXXX`,
        description: `Train {train}: Restricted Manual, PSD auto open/close not available at {station}`,
        value: 'RM',
      },
      psdIndicator: true,
    },
    id: 'psd-fault-manual',
    incident: 'Manual PSD operation (RM train)',
    kind: 'PSD_FAULT',
    objective: `Signalling cannot command the PSDs for an RM train at {station}. Arrange manual operation of PSDs and train doors, and authorise RM driving.`,
    target: `{station} {bound} platform, manual PSD operation`,
    title: 'Manual PSD Operation',
    tasks: [
      selectFaultTrainTask('select-psd-manual-train'),
      acknowledgeFaultTask('acknowledge-psd-manual', 'Acknowledge RM / PSD alarm'),
      holdTrainTask('hold-psd-manual-train', undefined, false),
      callTask('alert-cc-wc-psd-manual', 'Alert CC and WC', ['cc-alert-incident', 'wc-alert-fault']),
      callTask('driver-manual-doors-psd', 'Driver to leading cab for manual PSD/train door operation', ['driver-manual-doors'], { critical: true }),
      callTask('station-manual-psd', 'Authorise station staff to operate PSD manually', ['station-manual-psd'], { critical: true }),
      callTask('station-standby-psd-manual', 'Station staff to standby at the platform', ['station-standby-platform'], { weight: 5 }),
      callTask('authorise-rm-psd-manual', 'Authorise RM driving', ['driver-authorise-rm'], { critical: true }),
      reviewFaultTask('review-psd-manual-outcome'),
    ],
  },
  {
    defaultTargetTrainId: FAULT_TRAIN_ID,
    duration: '08:00',
    fault: {
      alarm: {
        asset: `SIG/{station}/B2/DMS0401`,
        description: `PSD: {station} {bound} Multiple Doors Isolated (DCU communication fault)`,
        value: 'ISOLATED',
      },
      psdIndicator: true,
    },
    id: 'psd-fault-multiple',
    incident: 'Multiple PSD failed to open',
    kind: 'PSD_FAULT',
    objective: `Several PSDs at {station} {bound} failed to open. Isolate the first faulty PSD, then run doors manually in RMF with station staff until Signalling resets it.`,
    target: `{station} {bound} platform, multiple PSDs`,
    title: 'Multiple PSD Failure',
    tasks: [
      selectFaultTrainTask('select-psd-multiple-train'),
      acknowledgeFaultTask('acknowledge-psd-multiple', 'Acknowledge multiple PSD alarm'),
      callTask('driver-standby-psd-multiple', 'Driver to open driving console at leading cab', ['driver-standby-console']),
      callTask('report-wc-cc-psd-multiple', 'Report fault to WC and inform CC', ['wc-alert-fault', 'cc-alert-incident']),
      callTask('station-manual-psd-multiple', 'Station staff to HW/TW unit for manual PSD operation', ['station-manual-psd'], { critical: true }),
      callTask('isolate-first-psd', 'Authorise isolation of the first faulty PSD (closed)', ['station-isolate-psd-closed'], { critical: true }),
      callTask('authorise-rmf-doors', 'Authorise train doors in RMF with read-back', ['driver-rmf-doors'], { critical: true }),
      reviewFaultTask('review-psd-multiple-outcome'),
    ],
  },
  // Sections 7.1, 7.2, 7.6, 7.7 and 7.8 of the train loop & shuttle SOP.
  serviceDisruptionDefinition({
    buses: 'HBF – PTP',
    id: 'disruption-single-loop',
    incident: 'Single train loop service',
    loops: 'loop PGC – PTP',
    terminals: 'PTP',
  }),
  serviceDisruptionDefinition({
    buses: 'OTP – DBG',
    id: 'disruption-dual-loop',
    incident: 'Dual train loop service',
    loops: 'loops PGC – DBG and HBF – OTP',
    terminals: 'OTP & DBG',
  }),
  serviceDisruptionDefinition({
    buses: 'FRP – SKG',
    id: 'disruption-single-loop-shuttle',
    incident: 'Single train loop with shuttle',
    loops: 'loop HBF – FRP',
    shuttle: 'shuttle PGC – SKG',
    terminals: 'FRP',
  }),
  serviceDisruptionDefinition({
    buses: 'FRP – SER',
    id: 'disruption-dual-loop-shuttle',
    incident: 'Dual train loop with shuttle',
    loops: 'loops PGC – HGN and HBF – FRP',
    shuttle: 'shuttle HGN – SER',
    terminals: 'FRP & HGN',
  }),
  serviceDisruptionDefinition({
    buses: 'BGK – PGC',
    id: 'disruption-single-platform',
    incident: 'Loop with shuttle (single platform)',
    loops: 'loop HBF – BGK',
    shuttle: 'shuttle PGC – BGK on the same platform',
    terminals: 'BGK',
  }),
  // Unscheduled withdrawal at a station (NEL/OPS/TRA/OP/OCC/03.001.9, section 7.2).
  {
    armNotice: 'Unscheduled withdrawal: CC has decided to withdraw Train {train} at {station} {bound}. Respond as per SOP.',
    defaultTargetTrainId: FAULT_TRAIN_ID,
    duration: '07:00',
    heldAtStation: true,
    id: 'unscheduled-withdrawal',
    incident: 'Unscheduled withdrawal at station',
    kind: 'UNSCHEDULED_WITHDRAWAL',
    objective: 'CC has decided to withdraw the train at {station} {bound} from service. Alert the driver and station staff, have CoC make the PA, close doors and PSDs for train clear, then route the train to its destination.',
    target: 'Train {train} at {station} {bound}',
    title: 'Unscheduled Train Withdrawal',
    tasks: [
      selectFaultTrainTask('select-unscheduled-withdrawal-train'),
      callTask('driver-unscheduled-withdrawal', 'Alert the driver: train out of service, train clear at the station', ['driver-withdraw-train-clear'], { critical: true }),
      callTask('station-unscheduled-withdrawal', 'Inform station staff to assist in train clear', ['station-assist-train-clear'], { critical: true }),
      callTask('coc-unscheduled-withdrawal', 'Alert CoC to make PA on the withdrawal train', ['coc-withdrawal-pa'], { critical: true }),
      callTask('dtc-unscheduled-withdrawal', 'Alert DTC: withdrawal train returning to depot', ['dtc-withdrawal-return'], { weight: 5 }),
      {
        critical: true,
        evidenceKeywords: ['doors and psds closed for train clear'],
        id: 'close-doors-unscheduled-withdrawal',
        label: 'Close all train doors & PSDs for train clear',
        // IOS: the trainer confirms it on the console (no simulator command for it).
        monitor: 'IOS',
        weight: 10,
      },
      callTask('train-clear-unscheduled-withdrawal', 'Receive Train Clear from the driver', ['driver-train-clear-received'], { critical: true }),
      {
        critical: true,
        id: 'route-unscheduled-withdrawal',
        label: 'Route the train to the designated destination',
        mappedTaskId: 'setRoute',
        monitor: 'Line Map',
        weight: 10,
      },
      reviewFaultTask('review-unscheduled-withdrawal'),
    ],
  },
] as const

const scenarioDefinitionById = new Map(trainingScenarioDefinitions.map((definition) => [definition.id, definition]))

export const launchRoutePathIds = new Set([
  'timetable-skg-to-pgl-upper-mainline',
  'timetable-skg-to-pgc-upper-mainline',
])

export const trainingScenarioWorkflowDefinitions: Record<TrainingScenarioWorkflowAction, TrainingScenarioWorkflowDefinition> = {
  PREPARE_LAUNCH_ROUTE: {
    kind: 'TRAIN_LAUNCH',
    lineMapAction: 'PREPARE_LAUNCH_ROUTE',
    message: 'Launch route R655_617 prepared from RT1/S655 into SKG mainline.',
    taskIds: ['select-launch-train', 'set-launch-route'],
    value: 'LAUNCH ROUTE',
  },
  DISPATCH_LAUNCH: {
    kind: 'TRAIN_LAUNCH',
    lineMapAction: 'DISPATCH_LAUNCH',
    message: 'Launch train dispatched into timetable mainline service.',
    taskIds: ['dispatch-launch-train'],
    value: 'LAUNCH DISPATCH',
  },
  VERIFY_LAUNCH_MAINLINE: {
    kind: 'TRAIN_LAUNCH',
    lineMapAction: 'VERIFY_LAUNCH_MAINLINE',
    message: 'Launch train verified on SKG mainline service. Scenario complete.',
    taskIds: ['review-launch-outcome'],
    value: 'LAUNCH COMPLETE',
  },
  DECLARE_WITHDRAWAL_DESTINATION: {
    kind: 'TRAIN_WITHDRAWAL',
    lineMapAction: 'DECLARE_WITHDRAWAL_DESTINATION',
    message: 'Withdrawal destination declared in Arrival Time.',
    taskIds: ['declare-last-station-destination', 'declare-depot-destination'],
    value: 'WITHDRAW DEST',
  },
  TRIGGER_WITHDRAWAL_MOVEMENT: {
    kind: 'TRAIN_WITHDRAWAL',
    lineMapAction: 'TRIGGER_WITHDRAWAL_MOVEMENT',
    message: 'Withdrawal departure time applied and movement triggered.',
    taskIds: ['move-to-s608-hold', 'trigger-withdrawal-movement'],
    value: 'WITHDRAW DEPART',
  },
  VERIFY_WITHDRAWAL_ENDPOINT: {
    kind: 'TRAIN_WITHDRAWAL',
    lineMapAction: 'VERIFY_WITHDRAWAL_ENDPOINT',
    message: 'Withdrawal train verified at depot endpoint. Scenario complete.',
    taskIds: ['verify-depot-endpoint', 'review-withdrawal-outcome'],
    value: 'DEPOT ENDPOINT',
  },
  INJECT_DOOR_FAULT: {
    kind: 'DOOR_FAULT',
    lineMapAction: 'INJECT_DOOR_FAULT',
    message: 'Door fault injected on Train 317 and train held for operator response.',
    summaryTone: 'red',
    taskIds: ['select-door-fault-train'],
    tone: 'red',
    value: 'YES',
  },
  ACKNOWLEDGE_DOOR_FAULT: {
    kind: 'DOOR_FAULT',
    lineMapAction: 'ACKNOWLEDGE_DOOR_FAULT',
    message: 'Door fault alarm acknowledged for Train 317.',
    taskIds: ['acknowledge-door-fault'],
    value: 'ACK',
  },
  APPLY_DOOR_FAULT_PROCEDURE: {
    kind: 'DOOR_FAULT',
    lineMapAction: 'APPLY_DOOR_FAULT_PROCEDURE',
    message: 'Door procedure applied: Cycle Door and Confirm Closed/Locked completed.',
    taskIds: ['apply-door-procedure'],
    value: 'CLOSED/LOCKED',
  },
  AUTHORISE_DOOR_FAULT_RECOVERY: {
    kind: 'DOOR_FAULT',
    lineMapAction: 'AUTHORISE_DOOR_FAULT_RECOVERY',
    message: 'Door fault recovery movement authorised after route protection.',
    scenarioTaskIds: ['dispatchTrain'],
    taskIds: ['route-after-door-fault'],
    value: 'AUTHORISED TO MOVE',
  },
  COMPLETE_DOOR_FAULT_REVIEW: {
    kind: 'DOOR_FAULT',
    lineMapAction: 'COMPLETE_DOOR_FAULT_REVIEW',
    message: 'Door fault scenario review completed. Scenario complete.',
    taskIds: ['review-door-fault-outcome'],
    value: 'DOOR FAULT COMPLETE',
  },
}

export function getTrainingScenarioDefinition(id: string | undefined) {
  return scenarioDefinitionById.get(id ?? '') ?? idleTrainingScenarioDefinition
}
