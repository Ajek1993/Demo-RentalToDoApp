import { useState, useEffect, useRef } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import { useOnlineStatus } from './components/OfflineBanner'
import { usePushNotifications } from './hooks/usePushNotifications'
import { LoginForm } from './components/LoginForm'
import { OrderList } from './components/OrderList'
import { OfflineBanner } from './components/OfflineBanner'
import { AvailabilityManager } from './components/AvailabilityManager'
import { AdminAvailabilityView } from './components/AdminAvailabilityView'
import { FeedbackModal } from './components/FeedbackModal'
import KursyList from './components/KursyList'
import { AdminUserManagement } from './components/AdminUserManagement'
import { CompleteProfile } from './components/CompleteProfile'
import { AboutModal } from './components/AboutModal'

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return [dark, () => setDark(d => !d)]
}

function App() {
  const { user, profile, loading, signOut, passwordRecovery, updatePassword, isAdmin, needsProfileSetup } = useAuth()
  const isOnline = useOnlineStatus()
  const { subscribed, supported, subscribe, unsubscribe, loading: pushLoading } = usePushNotifications()
  const [showPushSettings, setShowPushSettings] = useState(false)
  const [showAvailability, setShowAvailability] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showKursy, setShowKursy] = useState(false)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [darkMode, toggleDarkMode] = useDarkMode()
  const [showMenu, setShowMenu] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const menuRef = useRef(null)

  // Search & filters state (shared with OrderList)
  const [searchQuery, setSearchQuery] = useState('')
  const [showOnlyMine, setShowOnlyMine] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const searchInputRef = useRef(null)

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

  // Zamknij menu po kliknięciu poza nim
  useEffect(() => {
    if (!showMenu) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  // Focus search input on desktop when shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearch])

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

  if (needsProfileSetup) {
    return <CompleteProfile />
  }

  if (passwordRecovery) {
    const handleSetNewPassword = async (e) => {
      e.preventDefault()
      setPasswordError('')

      if (newPassword.length < 6) {
        setPasswordError('Hasło musi mieć co najmniej 6 znaków')
        return
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('Hasła nie są identyczne')
        return
      }

      setPasswordLoading(true)
      try {
        const { error } = await updatePassword(newPassword)
        if (error) throw error
        toast.success('Hasło zostało zmienione!')
        setNewPassword('')
        setConfirmPassword('')
      } catch (err) {
        setPasswordError(err.message || 'Wystąpił błąd')
      } finally {
        setPasswordLoading(false)
      }
    }

    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-message-icon">🔑</div>
          <h1>Ustaw nowe hasło</h1>
          <form onSubmit={handleSetNewPassword}>
            <div className="auth-field">
              <label>Nowe hasło:</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="auth-field">
              <label>Powtórz hasło:</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            {passwordError && (
              <div className="auth-error">{passwordError}</div>
            )}
            <button type="submit" disabled={passwordLoading} className="auth-btn">
              {passwordLoading ? 'Zapisywanie...' : 'Zapisz nowe hasło'}
            </button>
          </form>
        </div>
      </div>
    )
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
          {/* Desktop: Search & Filters */}
          <div className="header-controls-desktop">
            {showSearch ? (
              <div className="search-wrapper search-expanded header-search">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="search-input"
                  placeholder="Szukaj..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => {
                    if (!searchQuery) setShowSearch(false)
                  }}
                />
                <button
                  className="search-clear"
                  onClick={() => { setSearchQuery(''); setShowSearch(false) }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                className={`toolbar-icon-btn ${searchQuery ? 'has-active-filter' : ''}`}
                onClick={() => setShowSearch(true)}
                title="Szukaj"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
            )}
            <div className="filter-dropdown-wrapper">
              <button
                className={`toolbar-icon-btn ${showFilters ? 'active' : ''} ${(showOnlyMine || dateFrom || dateTo) ? 'has-active-filter' : ''}`}
                onClick={() => setShowFilters(prev => !prev)}
                title="Filtry"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              </button>
              {showFilters && (
                <div className="filter-dropdown">
                  <button
                    className={`filter-chip ${showOnlyMine ? 'active' : ''}`}
                    onClick={() => setShowOnlyMine(prev => !prev)}
                  >
                    Moje
                  </button>
                  <div className="filter-row">
                    <label className="date-range-label">Od</label>
                    <input
                      type="date"
                      className="date-range-input"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="filter-row">
                    <label className="date-range-label">Do</label>
                    <input
                      type="date"
                      className="date-range-input"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                  {(dateFrom || dateTo) && (
                    <button
                      className="filter-chip"
                      onClick={() => { setDateFrom(''); setDateTo('') }}
                    >
                      ✕ Wyczyść daty
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="header-menu-wrapper" ref={menuRef}>
            <button
              onClick={() => setShowMenu(v => !v)}
              className="btn-icon"
              title="Menu"
              aria-label="Menu"
              aria-expanded={showMenu}
              aria-haspopup="true"
            >
              ⚙️
            </button>
            {showMenu && (
              <div className="header-menu" role="menu">
                <button
                  className="header-menu-item"
                  role="menuitem"
                  onClick={() => { toggleDarkMode(); setShowMenu(false) }}
                >
                  <span className="header-menu-icon" aria-hidden="true">{darkMode ? '☀️' : '🌙'}</span>
                  {darkMode ? 'Tryb jasny' : 'Tryb ciemny'}
                </button>
                <button
                  className="header-menu-item"
                  role="menuitem"
                  onClick={() => { setShowAvailability(true); setShowMenu(false) }}
                  disabled={!isOnline}
                >
                  <span className="header-menu-icon" aria-hidden="true">📅</span>
                  {isAdmin ? 'Dyspozycyjność' : 'Moja dyspozycyjność'}
                </button>
                <button
                  className="header-menu-item"
                  role="menuitem"
                  onClick={() => { setShowKursy(true); setShowMenu(false) }}
                  disabled={!isOnline}
                >
                  <span className="header-menu-icon" aria-hidden="true">🚗</span>
                  Kursy <span className="beta-badge">Beta</span>
                </button>
                {isAdmin && (
                  <button
                    className="header-menu-item"
                    role="menuitem"
                    onClick={() => { setShowUserManagement(true); setShowMenu(false) }}
                    disabled={!isOnline}
                  >
                    <span className="header-menu-icon" aria-hidden="true">👥</span>
                    Użytkownicy
                  </button>
                )}
                {supported && (
                  <button
                    className="header-menu-item"
                    role="menuitem"
                    onClick={() => { togglePushSettings(); setShowMenu(false) }}
                    disabled={!isOnline}
                  >
                    <span className="header-menu-icon" aria-hidden="true">🔔</span>
                    Powiadomienia
                  </button>
                )}
                <button
                  className="header-menu-item"
                  role="menuitem"
                  onClick={() => { setShowFeedback(true); setShowMenu(false) }}
                  disabled={!isOnline}
                >
                  <span className="header-menu-icon" aria-hidden="true">💬</span>
                  Feedback
                </button>
                <button
                  className="header-menu-item"
                  role="menuitem"
                  onClick={() => { setShowAbout(true); setShowMenu(false) }}
                >
                  <span className="header-menu-icon" aria-hidden="true">ℹ️</span>
                  O programie
                </button>
                <div className="header-menu-divider"></div>
                <button
                  className="header-menu-item header-menu-item-danger"
                  role="menuitem"
                  onClick={() => { signOut(); setShowMenu(false) }}
                  disabled={!isOnline}
                >
                  Wyloguj
                </button>
              </div>
            )}
          </div>
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
        isAdmin ? (
          <AdminAvailabilityView onClose={() => setShowAvailability(false)} />
        ) : (
          <AvailabilityManager onClose={() => setShowAvailability(false)} />
        )
      )}

      {showFeedback && (
        <FeedbackModal userId={user.id} onClose={() => setShowFeedback(false)} />
      )}

      {showAbout && (
        <AboutModal onClose={() => setShowAbout(false)} />
      )}

      {showKursy && (
        <div className="modal-overlay" onClick={() => setShowKursy(false)}>
          <div className="modal-content kursy-modal" role="dialog" aria-modal="true" aria-label="Kursy" onClick={(e) => e.stopPropagation()}>
            <KursyList currentUser={user} profile={profile} onClose={() => setShowKursy(false)} isAdmin={isAdmin} />
          </div>
        </div>
      )}

      {showUserManagement && isAdmin && (
        <AdminUserManagement onClose={() => setShowUserManagement(false)} />
      )}

      <main id="main-content">
        <OrderList
          currentUser={user}
          isAdmin={isAdmin}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showOnlyMine={showOnlyMine}
          setShowOnlyMine={setShowOnlyMine}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
        />
      </main>
    </div>
  )
}

export default App
