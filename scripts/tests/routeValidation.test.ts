import assert from 'node:assert/strict'
import type { SignalRouteDefinition } from '../../src/screens/line-map/routeDefinitions'
import {
  getKnownLineMapRailIds,
  getLineMapSignalAccounts,
  validateLineMapRouteDefinitions,
} from '../../src/screens/line-map/routeValidation'
import type { TimetableLineMapRoutePathDefinition } from '../../src/screens/line-map/lineMapRoutePaths'

const validRoute: SignalRouteDefinition = {
  commandSegmentIds: ['route-r608-803-command', 'rail-618'],
  commandStateSegmentIds: ['route-r608-803-command'],
  realSegmentIds: ['rail-618'],
  routeLabel: 'Route R608_803',
  signalLabel: 'S608',
}

assert.deepEqual(validateLineMapRouteDefinitions(), [])

{
  const railIds = [...getKnownLineMapRailIds()]

  assert.ok(railIds.length > 0)
  assert.equal(railIds.some((railId) => railId.startsWith('rail-unlabelled-')), false)
}

{
  const signalAccounts = getLineMapSignalAccounts()

  assert.ok(signalAccounts.length > 0)
  assert.equal(new Set(signalAccounts.map((account) => account.accountId)).size, signalAccounts.length)
  assert.equal(signalAccounts.some((account) => account.label.trim() === ''), false)
  assert.equal(signalAccounts.every((account) => account.placementStatus === 'rail-anchored'), true)
  assert.equal(signalAccounts.every((account) => account.routeStatus.length > 0), true)
}

{
  const issues = validateLineMapRouteDefinitions({
    routeDefinitions: [
      validRoute,
      {
        ...validRoute,
        commandSegmentIds: ['route-r608-803-command', 'rail-620'],
        realSegmentIds: ['rail-620'],
        routeLabel: 'Route R700_608',
        signalLabel: 'S700',
      },
    ],
  })

  assert.ok(issues.some((issue) => issue.includes('route-r608-803-command command marker is reused')))
}

{
  const issues = validateLineMapRouteDefinitions({
    routeDefinitions: [{
      ...validRoute,
      realSegmentIds: ['rail-does-not-exist'],
      routeLabel: 'Route R999_001',
      signalLabel: 'S608',
    }],
  })

  assert.ok(issues.some((issue) => issue.includes('rail-does-not-exist is not rendered')))
}

{
  const issues = validateLineMapRouteDefinitions({
    routeDefinitions: [{
      ...validRoute,
      routeLabel: 'Route Bad',
    }],
  })

  assert.ok(issues.some((issue) => issue.includes('Route Bad route label must use')))
}

{
  const issues = validateLineMapRouteDefinitions({
    routeDefinitions: [{
      ...validRoute,
      routeLabel: 'Route R709_705',
      signalLabel: 'S709',
    }],
  })

  assert.ok(issues.some((issue) => issue.includes('S709 Route R709_705 is defined for a signal that should not expose routes')))
  assert.ok(issues.some((issue) => issue.includes('S709 is marked route-less but still has route definitions')))
}

{
  const issues = validateLineMapRouteDefinitions({
    routeDefinitions: [
      {
        commandSegmentIds: [],
        commandStateSegmentIds: [],
        pendingImplementation: true,
        realSegmentIds: [],
        routeLabel: 'Route R608_600',
        signalLabel: 'S608',
      },
      {
        commandSegmentIds: ['rail-618'],
        commandStateSegmentIds: [],
        pendingImplementation: true,
        realSegmentIds: ['rail-618'],
        routeLabel: 'Route R608_602',
        signalLabel: 'S608',
      },
    ],
  })

  assert.ok(!issues.some((issue) => issue.includes('Route R608_600')))
  assert.ok(issues.some((issue) => issue.includes('Route R608_602 is pending but already defines real rail IDs')))
  assert.ok(issues.some((issue) => issue.includes('Route R608_602 is pending but already defines command segment IDs')))
}

{
  const issues = validateLineMapRouteDefinitions({
    routeDefinitions: [{
      ...validRoute,
      commandSegmentIds: ['route-r608-803-command'],
    }],
  })

  assert.ok(issues.some((issue) => issue.includes('real rail rail-618 is not part of its command segment list')))
}

{
  const issues = validateLineMapRouteDefinitions({
    routeDefinitions: [{
      ...validRoute,
      commandSegmentIds: ['route-r700-608-command', 'rail-618'],
      commandStateSegmentIds: ['route-r700-608-command'],
    }],
  })

  assert.ok(issues.some((issue) => issue.includes('command marker route-r700-608-command does not match Route R608_803')))
}

{
  const issues = validateLineMapRouteDefinitions({
    routeDefinitions: [{
      ...validRoute,
      commandSegmentIds: ['route-r608-803-command', 'rail-705-section04'],
      realSegmentIds: ['rail-705-section04'],
    }],
  })

  assert.ok(issues.some((issue) => issue.includes('uses removed or legacy rail rail-705-section04')))
}

{
  const issues = validateLineMapRouteDefinitions({
    routeDefinitions: [{
      commandSegmentIds: ['route-r999-001-command', 'rail-P608', 'rail-614'],
      commandStateSegmentIds: ['route-r999-001-command'],
      realSegmentIds: ['rail-P608', 'rail-614'],
      routeLabel: 'Route R999_001',
      signalLabel: 'S608',
    }],
  })

  assert.ok(issues.some((issue) => issue.includes('sets mutually exclusive rails rail-P608 and rail-614')))
}

{
  const issues = validateLineMapRouteDefinitions({
    routeDefinitions: [{
      commandSegmentIds: ['route-r999-002-command', 'rail-P1102', 'rail-1115', 'rail-P1103'],
      commandStateSegmentIds: ['route-r999-002-command'],
      realSegmentIds: ['rail-P1102', 'rail-1115', 'rail-P1103'],
      routeLabel: 'Route R999_002',
      signalLabel: 'S1102',
    }],
  })

  assert.ok(issues.some((issue) => issue.includes('uses invalid PGC 1115 crossover pairing rail-P1102, rail-P1103')))
}

{
  const timetableRoute: TimetableLineMapRoutePathDefinition = {
    from: 'PGC',
    id: 'test-timetable-path',
    match: { destinationAny: ['RT2_DEPOT'], stationAny: ['SKG'] },
    owner: 'timetable',
    panelCode: 'SKG',
    routeLabel: 'Test timetable path',
    routeLabels: ['Route R608_803'],
    steps: [{ point: { x: 0, y: 0 }, segmentId: 'rail-618' }],
    to: 'RT2_DEPOT',
    via: ['SKG'],
  }

  const issues = validateLineMapRouteDefinitions({
    routeDefinitions: [validRoute],
    routePathDefinitions: [timetableRoute],
  })

  assert.ok(issues.some((issue) => issue.includes('test-timetable-path must explicitly opt into or out of guide rails')))
}
