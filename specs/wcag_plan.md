# WCAG 2.1 — Szczegółowy Plan Naprawy

**Data:** 2026-02-22
**Źródło:** [specs/wcag.md](./wcag.md)
**Cel:** WCAG 2.1 Level AA

---

## Etap 1 — Modal.jsx (fundament dostępności)

**Plik:** `src/components/Modal.jsx`
**Priorytet:** 🔴 Krytyczny
**WCAG:** 1.3.1, 2.1.1, 2.4.3, 4.1.3

Modal.jsx to baza dla wszystkich modali w aplikacji. Poprawka tutaj automatycznie poprawi komponenty, które go używają (KursyList).

### Obecny kod (linia 1-9):
```jsx
export default function Modal({ children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
```

### Docelowy kod:
```jsx
import { useEffect, useRef } from 'react'

export default function Modal({ children, onClose, ariaLabel }) {
  const modalRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    // Save previous focus to restore later
    previousFocusRef.current = document.activeElement

    // Focus the modal container
    modalRef.current?.focus()

    // Handle Escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
        return
      }

      // Focus trap: keep Tab inside modal
      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable || focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Restore focus on close
      previousFocusRef.current?.focus()
    }
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
```

### Zmiany:
- `role="dialog"` + `aria-modal="true"` — czytnik ekranu rozpozna modal
- `aria-label` (prop) — opis modalu dla czytnika
- `tabIndex={-1}` + `ref` — fokus na modal po otwarciu
- Obsługa klawisza **Escape** — zamyka modal
- **Focus trap** — Tab/Shift+Tab nie opuszcza modalu
- **Focus restore** — po zamknięciu fokus wraca do triggera

### Aktualizacja KursyList.jsx (linia 444):
```jsx
// Było:
<Modal onClose={() => setEditing(null)}>

// Będzie:
<Modal onClose={() => setEditing(null)} ariaLabel="Edytuj kurs">
```

---

## Etap 2 — Inline modals (bez użycia Modal.jsx)

**Pliki do poprawienia:**
- `src/components/FeedbackModal.jsx`
- `src/components/AboutModal.jsx`
- `src/components/AvailabilityManager.jsx`
- `src/components/AdminAvailabilityView.jsx`
- `src/components/OrderCard.jsx` (3 modale inline)
- `src/components/OrderList.jsx` (3 modale inline)

Te komponenty mają własne `modal-overlay` + `modal-content` zamiast `<Modal>`. Mają dwa warianty naprawy:

### Wariant A — Refaktor na `<Modal>` (rekomendowany)

Zamienić inline overlay/content na komponent `<Modal>` z etapu 1. Przykład dla FeedbackModal:

**FeedbackModal.jsx — obecny kod (linia 32-33):**
```jsx
<div className="modal-overlay" onClick={onClose}>
  <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
```

**FeedbackModal.jsx — docelowy:**
```jsx
<Modal onClose={onClose} ariaLabel="Wyślij feedback">
  <div style={{ maxWidth: 400 }}>
```

### Wariant B — Dodać atrybuty ARIA inline (szybsza naprawa)

Jeśli refaktor jest zbyt ryzykowny, dodać atrybuty bezpośrednio:

```jsx
<div className="modal-overlay" onClick={onClose}>
  <div
    className="modal-content"
    role="dialog"
    aria-modal="true"
    aria-label="Wyślij feedback"
    onClick={e => e.stopPropagation()}
  >
```

### Konkretne zmiany per plik:

**FeedbackModal.jsx:**
- Dodaj `<label htmlFor="feedback-textarea">` do textarea (linia 37)
- Dodaj `id="feedback-textarea"` do `<textarea>` (linia 37)
- Dodaj `aria-label="Wyślij feedback"` na modal

**AboutModal.jsx (linia 32-33):**
- Dodaj `role="dialog"`, `aria-modal="true"`, `aria-label="O programie"`

**AvailabilityManager.jsx (linia 157-158):**
- Dodaj `role="dialog"`, `aria-modal="true"`, `aria-label="Moja dyspozycyjność"`
- Dodaj Escape key handler
- Dodaj focus trap

**AdminAvailabilityView.jsx (linia 75-76):**
- Dodaj `role="dialog"`, `aria-modal="true"`, `aria-label="Dyspozycyjność kierowców"`
- Dodaj Escape key handler

**OrderCard.jsx — 3 modale:**
- Linia 357: `aria-label="Akcje zlecenia"` na actions modal
- Linia 450: `aria-label="Potwierdzenie wypisania"` na unassign confirm
- Linia 467: `aria-label="Trwałe usunięcie zlecenia"` na permanent delete confirm

