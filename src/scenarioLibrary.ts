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
}

export type AssessmentCriterion = {
  evidence: string
  metric: string
  passTarget: string
  weight: number
}

export const scenarioTemplates: ScenarioTemplate[] = [
  {
    affectedMonitors: ['Alarms', 'Line Map', 'Timetable', 'IOS'],
    duration: '05:00',
    expectedSteps: [
      'Select Train 317',
      'Acknowledge injected alarm',
      'Apply route command',
      'Dispatch train after route',
      'Complete trainer review',
    ],
    id: 'launch-withdrawal',
    incidents: ['Door fault', 'Train hold', 'Timetable deviation'],
    objective: 'Handle a controlled train launch / withdrawal drill across all three OCC monitors.',
    passCondition: 'All required steps complete with no unresolved rejected action.',
    status: 'Active',
    target: 'Train 317 at SKG/BGK section',
    title: 'Train Launch / Withdrawal',
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
