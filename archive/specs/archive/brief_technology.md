Co boli

 Kierowcy przypisują się do zleceń na wspólnej liście, ale nie ma pewności kto był pierwszy i brakuje powiadomień o zmianach.

 Dla kogo

 ~15 pracowników wypożyczalni samochodów - wewnętrzne narzędzie. Wszyscy mają te same uprawnienia.

 Core funkcja MVP (krok po kroku)

 Każdy użytkownik może:
 - Loguje się (login/hasło)
 - Dodaje zlecenie: data, godzina, miejsce wydania, numer rejestracyjny, notatki
 - Widzi 3 listy: Aktywne | Zakończone | Usunięte
 - Edytuje/usuwa/kończy zlecenie
 - Przypisuje się do zlecenia (lub wypisuje)
 - Przypisuje INNEGO użytkownika do zlecenia (np. przy zamianie między kierowcami)
 - Widzi historię przypisań do każdego zlecenia (kto, kiedy - z timestampem)
 - Dostaje push notification gdy: nowe zlecenie, zlecenie zakończone

 UI: Mobile first (telefony kierowców), ale działa też na desktop

 ---
 Analiza technologii: Dlaczego NIE Python?

 Python nie pasuje do tego projektu - to aplikacja webowa z real-time UI i push notifications, gdzie 80% pracy to frontend (PWA działająca na telefonach kierowców). Python nie ma narzędzi do frontendu webowego, a       
 pisanie osobnego backendu w Pythonie gdy Supabase daje to "za darmo" to niepotrzebna praca.

 Gdybyś chciał Pythona mimo wszystko:
 - Backend: FastAPI + websockets + psycopg2
 - Problem: i tak potrzebujesz JS frontendu (React/Vue) + Service Worker do push
 - Rezultat: 2x więcej pracy, 2 języki zamiast 1

 ---
 Technologia (rekomendacja)

 Backend + Auth + DB + Real-time: Supabase (darmowy tier wystarczy dla 15 userów)
 - PostgreSQL - baza danych
 - Wbudowana autentykacja (email/hasło)
 - Real-time subscriptions - aktualizacje na żywo
 - Edge Functions - do wysyłania push notifications

 Frontend: React + Vite (prostsze niż Next.js dla MVP)
 - PWA z Service Worker dla push notifications
 - Web Push API (VAPID keys)
 - Deploy na Vercel lub Netlify (darmowy)

 Uzasadnienie: Supabase daje "z pudełka" to co potrzebne (auth, DB, real-time). Zero własnego backendu = mniej kodu do utrzymania.

 ---
 Biblioteki JS/TS

 WBUDOWANE W PRZEGLĄDARKĘ (preferowane):
 - fetch: zapytania HTTP do Supabase
 - localStorage: cache tokena sesji
 - Notification API: wyświetlanie push notifications
 - Service Worker API: obsługa push w tle

 ZEWNĘTRZNE (konieczne):
 - @supabase/supabase-js: klient Supabase (auth, DB, real-time) - bez tego nie ma projektu
 - react: UI components - standard dla PWA
 - react-dom: renderowanie React
 - vite: bundler + dev server - szybszy i prostszy niż webpack
 - web-push (tylko backend/edge function): generowanie VAPID keys i wysyłanie push

 Opcjonalne (ale oszczędzają dużo czasu):
 - react-hot-toast lub sonner: toasty/notyfikacje w UI (~200 linii oszczędności)

 ---
 Struktura plików (minimalna)

 /src
   /components
     OrderCard.jsx        # pojedyncze zlecenie
     OrderList.jsx        # lista zleceń (aktywne/zakończone/usunięte)
     OrderForm.jsx        # formularz dodawania/edycji
     AssignmentHistory.jsx # historia przypisań
     Header.jsx           # nawigacja + user info
   /hooks
     useOrders.js         # fetch + real-time subscription zleceń
     useAuth.js           # logowanie/wylogowanie
     usePushNotifications.js # rejestracja push
   /lib
     supabase.js          # klient Supabase (singleton)
   App.jsx                # główny komponent + routing (3 zakładki)
   main.jsx               # entry point
   index.css              # style (Tailwind lub czyste CSS)
 /public
   sw.js                  # Service Worker dla push
   manifest.json          # PWA manifest
 /supabase
   /functions
     send-push/index.ts   # Edge Function wysyłająca push
   /migrations
     001_initial.sql      # schemat bazy
 index.html
 vite.config.js
 package.json

 ~15 plików dla kompletnego MVP.

 ---
 Jak uruchomić

 Instalacja:
 npm create vite@latest todo-app -- --template react
 cd todo-app
 npm install @supabase/supabase-js

 Development:
 npm run dev
 # Otwórz http://localhost:5173

 Deploy:
 npm run build
 # Upload /dist do Vercel/Netlify

 Supabase (osobno):
 npx supabase init
 npx supabase db push        # migracje
 npx supabase functions deploy send-push  # edge function

 Struktura danych (minimum)

 Tabela users:
 - id, email, name (bez ról - wszyscy równi)

 Tabela orders:
 - id, plate (nr rej), date, time, location, notes, status (active/completed/deleted), created_by, created_at

 Tabela assignments:
 - id, order_id, user_id, assigned_at (timestamp), assigned_by (kto przypisał - może być inna osoba)

 Statusy zleceń:
 - active - widoczne na liście "Aktywne"
 - completed - widoczne na liście "Zakończone"
 - deleted - widoczne na liście "Usunięte" (soft delete)

 Edge cases (max 4)

 - Konflikt przypisań: Serwer decyduje o kolejności na podstawie assigned_at - kto ma wcześniejszy timestamp, ten był pierwszy
 - Offline: Jeśli brak połączenia, pokaż komunikat "Brak połączenia" - nie pozwalaj na akcje
 - Usunięcie zlecenia z przypisanymi: Przed usunięciem pokaż ostrzeżenie z listą przypisanych kierowców
 - Wielu kierowców naraz: Każdy może się przypisać, lista sortowana po czasie - pierwszy na górze

 Czego NIE robimy w MVP

 - ❌ Google OAuth (zostajemy przy login/hasło)
 - ❌ Role i uprawnienia (wszyscy równi)
 - ❌ Auto-usuwanie starych wpisów (może kiedyś: >30 dni)
 - ❌ Filtrowanie/sortowanie zaawansowane
 - ❌ Eksport danych
 - ❌ Notyfikacje email
 - ❌ Tryb offline z synchronizacją
 - ❌ Testy automatyczne
 - ❌ Logowanie błędów
 - ❌ Cache
 - ❌ Aplikacja mobilna natywna (PWA wystarczy)

 Weryfikacja (jak przetestować)

 - Zaloguj się jako biuro, dodaj zlecenie
 - Zaloguj się jako kierowca (druga przeglądarka/incognito), przypisz się
 - Sprawdź czy biuro widzi przypisanie w real-time
 - Sprawdź czy push notification przyszła
 - Sprawdź historię przypisań - czy timestamp jest poprawny