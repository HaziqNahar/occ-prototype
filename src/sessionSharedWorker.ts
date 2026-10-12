import type { SessionMonitorLaunch } from './types'

// The SharedWorker is scoped to one browser profile. It relays Monitor 02's
// request to open Monitor 01 and Monitor 03 to the other windows on this PC.
// Session state never passes through here: the server is its only source.

type MonitorLaunchMessage = SessionMonitorLaunch & {
  type: 'monitor-launch:request'
}

type SharedWorkerConnectEvent = MessageEvent & {
  ports: MessagePort[]
}

const workerScope = globalThis as unknown as {
  onconnect: ((event: SharedWorkerConnectEvent) => void) | null
}

const ports = new Set<MessagePort>()

// Dead windows throw when messaged; deleting them keeps the worker healthy
// during repeated local runs.
function postToPort(port: MessagePort, message: MonitorLaunchMessage & { transport: 'shared-worker' }) {
  try {
    port.postMessage(message)
  } catch {
    ports.delete(port)
  }
}

workerScope.onconnect = (event: SharedWorkerConnectEvent) => {
  const port = event.ports[0]

  if (!port) {
    return
  }

  ports.add(port)

  port.onmessage = (messageEvent: MessageEvent<MonitorLaunchMessage>) => {
    const message = messageEvent.data

    // Launch requests are one-shot coordination events, not stored.
    if (message.type === 'monitor-launch:request') {
      ports.forEach((target) => postToPort(target, { ...message, transport: 'shared-worker' }))
    }
  }

  port.start()
}

export { }
