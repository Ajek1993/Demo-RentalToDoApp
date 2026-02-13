import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)

  const { signIn, signUp, resetPassword } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Walidacja
    if (!email || !password || (isSignUp && !name)) {
      setError('Wszystkie pola są wymagane')
      setLoading(false)
      return
    }

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, name)
        if (error) throw error
        setShowEmailConfirmation(true)
      } else {
        const { error } = await signIn(email, password)
        if (error) throw error
      }
    } catch (err) {
      setError(err.message || 'Wystąpił błąd')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!resetEmail) {
      setError('Podaj adres email')
      setLoading(false)
      return
    }

    try {
      const { error } = await resetPassword(resetEmail)
      if (error) throw error
      setResetSent(true)
    } catch (err) {
      setError(err.message || 'Wystąpił błąd')
    } finally {
      setLoading(false)
    }
  }

  function goBackToLogin() {
    setShowEmailConfirmation(false)
    setShowResetPassword(false)
    setResetSent(false)
    setIsSignUp(false)
    setEmail('')
    setPassword('')
    setName('')
    setResetEmail('')
    setError('')
  }

  // Ekran potwierdzenia email po rejestracji
  if (showEmailConfirmation) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-message-icon">✉️</div>
          <h1>Sprawdź swoją skrzynkę</h1>
          <p className="auth-message">
            Wysłaliśmy link potwierdzający na adres <strong>{email}</strong>.
            Kliknij link w wiadomości, aby aktywować konto.
          </p>
          <p className="auth-message-hint">
            Nie widzisz wiadomości? Sprawdź folder spam.
          </p>
          <button onClick={goBackToLogin} className="auth-btn">
            Wróć do logowania
          </button>
        </div>
      </div>
    )
  }

  // Formularz resetowania hasła
  if (showResetPassword) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Resetuj hasło</h1>

          {resetSent ? (
            <>
              <div className="auth-message-icon">📧</div>
              <p className="auth-message">
                Wysłaliśmy link do resetowania hasła na adres <strong>{resetEmail}</strong>.
                Kliknij link w wiadomości, aby ustawić nowe hasło.
              </p>
              <p className="auth-message-hint">
                Nie widzisz wiadomości? Sprawdź folder spam.
              </p>
              <button onClick={goBackToLogin} className="auth-btn">
                Wróć do logowania
              </button>
            </>
          ) : (
            <>
              <p className="auth-description">
                Podaj adres email powiązany z Twoim kontem. Wyślemy Ci link do resetowania hasła.
              </p>
              <form onSubmit={handleResetPassword}>
                <div className="auth-field">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="twoj@email.com"
                    required
                  />
                </div>

                {error && (
                  <div className="auth-error">{error}</div>
                )}

                <button type="submit" disabled={loading} className="auth-btn">
                  {loading ? 'Wysyłanie...' : 'Wyślij link resetujący'}
                </button>
              </form>
              <div className="auth-switch">
                <button onClick={goBackToLogin} className="auth-link">
                  Wróć do logowania
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Główny formularz logowania / rejestracji
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>{isSignUp ? 'Rejestracja' : 'Logowanie'}</h1>

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="auth-field">
              <label>Imię i nazwisko:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isSignUp}
              />
            </div>
          )}

          <div className="auth-field">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label>Hasło:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="auth-error">{error}</div>
          )}

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Ładowanie...' : (isSignUp ? 'Zarejestruj się' : 'Zaloguj się')}
          </button>
        </form>

        {!isSignUp && (
          <div className="auth-forgot">
            <button
              onClick={() => {
                setShowResetPassword(true)
                setError('')
              }}
              className="auth-link"
            >
              Nie pamiętasz hasła?
            </button>
          </div>
        )}

        <div className="auth-switch">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
            }}
            className="auth-link"
          >
            {isSignUp ? 'Masz już konto? Zaloguj się' : 'Nie masz konta? Zarejestruj się'}
          </button>
        </div>
      </div>
    </div>
  )
}
