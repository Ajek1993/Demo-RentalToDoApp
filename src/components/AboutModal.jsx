const CHANGELOG = [
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
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content about-modal" onClick={(e) => e.stopPropagation()}>
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
