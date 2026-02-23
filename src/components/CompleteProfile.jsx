import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export function CompleteProfile() {
  const { completeProfile } = useAuth()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Imię i nazwisko jest wymagane')
      return
    }
    if (password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków')
      return
    }
    if (password !== confirmPassword) {
      setError('Hasła nie są identyczne')
      return
    }

    setLoading(true)
    const { error: err } = await completeProfile(name.trim(), password)
    if (err) {
      setError(err.message || 'Wystąpił błąd. Spróbuj ponownie.')
      setLoading(false)
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-message-icon">👋</div>
        <h1>Uzupełnij profil</h1>
        <p className="auth-description">
          Witaj! Zanim zaczniesz, podaj swoje imię i nazwisko oraz ustaw hasło do konta.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="complete-name">Imię i nazwisko</label>
            <input
              id="complete-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Jan Kowalski"
              autoFocus
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="complete-password">Hasło</label>
            <input
              id="complete-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 znaków"
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="complete-password-confirm">Potwierdź hasło</label>
            <input
              id="complete-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Powtórz hasło"
              required
            />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Zapisywanie...' : 'Rozpocznij korzystanie'}
          </button>
        </form>
      </div>
    </div>
  )
}
