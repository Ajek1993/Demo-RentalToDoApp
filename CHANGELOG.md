# Changelog

Wszystkie istotne zmiany w projekcie System Zleceń Wypożyczalni.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.0.0/),
wersjonowanie według [Semantic Versioning](https://semver.org/lang/pl/).

## [1.1.0] - 2026-03-02

### Dodane
- Content Security Policy (CSP) — meta tag z ścisłymi dyrektywami, przeniesienie inline script do `public/theme-init.js`
- `eslint-plugin-security` — automatyczne wykrywanie wzorców zagrożeń w kodzie
- Walidacja typów payloadu w Edge Function `send-push` (title, body, url, userId, targetRole)
- Ograniczenia `maxLength` na formularzach: `OrderForm` (plate 10, location 200, notes 2000), `LoginForm` (name 100, password 255), `FeedbackModal` (message 2000), `CompleteProfile` (name 100)

### Naprawione
- **P0 Krytyczne:** Zablokowanie eskalacji uprawnień — użytkownik nie może zmienić swojej roli na admin (migracja `019_rls_role_escalation_fix`, `WITH CHECK role = (SELECT role FROM profiles WHERE id = auth.uid())`)
- Polityka RLS `Feedback: admin read` — admin może odczytywać feedback użytkowników (migracja `019_rls_role_escalation_fix`)
- Podatności npm (`npm audit fix` — 6 pakietów)
- Puste bloki catch w `AdminUserManagement` i nieużywana zmienna w `useAuth`

### Zmienione
- Sourcemaps wyłączone w buildzie produkcyjnym (`vite.config.js`, `build.sourcemap: false`)

## [1.0.1] - 2026-03-02

### Naprawione
- `AdminUserManagement`: odczyt rzeczywistego komunikatu błędu z ciała odpowiedzi Edge Function (zamiast generycznego "Edge Function returned a non-2xx status code")
- `useAuth`: wykrywanie linku zaproszeniowego w `?search` (PKCE flow) obok dotychczasowego `#hash`
- `useAuth`: eksponowanie `inviteError` gdy Supabase zwraca `#error=...` w URL (wygasły/unieważniony token)
- `LoginForm`: wyświetlenie komunikatu o wygasłym linku zaproszeniowym zamiast cichego przekierowania na pusty formularz logowania

## [1.0.0] - 2026-02-27

### Dodane
- Hook `useScrollLock` — blokowanie przewijania tła pod modalami na mobile (iOS scroll lock)
- Ujednolicony przycisk zamykania (✕) we wszystkich modalach
- ErrorBoundary - komponent do łapania błędów renderowania z przyjaznym UI
- Testy jednostkowe (Vitest + React Testing Library) dla: useAuth, useOrders, OrderForm, ErrorBoundary

### Naprawione
- Scroll tła pod modalami inline (FeedbackModal, AboutModal, AvailabilityManager, AdminAvailabilityView, AdminUserManagement, OrderCard, OrderList, KursyList)
- Layout panelu zarządzania użytkownikami na mobile (formularz zaproszenia)
- Wszystkie błędy ESLint (15 errors) - 0 errors, 0 warnings
- Refs w Modal.jsx - przenieść assignment do useEffect
- Async functions w komponentach - konwersja na useCallback tam gdzie wymagane

### Zmienione
- Scroll lock w Modal.jsx wydzielony do reusable hooka `useScrollLock`
- useOnlineStatus wydzielony do osobnego pliku `src/hooks/useOnlineStatus.js`
- OfflineBanner - import hooka z nowej lokalizacji
- sw.js - zmiana `eslint-env` na `global` komentarz

## [0.9.9] - 2026-02-26

### Dodane
- Rozszerzone grupowanie dat w zakładce Aktywne: Pojutrze, Ten tydzień, Przyszły tydzień
- Nowe grupy domyślnie zwinięte; tylko „Dzisiaj" rozwinięte
- Możliwość zaznaczania tekstu na kartach zleceń na desktopie (data, godzina, nr rejestracyjny, adres, notatki)

## [0.9.8] - 2026-02-24

### Zmienione
- Optymalizacja ładowania danych przy przełączaniu zakładek (~45 → ~15 zapytań do Supabase)
- Lista użytkowników (`profiles`) pobierana raz na poziomie `OrderList` zamiast per karta
- Historia edycji (`order_edits`) ładowana lazy — dopiero po otwarciu historii przypisań
- `OrderCard` opakowany w `React.memo` dla uniknięcia zbędnych re-renderów
- Usunięto filtr admina po użytkowniku z `KursyList` (każdy widzi tylko swoje kursy)
- Poprawiono układ elementów listy historii przypisań (zawijanie tekstu)

## [0.9.7] - 2026-02-24

### Dodane
- Admin może wypisać inną osobę ze zlecenia (z widoku historii przypisań)
- Historia przypisań pokazuje kto przypisał / wypisał inną osobę

### Naprawione
- Resetowanie stanu subskrypcji push po ręcznym wypisaniu
- Wklejona data pozostaje widoczna w polu „Szybkie wklejanie daty"
- Styl focus na checkboxach (usunięto box-shadow)

## [0.9.6] - 2026-02-23

### Dodane
- Pełna zgodność WCAG 2.1 AA — focus trap, Escape, przywracanie focusu w modalach (Modal.jsx)
- Skip navigation link (`Przejdź do treści`) dla nawigacji klawiaturą
- Klasa `.sr-only` i globalne reguły `focus-visible` w CSS
- `role="dialog"` + `aria-modal` + `aria-label` na wszystkich 14 modalach w aplikacji
- `role="tablist"` / `role="tab"` / `aria-selected` na zakładkach zleceń
- `role="menu"` / `role="menuitem"` w dropdownie przypisywania i menu hamburgera
- `role="alert"` + `aria-live="assertive"` na banerze offline
- `aria-pressed` na przyciskach toggle (filtry, dyspozycyjność)
- `aria-expanded` + `aria-controls` na elementach rozwijanych
- `aria-hidden="true"` na dekoracyjnych emoji i ikonach SVG
- Powiązanie `htmlFor`/`id` dla wszystkich pól formularzy (LoginForm, CompleteProfile, OrderForm, KursyList, AvailabilityManager, AdminUserManagement, FeedbackModal)
- `<article>` dla kart zleceń, `<section>` dla grup dat, `<main id="main-content">` dla treści
- `lang="pl"` w index.html (wcześniej: `lang="en"`)

### Zmienione
- Hierarchia nagłówków: `h4` → `h3` w AssignmentHistory i AdminAvailabilityView
- Box-shadow focus zwiększony z `0.1` → `0.3` opacity (lepszy kontrast wskaźnika focusu)
- Dodano `box-shadow` do selektorów `.period-select`, `.extra-filter-input`, `.kurs-form input` przy focusie
- Opacity tekstu "brak nazwy" zwiększone z `0.45` → `0.6` (kontrast)

## [0.9.5] - 2026-02-23

### Dodane
- Przyciski "Zapisz się" / "Przypisz" przeniesione do modalu akcji na urządzeniach mobilnych (<640px)
- Header modalu z datą, godziną i lokalizacją zlecenia
- Modal zamyka się automatycznie po przypisaniu lub zapisaniu się

### Zmienione
- Na mobilach `.assignment-section` na karcie jest ukryte — przyciski dostępne wyłącznie w modalu
- Historia przypisań (📜) działa poprawnie na mobilach (oddzielna klasa `assignment-history-section`)
- Refactor przycisków przypisywania do helper function `renderAssignmentButtons(variant)`

## [0.9.4] - 2026-02-23

### Poprawione
- Automatyczne przekierowanie po uzupełnieniu profilu (bez konieczności F5)
- Dynamiczne nagłówki CORS w edge functions — obsługa localhost:5173 obok produkcji

### Zmienione
- Wyłączona publiczna rejestracja (flaga `REGISTRATION_ENABLED` w LoginForm)

## [0.9.3] - 2026-02-22

### Dodane
- Automatyczne powiadomienia push o dyspozycyjności dla kierowców (środa i niedziela, 21:00 CET)
- Nowy parametr `targetRole` w Edge Function `send-push` — filtrowanie subskrybentów po roli
- Funkcja SQL `send_availability_reminder()` wywoływana przez pg_cron
- Migracja `017_availability_reminder_cron.sql`

## [0.9.2] - 2026-02-22

### Dodane
- Numery rejestracyjne zawsze przechowywane jako UPPERCASE (frontend + backend + constraint w bazie)
- Kolorowe nagłówki grup dat: dzisiaj (niebieski), jutro (amber), później (szary), przeterminowane (czerwony)

### Zmienione
- Grupy dat domyślnie zwinięte (poza "Dzisiaj")
- Każda grupa dat ma kolorowy badge z liczbą zleceń

## [0.9.1] - 2025-02-20

### Dodane
- Trwałe usuwanie zleceń dla admina (nieodwracalne)
- Automatyczne przeliczanie kwoty przy edycji adresu w kursach
- Wyświetlanie wykrytego miasta i dystansu w formularzu kursu

### Zmienione
- Godzina zlecenia jest teraz opcjonalna
- Poprawione wyświetlanie historii przypisań i edycji

## [0.9.0] - 2025-02-19

### Dodane
- Panel kursów z eksportem do Excel
- Automatyczne obliczanie kwot na podstawie lokalizacji
- Modalne potwierdzenia operacji z typami akcji
- Widok dyspozycyjności dla admina

## [0.8.0]

### Dodane
- OC sprawcy - wybór ubezpieczyciela (PZU, WARTA, VIG, ALLIANZ, TUW, INNE)
- Drukowanie dokumentów PDF ubezpieczycieli
- Role użytkowników (admin/user)
- Kaskadowe usuwanie użytkowników

### Poprawione
- Zabezpieczenie aplikacji przed nieautoryzowanym dostępem

## [0.7.0]

### Dodane
- Dark mode z przełącznikiem
- Menu dropdown w headerze
- Wyszukiwarka zleceń (rejestracja, miejsce, data, notatki)
- Filtr zakresu dat (od-do)
- Potwierdzenie email po rejestracji
- Reset hasła
- Przycisk feedbacku z zapisem do Supabase
- Kompaktowy widok mobile
- Szybkie wklejanie daty i godziny na desktop

### Zmienione
- Rebranding na Abacus

## [0.6.0]

### Dodane
- Historia edycji zleceń (kto, kiedy, jakie pola)
- Zarządzanie dyspozycyjnością pracowników
- Opcja dyspozycyjności "Brak"
- Grupowanie zleceń po datach
- Filtr "Tylko moje"

### Poprawione
- Ikony PWA (purpose + meta tagi iOS)

## [0.5.0]

### Dodane
- Progressive Web App (PWA) z manifestem
- Service Worker do obsługi offline
- Push notifications (backend + UI)
- Real-time updates bez odświeżania strony
- System przypisywania użytkowników do zleceń
- Historia przypisań z timestampami
- Modal potwierdzenia usuwania zleceń z przypisanymi
- Kompletny system zarządzania zleceniami (CRUD)
- Autoryzacja przez Supabase Auth
