import { useEffect, useState } from 'react'

// When the host has been rebuilt, pages opened before it keep running the old
// app until reloaded. This checks the host's build every minute and offers
// the reload. Production builds only (dev servers have no build.json).
const CHECK_MS = 60_000

function UpdateBanner() {
  const [newer, setNewer] = useState(false)

  useEffect(() => {
    if (!import.meta.env.PROD) {
      return undefined
    }

    const check = () => {
      void fetch('/build.json', { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : null))
        .then((info: { build?: string } | null) => {
          if (info?.build && info.build !== __APP_BUILD__) {
            setNewer(true)
          }
        })
        .catch(() => undefined)
    }
    const timer = window.setInterval(check, CHECK_MS)

    check()

    return () => window.clearInterval(timer)
  }, [])

  if (!newer) {
    return null
  }

  return (
    <div className="update-banner" role="status">
      <span>A new version of the simulator is ready.</span>
      <button type="button" onClick={() => window.location.reload()}>Reload</button>
    </div>
  )
}

export default UpdateBanner
