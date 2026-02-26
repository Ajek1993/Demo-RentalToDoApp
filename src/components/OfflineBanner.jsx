import { useOnlineStatus } from '../hooks/useOnlineStatus'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="offline-banner" role="alert" aria-live="assertive" aria-atomic="true">
      Brak połączenia z internetem
    </div>
  )
}
