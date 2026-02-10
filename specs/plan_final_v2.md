# FINALNY PLAN PROJEKTU - System Zleceń Wypożyczalni

**Wersja:** 1.0 FINAL
**Status:** GOTOWY DO IMPLEMENTACJI

## KONTEKST

**Problem:** Kierowcy wypożyczalni przypisują się do zleceń na wspólnej liście, ale nie ma pewności kto był pierwszy i brakuje powiadomień o zmianach.

**Rozwiązanie:** Aplikacja webowa (PWA) z real-time aktualizacjami i push notifications.

**Użytkownicy:** ~15 pracowników, wszyscy z równymi uprawnieniami.

## TECHNOLOGIA

- Backend: Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- Frontend: React 18 + Vite
- Biblioteki: @supabase/supabase-js, react-hot-toast
- Deploy: Vercel/Netlify (darmowy)

## STRUKTURA PLIKÓW

```
rental-app/
├── src/
│   ├── components/
│   │   ├── LoginForm.jsx
│   │   ├── OrderCard.jsx
│   │   ├── OrderList.jsx
│   │   ├── OrderForm.jsx
│   │   ├── AssignmentHistory.jsx
│   │   └── OfflineBanner.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useOrders.js
│   │   └── usePushNotifications.js
│   ├── lib/
│   │   └── supabase.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
│   ├── sw.js
│   └── manifest.json
├── supabase/
│   ├── functions/
│   │   └── send-push/
│   │       └── index.ts
│   └── migrations/
│       └── 001_initial.sql
├── .env
├── index.html
├── vite.config.js
└── package.json
```

## ETAP A: Fundament + Auth

**Cel:** Użytkownik może się zarejestrować, zalogować i zobaczyć pustą stronę główną.

### Kroki

#### A1: Utwórz projekt Supabase

- Wejdź na dashboard.supabase.com
- Kliknij "New Project"
- Zapisz:
  - Project URL: https://xxx.supabase.co
  - Anon public key: eyJhbGc...

#### A2: Utwórz schemat bazy danych

Wykonaj w Supabase SQL Editor:

```sql
-- Tabela profili (rozszerzenie auth.users)
create table public.profiles (
   id uuid references auth.users on delete cascade primary key,
   name text not null,
   created_at timestamptz default now()
 );

 -- Tabela zleceń
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

 -- Tabela przypisań
 create table public.assignments (
   id uuid primary key default gen_random_uuid(),
   order_id uuid references public.orders(id) on delete cascade,
   user_id uuid references public.profiles(id),
   assigned_by uuid references public.profiles(id),
   assigned_at timestamptz default now()
 );

 -- Tabela subskrypcji push (dla Etapu E)
 create table public.push_subscriptions (
   id uuid primary key default gen_random_uuid(),
   user_id uuid references public.profiles(id) on delete cascade,
   endpoint text not null,
   p256dh text not null,
   auth text not null,
   created_at timestamptz default now(),
   unique(user_id, endpoint)
 );

 -- RLS - włącz dla wszystkich tabel
 alter table public.profiles enable row level security;
 alter table public.orders enable row level security;
 alter table public.assignments enable row level security;
 alter table public.push_subscriptions enable row level security;

 -- Polityki RLS
 create policy "Profiles: select all" on public.profiles for select using (true);
 create policy "Profiles: insert own" on public.profiles for insert with check (auth.uid() = id);
 create policy "Profiles: update own" on public.profiles for update using (auth.uid() = id);

 create policy "Orders: select all" on public.orders for select using (true);
 create policy "Orders: insert auth" on public.orders for insert with check (auth.uid() = created_by);
 create policy "Orders: update all" on public.orders for update using (true);

 create policy "Assignments: select all" on public.assignments for select using (true);
 create policy "Assignments: insert auth" on public.assignments for insert with check (true);
 create policy "Assignments: delete own" on public.assignments for delete using (user_id = auth.uid());

 create policy "Push: select own" on public.push_subscriptions for select using (auth.uid() = user_id);
 create policy "Push: insert own" on public.push_subscriptions for insert with check (auth.uid() = user_id);
 create policy "Push: delete own" on public.push_subscriptions for delete using (auth.uid() = user_id);

 -- Trigger: auto-tworzenie profilu przy rejestracji
 create or replace function public.handle_new_user()
 returns trigger as $$
 begin
   insert into public.profiles (id, name)
   values (new.id, coalesce(new.raw_user_meta_data->>'name', 'Użytkownik'));
   return new;
 end;
 $$ language plpgsql security definer;

 create trigger on_auth_user_created
   after insert on auth.users
   for each row execute function public.handle_new_user();

-- Włącz Realtime dla tabel (potrzebne w Etapie D)
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.assignments;
```

