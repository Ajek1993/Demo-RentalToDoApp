SZCZEGÓŁOWY PLAN PRAC

 Etap A: Fundament + Auth

 Cel: Użytkownik może się zalogować i zobaczyć pustą stronę główną.

 Kroki:

 - A1: Utwórz projekt Supabase na dashboard.supabase.com, zapisz URL i anon key
 - A2: Utwórz tabele w Supabase SQL Editor:
 -- users (rozszerzenie auth.users)
 create table public.profiles (
   id uuid references auth.users primary key,
   name text not null,
   created_at timestamptz default now()
 );

 -- orders
 create table public.orders (
   id uuid primary key default gen_random_uuid(),
   plate text not null,
   date date not null,
   time time not null,
   location text not null,
   notes text,
   status text default 'active' check (status in ('active', 'completed', 'deleted')),
   created_by uuid references public.profiles(id),
   created_at timestamptz default now()
 );

 -- assignments
 create table public.assignments (
   id uuid primary key default gen_random_uuid(),
   order_id uuid references public.orders(id) on delete cascade,
   user_id uuid references public.profiles(id),
   assigned_by uuid references public.profiles(id),
   assigned_at timestamptz default now()
 );

 -- RLS policies (wszyscy zalogowani widzą wszystko)
 alter table public.profiles enable row level security;
 alter table public.orders enable row level security;
 alter table public.assignments enable row level security;

 create policy "Users can view all profiles" on public.profiles for select using (true);
 create policy "Users can view all orders" on public.orders for select using (true);
 create policy "Users can insert orders" on public.orders for insert with check (auth.uid() = created_by);
 create policy "Users can update orders" on public.orders for update using (true);
 create policy "Users can view assignments" on public.assignments for select using (true);
 create policy "Users can insert assignments" on public.assignments for insert with check (true);
 create policy "Users can delete own assignments" on public.assignments for delete using (user_id = auth.uid());
 - A3: Utwórz projekt React: npm create vite@latest rental-app -- --template react && cd rental-app && npm install @supabase/supabase-js
 - A4: Utwórz /src/lib/supabase.js z klientem Supabase (URL + key z .env)
 - A5: Utwórz /src/hooks/useAuth.js z funkcjami: signUp, signIn, signOut, getSession
 - A6: Utwórz /src/components/LoginForm.jsx z formularzem email/hasło
 - A7: Utwórz /src/App.jsx z logiką: niezalogowany → LoginForm, zalogowany → "Witaj, [name]" + przycisk wyloguj

 Edge cases: Brak (etap infrastrukturalny)

 Definicja "done":
 - npm run dev uruchamia aplikację
 - Można się zarejestrować nowym emailem
 - Można się zalogować
 - Po odświeżeniu strony sesja zachowana
 - Wylogowanie działa

 Test:
 npm run dev
 → Otwórz localhost:5173
 → Kliknij "Zarejestruj", wpisz email+hasło+imię
 → Widzisz "Witaj, [imię]"
 → F5 → nadal zalogowany
 → Kliknij "Wyloguj" → ekran logowania

 ---
 Etap B: CRUD Zleceń

 Cel: Użytkownik może dodawać, edytować, usuwać zlecenia i przeglądać 3 listy.

 Kroki:

 - B1: Utwórz /src/hooks/useOrders.js z funkcjami: fetchOrders, createOrder, updateOrder, deleteOrder (soft delete = status='deleted')
 - B2: Utwórz /src/components/OrderForm.jsx - formularz z polami: plate, date, time, location, notes + walidacja (wszystkie wymagane oprócz notes)
 - B3: Utwórz /src/components/OrderCard.jsx - karta zlecenia z przyciskami: Edytuj, Zakończ, Usuń
 - B4: Utwórz /src/components/OrderList.jsx - 3 zakładki (Aktywne/Zakończone/Usunięte) + lista OrderCard
 - B5: Dodaj style mobile-first w /src/index.css (flexbox, touch-friendly buttons min 44px)

 Edge cases:
 - Usunięcie zlecenia z przypisanymi: Na tym etapie ignorujemy (obsłużymy w etapie C)

 Definicja "done":
 - Formularz dodawania działa
 - Zlecenie pojawia się na liście "Aktywne"
 - Edycja zlecenia działa
 - "Zakończ" przenosi do listy "Zakończone"
 - "Usuń" przenosi do listy "Usunięte"
 - UI czytelny na telefonie (min-width 320px)

 Test:
 → Kliknij "+"
 → Wpisz: WA12345, 2024-01-15, 10:00, Okęcie T1, "klient VIP"
 → Zapisz → zlecenie na liście Aktywne
 → Kliknij "Edytuj" → zmień lokalizację → Zapisz
 → Kliknij "Zakończ" → zlecenie w zakładce Zakończone
 → Kliknij "Usuń" → zlecenie w zakładce Usunięte

 ---
 Etap C: Przypisywanie + Historia

 Cel: Kierowca może się przypisać do zlecenia, widać kto był pierwszy.

 Kroki:

 - C1: Rozszerz useOrders.js o: assignToOrder(orderId, userId, assignedBy), unassignFromOrder(orderId, userId), fetchAssignments(orderId)
 - C2: Utwórz /src/components/AssignmentHistory.jsx - lista przypisanych z timestampami, posortowana od najwcześniejszego
 - C3: Dodaj do OrderCard.jsx: przycisk "Zapisz się" / "Wypisz się" + komponent AssignmentHistory
 - C4: Dodaj dropdown "Przypisz innego" z listą wszystkich userów (fetch z profiles)
 - C5: Dodaj modal potwierdzenia przed usunięciem zlecenia z przypisanymi kierowcami

 Edge cases:
 - Konflikt przypisań: Serwer (Supabase) nadaje timestamp - kto pierwszy w bazie, ten pierwszy na liście
 - Usunięcie zlecenia z przypisanymi: Modal z ostrzeżeniem i listą przypisanych
 - Wielu kierowców naraz: Każdy może się przypisać, lista sortowana po assigned_at ASC

 Definicja "done":
 - Przycisk "Zapisz się" dodaje wpis do assignments
 - Przycisk "Wypisz się" usuwa wpis
 - Historia pokazuje: imię + timestamp (HH:MM:SS)
 - Lista posortowana - najwcześniejszy na górze
 - Dropdown pozwala przypisać innego usera
 - Modal ostrzega przed usunięciem zlecenia z przypisanymi

 Test:
 → User A: otwórz zlecenie WA12345, kliknij "Zapisz się"
 → Widzisz: "Jan Kowalski - 14:32:05"
 → User B (incognito): zaloguj się, otwórz to samo zlecenie
 → Kliknij "Zapisz się"
 → Widzisz: "Jan Kowalski - 14:32:05" (pierwszy), "Anna Nowak - 14:33:12" (druga)
 → User A: kliknij "Usuń" → modal "Zlecenie ma przypisanych: Jan, Anna. Usunąć?"

 ---
 Etap D: Real-time Updates

 Cel: Zmiany widoczne natychmiast bez odświeżania strony.

 Kroki:

 - D1: Włącz Realtime w Supabase Dashboard dla tabel: orders, assignments
 - D2: Dodaj do useOrders.js subscription na zmiany: supabase.channel('orders').on('postgres_changes', ...)
 - D3: Zainstaluj react-hot-toast: npm install react-hot-toast
 - D4: Dodaj Toaster do App.jsx i wyświetlaj toast przy zmianach: "Nowe zlecenie", "Ktoś się przypisał", "Zlecenie zakończone"
 - D5: Dodaj obsługę edge case "Offline" - sprawdzaj navigator.onLine, blokuj akcje gdy false

 Edge cases:
 - Offline: Jeśli navigator.onLine === false, pokaż banner "Brak połączenia" i zablokuj przyciski

 Definicja "done":
 - Nowe zlecenie pojawia się u innych bez F5
 - Przypisanie widoczne u innych bez F5
 - Toast informuje o zmianach
 - Offline: banner + zablokowane akcje

 Test:
 → Otwórz app w 2 oknach przeglądarki (2 userów)
 → User A: dodaj zlecenie "WA99999"
 → User B: widzi zlecenie natychmiast + toast "Nowe zlecenie: WA99999"
 → User B: przypisz się
 → User A: widzi przypisanie natychmiast + toast
 → Wyłącz WiFi → banner "Brak połączenia", przyciski nieaktywne

 ---
 Etap E: Push Notifications (PWA)

 Cel: Powiadomienia na telefon nawet gdy przeglądarka zamknięta.

 Kroki:

 - E1: Utwórz /public/manifest.json z nazwą app, ikonami, display: standalone
 - E2: Utwórz /public/sw.js - Service Worker obsługujący push event
 - E3: Utwórz /src/hooks/usePushNotifications.js - rejestracja SW, request permission, subscribe to push
 - E4: Wygeneruj VAPID keys (npx web-push generate-vapid-keys), zapisz w Supabase secrets
 - E5: Utwórz Supabase Edge Function /supabase/functions/send-push/index.ts - wysyła push do wszystkich subskrybentów
 - E6: Dodaj database trigger: po INSERT do orders wywołaj Edge Function

 Edge cases: Brak nowych (push to rozszerzenie, nie core)

 Definicja "done":
 - App instalowalna jako PWA (Chrome: "Dodaj do ekranu głównego")
 - Prośba o zgodę na powiadomienia przy pierwszym uruchomieniu
 - Push przychodzi gdy przeglądarka zamknięta
 - Kliknięcie w push otwiera app

 Test:
 → Chrome na telefonie: otwórz app, kliknij "Zainstaluj"
 → Zaakceptuj powiadomienia
 → Zamknij przeglądarkę całkowicie
 → Na komputerze: dodaj nowe zlecenie
 → Telefon: push "Nowe zlecenie: WA12345"
 → Kliknij push → app się otwiera

 ---
 TESTY KOŃCOWE

 Test integracyjny (end-to-end)

 PRZYGOTOWANIE:
 - 2 urządzenia (komputer + telefon) lub 2 przeglądarki
 - 2 konta użytkowników: "Biuro" i "Kierowca"

 SCENARIUSZ:
 - [Biuro] Zaloguj się
 - [Biuro] Dodaj zlecenie: WA12345, jutro, 09:00, Lotnisko Chopina
 - [Kierowca] Zaloguj się (telefon/incognito)
 - [Kierowca] Widzisz zlecenie natychmiast (real-time) + push notification
 - [Kierowca] Kliknij "Zapisz się"
 - [Biuro] Widzisz przypisanie: "Kierowca - 09:15:32"
 - [Kierowca] Kliknij "Wypisz się"
 - [Biuro] Przypisanie znika
 - [Biuro] Kliknij "Zakończ"
 - [Kierowca] Zlecenie przenosi się do "Zakończone" + push
 - [Biuro] Sprawdź historię - widać wszystkie akcje z timestampami

 OCZEKIWANY REZULTAT:
 ✓ Wszystkie akcje synchronizują się w real-time
 ✓ Push notifications działają
 ✓ Historia przypisań kompletna i posortowana

 Scenariusz sukcesu

 UŻYTKOWNIK: Kierowca Jan otwiera app na telefonie rano
 AKCJA: Widzi nowe zlecenie "WA12345 - Okęcie - 10:00"
 AKCJA: Klika "Zapisz się"
 REZULTAT:
 - Widzi siebie na liście: "Jan Kowalski - 08:15:03"
 - Inni kierowcy widzą to samo natychmiast
 - Biuro widzi kto się zapisał

 Scenariusz błędu

 UŻYTKOWNIK: Kierowca Anna próbuje się zapisać bez internetu
 AKCJA: Klika "Zapisz się"
 REZULTAT:
 - Banner: "Brak połączenia z internetem"
 - Przycisk nieaktywny (szary)
 - Żadna akcja nie jest wykonana
 - Po przywróceniu internetu: banner znika, można kliknąć

 UŻYTKOWNIK: Biuro próbuje usunąć zlecenie z przypisanymi
 AKCJA: Klika "Usuń" na zleceniu WA12345
 REZULTAT:
 - Modal: "To zlecenie ma przypisanych kierowców: Jan, Anna. Czy na pewno usunąć?"
 - Przyciski: "Anuluj" / "Usuń mimo to"
 - Dopiero po potwierdzeniu zlecenie trafia do "Usunięte"