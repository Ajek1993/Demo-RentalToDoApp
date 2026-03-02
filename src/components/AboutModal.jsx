import { useScrollLock } from '../hooks/useScrollLock'

const CHANGELOG = [
  {
    version: '1.1.0',
    date: '2026-03-02',
    changes: [
      'Content Security Policy (CSP) — ochrona przed XSS',
      'Zablokowanie eskalacji uprawnień (zmiana roli) w bazie danych',
      'Ograniczenia maxLength na wszystkich formularzach',
      'Walidacja payloadu Edge Function send-push',
      'ESLint plugin security — wykrywanie zagrożeń w kodzie',
      'Wyłączenie sourcemaps w buildzie produkcyjnym',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-02-27',
    changes: [
      'Blokowanie przewijania tła pod modalami na urządzeniach mobilnych',
      'Ujednolicony przycisk zamykania (✕) we wszystkich modalach',
      'Poprawki layoutu panelu zarządzania użytkownikami',
    ],
  },
  {
    version: '0.9.9',
    date: '2026-02-26',
    changes: [
      'Rozszerzone grupowanie dat: Pojutrze, Ten tydzień, Przyszły tydzień',
      'Nowe grupy domyślnie zwinięte; tylko „Dzisiaj" rozwinięte',
    ],
  },
  {
    version: '0.9.8',
    date: '2026-02-24',
    changes: [
      'Optymalizacja ładowania danych przy przełączaniu zakładek (~45 → ~15 zapytań)',
      'Lista użytkowników pobierana raz zamiast per karta',
      'Historia edycji ładowana lazy (dopiero po otwarciu)',
    ],
  },
  {
    version: '0.9.7',
    date: '2026-02-24',
    changes: [
      'Admin może wypisać inną osobę ze zlecenia (z historii przypisań)',
      'Historia pokazuje kto przypisał / wypisał inną osobę',
      'Naprawiono resetowanie stanu subskrypcji push po ręcznym wypisaniu',
      'Wklejona data pozostaje widoczna w polu "Szybkie wklejanie daty"',
      'Naprawiono styl focus na checkboxach (bez box-shadow)',
    ],
  },
  {
    version: '0.9.6',
    date: '2026-02-23',
    changes: [
      'Pełna zgodność WCAG 2.1 AA (focus trap, ARIA roles, semantic HTML)',
      'Skip navigation link dla nawigacji klawiaturą',
      'Powiązanie htmlFor/id dla wszystkich pól formularzy',
    ],
  },
  {
    version: '0.9.5',
    date: '2026-02-23',
    changes: [
      'Przyciski "Zapisz się" / "Przypisz" przeniesione do modalu akcji na mobile',
      'Header modalu z datą, godziną i lokalizacją zlecenia',
      'Modal zamyka się automatycznie po przypisaniu lub zapisaniu się',
    ],
  },
  {
    version: '0.9.4',
    date: '2026-02-23',
    changes: [
      'Automatyczne przekierowanie po uzupełnieniu profilu',
      'Dynamiczne nagłówki CORS w edge functions',
      'Wyłączona publiczna rejestracja',
    ],
  },
  {
    version: '0.9.3',
    date: '2026-02-22',
    changes: [
      'Automatyczne powiadomienia push o dyspozycyjności (pg_cron)',
      'Filtrowanie subskrybentów push po roli',
    ],
  },
  {
    version: '0.9.2',
    date: '2026-02-22',
    changes: [
      'Numery rejestracyjne zawsze jako UPPERCASE',
      'Kolorowe nagłówki grup dat z badge\'ami',
      'Grupy dat domyślnie zwinięte (poza "Dzisiaj")',
    ],
  },
  {
    version: '0.9.1',
    date: '2025-02-20',
    changes: [
      'Trwałe usuwanie zleceń dla admina',
      'Automatyczne przeliczanie kwoty przy edycji kursu',
      'Godzina zlecenia opcjonalna',
    ],
  },
]

export function AboutModal({ onClose }) {
  useScrollLock()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content about-modal" role="dialog" aria-modal="true" aria-label="O programie" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Zamknij">✕</button>
        <h2>O programie</h2>

        <div className="about-version">
          <span className="about-app-name">Abacus</span>
          <span className="about-version-badge">v{__APP_VERSION__}</span>
        </div>

        <p className="about-description">
          System zleceń wypożyczalni samochodów
        </p>

        <div className="about-changelog">
          <h3>Ostatnie zmiany</h3>
          {CHANGELOG.map((release) => (
            <div key={release.version} className="about-release">
              <div className="about-release-header">
                <span className="about-release-version">v{release.version}</span>
                <span className="about-release-date">{release.date}</span>
              </div>
              <ul className="about-release-changes">
                {release.changes.map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button onClick={onClose} className="btn-primary">Zamknij</button>
        </div>
      </div>
    </div>
  )
}