#### A3: Utwórz projekt React

```bash
npm create vite@latest rental-app -- --template react
cd rental-app
npm install @supabase/supabase-js
```

#### A4: Utwórz plik .env

Utwórz .env w katalogu głównym:

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

#### A5: Utwórz klienta Supabase

Utwórz /src/lib/supabase.js:

```javascript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

#### A6: Utwórz hook useAuth

Utwórz /src/hooks/useAuth.js z funkcjami:

- signUp(email, password, name) - rejestracja z przekazaniem name w metadata
- signIn(email, password) - logowanie
- signOut() - wylogowanie
- user - aktualny użytkownik (reaktywny)
- profile - profil z tabeli profiles (name)
- loading - stan ładowania

#### A7: Utwórz komponent LoginForm

Utwórz /src/components/LoginForm.jsx:

- Formularz z polami: email, hasło, imię (tylko przy rejestracji)
- Przełącznik: "Zaloguj się" / "Zarejestruj się"
- Walidacja: wszystkie pola wymagane
- Obsługa błędów: wyświetl komunikat

#### A8: Utwórz App.jsx

Utwórz /src/App.jsx:

- Jeśli niezalogowany → <LoginForm />
- Jeśli zalogowany → "Witaj, [name]" + przycisk "Wyloguj"
- Stan ładowania → spinner

### Definicja "done"

- npm run dev uruchamia aplikację na localhost:5173
- Można się zarejestrować nowym emailem + imieniem
- Profil tworzony automatycznie w tabeli profiles
- Można się zalogować
- Sesja przeżywa odświeżenie strony (F5)
- Wylogowanie działa

### Test

- → npm run dev
- → Otwórz localhost:5173
- → Kliknij "Zarejestruj się"
- → Wpisz: test@test.pl, haslo123, "Jan Kowalski"
- → Widzisz: "Witaj, Jan Kowalski" + przycisk "Wyloguj"
- → F5 → nadal zalogowany
- → Sprawdź Supabase → tabela profiles ma wpis z name="Jan Kowalski"
- → Kliknij "Wyloguj" → ekran logowania

## ETAP B: CRUD Zleceń

**Cel:** Użytkownik może dodawać, edytować, usuwać zlecenia i przeglądać 3 listy.

### Kroki

#### B1: Utwórz hook useOrders

 Utwórz /src/hooks/useOrders.js z funkcjami:
 - orders - lista zleceń (reaktywna)
 - loading - stan ładowania
 - fetchOrders() - pobierz wszystkie zlecenia
 - createOrder({ plate, date, time, location, notes }) - dodaj zlecenie
 - updateOrder(id, { plate, date, time, location, notes, status }) - edytuj
 - deleteOrder(id) - soft delete (status = 'deleted')
 - completeOrder(id) - zakończ (status = 'completed')
 - restoreOrder(id) - przywróć do aktywnych (status = 'active')

#### B2: Utwórz komponent OrderForm

 Utwórz /src/components/OrderForm.jsx:
 - Pola: plate (text), date (date), time (time), location (text), notes (textarea)
 - Walidacja: plate, date, time, location wymagane
 - Props: onSubmit, initialData (dla edycji), onCancel
 - Tryb: dodawanie (puste) lub edycja (wypełnione)

#### B3: Utwórz komponent OrderCard

 Utwórz /src/components/OrderCard.jsx:
 - Wyświetla: plate (duży), date + time, location, notes (jeśli są)
 - Przyciski (zależne od statusu):
   - active: Edytuj, Zakończ, Usuń
   - completed: Przywróć, Usuń
   - deleted: Przywróć
 - Props: order, onEdit, onComplete, onDelete, onRestore

#### B4: Utwórz komponent OrderList

 Utwórz /src/components/OrderList.jsx:
 - 3 zakładki: Aktywne | Zakończone | Usunięte
 - Filtrowanie zleceń po status
 - Przycisk "+" do dodawania (floating action button)
 - Modal z OrderForm do dodawania/edycji
 - Sortowanie: najnowsze na górze (created_at DESC)

#### B5: Dodaj style mobile-first

 Edytuj /src/index.css:
 - Mobile first (min-width: 320px)
 - Touch-friendly: przyciski min 44x44px
 - Zakładki jako tabs na górze
 - Karty zleceń: border-left jako status indicator
 - FAB w prawym dolnym rogu

#### B6: Zintegruj OrderList z App.jsx

 Zaktualizuj /src/App.jsx:
 - Po zalogowaniu wyświetl <OrderList />
 - Header z imieniem użytkownika i przyciskiem wyloguj

### Definicja "done"

- Formularz dodawania działa
 - Zlecenie pojawia się na liście "Aktywne"
 - Edycja zlecenia działa (modal z wypełnionymi danymi)
 - "Zakończ" przenosi do listy "Zakończone"
 - "Usuń" przenosi do listy "Usunięte"
 - "Przywróć" wraca do "Aktywne"
 - UI czytelny na telefonie (320px szerokości)

### Test

- → Kliknij "+"
 → Wpisz: WA12345, 2025-01-15, 10:00, "Lotnisko Okęcie T1", "klient VIP"
 → Zapisz → zlecenie na liście "Aktywne"
 → Kliknij "Edytuj" → zmień lokalizację na "Dworzec Centralny" → Zapisz
 → Sprawdź czy lokalizacja się zmieniła
 → Kliknij "Zakończ" → zlecenie w zakładce "Zakończone"
 → Kliknij "Usuń" → zlecenie w zakładce "Usunięte"
 → Kliknij "Przywróć" → zlecenie wraca do "Aktywne"
 → Zmień szerokość okna na 320px → UI nadal czytelny

## ETAP C: Przypisywanie + Historia

**Cel:** Kierowca może się przypisać do zlecenia, widać kto był pierwszy (timestamp).

### Kroki

#### C1: Rozszerz useOrders o przypisania

 Dodaj do /src/hooks/useOrders.js:
 - assignToOrder(orderId, userId, assignedBy) - przypisz użytkownika
 - unassignFromOrder(orderId, userId) - wypisz użytkownika
 - fetchAssignments(orderId) - pobierz przypisania dla zlecenia
 - Zwracaj przypisania posortowane po assigned_at ASC (pierwszy na górze)

#### C2: Utwórz komponent AssignmentHistory

 Utwórz /src/components/AssignmentHistory.jsx:
 - Lista przypisanych: imię + timestamp (HH:MM:SS)
 - Pierwszy na liście = pierwszy przypisany (oznaczenie "Pierwszy")
 - Props: assignments, currentUserId
 - Wyróżnij aktualnego użytkownika (pogrubienie)

#### C3: Dodaj funkcje przypisywania do OrderCard

 Zaktualizuj /src/components/OrderCard.jsx:
 - Pobierz przypisania przy renderowaniu
 - Przycisk "Zapisz się" (jeśli user nie jest przypisany)
 - Przycisk "Wypisz się" (jeśli user jest przypisany)
 - Wyświetl <AssignmentHistory /> pod danymi zlecenia

#### C4: Dodaj dropdown "Przypisz innego"

 Zaktualizuj /src/components/OrderCard.jsx:
 - Dropdown z listą wszystkich użytkowników (fetch z profiles)
 - Wyklucz już przypisanych z listy
 - Po wybraniu → wywołaj assignToOrder(orderId, selectedUserId, currentUserId)

#### C5: Dodaj modal potwierdzenia usunięcia

 Zaktualizuj logikę usuwania:
 - Przed usunięciem sprawdź czy zlecenie ma przypisanych
 - Jeśli tak → modal: "To zlecenie ma przypisanych: [lista]. Usunąć?"
 - Przyciski: "Anuluj" / "Usuń mimo to"
 - Dopiero po potwierdzeniu → deleteOrder(id)

### Edge cases obsłużone

- Konflikt przypisań: Supabase nadaje timestamp serwerowy (default now()) - kto pierwszy w bazie, ten pierwszy
 - Usunięcie z przypisanymi: Modal z ostrzeżeniem
 - Wielu kierowców: Każdy może się przypisać, lista posortowana ASC

### Definicja "done"

- Przycisk "Zapisz się" dodaje wpis do assignments
 - Przycisk "Wypisz się" usuwa wpis
 - Historia pokazuje: imię + timestamp (HH:MM:SS)
 - Lista posortowana - najwcześniejszy na górze z oznaczeniem "Pierwszy"
 - Dropdown "Przypisz innego" działa
 - Modal ostrzega przed usunięciem zlecenia z przypisanymi

### Test

- → User A: zaloguj się, otwórz zlecenie WA12345
 → Kliknij "Zapisz się"
 → Widzisz: "Jan Kowalski - 14:32:05 (Pierwszy)"
 → User B (incognito): zaloguj się jako inny user
 → Otwórz to samo zlecenie, kliknij "Zapisz się"
 → Widzisz: "Jan Kowalski - 14:32:05 (Pierwszy)", "Anna Nowak - 14:33:12"
 → User A: kliknij dropdown "Przypisz innego" → wybierz "Piotr" → Piotr dodany
 → User A: kliknij "Usuń"
 → Modal: "To zlecenie ma przypisanych: Jan, Anna, Piotr. Usunąć?"
 → Kliknij "Anuluj" → nic się nie dzieje
 → Kliknij "Usuń" ponownie → "Usuń mimo to" → zlecenie w "Usunięte"

## ETAP D: Real-time Updates

**Cel:** Zmiany widoczne natychmiast bez odświeżania strony.

### Kroki

#### D1: Włącz Realtime w Supabase

- Wejdź w Supabase Dashboard → Database → Replication
- Upewnij się że orders i assignments są w publikacji supabase_realtime
- (Zrobione w SQL w etapie A2, ale zweryfikuj)

#### D2: Dodaj subscription do useOrders

Zaktualizuj /src/hooks/useOrders.js:

```javascript
// W useEffect przy montowaniu:
const channel = supabase
  .channel('orders-changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'orders' },
    (payload) => handleOrderChange(payload)
  )
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'assignments' },
    (payload) => handleAssignmentChange(payload)
  )
  .subscribe()

