import { Toaster } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import { useOnlineStatus } from './components/OfflineBanner'
import { LoginForm } from './components/LoginForm'
import { OrderList } from './components/OrderList'
import { OfflineBanner } from './components/OfflineBanner'

function App() {
  const { user, profile, loading, signOut } = useAuth()
  const isOnline = useOnlineStatus()

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
        <h1>Witaj, {profile?.name || 'Użytkownik'}</h1>
        <button onClick={signOut} className="btn-danger" disabled={!isOnline}>
          Wyloguj
        </button>
      </header>

      <OrderList currentUser={user} />
    </div>
  )
}

export default App
