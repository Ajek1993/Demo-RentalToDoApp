ETAPY REALIZACJI MVP

 Etap A: Fundament + Auth

 Co robi: Stawia infrastrukturę (Supabase, React) i pozwala użytkownikom się zalogować.

 Cel: Działająca aplikacja z ekranem logowania i pustą stroną główną po zalogowaniu.

 Zakres:
 - Projekt Supabase (dashboard.supabase.com)
 - Schemat bazy: tabele users, orders, assignments
 - React + Vite boilerplate
 - Klient Supabase (/src/lib/supabase.js)
 - Hook useAuth.js (login, logout, sesja)
 - Komponent LoginForm.jsx
 - Prosty App.jsx z routingiem (zalogowany/niezalogowany)

 Input: Email + hasło użytkownika

 Output: Zalogowany użytkownik, token sesji w localStorage

 Test:
 - Otwórz localhost:5173
 - Wpisz email + hasło
 - Kliknij "Zaloguj"
 - Widzisz "Witaj, [imię]" + przycisk "Wyloguj"
 - Odśwież stronę - nadal zalogowany
 - Kliknij "Wyloguj" - wraca do logowania

 Definition of Done:
 - Użytkownik może się zarejestrować
 - Użytkownik może się zalogować
 - Sesja przeżywa odświeżenie strony
 - Wylogowanie działa

 ---
 Etap B: CRUD Zleceń

 Co robi: Pozwala dodawać, edytować, usuwać i przeglądać zlecenia.

 Cel: Lista zleceń z możliwością zarządzania nimi.

 Zakres:
 - Hook useOrders.js (fetch, create, update, delete)
 - Komponent OrderForm.jsx (formularz dodawania/edycji)
 - Komponent OrderCard.jsx (pojedyncze zlecenie)
 - Komponent OrderList.jsx (lista z 3 zakładkami)
 - Style mobile-first

 Input: Dane zlecenia (plate, date, time, location, notes)

 Output: Zlecenie zapisane w bazie, widoczne na liście

 Test:
 - Kliknij "Dodaj zlecenie"
 - Wpisz: WA12345, jutro, 10:00, Okęcie T1, "VIP"
 - Kliknij "Zapisz"
 - Zlecenie pojawia się na liście "Aktywne"
 - Kliknij "Zakończ" - przenosi do "Zakończone"
 - Kliknij "Usuń" - przenosi do "Usunięte"

 Definition of Done:
 - Można dodać nowe zlecenie
 - Można edytować istniejące zlecenie
 - Można oznaczyć jako zakończone
 - Można usunąć (soft delete)
 - 3 zakładki działają (Aktywne/Zakończone/Usunięte)

 ---
 Etap C: Przypisywanie + Historia

 Co robi: Pozwala przypisywać się do zleceń i widzieć kto był pierwszy.

 Cel: Kierowca klika "Zapisz się" i widzi listę przypisanych z timestampami.

 Zakres:
 - Rozszerzenie useOrders.js o assign/unassign
 - Komponent AssignmentHistory.jsx
 - Dropdown "Przypisz innego" (lista userów)
 - Sortowanie przypisanych po assigned_at

 Input: ID zlecenia + ID użytkownika (siebie lub innego)

 Output: Wpis w tabeli assignments z timestampem

 Test:
 - Otwórz zlecenie WA12345
 - Kliknij "Zapisz się"
 - Widzisz: "Jan Kowalski - 14:32:05" na liście
 - Otwórz tę samą stronę w incognito (inny user)
 - Kliknij "Zapisz się"
 - Widzisz obu userów, posortowanych po czasie
 - Kliknij "Wypisz się" - znikasz z listy

 Definition of Done:
 - Można przypisać siebie do zlecenia
 - Można wypisać siebie ze zlecenia
 - Można przypisać innego użytkownika
 - Historia pokazuje kto i kiedy (timestamp do sekundy)
 - Lista posortowana - pierwszy na górze

 ---
 Etap D: Real-time Updates

 Co robi: Aktualizacje pojawiają się automatycznie bez odświeżania.

 Cel: Gdy ktoś doda zlecenie lub się przypisze, inni widzą to natychmiast.

 Zakres:
 - Supabase Realtime subscription w useOrders.js
 - Toast notification w UI (react-hot-toast)
 - Obsługa INSERT/UPDATE/DELETE na tabelach

 Input: Zmiana w bazie (INSERT/UPDATE/DELETE)

 Output: Automatyczna aktualizacja UI + toast "Nowe zlecenie dodane"

 Test:
 - Otwórz app w 2 oknach (2 różnych userów)
 - User A dodaje zlecenie
 - User B widzi je natychmiast (bez F5) + toast
 - User B przypisuje się
 - User A widzi przypisanie natychmiast + toast

 Definition of Done:
 - Nowe zlecenia pojawiają się automatycznie
 - Zmiany statusu widoczne natychmiast
 - Przypisania widoczne natychmiast
 - Toast informuje o zmianach

 ---
 Etap E: Push Notifications (PWA)

 Co robi: Powiadomienia na telefon nawet gdy app zamknięta.

 Cel: Kierowca dostaje push gdy pojawia się nowe zlecenie.

 Zakres:
 - manifest.json (PWA)
 - sw.js (Service Worker)
 - Hook usePushNotifications.js
 - Supabase Edge Function send-push
 - Database trigger na INSERT do orders

 Input: Nowe zlecenie w bazie

 Output: Push notification na wszystkich urządzeniach

 Test:
 - Zainstaluj app jako PWA (Chrome: "Dodaj do ekranu głównego")
 - Zamknij przeglądarkę
 - Na innym urządzeniu dodaj zlecenie
 - Telefon pokazuje push: "Nowe zlecenie: WA12345"
 - Kliknij - otwiera app na tym zleceniu

 Definition of Done:
 - App instalowalna jako PWA
 - Service Worker zarejestrowany
 - Push przychodzi gdy app zamknięta
 - Kliknięcie w push otwiera app

 ---
 PODSUMOWANIE ETAPÓW

 Kolejność realizacji

 A: Fundament + Auth     ─────►  B: CRUD Zleceń  ─────►  C: Przypisywanie
                                                               │
                                                               ▼
                         E: Push Notifications  ◄─────  D: Real-time

 Sekwencja: A → B → C → D → E

 Etap KRYTYCZNY

 Etap A (Fundament + Auth) - bez niego nic nie działa. Supabase + auth to podstawa wszystkiego.

 Etap do POMINIĘCIA w wersji 0

 Etap E (Push Notifications) - można używać aplikacji bez push. Użytkownicy będą musieli ręcznie odświeżać lub trzymać app otwartą, ale core funkcjonalność działa. Push dodamy gdy reszta będzie stabilna.

 Alternatywnie: Etap D (Real-time) też można pominąć na start - wystarczy F5 do odświeżenia. Ale to gorsze UX niż brak push.

 Minimalna działająca wersja (MVP-0)

 Jeśli potrzebujesz czegoś działającego ASAP:

 A + B + C = działająca aplikacja (bez real-time, bez push)
 - Logowanie ✓
 - CRUD zleceń ✓
 - Przypisywanie z historią ✓
 - Trzeba ręcznie odświeżać żeby zobaczyć zmiany

 To wystarczy do testów z prawdziwymi użytkownikami. D i E dodasz po feedbacku.