// Cleanup przy odmontowaniu:
return () => supabase.removeChannel(channel)
```

#### D3: Zainstaluj react-hot-toast

```bash
npm install react-hot-toast
```

#### D4: Dodaj Toaster i toasty

Zaktualizuj /src/App.jsx:

```javascript
import { Toaster } from 'react-hot-toast'
// W renderze:
<Toaster position="bottom-center" />
```

Zaktualizuj /src/hooks/useOrders.js - przy zmianach wyświetlaj toast:

- INSERT orders: "Nowe zlecenie: [plate]"
- UPDATE orders (status=completed): "Zlecenie zakończone: [plate]"
- INSERT assignments: "[name] przypisał się do [plate]"

#### D5: Dodaj obsługę offline

Utwórz /src/components/OfflineBanner.jsx:

- Nasłuchuj window.addEventListener('online'/'offline')
- Jeśli offline → banner na górze: "Brak połączenia z internetem"
- Eksportuj hook useOnlineStatus() zwracający boolean

 Zaktualizuj komponenty:
 - Gdy offline → przyciski akcji disabled (szare)
 - Gdy online → banner znika, przyciski aktywne

### Edge case obsłużony

- Offline: Banner + zablokowane przyciski

### Definicja "done"

- Nowe zlecenie pojawia się u innych bez F5
 - Zmiana statusu widoczna u innych bez F5
 - Przypisanie widoczne u innych bez F5
 - Toast informuje o zmianach
 - Offline: banner + zablokowane przyciski

### Test

- → Otwórz app w 2 oknach przeglądarki (zaloguj 2 różnych userów)
 → User A: dodaj zlecenie "WA99999"
 → User B: widzi zlecenie natychmiast + toast "Nowe zlecenie: WA99999"
 → User B: przypisz się do zlecenia
 → User A: widzi przypisanie natychmiast + toast "Anna przypisała się do WA99999"
 → User A: zakończ zlecenie
 → User B: zlecenie przenosi się do "Zakończone" + toast
 → Chrome DevTools → Network → Offline
 → Banner "Brak połączenia", przyciski nieaktywne
 → Network → Online → banner znika, przyciski aktywne

## ETAP E: Push Notifications (PWA)

**Cel:** Powiadomienia na telefon nawet gdy przeglądarka zamknięta.

### Kroki

#### E1: Utwórz manifest.json

Utwórz /public/manifest.json:

```json
{
  "name": "System Zleceń - Wypożyczalnia",
  "short_name": "Zlecenia",
  "description": "Zarządzanie zleceniami wypożyczalni",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Dodaj ikony 192x192 i 512x512 do /public/.

#### E2: Dodaj link do manifest w index.html

Zaktualizuj /index.html w <head>:

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#2563eb">
```

#### E3: Utwórz Service Worker

Utwórz /public/sw.js:

```javascript
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  const title = data.title || 'Nowe powiadomienie'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' }
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
```

#### E4: Utwórz hook usePushNotifications

Utwórz /src/hooks/usePushNotifications.js:

- subscribed - czy user ma aktywną subskrypcję
- subscribe() - zarejestruj SW, poproś o zgodę, zapisz subskrypcję do Supabase
- unsubscribe() - usuń subskrypcję

Rejestracja SW w funkcji:

```javascript
const registration = await navigator.serviceWorker.register('/sw.js')
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: VAPID_PUBLIC_KEY
})
// Zapisz subscription do tabeli push_subscriptions
```

#### E5: Wygeneruj VAPID keys

```bash
npx web-push generate-vapid-keys
```

Zapisz:

- Public key → .env jako VITE_VAPID_PUBLIC_KEY
- Private key → Supabase Dashboard → Settings → Secrets jako VAPID_PRIVATE_KEY

#### E6: Utwórz Edge Function send-push

Utwórz /supabase/functions/send-push/index.ts:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import webpush from 'npm:web-push'

webpush.setVapidDetails(
  'mailto:admin@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

serve(async (req) => {
  const { title, body, url } = await req.json()

  // Pobierz wszystkie subskrypcje
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')

  // Wyślij push do każdej
  await Promise.all(subscriptions.map(sub =>
    webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ title, body, url })
    ).catch(() => {}) // Ignoruj błędy (expired subscriptions)
  ))

  return new Response('OK')
})
```

