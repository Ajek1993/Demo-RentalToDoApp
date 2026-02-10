# System Zleceń Wypożyczalni

Aplikacja do zarządzania zleceniami w wypożyczalni samochodów.

## Funkcjonalności

- **Zarządzanie zleceniami** - dodawanie, edycja, usuwanie i oznaczanie jako ukończone
- **Przypisywanie użytkowników** - kierowcy mogą się przypisywać do zleceń (max 10 osób)
- **Historia przypisań** - pełna historia przypisań i wypisań z timestampami
- **Filtrowanie zleceń** - widok aktywnych, ukończonych i usuniętych zleceń
- **Autoryzacja** - logowanie przez Supabase Auth
- **Responsywny design** - dostosowany do urządzeń mobilnych i desktopowych
- **Mobile-first** - modal z akcjami na urządzeniach mobilnych

## Struktura zlecenia

Każde zlecenie zawiera:
- Numer rejestracyjny pojazdu
- Data i godzina wypożyczenia
- Lokalizacja odbioru
- Notatki (opcjonalnie)
- Status (aktywne/ukończone/usunięte)
- Lista przypisanych użytkowników z timestampami

## Przypisywanie do zleceń

- **Limit**: maksymalnie 10 osób może być przypisanych do zlecenia
- **Pierwszeństwo**: pierwszy przypisany użytkownik jest wyróżniony
- **Historia**: pełna historia przypisań i wypisań jest zachowywana
- **Soft delete**: wypisanie nie usuwa rekordu, tylko ustawia timestamp wypisania

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

3. Wykonaj migracje SQL w Supabase:
   - Uruchom migracje z folderu `supabase/migrations/` w Supabase SQL Editor
   - Migracje dodają tabele i kolumny potrzebne do przypisywania użytkowników

4. Uruchom aplikację:
```bash
npm run dev
```

## Rozwój

- `npm run dev` - uruchom serwer deweloperski
- `npm run build` - zbuduj aplikację produkcyjną
- `npm run preview` - podgląd buildu produkcyjnego
