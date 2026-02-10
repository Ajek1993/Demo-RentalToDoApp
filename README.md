# System Zleceń Wypożyczalni

Aplikacja do zarządzania zleceniami w wypożyczalni samochodów.

## Funkcjonalności

- **Zarządzanie zleceniami** - dodawanie, edycja, usuwanie i oznaczanie jako ukończone
- **Filtrowanie zleceń** - widok aktywnych, ukończonych i usuniętych zleceń
- **Autoryzacja** - logowanie przez Supabase Auth
- **Responsywny design** - dostosowany do urządzeń mobilnych i desktopowych

## Struktura zlecenia

Każde zlecenie zawiera:
- Numer rejestracyjny pojazdu
- Data i godzina wypożyczenia
- Lokalizacja odbioru
- Notatki (opcjonalnie)
- Status (aktywne/ukończone/usunięte)

## Technologie

- React 18 + Vite
- Supabase (baza danych + autoryzacja)
- CSS modules (custom design system)

## Konfiguracja

1. Zainstaluj zależności:
```bash
npm install
```

2. Skonfiguruj zmienne środowiskowe w `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Uruchom aplikację:
```bash
npm run dev
```

## Rozwój

- `npm run dev` - uruchom serwer deweloperski
- `npm run build` - zbuduj aplikację produkcyjną
- `npm run preview` - podgląd buildu produkcyjnego
