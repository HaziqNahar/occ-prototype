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
    affectedMonitors: ['Alarms', 'Line Map', 'IOS'],
    duration: '05:00',
    expectedSteps: [
      'Select affected Train 317',
      'Acknowledge the injected door fault alarm',
      'Apply the door fault procedure in Train Control',
      'Set the protected movement route after recovery',
      'Authorise train movement after the door is confirmed closed and locked',
      'Complete trainer review',
    ],
    id: 'door-fault',
    incidents: ['Door fault'],
    objective: 'Handle train door failure using alarm acknowledgement and controlled train commands.',
    passCondition: 'The alarm is acknowledged, the door is secured, and recovery movement is authorised with no critical task open.',
    status: 'Active',
    target: 'Faulted Train 317 on mainline',
    title: 'Train Door Fault',
    trainingScenarioKind: 'DOOR_FAULT',
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
