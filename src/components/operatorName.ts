import { createContext } from 'react'

// The signed-in person's username, shown in capitals above "[ TSR1 ] @ OCC" in
// the SCADA footer, as the workstation shows its operator.
export const OperatorNameContext = createContext('')