**OrderList.jsx — 3 modale:**
- Linia 395: `aria-label={editingOrder ? 'Edytuj zlecenie' : 'Nowe zlecenie'}`
- Linia 409: `aria-label="Potwierdzenie usunięcia"`
- Linia 438: `aria-label="Potwierdzenie zakończenia"`

---

## Etap 3 — OfflineBanner: role="alert"

**Plik:** `src/components/OfflineBanner.jsx`
**Priorytet:** 🔴 Krytyczny
**WCAG:** 4.1.3

### Obecny kod (linia 33-35):
```jsx
<div className="offline-banner">
  Brak połączenia z internetem
</div>
```

### Docelowy kod:
```jsx
<div className="offline-banner" role="alert" aria-live="assertive" aria-atomic="true">
  Brak połączenia z internetem
</div>
```

---

## Etap 4 — Aria-labels dla emoji i ikon

**Plik:** `src/components/OrderCard.jsx`
**Priorytet:** 🔴 Krytyczny
**WCAG:** 1.1.1

### Zmiany w OrderCard.jsx:

**Linia 171-183** (przycisk historii):
```jsx
// Było:
<button className="btn-history-icon" ... title="Historia">
  📜

// Będzie:
<button className="btn-history-icon" ... title="Historia" aria-label="Historia przypisań">
  📜
```

**Linia 186-195** (przycisk notatek):
```jsx
// Było:
<button className="btn-notes-info" ... title="Notatki">
  i

// Będzie:
<button className="btn-notes-info" ... title="Notatki" aria-label="Pokaż notatki">
  i
```

**Linia 219-228** (drukuj OC):
```jsx
// Było:
<button ... className="btn-icon btn-print-oc" title={`Drukuj OC - ${order.insurance_company}`}>
  🖨️

// Będzie:
<button ... className="btn-icon btn-print-oc" title={`Drukuj OC - ${order.insurance_company}`} aria-label={`Drukuj dokument OC ${order.insurance_company}`}>
  🖨️
```

**Linia 235** (edytuj):
```jsx
// Było:
<button ... className="btn-icon btn-secondary" title="Edytuj" ...>
  ✏️

// Będzie:
<button ... className="btn-icon btn-secondary" title="Edytuj" aria-label="Edytuj zlecenie" ...>
  ✏️
```

**Linia 238** (usuń):
```jsx
// Było:
<button ... className="btn-icon btn-danger" title="Usuń" ...>
  ✕

// Będzie:
<button ... className="btn-icon btn-danger" title="Usuń" aria-label="Usuń zlecenie" ...>
  ✕
```

**Linia 246** (przywróć):
```jsx
// Było:
<button ... className="btn-icon btn-primary" title="Przywróć" ...>
  ↶

// Będzie:
<button ... className="btn-icon btn-primary" title="Przywróć" aria-label="Przywróć zlecenie" ...>
  ↶
```

**Linia 261** (usuń na stałe):
```jsx
// Było:
<button ... className="btn-icon btn-danger" title="Usuń na stałe" ...>
  🗑️

// Będzie:
<button ... className="btn-icon btn-danger" title="Usuń na stałe" aria-label="Usuń zlecenie na stałe" ...>
  🗑️
```

### Zmiany w AvailabilityManager.jsx:

**Linia 162-166** (strzałka w lewo):
```jsx
// Było:
<button className="btn-compact btn-secondary" onClick={...}>
  &larr;

// Będzie:
<button className="btn-compact btn-secondary" onClick={...} aria-label="Poprzedni tydzień">
  &larr;
```

**Linia 169-173** (strzałka w prawo):
```jsx
// Było:
<button className="btn-compact btn-secondary" onClick={...}>
  &rarr;

// Będzie:
<button className="btn-compact btn-secondary" onClick={...} aria-label="Następny tydzień">
  &rarr;
```

**Linia 238-242** (usuń slot):
```jsx
// Było:
<button className="btn-icon btn-danger avail-remove-slot" onClick={...}>
  &times;

// Będzie:
<button className="btn-icon btn-danger avail-remove-slot" onClick={...} aria-label="Usuń slot czasowy">
  &times;
```

### Zmiany w OrderList.jsx:

**Linia 252-257** (filtr SVG):
```jsx
// Było:
<button className={...} onClick={...} title="Filtry">
  <svg ...>

// Będzie:
<button className={...} onClick={...} title="Filtry" aria-label="Pokaż filtry">
  <svg aria-hidden="true" ...>
```

