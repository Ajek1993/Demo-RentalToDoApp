# RentalApp — System Zleceń Wypożyczalni (DEMO)

**Wersja demonstracyjna** aplikacji PWA do zarządzania zleceniami dostaw w wypożyczalni samochodów. Działa w pełni lokalnie — bez połączenia z bazą danych, z fikcyjnymi danymi w pamięci przeglądarki.

> Wersja produkcyjna łączy się z backendem **Supabase** (PostgreSQL, Auth, Realtime, Edge Functions) i obsługuje ~15 pracowników w codziennej pracy.

## Uruchomienie

```bash
npm install
npm run dev
```

Aplikacja uruchomi się w trybie demo automatycznie (zmienna `VITE_DEMO_MODE=true` w `.env`). Dane są fikcyjne i przechowywane w `sessionStorage` — resetują się po zamknięciu karty przeglądarki.

## Co zobaczysz w demo

- **Baner demo** na górze strony z przełącznikiem ról Admin / User
- **~15 przykładowych zleceń** z różnymi statusami, datami i przypisaniami
- **Pełny CRUD** — tworzenie, edycja, usuwanie, oznaczanie jako ukończone
- **Przypisywanie pracowników** do zleceń (max 10 osób)
- **Historia przypisań i edycji** z timestampami
- **Dyspozycyjność pracowników** — ustawianie dostępności na dni tygodnia
- **Panel kursów** z eksportem do Excel
- **Zarządzanie użytkownikami** (widok admina) — lista, zapraszanie, usuwanie
- **OC sprawcy** — wybór ubezpieczyciela z podglądem dokumentów PDF (placeholder)
- **Dark mode**, wyszukiwarka, filtr dat, filtr "Tylko moje"
- **Responsywny design** — mobile-first, dostosowany do telefonów i desktopów

## Przełączanie ról

Baner demo pozwala przełączać się między dwoma kontami:

| Rola | Użytkownik | Opis |
|------|------------|------|
| **Admin** | Anna Nowak | Pełne uprawnienia — zarządzanie użytkownikami, usuwanie zleceń, podgląd feedbacku |
| **User** | Jan Kowalski | Standardowy kierowca — tworzenie zleceń, przypisywanie się, dyspozycyjność |

## Co posiada więcej wersja produkcyjna

Wersja produkcyjna rozszerza demo o funkcjonalności wymagające backendu:

- **Baza danych PostgreSQL (Supabase)** — trwałe przechowywanie danych z politykami RLS (Row Level Security)
- **Autoryzacja** — rejestracja i logowanie przez Supabase Auth (email/hasło), zaproszenia nowych użytkowników
- **Real-time updates** — zmiany widoczne natychmiast u wszystkich użytkowników bez odświeżania strony (Supabase Realtime / WebSocket)
- **Push notifications** — powiadomienia o nowych zleceniach nawet gdy aplikacja jest zamknięta (Web Push API + Service Worker + Edge Functions)
- **Automatyczne przypomnienia** — cron job wysyłający powiadomienia o dyspozycyjności (środa i niedziela, 21:00)
- **Progressive Web App (PWA)** — instalacja na urządzeniu, pełna obsługa offline z Service Workerem
- **Edge Functions** — wysyłka push notifications i zarządzanie użytkownikami po stronie serwera
- **Zabezpieczenia** — CSP, walidacja payloadów, ograniczenia długości pól, ochrona przed eskalacją uprawnień

Architektura aplikacji jest modularna — **nowe funkcjonalności można dołożyć w razie potrzeby** przyszłych klientów bez przebudowy istniejącego kodu.

## Technologie

- **Frontend:** React 19 + Vite 7
- **Backend (produkcja):** Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **UI:** react-hot-toast, custom CSS (mobile-first), WCAG 2.1 AA
- **Testy:** Vitest + React Testing Library

## Skrypty

| Komenda | Opis |
|---------|------|
| `npm run dev` | Serwer deweloperski (Vite) |
| `npm run build` | Build produkcyjny do `dist/` |
| `npm run test` | Testy jednostkowe (watch mode) |
| `npm run test:run` | Testy jednostkowe (single run) |
| `npm run lint` | Linting kodu (ESLint) |
