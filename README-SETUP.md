# System Zleceń Wypożyczalni - Instrukcja Konfiguracji

## ETAP A: Fundament + Auth - UKOŃCZONY ✅

### Co zostało zaimplementowane:

- ✅ Projekt React z Vite
- ✅ Instalacja @supabase/supabase-js
- ✅ Klient Supabase (src/lib/supabase.js)
- ✅ Hook useAuth z funkcjami rejestracji i logowania
- ✅ Komponent LoginForm
- ✅ Komponent App z obsługą sesji
- ✅ Schemat SQL do wykonania w Supabase

---

## KROK 1: Utwórz projekt Supabase

- Wejdź na https://dashboard.supabase.com
- Kliknij "New Project"
- Nadaj nazwę projektowi (np. "rental-app")
- Ustaw hasło do bazy danych (zapisz je!)
- Wybierz region (najbliższy Twojej lokalizacji)
- Poczekaj aż projekt się utworzy (~2 minuty)

Po utworzeniu projektu, zapisz:

- **Project URL**: https://xxx.supabase.co (znajdziesz w Settings → API)
- **Anon public key**: eyJhbGc... (znajdziesz w Settings → API)

---

## KROK 2: Wykonaj schemat bazy danych

- Wejdź do Supabase Dashboard → SQL Editor
- Kliknij "New query"
- Otwórz plik `supabase-schema.sql` z tego katalogu
- Skopiuj CAŁĄ jego zawartość
- Wklej do SQL Editor w Supabase
- Kliknij "Run" (lub naciśnij Ctrl+Enter)
- Sprawdź czy wszystko się wykonało bez błędów

---

## KROK 3: Skonfiguruj plik .env

- Otwórz plik `.env` w głównym katalogu projektu
- Zamień placeholder wartości na swoje:

```env
VITE_SUPABASE_URL=https://twoj-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=twoj-anon-key
```

Gdzie:
- `VITE_SUPABASE_URL` - to Project URL z Supabase (Settings → API)
- `VITE_SUPABASE_ANON_KEY` - to anon public key z Supabase (Settings → API)

---

## KROK 4: Uruchom aplikację

```bash
cd rental-app
npm run dev
```

Aplikacja powinna uruchomić się na http://localhost:5173

---

## TESTY - Czy wszystko działa?

### Test 1: Rejestracja

- Otwórz http://localhost:5173
- Kliknij "Nie masz konta? Zarejestruj się"
- Wpisz:
  - **Imię i nazwisko**: Jan Kowalski
  - **Email**: test@test.pl
  - **Hasło**: haslo123
- Kliknij "Zarejestruj się"
- Powinno wyświetlić: "Witaj, Jan Kowalski" + przycisk "Wyloguj"

### Test 2: Sprawdź bazę danych

- Wejdź do Supabase Dashboard → Table Editor
- Otwórz tabelę `profiles`
- Powinieneś zobaczyć wpis z name="Jan Kowalski"

### Test 3: Odświeżenie strony (F5)

- Naciśnij F5 w przeglądarce
- Powinieneś nadal być zalogowany
- Jeśli tak - sesja działa poprawnie ✅

### Test 4: Wylogowanie

- Kliknij "Wyloguj"
- Powinno wyświetlić ekran logowania
- Spróbuj się zalogować ponownie używając test@test.pl / haslo123
- Powinno zadziałać ✅

---

## Definicja "done" dla Etapu A:

- ✅ npm run dev uruchamia aplikację na localhost:5173
- ✅ Można się zarejestrować nowym emailem + imieniem
- ✅ Profil tworzony automatycznie w tabeli profiles (trigger w bazie)
- ✅ Można się zalogować
- ✅ Sesja przeżywa odświeżenie strony (F5)
- ✅ Wylogowanie działa

---

## Co dalej?

Etap A zakończony! Następne etapy:

- **ETAP B**: CRUD Zleceń (dodawanie, edycja, usuwanie, 3 listy)
- **ETAP C**: Przypisywanie + Historia
- **ETAP D**: Real-time Updates
- **ETAP E**: Push Notifications (PWA)

Aby kontynuować, poczekaj na implementację kolejnych etapów.

---

## Problemy?

### Błąd: "Invalid API key"
- Sprawdź czy wartości w .env są poprawne
- Sprawdź czy skopiowałeś całe klucze (bez spacji na końcu)
- Zrestartuj `npm run dev` po zmianie .env

### Błąd: "relation profiles does not exist"
- Schemat SQL nie został wykonany w bazie
- Wróć do KROKU 2 i wykonaj `supabase-schema.sql`

### Rejestracja nie działa
- Sprawdź Console w przeglądarce (F12 → Console)
- Sprawdź czy w Supabase → Authentication → Settings → Email Auth jest włączone
- Sprawdź czy trigger `handle_new_user` został utworzony (Database → Functions)

### Inne problemy
- Sprawdź Console w przeglądarce (F12)
- Sprawdź czy wszystkie zależności zainstalowane: `npm install`