**Linia 280-286** (szukaj SVG):
```jsx
// Było:
<button className={...} onClick={...} title="Szukaj">
  <svg ...>

// Będzie:
<button className={...} onClick={...} title="Szukaj" aria-label="Szukaj zleceń">
  <svg aria-hidden="true" ...>
```

**Linia 272-276** (zamknij wyszukiwanie):
```jsx
// Było:
<button className="search-clear" onClick={...}>
  ✕

// Będzie:
<button className="search-clear" onClick={...} aria-label="Zamknij wyszukiwanie">
  ✕
```

**Linia 315-320** (wyczyść daty):
```jsx
// Było:
<button className="filter-chip" onClick={...}>
  ✕

// Będzie:
<button className="filter-chip" onClick={...} aria-label="Wyczyść filtr dat">
  ✕
```

**Linia 390** (FAB):
```jsx
// Było:
<button className="fab" onClick={handleAddOrder} title="Dodaj zlecenie" ...>
  +

// Będzie:
<button className="fab" onClick={handleAddOrder} title="Dodaj zlecenie" aria-label="Dodaj nowe zlecenie" ...>
  +
```

### Zmiany w KursyList.jsx:

**Linia 295-296** (zamknij panel):
```jsx
// Było:
<button type="button" className="panel-close" onClick={onClose}>
  X

// Będzie:
<button type="button" className="panel-close" onClick={onClose} aria-label="Zamknij panel kursów">
  X
```

**Linia 446-447** (zamknij edycję kursu):
```jsx
// Było:
<button type="button" className="panel-close" onClick={() => setEditing(null)}>
  X

// Będzie:
<button type="button" className="panel-close" onClick={() => setEditing(null)} aria-label="Zamknij edycję kursu">
  X
```

---

## Etap 5 — Etykiety formularzy (htmlFor + id)

**Priorytet:** 🔴 Krytyczny
**WCAG:** 1.3.1, 2.5.3

### FeedbackModal.jsx (linia 36-43):
```jsx
// Było:
<div className="form-group">
  <textarea value={message} ... placeholder="Opisz problem..." />
</div>

// Będzie:
<div className="form-group">
  <label htmlFor="feedback-message">Twój feedback</label>
  <textarea id="feedback-message" value={message} ... placeholder="Opisz problem..." />
</div>
```

### AdminAvailabilityView.jsx (linia 96-103):
```jsx
// Było:
<label>
  {dateRange === 'single' ? 'Data:' : 'Od:'}
  <input type="date" value={selectedDate} ... />
</label>

// Będzie:
<label htmlFor="avail-start-date">
  {dateRange === 'single' ? 'Data:' : 'Od:'}
</label>
<input id="avail-start-date" type="date" value={selectedDate} ... />
```

**Linia 107-114:**
```jsx
// Było:
<label>
  Do:
  <input type="date" value={endDate} ... />
</label>

// Będzie:
<label htmlFor="avail-end-date">Do:</label>
<input id="avail-end-date" type="date" value={endDate} ... />
```

### AvailabilityManager.jsx (linia 226-235, inputy time):
```jsx
// Było:
<input type="time" value={slot.start_time} onChange={...} />
<span className="avail-slot-separator">-</span>
<input type="time" value={slot.end_time} onChange={...} />

// Będzie:
<label htmlFor={`slot-start-${index}`} className="sr-only">Godzina od</label>
<input id={`slot-start-${index}`} type="time" value={slot.start_time} onChange={...} />
<span className="avail-slot-separator" aria-hidden="true">-</span>
<label htmlFor={`slot-end-${index}`} className="sr-only">Godzina do</label>
<input id={`slot-end-${index}`} type="time" value={slot.end_time} onChange={...} />
```

### OrderList.jsx (linia 300-312, filtry dat):
```jsx
// Było:
<label className="date-range-label">Od</label>
<input type="date" className="date-range-input" value={dateFrom} ... />
<label className="date-range-label">Do</label>
<input type="date" className="date-range-input" value={dateTo} ... />

// Będzie:
<label htmlFor="filter-date-from" className="date-range-label">Od</label>
<input id="filter-date-from" type="date" className="date-range-input" value={dateFrom} ... />
<label htmlFor="filter-date-to" className="date-range-label">Do</label>
<input id="filter-date-to" type="date" className="date-range-input" value={dateTo} ... />
```

