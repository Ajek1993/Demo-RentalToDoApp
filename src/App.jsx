import { useAuth } from './hooks/useAuth'
import { LoginForm } from './components/LoginForm'
import { OrderList } from './components/OrderList'

function App() {
  const { user, profile, loading, signOut } = useAuth()

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
      <header className="app-header">
        <h1>Witaj, {profile?.name || 'Użytkownik'}</h1>
        <button onClick={signOut} className="btn-danger">
          Wyloguj
        </button>
      </header>

      <OrderList />
    </div>
  )
}

export default App
