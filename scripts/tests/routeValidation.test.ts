import assert from 'node:assert/strict'
import type { SignalRouteDefinition } from '../../src/screens/line-map/routeDefinitions'
import { validateLineMapRouteDefinitions } from '../../src/screens/line-map/routeValidation'
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
  const timetableRoute: TimetableLineMapRoutePathDefinition = {
    id: 'test-timetable-path',
    match: { stationAny: ['SKG'] },
    owner: 'timetable',
    panelCode: 'SKG',
    routeLabel: 'Test timetable path',
    steps: [{ point: { x: 0, y: 0 }, segmentId: 'rail-618' }],
  }

  const issues = validateLineMapRouteDefinitions({
    routeDefinitions: [validRoute],
    routePathDefinitions: [timetableRoute],
  })

  assert.ok(issues.some((issue) => issue.includes('test-timetable-path must explicitly opt into or out of guide rails')))
}