#### E7: Dodaj database trigger

Wykonaj w Supabase SQL Editor:

```sql
-- Trigger na nowe zlecenie
create or replace function notify_new_order()
returns trigger as $$
begin
  perform net.http_post(
    url := 'https://xxx.supabase.co/functions/v1/send-push',
    body := json_build_object(
      'title', 'Nowe zlecenie',
      'body', 'Zlecenie: ' || NEW.plate || ' - ' || NEW.location,
      'url', '/'
    )::text,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  );
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_new_order
  after insert on public.orders
  for each row execute function notify_new_order();

-- Trigger na zakończenie zlecenia
create or replace function notify_completed_order()
returns trigger as $$
begin
  if NEW.status = 'completed' and OLD.status != 'completed' then
    perform net.http_post(
      url := 'https://xxx.supabase.co/functions/v1/send-push',
      body := json_build_object(
        'title', 'Zlecenie zakończone',
        'body', 'Zlecenie: ' || NEW.plate,
        'url', '/'
      )::text,
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    );
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_order_completed
  after update on public.orders
  for each row execute function notify_completed_order();
```

#### E8: Zintegruj push z UI

Zaktualizuj /src/App.jsx:

- Przy pierwszym zalogowaniu → usePushNotifications().subscribe()
- Przycisk w ustawieniach: "Włącz/Wyłącz powiadomienia"

