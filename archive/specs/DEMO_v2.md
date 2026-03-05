# Plan implementacji wersji DEMO — rental-app

> Pełny plan z podziałem na kroki, testami i kryteriami akceptacji.
> Bazuje na `specs/DEMO.md`.

---

## Krok A — Setup brancha i debranding

### A.1 — Przygotowanie brancha `DEMO`

- Utworzyć branch `DEMO` z `DEV` (jeśli nie istnieje)
- Przełączyć się na `DEMO`

### A.2 — Usunięcie marki Abacus z kodu

**Pliki do edycji:**

| Plik | Co zmienić |
|---|---|
| `index.html:24` | `<title>Abacus - System Zleceń</title>` → `<title>RentalApp - System Zleceń</title>` |
| `public/manifest.json:2` | `"name": "Abacus - System Zleceń"` → `"name": "RentalApp - System Zleceń"` |
| `public/manifest.json:3` | `"short_name": "Abacus"` → `"short_name": "RentalApp"` |
| `src/components/AboutModal.jsx:106` | `Abacus` → `RentalApp` (w `<span className="about-app-name">`) |
| `src/hooks/useAuth.js:4` | `'https://to-do-app-abacus.vercel.app/'` → `'https://example.com/'` |
| `supabase/functions/send-push/index.ts:8` | `'https://to-do-app-abacus.vercel.app'` → `'https://example.com'` |
| `supabase/functions/admin-actions/index.ts:5` | `'https://to-do-app-abacus.vercel.app'` → `'https://example.com'` |
| `supabase/functions/admin-actions/index.ts:123` | `'https://to-do-app-abacus.vercel.app/'` → `'https://example.com/'` |
| `CHANGELOG.md:171` | `Rebranding na Abacus` → `Rebranding na RentalApp` |
| `specs/integration.md` | `abacus-kursy-app` → `kursy-app` (wszystkie wystąpienia) |

**Test:**
```bash
grep -ri "abacus" --include="*.{js,jsx,ts,html,json,md}" . | grep -v node_modules | grep -v DEMO.md | grep -v DEMO_v2.md
# Oczekiwany wynik: 0 linii
```

### A.3 — Usunięcie custom ikon PWA

- Usunąć cały katalog `public/icons/` (android/ + ios/, ~26 plików PNG)
- Usunąć z `public/manifest.json` całą sekcję `"icons": [...]`
- Usunąć z `index.html` referencje do `apple-touch-icon` i `favicon` z folderu `icons/`

**Test manualny:**
- `npm run dev` — strona ładuje się bez błędów 404 w konsoli dotyczących ikon
- Manifest nie zawiera sekcji `icons`

### A.4 — Placeholder PDF-y ubezpieczycieli

Pliki do zastąpienia: `ALLIANZ.pdf`, `INNE.pdf`, `PZU.pdf`, `TUW.pdf`, `VIG.pdf`, `WARTA.pdf`

- Wygenerować minimalne placeholder PDF-y z treścią "Dokument demo — [NAZWA]"
- Metoda: skrypt Node.js jednorazowy lub ręczne wygenerowanie (np. przez jsPDF / prosty %PDF literal)
- Zachować identyczne nazwy plików

**Test manualny:**
- Otworzyć każdy link do PDF w przeglądarce — plik się otwiera i wyświetla tekst placeholder

### A.5 — Commit debrandingu

- Commit: `chore: remove Abacus branding, replace with RentalApp placeholders`
- Zawartość: wszystkie zmiany z kroków A.2–A.4

---

## Krok B — Infrastruktura trybu demo

### B.1 — `src/lib/demo-mode.js` (nowy plik, ~15 linii)

```js
export function isDemoMode() {
  return import.meta.env.VITE_DEMO_MODE === 'true'
}
```

**Test jednostkowy** (`src/__tests__/demo-mode.test.js`):
```js
describe('isDemoMode', () => {
  it('should return true when VITE_DEMO_MODE is "true"', () => {
    // mock import.meta.env
  })
  it('should return false when VITE_DEMO_MODE is undefined', () => {})
  it('should return false when VITE_DEMO_MODE is "false"', () => {})
})
```