### OrderList.jsx (linia 261-267, search input):
```jsx
// Było:
<input ref={searchInputRef} type="text" className="search-input" placeholder="Szukaj..." ... />

// Będzie:
<label htmlFor="order-search" className="sr-only">Szukaj zleceń</label>
<input id="order-search" ref={searchInputRef} type="text" className="search-input" placeholder="Szukaj..." ... />
```

### LoginForm.jsx (linia 130, 169, 180, 190):
Labele w LoginForm **nie mają htmlFor** i inputy **nie mają id**. Wrappowanie `<label>` wokół inputa jest akceptowalne, ale explicit `htmlFor` + `id` jest bardziej niezawodne.

```jsx
// Było:
<label>Email:</label>
<input type="email" value={email} ... />

// Będzie:
<label htmlFor="login-email">Email:</label>
<input id="login-email" type="email" value={email} ... />
```

Analogicznie dla: password (`login-password`), name (`login-name`), resetEmail (`reset-email`).

### KursyList.jsx — filtry (linia 358-386):
```jsx
// Było:
<label>
  Data:
  <input type="date" value={filterDate} ... />
</label>

// Będzie:
<label htmlFor="kurs-filter-date">Data:</label>
<input id="kurs-filter-date" type="date" value={filterDate} ... />
```

Analogicznie: `kurs-filter-nr`, `kurs-filter-marka`.

### KursyList.jsx — edycja kursu (linia 455-507):
```jsx
// Było:
<label>
  Data:
  <input type="date" value={editData} ... />
</label>

// Będzie:
<label htmlFor="kurs-edit-data">Data:</label>
<input id="kurs-edit-data" type="date" value={editData} ... />
```

Analogicznie: `kurs-edit-nrrej`, `kurs-edit-marka`, `kurs-edit-adres`, `kurs-edit-kwota`.

### OrderForm.jsx — select ubezpieczyciela (linia 355-367):
```jsx
// Było:
<select name="insurance_company" ... className="insurance-select">

// Będzie:
<label htmlFor="insurance-company-select" className="sr-only">Ubezpieczyciel OC</label>
<select id="insurance-company-select" name="insurance_company" ... className="insurance-select" aria-label="Wybierz ubezpieczyciela">
```

### OrderForm.jsx — typ operacji (linia 268-289):
Dodaj `aria-pressed` do przycisków toggle:

```jsx
// Było:
<button type="button"
  className={`operation-type-btn ${operationType === type ? 'selected' : ''}`}
  onClick={...}
>
  {type}
</button>

// Będzie:
<button type="button"
  className={`operation-type-btn ${operationType === type ? 'selected' : ''}`}
  aria-pressed={operationType === type}
  onClick={...}
>
  {type}
</button>
```

---

## Etap 6 — ARIA toggle/expand buttons

**Priorytet:** 🟡 Wysoki
**WCAG:** 1.3.1, 4.1.2

### AdminAvailabilityView.jsx — filter chips (linia 81-92):
```jsx
// Było:
<button className={`filter-chip ${dateRange === 'single' ? 'active' : ''}`}
  onClick={() => setDateRange('single')}>
  Jeden dzień
</button>

// Będzie:
<button className={`filter-chip ${dateRange === 'single' ? 'active' : ''}`}
  aria-pressed={dateRange === 'single'}
  onClick={() => setDateRange('single')}>
  Jeden dzień
</button>
```

### OrderList.jsx — przycisk "Moje" (linia 294-298):
```jsx
// Było:
<button className={`filter-chip ${showOnlyMine ? 'active' : ''}`}
  onClick={() => setShowOnlyMine(prev => !prev)}>
  Moje
</button>

// Będzie:
<button className={`filter-chip ${showOnlyMine ? 'active' : ''}`}
  aria-pressed={showOnlyMine}
  onClick={() => setShowOnlyMine(prev => !prev)}>
  Moje
</button>
```

### OrderList.jsx — date group toggle (linia 340):
```jsx
// Było:
<button className={`date-group-header ${!isCollapsed ? 'expanded' : ''}`}
  onClick={() => toggleGroup(key)}>

// Będzie:
<button className={`date-group-header ${!isCollapsed ? 'expanded' : ''}`}
  aria-expanded={!isCollapsed}
  aria-controls={`date-group-body-${key}`}
  onClick={() => toggleGroup(key)}>
```

I na linia 346:
```jsx
// Było:
<div className="date-group-body">

// Będzie:
<div id={`date-group-body-${key}`} className="date-group-body">
```