### Definicja "done"

- App instalowalna jako PWA (Chrome: "Dodaj do ekranu głównego")
 - Prośba o zgodę na powiadomienia przy logowaniu
 - Push przychodzi gdy: nowe zlecenie, zlecenie zakończone
 - Push działa gdy przeglądarka zamknięta
 - Kliknięcie w push otwiera app

### Test

- → Chrome na telefonie: otwórz app
 → Zaloguj się → prośba o powiadomienia → Zezwól
 → Menu Chrome → "Dodaj do ekranu głównego" → Zainstaluj
 → Zamknij przeglądarkę całkowicie
 → Na komputerze: zaloguj się i dodaj nowe zlecenie "WA12345"
 → Telefon: push "Nowe zlecenie: WA12345 - Lotnisko"
 → Kliknij push → app się otwiera
 → Na komputerze: zakończ zlecenie
 → Telefon: push "Zlecenie zakończone: WA12345"

## TESTY KOŃCOWE

### Test integracyjny (end-to-end)

**Przygotowanie:**

- 2 urządzenia: komputer + telefon (lub 2 przeglądarki)
- 2 konta: "Biuro" (na komputerze), "Kierowca" (na telefonie)

**Scenariusz:**

- → [Biuro] Zaloguj się na komputerze
- → [Kierowca] Zaloguj się na telefonie, zainstaluj PWA, włącz powiadomienia
- → [Kierowca] Zamknij przeglądarkę na telefonie
- → [Biuro] Dodaj zlecenie: WA12345, jutro, 09:00, "Lotnisko Chopina T1"
- → [Kierowca] Telefon pokazuje push: "Nowe zlecenie: WA12345"
- → [Kierowca] Kliknij push → app się otwiera, widać zlecenie
- → [Kierowca] Kliknij "Zapisz się"
- → [Biuro] Widzi natychmiast: "Kierowca - 09:15:32 (Pierwszy)" + toast
- → [Biuro] Kliknij dropdown → przypisz "Biuro" do zlecenia
- → [Kierowca] Widzi natychmiast: "Kierowca (Pierwszy)", "Biuro"
- → [Kierowca] Kliknij "Wypisz się"
- → [Biuro] Przypisanie "Kierowca" znika, zostaje tylko "Biuro"
- → [Biuro] Kliknij "Zakończ"
- → [Kierowca] Zlecenie przenosi się do "Zakończone" + push "Zlecenie zakończone"

