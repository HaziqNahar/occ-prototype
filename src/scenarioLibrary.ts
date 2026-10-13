import type { TrainingScenarioKind } from './trainingScenarios'

export type ScenarioTemplate = {
  affectedMonitors: string[]
  duration: string
  expectedSteps: string[]
  id: string
  incidents: string[]
  objective: string
  passCondition: string
  status: 'Active' | 'Prepared' | 'Future'
  target: string
  title: string
  trainingScenarioKind?: TrainingScenarioKind
}

export type AssessmentCriterion = {
  evidence: string
  metric: string
  passTarget: string
  weight: number
}

export const scenarioTemplates: ScenarioTemplate[] = [
  {
    affectedMonitors: ['Line Map', 'Timetable', 'IOS'],
    duration: '06:00',
    expectedSteps: [
      'Select an eligible SKG-origin timetable train',
      'Set the launch route from RT depot to SKG',
      'Apply departure and dispatch the launch train',
      'Verify the train enters mainline timetable service',
      'Complete trainer review',
    ],
    id: 'train-launch',
    incidents: ['Train launch'],
    objective: 'Launch a train from the RT depot into live mainline service while timetable traffic continues.',
    passCondition: 'The selected train reaches mainline service with all required launch tasks complete.',
    status: 'Active',
    target: 'RT1 / RT2 launch to SKG timetable service',
    title: 'Train Launch',
    trainingScenarioKind: 'TRAIN_LAUNCH',
  },
  {
    affectedMonitors: ['Line Map', 'Timetable', 'IOS'],
    duration: '07:00',
    expectedSteps: [
      'Select a live timetable train to withdraw',
      'Set the route to the last-station hold path',
      'Declare SKG / SKGS in Arrival Time',
      'Apply Departure Time to move to the S608 hold',
      'Declare NED / RT2D in Arrival Time',
      'Apply Departure Time to move into RT2 depot',
      'Verify the train reaches the depot endpoint',
      'Complete trainer review',
    ],
    id: 'train-withdrawal',
    incidents: ['Train withdrawal'],
    objective: 'Withdraw a live timetable train from mainline service to RT depot without stopping other services.',
    passCondition: 'The selected train reaches the RT depot endpoint with all required withdrawal tasks complete.',
    status: 'Active',
    target: 'Mainline train to RT depot endpoint',
    title: 'Train Withdrawal',
    trainingScenarioKind: 'TRAIN_WITHDRAWAL',
  },
  {
    affectedMonitors: ['Alarms', 'Line Map', 'Calls', 'IOS'],
    duration: '06:00',
    expectedSteps: [
      'Acknowledge the train door alarm',
      'Alert CC and WC, and instruct the driver to investigate',
      'Hold the train and apply the SOP for the fault type',
      'Release the train when safe',
      'Complete trainer review',
    ],
    id: 'door-fault',
    // Each incident is its own SOP variant (NEL/OPS/TRA/OP/TRN/07.001.34).
    incidents: ['Door fault', 'EHS activation', 'Detrainment door cover open'],
    objective: 'Respond to train door problems on the mainline: door failure, EHS activation or detrainment door cover open.',
    passCondition: 'Every critical SOP step is complete: alarm acknowledged, CC/WC alerted, train held and recovered safely.',
    status: 'Active',
    target: 'Faulted Train 317 on mainline',
    title: 'Train Door Fault',
    trainingScenarioKind: 'DOOR_FAULT',
  },
  {
    affectedMonitors: ['Alarms', 'Line Map', 'Calls', 'IOS'],
    duration: '06:00',
    expectedSteps: [
      'Acknowledge the PSD alarm and identify the train and platform',
      'Hold the train and send station staff to the affected PSD',
      'Report the fault to WC and inform CC',
      'Authorise isolation, override or manual operation as per SOP',
      'Release the train and complete trainer review',
    ],
    id: 'psd-fault',
    // Each incident is its own SOP variant (NEL/OPS/TRA/OP/DEG/09.001.18).
    incidents: [
      'PSD obstructed',
      'Single PSD failed to open',
      'Single PSD failed to close',
      'PSD summary light not available',
      'Manual PSD operation (RM train)',
      'Multiple PSD failed to open',
    ],
    objective: 'Respond to platform screen door faults at a station platform while keeping train service moving.',
    passCondition: 'Every critical SOP step is complete and the train departs with the PSDs secured.',
    status: 'Active',
    target: 'HGN NB platform, Train 317',
    title: 'PSD Fault',
    trainingScenarioKind: 'PSD_FAULT',
  },
  {
    affectedMonitors: ['Calls', 'IOS'],
    duration: '06:00',
    expectedSteps: [
      'Radio broadcast the loop service and bridging buses to stations & trains',
      'Inform the intermediate terminal station(s) via PABX or Tetra',
      'Prepare and record the disruption PA (and shuttle PA where there is a shuttle)',
      'Disseminate the Train Disruption Notice to all stations',
      'Instruct CSOs to make local PA every 4 minutes',
      'Complete trainer review',
    ],
    id: 'service-disruption',
    // Each incident is a service pattern in NEL/OPS/TRA/OP/DEG/14.001.46 section 7.
    incidents: [
      'Single train loop service',
      'Dual train loop service',
      'Single train loop with shuttle',
      'Dual train loop with shuttle',
      'Loop with shuttle (single platform)',
    ],
    objective: 'Implement a train loop and shuttle service with free regular & bridging buses during a train service disruption.',
    passCondition: 'Every critical OCC communication step is logged and the disruption notice is sent.',
    status: 'Active',
    target: 'NEL service pattern chosen by CC',
    title: 'Train Loop & Shuttle Service',
    trainingScenarioKind: 'SERVICE_DISRUPTION',
  },
  {
    affectedMonitors: ['Line Map', 'Calls', 'IOS'],
    duration: '07:00',
    expectedSteps: [
      'Select the train CC has decided to withdraw',
      'Alert the driver and inform station staff at the withdrawal station',
      'Alert CoC to make PA, and DTC that the train is returning to depot',
      'Close train doors & PSDs for train clear and receive Train Clear',
      'Route the train to its destination and move it off the platform',
      'Complete trainer review',
    ],
    id: 'unscheduled-withdrawal',
    // NEL/OPS/TRA/OP/OCC/03.001.9 section 7.2.
    incidents: ['Unscheduled withdrawal at station'],
    objective: 'Withdraw a train from service at a station on the Chief Controller\'s decision, outside the timetable.',
    passCondition: 'The train is cleared of passengers and routed off the platform with every critical SOP step complete.',
    status: 'Active',
    target: 'Train held at a station platform',
    title: 'Unscheduled Train Withdrawal',
    trainingScenarioKind: 'UNSCHEDULED_WITHDRAWAL',
  },
  {
    affectedMonitors: ['Line Map', 'Timetable', 'IOS'],
    duration: '06:00',
    expectedSteps: [
      'Identify crowd-affected service',
      'Coordinate station response',
      'Apply service regulation action',
      'Monitor timetable impact',
    ],
    id: 'high-occupancy',
    incidents: ['High train occupancy', 'Station coordination', 'Service regulation'],
    objective: 'Practice controller decision-making for crowded train and station loading response.',
    passCondition: 'Correct service regulation action selected and timetable impact explained.',
    status: 'Prepared',
    target: 'Train service at SKG / PGL',
    title: 'High Train Occupancy',
  },
  {
    affectedMonitors: ['Alarms', 'Line Map', 'IOS'],
    duration: '07:00',
    expectedSteps: [
      'Identify malfunction alarm',
      'Hold affected train',
      'Select recovery command',
      'Escalate to engineering role',
    ],
    id: 'system-malfunction',
    incidents: ['Train system malfunction', 'Recovery command', 'Engineering escalation'],
    objective: 'Train the operator to classify a train fault and coordinate recovery safely.',
    passCondition: 'Train isolated, correct recovery action selected, escalation recorded.',
    status: 'Prepared',
    target: 'Faulted train on mainline',
    title: 'Train System Malfunction',
  },
  {
    affectedMonitors: ['Alarms', 'IOS'],
    duration: '04:00',
    expectedSteps: [
      'Acknowledge PA fault alarm',
      'Confirm passenger information impact',
      'Record temporary communication method',
      'Close fault with trainer review',
    ],
    id: 'pa-malfunction',
    incidents: ['PA system malfunction', 'Passenger information failure'],
    objective: 'Assess whether trainee can manage communications-related incident flow.',
    passCondition: 'Alarm acknowledged and passenger communication mitigation recorded.',
    status: 'Prepared',
    target: 'Station/train PA subsystem',
    title: 'PA System Malfunction',
  },
  {
    affectedMonitors: ['Line Map', 'Timetable', 'IOS'],
    duration: '08:00',
    expectedSteps: [
      'Insert additional train',
      'Verify route availability',
      'Dispatch inserted train',
      'Review headway and timetable impact',
    ],
    id: 'train-insertion',
    incidents: ['Insertion of train', 'Route allocation', 'Headway adjustment'],
    objective: 'Practice train insertion procedure and timetable coordination.',
    passCondition: 'Inserted train is dispatched without unresolved route conflict.',
    status: 'Future',
    target: 'Additional train from depot/mainline',
    title: 'Insertion of Train',
  },
]

export const assessmentRubric: AssessmentCriterion[] = [
  {
    evidence: 'Scenario checklist and IOS event feed',
    metric: 'Correct sequence of operational steps',
    passTarget: 'All mandatory steps completed in order',
    weight: 35,
  },
  {
    evidence: 'Alarm Summary monitor',
    metric: 'Alarm acknowledgement and incident recognition',
    passTarget: 'Alarm acknowledged before route or dispatch',
    weight: 20,
  },
  {
    evidence: 'Line Map and Timetable monitors',
    metric: 'Route, dispatch, and timetable coordination',
    passTarget: 'Route selected and dispatch completed with timetable state updated',
    weight: 25,
  },
  {
    evidence: 'Rejected command count',
    metric: 'Accuracy of actions taken',
    passTarget: 'No critical rejected command',
    weight: 10,
  },
  {
    evidence: 'Trainer notes and report sign-off',
    metric: 'Explanation and post-scenario review',
    passTarget: 'Trainee explains alarm, route, dispatch, and final service state',
    weight: 10,
  },
]
