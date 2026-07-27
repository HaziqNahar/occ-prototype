export type InspectorPage = 'information' | 'control' | 'tag'
export type TrainAuxiliaryView = 'alarms' | 'cctv' | 'details' | 'pec-reset' | 'pis' | 'regulation'
export type TrainDepartureCommandResult =
  | { accepted: true }
  | { accepted: false; message: string }
