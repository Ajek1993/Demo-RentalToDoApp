# Instrukcje Wdrożenia PWA i Push Notifications

## Status Implementacji

✅ Wszystkie pliki kodu zostały utworzone:
- `public/manifest.json` - konfiguracja PWA
- `public/sw.js` - Service Worker
- `public/icon-192.png`, `public/icon-512.png` - ikony aplikacji
- `src/hooks/usePushNotifications.js` - hook do obsługi push notifications
- `supabase/functions/send-push/index.ts` - Edge Function do wysyłania powiadomień
- `supabase/migrations/003_push_notifications.sql` - triggery bazy danych

## Kroki Do Wykonania

### 1. Konfiguracja VAPID Keys w Supabase

Otwórz plik `VAPID_SETUP.md` i postępuj zgodnie z instrukcjami, aby dodać klucze VAPID do Supabase.

Krótko:
1. Wejdź na [Supabase Dashboard](https://app.supabase.com)
2. Przejdź do **Settings** → **Edge Functions** → **Secrets**
3. Dodaj 3 sekrety:
   - `VAPID_PRIVATE_KEY`
   - `VAPID_PUBLIC_KEY`
   - `VAPID_EMAIL`

### 2. Wykonaj Migrację Bazy Danych

Wykonaj plik `supabase/migrations/003_push_notifications.sql` w Supabase SQL Editor:

1. Wejdź na [Supabase Dashboard](https://app.supabase.com)
2. Przejdź do **SQL Editor**
3. Otwórz plik `003_push_notifications.sql`
4. Skopiuj całą zawartość
5. Wklej do SQL Editor i kliknij **Run**

**WAŻNE:** W migracji zmień URL projektu:
```sql
v_service_url := 'https://xpjcopzdbovenbhykfsb.supabase.co';
```
Na właściwy URL Twojego projektu (jeśli jest inny).

### 3. Wdróż Edge Function

Musisz wdrożyć Edge Function `send-push` do Supabase.

#### Opcja A: Przez Supabase Dashboard

1. Wejdź na [Supabase Dashboard](https://app.supabase.com)
2. Przejdź do **Edge Functions**
3. Kliknij **Deploy new function**
4. Nazwa: `send-push`
5. Skopiuj zawartość `supabase/functions/send-push/index.ts`
6. Wklej do edytora i kliknij **Deploy**

#### Opcja B: Przez Supabase CLI (zalecane)

Zainstaluj Supabase CLI:
```bash
# Windows (Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# macOS (Homebrew)
brew install supabase/tap/supabase

# Linux
brew install supabase/tap/supabase
```

Następnie wdróż funkcję:
```bash
# Zaloguj się do Supabase
npx supabase login

# Połącz z projektem
npx supabase link --project-ref xpjcopzdbovenbhykfsb

# Wdróż funkcję
npx supabase functions deploy send-push
```

### 4. Zweryfikuj Konfigurację

#### Sprawdź Edge Function:

1. Przejdź do **Edge Functions** w Supabase Dashboard
2. Znajdź funkcję `send-push`
3. Kliknij **Invoke** i przetestuj z body:
```json
{
  "title": "Test",
  "body": "To jest test",
  "url": "/"
}
```

#### Sprawdź Triggery:

1. Przejdź do **SQL Editor**
2. Wykonaj:
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE '%order%';
```
Powinieneś zobaczyć triggery: `on_new_order`, `on_order_completed`, `on_assignment_created`

### 5. Testowanie Lokalnie

Uruchom aplikację:
```bash
npm run dev
```

1. Otwórz aplikację w przeglądarce
2. Zaloguj się
3. Po 2 sekundach pojawi się prośba o zgodę na powiadomienia - **Zezwól**
4. Sprawdź w konsoli przeglądarki, czy Service Worker został zarejestrowany:
```javascript
navigator.serviceWorker.getRegistration().then(reg => console.log(reg))
```

5. Sprawdź w Supabase Dashboard → **Table Editor** → `push_subscriptions` czy subskrypcja została zapisana

### 6. Testowanie Push Notifications

#### Test 1: Nowe Zlecenie

1. Otwórz aplikację w 2 oknach (2 różni użytkownicy)
2. User A: Dodaj nowe zlecenie
3. User B: Powinien otrzymać push notification "Nowe zlecenie: [plate]"

#### Test 2: Zakończenie Zlecenia

1. User A: Zakończ zlecenie
2. User B: Powinien otrzymać push "Zlecenie zakończone: [plate]"

#### Test 3: Przypisanie

1. User A: Przypisz się do zlecenia
2. User B: Powinien otrzymać push "[name] przypisał się do zlecenia [plate]"

#### Test 4: Push z Zamkniętą Przeglądarką

1. Zamknij przeglądarkę całkowicie (nie tylko kartę!)
2. Na innym urządzeniu: dodaj nowe zlecenie
3. Zamknięte urządzenie: Powiadomienie powinno pojawić się w systemie
4. Kliknij powiadomienie: Aplikacja się otworzy

### 7. Instalacja PWA na Telefonie

#### Android (Chrome):

1. Otwórz aplikację w Chrome
2. Kliknij **Menu** (⋮) → **Dodaj do ekranu głównego**
3. Aplikacja zainstaluje się jako natywna aplikacja

#### iOS (Safari):

1. Otwórz aplikację w Safari
2. Kliknij **Share** (□↑) → **Dodaj do ekranu głównego**
3. Aplikacja zainstaluje się jako natywna aplikacja

**UWAGA:** iOS wymaga HTTPS (nie działa na localhost). Wdróż do Vercel/Netlify najpierw.

### 8. Wdrożenie Produkcyjne

#### Wdróż Frontend do Vercel:

```bash
# Zainstaluj Vercel CLI
npm i -g vercel

# Wdróż
vercel

# Production deployment
vercel --prod
```

Lub przez GitHub:
1. Push do GitHub
2. Połącz repozytorium z Vercel
3. Automatyczne wdrożenie

#### Skonfiguruj zmienne środowiskowe w Vercel:

1. Wejdź na dashboard.vercel.com
2. Wybierz projekt
3. **Settings** → **Environment Variables**
4. Dodaj:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_VAPID_PUBLIC_KEY`

## Rozwiązywanie Problemów

### Push nie działa

1. **Sprawdź VAPID keys:**
   - Czy są ustawione w Supabase Secrets?
   - Czy public key jest w `.env`?

2. **Sprawdź Service Worker:**
   ```javascript
   // W konsoli przeglądarki
   navigator.serviceWorker.getRegistration().then(reg => {
     if (!reg) console.error('SW not registered')
     else console.log('SW active:', reg.active)
   })
   ```

3. **Sprawdź subskrypcję:**
   - Czy jest zapisana w tabeli `push_subscriptions`?
   - Czy `endpoint`, `p256dh`, `auth` nie są puste?

4. **Sprawdź Edge Function:**
   - Czy jest wdrożona?
   - Czy logi pokazują błędy? (Supabase Dashboard → Edge Functions → Logs)

5. **Sprawdź triggery:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname IN ('on_new_order', 'on_order_completed', 'on_assignment_created');
   ```

### Service Worker nie rejestruje się

1. **Sprawdź HTTPS:**
   - Service Workers wymagają HTTPS (wyjątek: localhost)
   - W production użyj Vercel/Netlify

2. **Sprawdź ścieżkę:**
   - SW musi być w `/public/sw.js`
   - Rejestracja: `navigator.serviceWorker.register('/sw.js')`

3. **Sprawdź CORS:**
   - Edge Function musi zwracać prawidłowe CORS headers

### Powiadomienia nie pojawiają się

1. **Sprawdź uprawnienia:**
   ```javascript
   console.log('Permission:', Notification.permission)
   ```
   Powinno być `'granted'`

2. **Sprawdź czy przeglądarka wspiera push:**
   - Chrome: ✅
   - Firefox: ✅
   - Edge: ✅
   - Safari: ⚠️ tylko od iOS 16.4+

3. **iOS Safari:**
   - Wymaga instalacji jako PWA (nie działa w przeglądarce)
   - Wymaga HTTPS
   - Nie działa w trybie prywatnym

## Gotowe!

Aplikacja powinna teraz działać jako PWA z push notifications. Użytkownicy mogą:
- Instalować aplikację na ekranie głównym
- Otrzymywać powiadomienia nawet gdy aplikacja jest zamknięta
- Pracować offline (bazowe funkcje)

W razie problemów, sprawdź logi w:
- Konsoli przeglądarki (F12)
- Supabase Dashboard → Edge Functions → Logs
- Supabase Dashboard → SQL Editor (triggery)