### B.2 — `src/lib/demo-data.js` (nowy plik, ~200 linii)

Eksporty:
- `getDemoUser()` → obiekt admina `{ id, email, user_metadata }` kompatybilny z Supabase auth user
- `initializeDemoDatabase()` → seeduje sessionStorage kluczami `demo_db_[table]` jeśli puste

Dane do zaseedowania:
- **profiles** — 5 profili:
  - Jan Kowalski (admin), Anna Nowak, Piotr Lewandowski, Maria Wójcik, Tomasz Zieliński
- **orders** — ~15 zleceń z mixem statusów (active / completed / deleted), różne daty, lokalizacje, ubezpieczyciele
- **order_assignments** — ~20 przypisań (powiązane z orders i profiles)
- **dyspozycyjnosc** — sloty na bieżący tydzień dla kilku profili
- **kursy** — kilka ukończonych kursów
- **order_edits** — historia edycji dla kilku zleceń
- **feedback** — kilka wpisów
- **push_subscriptions** — pusta tablica (push wyłączony w demo)

Daty w danych powinny być **relatywne** (today, yesterday, tomorrow) aby dane nie wyglądały na przeterminowane.

**Test jednostkowy** (`src/__tests__/demo-data.test.js`):
```js
describe('getDemoUser', () => {
  it('should return user object with id, email, user_metadata', () => {})
  it('should have role admin', () => {})
})

describe('initializeDemoDatabase', () => {
  beforeEach(() => sessionStorage.clear())

  it('should populate sessionStorage with all required tables', () => {
    initializeDemoDatabase()
    const tables = ['profiles', 'orders', 'order_assignments', 'dyspozycyjnosc', 'kursy', 'order_edits', 'feedback']
    tables.forEach(t => {
      expect(sessionStorage.getItem(`demo_db_${t}`)).not.toBeNull()
    })
  })
  it('should not overwrite existing data on second call', () => {})
  it('should create at least 5 profiles', () => {})
  it('should create orders with various statuses', () => {})
  it('should create assignments referencing valid profile and order IDs', () => {})
})
```

### B.3 — Commit infrastruktury

- Commit: `feat(demo): add demo-mode detection and demo-data seed`

---

## Krok C — Mock Supabase Client

### C.1 — `src/lib/supabase-mock.js` (nowy plik, ~600-800 linii)

Pełna implementacja mocka klienta Supabase, identyczne API jak `@supabase/supabase-js`.

**Moduły wewnętrzne:**

#### Storage helper
- `getTable(name)` — parsuje `sessionStorage.getItem('demo_db_' + name)` → array
- `setTable(name, data)` — serializuje i zapisuje

#### `auth` namespace
- `getUser()` → `{ data: { user } }` z sessionStorage (`demo_auth_user`)
- `getSession()` → `{ data: { session: { user } } }`
- `signInWithPassword({ email, password })` → symuluje login, zapisuje usera w sessionStorage
- `signOut()` → czyści usera z sessionStorage
- `onAuthStateChange(callback)` → zwraca `{ data: { subscription: { unsubscribe } } }`
- `updateUser()` → aktualizuje profil
- `resetPasswordForEmail()` → noop success

#### `from(table)` — chainable query builder
Metody (każda zwraca `this` oprócz terminali):
- `.select(columns)` — z obsługą joinów: `*, profiles(*)` → rozwiązuje z sessionStorage
- `.insert(rows)` — dodaje rekordy, auto-generuje `id` i `created_at`
- `.update(values)` — aktualizuje filtrowane rekordy
- `.delete()` — usuwa filtrowane rekordy
- `.eq(col, val)`, `.neq(col, val)`, `.is(col, val)`, `.in(col, vals)`, `.gte(col, val)`, `.lte(col, val)`
- `.or(filter)` — basic OR filter parsing
- `.order(col, { ascending })` — sortowanie
- `.limit(n)` — limitowanie wyników
- `.range(from, to)` — paginacja
- `.single()` — terminal: zwraca `{ data: rows[0], error }`
- `.maybeSingle()` — terminal: jak single ale null zamiast error
- Domyślny terminal (bez single/maybeSingle): `{ data: rows, error: null }`