### KursyList.jsx — toggle filtru (linia 348-354):
```jsx
// Było:
<button className="button secondary"
  onClick={() => setFilterDisplay(d => !d)}>
  {filterDisplay ? 'Ukryj filtry' : 'Pokaż filtry'}
</button>

// Będzie:
<button className="button secondary"
  aria-expanded={filterDisplay}
  aria-controls="kurs-extra-filters"
  onClick={() => setFilterDisplay(d => !d)}>
  {filterDisplay ? 'Ukryj filtry' : 'Pokaż filtry'}
</button>
```

I na linia 357:
```jsx
// Było:
<div className="extra-filters" style={{ display: "flex" }}>

// Będzie:
<div id="kurs-extra-filters" className="extra-filters" style={{ display: "flex" }}>
```

### AvailabilityManager.jsx — toggle "Cały dzień" / "Brak" (linia 208-219):
```jsx
// Było:
<button className={`avail-fullday-toggle ${isFullDay ? 'active' : ''}`}
  onClick={handleToggleFullDay}>
  Cały dzień
</button>

// Będzie:
<button className={`avail-fullday-toggle ${isFullDay ? 'active' : ''}`}
  aria-pressed={isFullDay}
  onClick={handleToggleFullDay}>
  Cały dzień
</button>
```

Analogicznie dla "Brak" (`aria-pressed={isUnavailable}`).

---

## Etap 7 — Tab interface (OrderList.jsx)

**Priorytet:** 🟡 Wysoki
**WCAG:** 1.3.1, 4.1.2

### OrderList.jsx (linia 229-248):
```jsx
// Było:
<div className="tabs">
  <button className={`tab ${activeTab === 'active' ? 'active' : ''}`}
    onClick={() => setActiveTab('active')}>
    Aktywne (...)
  </button>
  ...
</div>

// Będzie:
<div className="tabs" role="tablist" aria-label="Status zleceń">
  <button className={`tab ${activeTab === 'active' ? 'active' : ''}`}
    role="tab"
    aria-selected={activeTab === 'active'}
    id="tab-active"
    onClick={() => setActiveTab('active')}>
    Aktywne (...)
  </button>
  <button className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
    role="tab"
    aria-selected={activeTab === 'completed'}
    id="tab-completed"
    onClick={() => setActiveTab('completed')}>
    Zakończone (...)
  </button>
  <button className={`tab ${activeTab === 'deleted' ? 'active' : ''}`}
    role="tab"
    aria-selected={activeTab === 'deleted'}
    id="tab-deleted"
    onClick={() => setActiveTab('deleted')}>
    Usunięte (...)
  </button>
</div>
```

---

## Etap 8 — Dropdown menu (OrderCard.jsx)

**Priorytet:** 🟡 Wysoki
**WCAG:** 1.3.1

### OrderCard.jsx (linia 310-338):
```jsx
// Było:
<button className="btn-compact btn-secondary"
  onClick={...}
  title={...}>
  Przypisz
</button>
{showAssignDropdown && (
  <div className="dropdown-menu" ...>

// Będzie:
<button className="btn-compact btn-secondary"
  onClick={...}
  title={...}
  aria-expanded={showAssignDropdown}
  aria-haspopup="true">
  Przypisz
</button>
{showAssignDropdown && (
  <div className="dropdown-menu" role="menu" ...>
    {availableUsers.map(user => (
      <button key={user.id} ... className="dropdown-item" role="menuitem">
        {user.name}
      </button>
    ))}
  </div>
)}
```

---

## Etap 9 — Hierarchia nagłówków

**Priorytet:** 🟡 Wysoki
**WCAG:** 1.3.1

### AssignmentHistory.jsx:
```jsx
// Linia 36: <h4>Przypisani:</h4> → <h3>Przypisani:</h3>
// Linia 80: <h4>Edycje:</h4> → <h3>Edycje:</h3>
```

### OrderCard.jsx — modal inline:
```jsx
// Linia 359: <h3> jest OK w kontekście modala
// Linia 452: <h2> jest OK
// Linia 469: <h2> jest OK
```

### AdminAvailabilityView.jsx:
```jsx
// Linia 162: <h4> → <h3> (wewnątrz sekcji z <h2>)
```

---

## Etap 10 — Semantic HTML

**Priorytet:** 🟢 Średni
**WCAG:** 1.3.1

