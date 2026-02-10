import { useAuth } from './hooks/useAuth'
import { LoginForm } from './components/LoginForm'

function App() {
  const { user, profile, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div>Ładowanie...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return (
    <div style={{ padding: '20px' }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h1>Witaj, {profile?.name || 'Użytkownik'}</h1>
        <button
          onClick={signOut}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Wyloguj
        </button>
      </header>

      <main style={{
        maxWidth: '1200px',
        margin: '40px auto'
      }}>
        <p>Główna strona aplikacji (jeszcze nie zaimplementowana)</p>
      </main>
    </div>
  )
}

export default App
