# Plan: Wersja DEMO aplikacji rental-app

## Context

Aplikacja rental-app to PWA (React 19 + Vite + Supabase) do zarządzania zleceniami dostawczymi. Potrzebna jest wersja demo do pokazania na forum/portfolio - w pełni działająca, ale bez backendu Supabase. Wszystkie dane zamockowane, stan w sessionStorage, auto-login.

## Podejście: Mock Supabase Client na poziomie biblioteki

Najczystsze rozwiązanie - podmiana klienta Supabase na mocka sterowana zmienną `VITE_DEMO_MODE`. Minimalne zmiany w istniejącym kodzie (4 pliki zmodyfikowane, 4 nowe).

---

## Nowe pliki

### `src/lib/demo-mode.js` (~15 linii)
- Eksportuje `isDemoMode()` - sprawdza `import.meta.env.VITE_DEMO_MODE === 'true'`

### `src/lib/demo-data.js` (~200 linii)
- `initializeDemoDatabase()` - seeduje sessionStorage jeśli puste
- `getDemoUser()` - zwraca admina do auto-loginu
- Dane:
  - 5 profili (Jan Kowalski admin, Anna Nowak, Piotr Lewandowski, Maria Wójcik, Tomasz Zieliński)
  - ~15 zleceń (mix statusów: active/completed/deleted, różne daty/lokalizacje/ubezpieczyciele)
  - ~20 przypisań do zleceń
  - Sloty dostępności na bieżący tydzień
  - Kilka kursów (ukończone zlecenia)
  - Historia edycji, feedback

### `src/lib/supabase-mock.js` (~600-800 linii)
- Mock klienta Supabase z identycznym API:
  - `auth` - signIn/signOut/getSession/onAuthStateChange (z sessionStorage)
  - `from(table)` - chainable query builder: select/insert/update/delete/eq/is/order/limit/single/maybeSingle
  - `channel()` / `removeChannel()` - realtime mock (eventy po 50ms delay)
  - `functions.invoke()` - mock admin-actions (list-users, invite, delete)
  - `rpc()` - mock delete_kurs_by_order_id
- Dane czyta/zapisuje z sessionStorage (klucze: `demo_db_[table]`)
- Format zwrotów: `{ data, error }` identyczny jak Supabase

### `src/components/DemoBanner.jsx` (~50 linii)
- Stały baner informujący o trybie demo
- **Przełącznik roli admin/user** - zmiana perspektywy w locie
- Możliwość zamknięcia (per sesja, przełącznik ról zostaje)

---

## Modyfikowane pliki

### `src/lib/supabase.js`
- Warunkowy eksport: demo mode -> import z supabase-mock, normalny -> createClient jak dotychczas

### `src/hooks/useAuth.js`
- W demo mode: auto-login bez pokazywania LoginForm

### `src/hooks/usePushNotifications.js`
- W demo mode: zwraca `{ supported: false }` - graceful disable

### `src/App.jsx`
- Import i renderowanie `DemoBanner`

### `.env.example`
- Dodanie `VITE_DEMO_MODE=false`

---

## Branch

- Nowy branch `DEMO` z `DEV`
- Cała implementacja na tym branchu
- Później można przenieść do osobnego repo lub deployować osobno

---

## Obsługa specjalnych przypadków

- **Realtime** - mock client emituje eventy z minimalnym opóźnieniem, stan aktualizuje się normalnie
- **Push notifications** - wyłączone (supported: false)
- **Edge functions (admin-actions)** - zamockowane w functions.invoke()
- **Joiny (profiles na assignments)** - mock rozwiązuje z sessionStorage
- **Soft delete** - działa identycznie (status='deleted')

---

## Debranding - usunięcie marki Abacus

Wersja DEMO będzie pokazywana na forum/portfolio. Należy usunąć wszystkie ślady marki Abacus i zastąpić neutralnymi placeholderami.

### Zmiany w kodzie (nazwa + URL-e)

- **`index.html`** (linia 24) - `<title>Abacus - System Zleceń</title>` -> `<title>RentalApp - System Zleceń</title>`
- **`public/manifest.json`** (linie 2-3) - `name` i `short_name` -> `RentalApp`
- **`src/components/AboutModal.jsx`** (linia 106) - `about-app-name` -> `RentalApp`
- **`src/hooks/useAuth.js`** (linia 4) - `PRODUCTION_URL` -> `'https://example.com/'` (placeholder)
- **`supabase/functions/send-push/index.ts`** (linia 8) - URL -> `'https://example.com'`
- **`supabase/functions/admin-actions/index.ts`** (linie 5, 123) - URL -> `'https://example.com'` (oba wystąpienia)
- **`CHANGELOG.md`** (linia 171) - `Rebranding na Abacus` -> `Rebranding na RentalApp`
- **`specs/integration.md`** - `abacus-kursy-app` -> `kursy-app` (neutralna nazwa)

### Ikony PWA (`public/icons/`)

- Usunąć wszystkie custom ikony z `public/icons/` (~30 plików Android + iOS)
- Usunąć referencje do ikon z `public/manifest.json` (sekcja `icons`)
- Przeglądarka użyje domyślnych ikon

### Dokumenty PDF ubezpieczycieli (`public/insurance/`)

Pliki: `ALLIANZ.pdf`, `INNE.pdf`, `PZU.pdf`, `TUW.pdf`, `VIG.pdf`, `WARTA.pdf`
- Zastąpić każdy jednoprostymi placeholder PDF-ami z treścią "Dokument demo - [NAZWA]"
- Zachować te same nazwy plików, żeby aplikacja działała bez zmian w kodzie

### Weryfikacja debrandingu

- `grep -ri "abacus"` w całym repo zwraca 0 wyników
- Aplikacja uruchamia się poprawnie (`npm run dev`)
- Ikony PWA wyświetlają się prawidłowo
- Linki do PDF-ów ubezpieczycieli działają
- AboutModal pokazuje "RentalApp"
- Tytuł strony i manifest PWA pokazują "RentalApp"

---

## Weryfikacja (tryb demo)

- Ustawić `VITE_DEMO_MODE=true` w .env
- `npm run dev` startuje bez Supabase
- Auto-login jako demo user, baner demo widoczny
- Tworzenie/edycja/usuwanie zleceń działa i przeżywa F5
- Przypisywanie osób, historia przypisań
- Dostępność pracowników
- Lista kursów
- Zarządzanie użytkownikami (admin)
- Network tab: 0 requestów do Supabase