Każda operacja terminalna: `then()` / `await` — implementacja przez `.then` na obiekcie query builder (thenable pattern).

#### `channel(name)` / `removeChannel(channel)`
- `.on('postgres_changes', config, callback)` → rejestruje listener
- `.subscribe()` → zwraca channel
- Przy insert/update/delete w query builder: emituje eventy z 50ms delay do zarejestrowanych listenerów
- `removeChannel()` → czyści listenery

#### `functions.invoke(name, { body })`
Mock Edge Functions:
- `admin-actions`:
  - `list-users` → zwraca profiles z dokleionym `email` z danych demo
  - `invite` → dodaje nowy profil z wygenerowanym ID
  - `delete-user` → usuwa profil i powiązane dane
- `send-push` → noop success (push wyłączony w demo)

#### `rpc(name, params)`
- `delete_kurs_by_order_id` → usuwa kursy z tabeli `kursy` po `order_id`

**Testy jednostkowe** (`src/__tests__/supabase-mock.test.js`):

```js
describe('supabase-mock', () => {
  beforeEach(() => sessionStorage.clear(); initializeDemoDatabase())

  describe('auth', () => {
    it('getUser returns null when not logged in', () => {})
    it('signInWithPassword sets user in sessionStorage', () => {})
    it('signOut clears user from sessionStorage', () => {})
    it('getSession returns session with user after login', () => {})
    it('onAuthStateChange returns subscription with unsubscribe', () => {})
  })

  describe('from().select()', () => {
    it('returns all rows from a table', async () => {})
    it('filters with .eq()', async () => {})
    it('filters with .is() for null values', async () => {})
    it('sorts with .order()', async () => {})
    it('limits results with .limit()', async () => {})
    it('.single() returns first result', async () => {})
    it('.maybeSingle() returns null for empty result', async () => {})
    it('resolves joins like profiles(*)', async () => {})
  })

  describe('from().insert()', () => {
    it('adds row to table in sessionStorage', async () => {})
    it('auto-generates id and created_at', async () => {})
    it('returns inserted data with .select()', async () => {})
  })

  describe('from().update()', () => {
    it('updates matching rows', async () => {})
    it('returns updated data with .select()', async () => {})
  })

  describe('from().delete()', () => {
    it('removes matching rows from table', async () => {})
  })

  describe('channel / realtime', () => {
    it('registers listener and receives events on insert', async () => {})
    it('removeChannel clears listeners', () => {})
  })

  describe('functions.invoke', () => {
    it('list-users returns profiles with emails', async () => {})
    it('invite creates new profile', async () => {})
    it('delete-user removes profile', async () => {})
  })

  describe('rpc', () => {
    it('delete_kurs_by_order_id removes matching kursy', async () => {})
  })
})
```

### C.2 — Commit mocka

- Commit: `feat(demo): implement Supabase mock client with full query builder`

---

## Krok D — Integracja z istniejącym kodem

### D.1 — Modyfikacja `src/lib/supabase.js`

Aktualnie:
```js
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Zmiana:
```js
import { isDemoMode } from './demo-mode'

let supabase

if (isDemoMode()) {
  const { createDemoClient } = await import('./supabase-mock')
  supabase = createDemoClient()
} else {
  const { createClient } = await import('@supabase/supabase-js')
  supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  )
}