### OrderCard.jsx (linia 160):
```jsx
// Było:
<div className={`order-card status-${order.status}`} onClick={handleCardClick}>

// Będzie:
<article className={`order-card status-${order.status}`} onClick={handleCardClick}>
// + zamknięcie na </article> zamiast </div> (linia 354)
```

---

## Etap 11 — Focus indicators (CSS)

**Plik:** `src/index.css`
**Priorytet:** 🟡 Wysoki
**WCAG:** 2.4.7, 2.4.11

### Problem:
Wiele elementów ma `outline: none` w `:focus`, zastępując outline przez `border-color` + słaby `box-shadow` (`rgba(37, 99, 235, 0.1)` — prawie niewidoczny).

### Docelowe zmiany:

Dodaj na końcu pliku CSS globalny styl `focus-visible`:

```css
/* WCAG 2.4.7 - visible focus indicator */
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
[tabindex]:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}
```

Wzmocnij `box-shadow` w istniejących regułach:
```css
/* Zmień opacity z 0.1 na 0.3 dla lepszej widoczności */

/* Linia 293-295 */
.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3);  /* było 0.1 */
}

/* Linia 891-893 */
.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3);  /* było 0.1 */
}
```

Analogicznie: `.date-range-input:focus`, `.auth-field input:focus`, `.insurance-select:focus`

### Dodaj klasę `.sr-only` (screen reader only):

```css
/* Screen reader only - hidden visually but accessible */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## Etap 12 — Semantic OrderList groups

**Priorytet:** 🟢 Średni
**WCAG:** 1.3.1

### OrderList.jsx (linia 335-366):
Zmienić `<div className="date-group">` na `<section>`:

```jsx
// Było:
<div className={`date-group date-group-${key}`} key={key}>

// Będzie:
<section className={`date-group date-group-${key}`} key={key} aria-label={group.label}>
```

---

## Podsumowanie zmian per plik

| Plik | Etap(y) | Zakres zmian |
|------|---------|-------------|
| `src/components/Modal.jsx` | 1 | Pełny rewrite (focus trap, Escape, ARIA) |
| `src/components/OfflineBanner.jsx` | 3 | +3 atrybuty |
| `src/components/OrderCard.jsx` | 2, 4, 8, 9, 10 | ~15 zmian (aria-labels, modal ARIA, dropdown) |
| `src/components/OrderList.jsx` | 2, 4, 5, 6, 7, 12 | ~20 zmian (modale, labels, tabs, toggles) |
| `src/components/FeedbackModal.jsx` | 2, 5 | +label, +dialog ARIA |
| `src/components/AboutModal.jsx` | 2 | +dialog ARIA |
| `src/components/AvailabilityManager.jsx` | 2, 4, 5, 6 | ~10 zmian (modal, labels, toggles) |
| `src/components/AdminAvailabilityView.jsx` | 2, 5, 6, 9 | ~8 zmian (modal, labels, pressed) |
| `src/components/OrderForm.jsx` | 5 | ~4 zmian (labels, aria-pressed) |
| `src/components/KursyList.jsx` | 4, 5, 6 | ~8 zmian (labels, toggle, close button) |
| `src/components/LoginForm.jsx` | 5 | ~4 zmian (htmlFor + id) |
| `src/components/AssignmentHistory.jsx` | 9 | h4 → h3 |
| `src/index.css` | 11 | focus-visible, sr-only, box-shadow fix |

---

## Kolejność implementacji

- **Etap 1** — Modal.jsx (fundament)
- **Etap 2** — Inline modals (role="dialog")
- **Etap 3** — OfflineBanner (role="alert")
- **Etap 4** — Aria-labels (emoji, SVG, ikony)
- **Etap 5** — Etykiety formularzy (htmlFor + id)
- **Etap 6** — ARIA toggle/expand
- **Etap 7** — Tab interface
- **Etap 8** — Dropdown menu
- **Etap 9** — Hierarchia nagłówków
- **Etap 10** — Semantic HTML
- **Etap 11** — Focus indicators (CSS)
- **Etap 12** — Semantic groups

---

## Testy po implementacji

- [ ] Nawigacja Tab przez całą aplikację bez "pułapek"
- [ ] Escape zamyka każdy modal
- [ ] Fokus wraca do triggera po zamknięciu modalu
- [ ] NVDA czyta poprawnie etykiety przycisków
- [ ] NVDA rozpoznaje modale jako "dialog"
- [ ] NVDA ogłasza banner offline
- [ ] Kontrast focus indicators >= 3:1
- [ ] axe DevTools: 0 błędów krytycznych

---

**Dokument utworzony:** 2026-02-22