**Oczekiwany rezultat:**

- ✅ Wszystkie akcje synchronizują się w real-time
- ✅ Push notifications działają (nowe + zakończone)
- ✅ Historia przypisań kompletna z timestampami
- ✅ "Pierwszy" oznaczony prawidłowo

### Scenariusz sukcesu

**UŻYTKOWNIK:** Kierowca Jan otwiera PWA na telefonie rano
**AKCJA:** Widzi nowe zlecenie "WA12345 - Okęcie - 10:00"
**AKCJA:** Klika "Zapisz się"
**REZULTAT:**

- Widzi siebie na liście: "Jan Kowalski - 08:15:03 (Pierwszy)"
- Inni kierowcy widzą to natychmiast bez odświeżania
- Biuro widzi kto się zapisał

### Scenariusze błędów

#### Offline:

**UŻYTKOWNIK:** Kierowca Anna traci połączenie z internetem
**AKCJA:** Próbuje kliknąć "Zapisz się"
**REZULTAT:**

- Banner: "Brak połączenia z internetem"
- Przycisk nieaktywny (szary)
- Po przywróceniu internetu: banner znika, można kliknąć

#### Usunięcie z przypisanymi:

**UŻYTKOWNIK:** Biuro chce usunąć zlecenie WA12345
**AKCJA:** Klika "Usuń"
**REZULTAT:**

- Modal: "To zlecenie ma przypisanych: Jan, Anna. Usunąć?"
- "Anuluj" → nic się nie dzieje
- "Usuń mimo to" → zlecenie w "Usunięte"

## PODSUMOWANIE

### Kolejność realizacji

```
A: Fundament + Auth  →  B: CRUD Zleceń  →  C: Przypisywanie  →  D: Real-time  →  E: Push
      (8 kroków)          (6 kroków)         (5 kroków)          (5 kroków)       (8 kroków)

Łącznie: 32 kroki
```

### MVP-0 (minimum do testów z userami)

A + B + C = działająca aplikacja

- Logowanie ✓
- CRUD zleceń ✓
- Przypisywanie z historią ✓
- (Trzeba ręcznie F5 żeby zobaczyć zmiany innych)

### Etap krytyczny

Etap A - bez niego nic nie działa

### Etap do pominięcia na start

Etap E (Push) - można dodać później gdy reszta stabilna

## CHECKLIST PRZED STARTEM

- Konto Supabase utworzone
- Node.js zainstalowany (v18+)
- Edytor kodu gotowy (VS Code)
- Przeglądarka Chrome (do testów PWA)
- Drugie urządzenie do testów (telefon lub incognito)