export { supabase }
```

**Test:** Istniejące testy w `src/__tests__/useAuth.test.js` nadal przechodzą (mockują supabase.js niezależnie).

### D.2 — Modyfikacja `src/hooks/useAuth.js`

W demo mode:
- Pominąć sprawdzanie `PRODUCTION_URL` (nie dotyczy demo)
- Auto-login: jeśli `isDemoMode()`, od razu ustawić usera z `getDemoUser()` i profil z demo-data, bez wyświetlania LoginForm
- Zachować resztę logiki (signOut, profile, isAdmin) bez zmian

**Test jednostkowy** (`src/__tests__/useAuth-demo.test.js`):
```js
describe('useAuth in demo mode', () => {
  beforeEach(() => {
    vi.mock('../lib/demo-mode', () => ({ isDemoMode: () => true }))
    initializeDemoDatabase()
  })

  it('should auto-login without showing LoginForm', async () => {})
  it('should set isAdmin to true for demo user', async () => {})
  it('should handle signOut and re-login in demo', async () => {})
})
```

### D.3 — Modyfikacja `src/hooks/usePushNotifications.js`

W demo mode: zwrócić od razu `{ supported: false, subscribed: false, loading: false, subscribe: noop, unsubscribe: noop }`.

**Test jednostkowy** (`src/__tests__/usePushNotifications-demo.test.js`):
```js
describe('usePushNotifications in demo mode', () => {
  it('should return supported: false immediately', () => {})
  it('subscribe should be a no-op function', () => {})
})
```

### D.4 — Modyfikacja `src/App.jsx`

- Import `DemoBanner` i `isDemoMode`
- Renderować `<DemoBanner />` warunkowo gdy `isDemoMode()` — na górze aplikacji, nad headerem

### D.5 — Aktualizacja `.env.example`

Dodać:
```
# Demo mode (no Supabase backend needed)
VITE_DEMO_MODE=false
```

### D.6 — Commit integracji

- Commit: `feat(demo): integrate mock client with existing hooks and App`

---

## Krok E — DemoBanner komponent

### E.1 — `src/components/DemoBanner.jsx` (nowy plik, ~50 linii)

Funkcjonalność:
- Stały baner na górze strony z info "Tryb demo — dane są fikcyjne"
- **Przełącznik roli** admin ↔ user — zmiana `profile.role` w sessionStorage i przeładowanie stanu auth
- **Przycisk zamknięcia** — ukrywa baner (per sesja via sessionStorage), przełącznik ról zostaje dostępny w inny sposób (np. w menu)
- Stylowanie: jasnoniebieski pasek, czytelny na białym i ciemnym tle

**Test jednostkowy** (`src/__tests__/DemoBanner.test.jsx`):
```js
describe('DemoBanner', () => {
  it('renders demo info text', () => {})
  it('renders role switcher with admin/user options', () => {})
  it('hides banner on close button click', () => {})
  it('persists hidden state in sessionStorage', () => {})
})
```

### E.2 — Style dla DemoBanner

- Dodać style w `src/styles/DemoBanner.css` lub w istniejącym pliku stylów
- Dark mode kompatybilność

### E.3 — Commit bannera

- Commit: `feat(demo): add DemoBanner component with role switcher`

---

## Krok F — Weryfikacja i testy end-to-end

### F.1 — Uruchomienie wszystkich testów jednostkowych

```bash
npm run test:run
```

**Oczekiwany wynik:** Wszystkie testy przechodzą (istniejące + nowe).

Lista nowych plików testowych:
- `src/__tests__/demo-mode.test.js`
- `src/__tests__/demo-data.test.js`
- `src/__tests__/supabase-mock.test.js`
- `src/__tests__/useAuth-demo.test.js`
- `src/__tests__/usePushNotifications-demo.test.js`
- `src/__tests__/DemoBanner.test.jsx`

### F.2 — Test lint

```bash
npm run lint
```

**Oczekiwany wynik:** 0 błędów, 0 ostrzeżeń.

### F.3 — Test build

```bash
npm run build
```

**Oczekiwany wynik:** Build przechodzi bez błędów. Weryfikuje poprawność importów i składni.

### F.4 — Test manualny w trybie demo

Ustawić `VITE_DEMO_MODE=true` w `.env`, uruchomić `npm run dev`:

- [ ] Strona ładuje się bez błędów w konsoli
- [ ] Auto-login — brak ekranu logowania
- [ ] DemoBanner widoczny na górze
- [ ] Przełącznik ról admin ↔ user działa
- [ ] Tytuł strony: "RentalApp - System Zleceń"
- [ ] AboutModal: "RentalApp"
- [ ] Lista zleceń wyświetla ~15 demo zleceń
- [ ] Tworzenie nowego zlecenia działa
- [ ] Edycja zlecenia działa
- [ ] Usuwanie zlecenia działa (soft delete)
- [ ] Przypisywanie pracownika do zlecenia działa
- [ ] Odświeżenie strony (F5) zachowuje dane
- [ ] Dostępność pracowników — widok i edycja
- [ ] Lista kursów — wyświetla dane
- [ ] Zarządzanie użytkownikami (admin) — lista, zaproszenie, usunięcie
- [ ] Dark mode toggle działa
- [ ] Network tab: 0 requestów do Supabase
- [ ] Linki do PDF-ów ubezpieczycieli otwierają placeholder

### F.5 — Test manualny w trybie normalnym

Ustawić `VITE_DEMO_MODE=false` (lub usunąć) w `.env`:

- [ ] Aplikacja działa normalnie z prawdziwym Supabase
- [ ] LoginForm wyświetla się
- [ ] Brak DemoBanner
- [ ] Wszystkie istniejące funkcje działają bez regresji

### F.6 — Weryfikacja debrandingu

```bash
grep -ri "abacus" --include="*.{js,jsx,ts,html,json,md}" . | grep -v node_modules | grep -v DEMO.md | grep -v DEMO_v2.md
```

**Oczekiwany wynik:** 0 wyników.

### F.7 — Commit finalny (jeśli potrzebne poprawki)

- Commit: `fix(demo): address issues found during verification`

---

## Podsumowanie commitów

| # | Commit | Krok |
|---|--------|------|
| 1 | `chore: remove Abacus branding, replace with RentalApp placeholders` | A |
| 2 | `feat(demo): add demo-mode detection and demo-data seed` | B |
| 3 | `feat(demo): implement Supabase mock client with full query builder` | C |
| 4 | `feat(demo): integrate mock client with existing hooks and App` | D |
| 5 | `feat(demo): add DemoBanner component with role switcher` | E |
| 6 | `fix(demo): address issues found during verification` | F (opcjonalny) |

---

## Nowe pliki (łącznie)

| Plik | Typ | ~Rozmiar |
|---|---|---|
| `src/lib/demo-mode.js` | lib | 15 linii |
| `src/lib/demo-data.js` | lib | 200 linii |
| `src/lib/supabase-mock.js` | lib | 600-800 linii |
| `src/components/DemoBanner.jsx` | component | 50 linii |
| `src/styles/DemoBanner.css` | style | 30 linii |
| `src/__tests__/demo-mode.test.js` | test | 25 linii |
| `src/__tests__/demo-data.test.js` | test | 50 linii |
| `src/__tests__/supabase-mock.test.js` | test | 150 linii |
| `src/__tests__/useAuth-demo.test.js` | test | 40 linii |
| `src/__tests__/usePushNotifications-demo.test.js` | test | 20 linii |
| `src/__tests__/DemoBanner.test.jsx` | test | 40 linii |

## Modyfikowane pliki

| Plik | Zakres zmiany |
|---|---|
| `index.html` | title |
| `public/manifest.json` | name, short_name, usunięcie icons |
| `src/components/AboutModal.jsx` | app name |
| `src/hooks/useAuth.js` | PRODUCTION_URL + demo auto-login |
| `src/hooks/usePushNotifications.js` | demo early return |
| `src/App.jsx` | import + render DemoBanner |
| `src/lib/supabase.js` | warunkowy import mock/real |
| `supabase/functions/send-push/index.ts` | URL placeholder |
| `supabase/functions/admin-actions/index.ts` | URL placeholder (x2) |
| `CHANGELOG.md` | zmiana wpisu "Abacus" |
| `specs/integration.md` | zmiana nazwy projektu |
| `.env.example` | dodanie VITE_DEMO_MODE |
| `public/icons/` | usunięcie katalogu |
| `public/insurance/*.pdf` | zastąpienie placeholderami |

---

## Zależności między krokami

```
A (debranding) ──────────────────────────────┐
B (demo-mode + demo-data) ──→ C (mock) ──→ D (integracja) ──→ F (weryfikacja)
                                              E (banner) ──────→ F
```

- **A** jest niezależny — można robić równolegle z B
- **B** musi być przed C (mock korzysta z demo-data)
- **C** musi być przed D (integracja importuje mock)
- **D** i **E** mogą być równoległe
- **F** wymaga ukończenia wszystkich poprzednich kroków
