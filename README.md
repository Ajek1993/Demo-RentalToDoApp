# System Zleceń Wypożyczalni

Wewnętrzna aplikacja PWA do zarządzania zleceniami dostaw w wypożyczalni samochodów. Przeznaczona dla ~15 pracowników - umożliwia tworzenie zleceń, przypisywanie się do nich, śledzenie historii zmian i zarządzanie dyspozycyjnością.

## Funkcjonalności

- **Zarządzanie zleceniami** - dodawanie, edycja, usuwanie i oznaczanie jako ukończone
- **Grupowanie po datach** - zlecenia pogrupowane chronologicznie z nagłówkami dat
- **Filtr "Tylko moje"** - szybkie filtrowanie zleceń przypisanych do zalogowanego użytkownika
- **Przypisywanie użytkowników** - kierowcy mogą się przypisywać do zleceń (max 10 osób)
- **Historia przypisań** - pełna historia przypisań i wypisań z timestampami
- **Historia edycji** - śledzenie kto i kiedy edytował zlecenie z listą zmienionych pól
- **Dyspozycyjność** - pracownicy mogą ustawiać swoją dostępność na poszczególne dni tygodnia
- **Real-time updates** - zmiany widoczne natychmiast u wszystkich użytkowników (bez odświeżania)
- **Push notifications** - powiadomienia o nowych zleceniach nawet gdy aplikacja jest zamknięta
- **Progressive Web App (PWA)** - instalacja na urządzeniu, Service Worker, obsługa offline
- **Tryb offline** - banner informacyjny i blokada akcji przy braku internetu
- **OC sprawcy** - admin może przypisać ubezpieczyciela (PZU, WARTA, VIG, ALLIANZ, TUW, INNE) z opcją drukowania dokumentów PDF
- **Autoryzacja** - logowanie przez Supabase Auth (email/hasło)
- **Responsywny design** - mobile-first, dostosowany do telefonów i desktopów

## Struktura zlecenia

Każde zlecenie zawiera:
- Numer rejestracyjny pojazdu
- Data i godzina
- Lokalizacja odbioru
- Notatki (opcjonalnie)
- Status (aktywne / ukończone / usunięte)
- Ubezpieczyciel OC sprawcy (opcjonalnie, tylko admin)
- Lista przypisanych użytkowników z timestampami

## Technologie

- **Frontend:** React 19 + Vite 7
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **Powiadomienia:** Web Push API + Service Worker
- **UI:** react-hot-toast, custom CSS (mobile-first)

## Struktura projektu

```
src/
├── components/
│   ├── LoginForm.jsx           # Formularz logowania/rejestracji
│   ├── OrderCard.jsx           # Karta zlecenia z akcjami
│   ├── OrderList.jsx           # Lista zleceń z grupowaniem i filtrami
│   ├── OrderForm.jsx           # Formularz tworzenia/edycji zlecenia
│   ├── AssignmentHistory.jsx   # Historia przypisań z timestampami
│   ├── AvailabilityManager.jsx # Zarządzanie dyspozycyjnością
│   └── OfflineBanner.jsx       # Banner trybu offline
├── hooks/
│   ├── useAuth.js              # Autoryzacja Supabase
│   ├── useOrders.js            # CRUD zleceń + subskrypcje realtime
│   ├── useAvailability.js      # Zarządzanie dostępnością
│   └── usePushNotifications.js # Push notifications
├── lib/
│   └── supabase.js             # Klient Supabase (singleton)
├── App.jsx                     # Główny komponent aplikacji
└── main.jsx                    # Entry point
supabase/
├── functions/
│   └── send-push/index.ts      # Edge Function - wysyłka push notifications
└── migrations/                 # Migracje SQL (uruchom po kolei w Supabase SQL Editor)
```

## Konfiguracja

### 1. Zainstaluj zależności

```bash
npm install
```

### 2. Skonfiguruj zmienne środowiskowe

Skopiuj plik `.env.example` jako `.env` i uzupełnij wartości:

```bash
cp .env.example .env
```

Wymagane zmienne:
| Zmienna | Opis |
|---------|------|
| `VITE_SUPABASE_URL` | URL projektu Supabase |
| `VITE_SUPABASE_ANON_KEY` | Klucz publiczny (anon key) Supabase |
| `VITE_VAPID_PUBLIC_KEY` | Klucz publiczny VAPID do push notifications |

Klucze VAPID wygenerujesz komendą:
```bash
npx web-push generate-vapid-keys
```

### 3. Wykonaj migracje SQL

Uruchom migracje z folderu `supabase/migrations/` **po kolei** w Supabase SQL Editor:

1. `supabase-schema.sql` - tabele: profiles, orders, assignments, push_subscriptions
2. `002_add_unassigned_at.sql` - kolumny unassigned_at/unassigned_by w assignments
3. `003_push_notifications.sql` - triggery push notifications
4. `004_fix_push_triggers.sql` - poprawki triggerów
5. `005_update_push_triggers.sql` - aktualizacja triggerów
6. `006_order_edits.sql` - historia edycji zleceń
7. `007_availability.sql` - tabela dyspozycyjności pracowników
8. `012_insurance_company.sql` - kolumna ubezpieczyciela OC sprawcy w zleceniach

### 4. Skonfiguruj push notifications

W Supabase Dashboard → Settings → Edge Functions → Secrets dodaj:

| Sekret | Opis |
|--------|------|
| `VAPID_PUBLIC_KEY` | Klucz publiczny VAPID (ten sam co w `.env`) |
| `VAPID_PRIVATE_KEY` | Klucz prywatny VAPID |
| `VAPID_EMAIL` | Email kontaktowy (format: `mailto:admin@example.com`) |

Wdróż Edge Function:
```bash
npx supabase functions deploy send-push --no-verify-jwt
```

### 5. Uruchom aplikację

```bash
npm run dev
```

## Skrypty

| Komenda | Opis |
|---------|------|
| `npm run dev` | Serwer deweloperski (Vite) |
| `npm run build` | Build produkcyjny do `dist/` |
| `npm run preview` | Podgląd buildu produkcyjnego |
| `npm run lint` | Linting kodu (ESLint) |
