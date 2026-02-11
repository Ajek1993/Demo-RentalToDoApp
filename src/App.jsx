import { useState, useEffect } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import { useOnlineStatus } from './components/OfflineBanner'
import { usePushNotifications } from './hooks/usePushNotifications'
import { LoginForm } from './components/LoginForm'
import { OrderList } from './components/OrderList'
import { OfflineBanner } from './components/OfflineBanner'
import { AvailabilityManager } from './components/AvailabilityManager'

function App() {
  const { user, profile, loading, signOut } = useAuth()
  const isOnline = useOnlineStatus()
  const { subscribed, supported, subscribe, unsubscribe, loading: pushLoading } = usePushNotifications()
  const [showPushSettings, setShowPushSettings] = useState(false)
  const [showAvailability, setShowAvailability] = useState(false)

  // Automatyczna subskrypcja przy pierwszym zalogowaniu
  useEffect(() => {
    if (user && !subscribed && !pushLoading && supported) {
      // Sprawdź rzeczywiste uprawnienia przeglądarki
      if (Notification.permission === 'default') {
        // Nie pytano jeszcze - pytaj automatycznie
        const timer = setTimeout(() => {
          handleSubscribe()
        }, 2000)
        return () => clearTimeout(timer)
      } else if (Notification.permission === 'granted' && !subscribed) {
        // Zgoda udzielona, ale brak subskrypcji - pytaj ponownie
        const timer = setTimeout(() => {
          handleSubscribe()
        }, 2000)
        return () => clearTimeout(timer)
      }
      // Jeśli 'denied' - nie pytaj, user odmówił
    }
  }, [user, subscribed, pushLoading, supported])

  const handleSubscribe = async () => {
    try {
      await subscribe()
      toast.success('Powiadomienia włączone!')
    } catch (error) {
      console.error('Failed to subscribe:', error)
      if (error.message.includes('denied')) {
        toast.error('Odmówiono dostępu do powiadomień')
      } else {
        toast.error('Nie udało się włączyć powiadomień')
      }
    }
  }

  const handleUnsubscribe = async () => {
    try {
      await unsubscribe()
      toast.success('Powiadomienia wyłączone')
    } catch (error) {
      console.error('Failed to unsubscribe:', error)
      toast.error('Nie udało się wyłączyć powiadomień')
    }
  }

  const togglePushSettings = () => {
    setShowPushSettings(!showPushSettings)
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div>Ładowanie...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return (
    <div>
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '8px',
            background: '#333',
            color: '#fff',
          },
        }}
      />
      <OfflineBanner />
      <header className="app-header">
        <div className="header-left">
          <h1>Witaj, {profile?.name || 'Użytkownik'}</h1>
        </div>
        <div className="header-right">
          <button
            onClick={() => setShowAvailability(true)}
            className="btn-icon"
            title="Dyspozycyjność"
            disabled={!isOnline}
          >
            📅
          </button>
          {supported && (
            <button
              onClick={togglePushSettings}
              className="btn-icon"
              title="Ustawienia powiadomień"
              disabled={!isOnline}
            >
              🔔
            </button>
          )}
          <button onClick={signOut} className="btn-danger" disabled={!isOnline}>
            Wyloguj
          </button>
        </div>
      </header>

      {showPushSettings && (
        <div className="push-settings">
          <div className="push-settings-content">
            <h3>Powiadomienia Push</h3>
            {supported ? (
              <>
                {Notification.permission === 'denied' && (
                  <p className="push-error">
                    ⚠️ Odmówiłeś zgody na powiadomienia.
                    Zmień ustawienia w przeglądarce: Kliknij ikonę 🔒 w pasku adresu → Powiadomienia → Zezwalaj
                  </p>
                )}
                <p className="push-status">
                  Status: {subscribed ? '✅ Włączone' : '❌ Wyłączone'}
                </p>
                <p className="push-description">
                  Otrzymuj powiadomienia o nowych zleceniach i zmianach nawet gdy aplikacja jest zamknięta.
                </p>
                <div className="push-buttons">
                  {subscribed ? (
                    <button
                      onClick={handleUnsubscribe}
                      className="btn-secondary"
                      disabled={!isOnline}
                    >
                      Wyłącz powiadomienia
                    </button>
                  ) : (
                    <button
                      onClick={handleSubscribe}
                      className="btn-primary"
                      disabled={!isOnline}
                    >
                      Włącz powiadomienia
                    </button>
                  )}
                  <button onClick={togglePushSettings} className="btn-secondary">
                    Zamknij
                  </button>
                </div>
              </>
            ) : (
              <p className="push-not-supported">
                Twoja przeglądarka nie wspiera powiadomień push. Użyj Chrome, Firefox lub Edge.
              </p>
            )}
          </div>
        </div>
      )}

      {showAvailability && (
        <AvailabilityManager onClose={() => setShowAvailability(false)} />
      )}

      <OrderList currentUser={user} />
    </div>
  )
}

export default App
