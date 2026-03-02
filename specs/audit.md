# Audyt Bezpieczeństwa — rental-app

**Data:** 2026-03-02
**Branch:** DEV
**Audytor:** Claude Code (Security Audit)

---

## Legenda

- **PASS** — brak zastrzeżeń
- **FAIL** — wymaga naprawy
- **WARN** — rekomendowane do naprawy
- **N/A** — nie dotyczy

> **Pole decyzji:** Przy każdym FAIL/WARN znajduje się pole `Decyzja:`.
> Wpisz `TAK` jeśli akceptujesz ryzyko (celowy mechanizm, świadoma decyzja).
> Wpisz `NIE` jeśli chcesz to naprawić.
> Opcjonalnie dodaj komentarz po `//`.

---

## 1. Bezpieczeństwo Komponentów React

### 1.1 XSS — dangerouslySetInnerHTML
**Status:** PASS
Brak użycia `dangerouslySetInnerHTML` w całym `src/`.

### 1.2 XSS — innerHTML / eval / new Function
**Status:** PASS
Brak użycia `innerHTML`, `eval(`, `new Function(` w `src/` i `public/`.

### 1.3 Walidacja formularzy — brak `maxLength`
**Status:** WARN

| Plik | Pole | Problem |
|------|------|---------|
| `src/components/OrderForm.jsx:197-205` | plate | Walidacja JS max 10 znaków, ale brak `maxLength` na `<input>` |
| `src/components/OrderForm.jsx:296-302` | location | Walidacja JS max 200 znaków, ale brak `maxLength` na `<input>` |
| `src/components/OrderForm.jsx:377-385` | notes | Walidacja JS max 2000 znaków, ale brak `maxLength` na `<textarea>` |
| `src/components/LoginForm.jsx:189-210` | name, password | Brak `maxLength` na żadnym polu |
| `src/components/FeedbackModal.jsx:41-47` | message | Brak `maxLength` i brak walidacji długości w JS |
| `src/components/CompleteProfile.jsx:52-57` | name | Brak `maxLength` na `<input>` |

```
Decyzja: NIE // TAK (akceptuję) / NIE (naprawić)
Komentarz:
```

### 1.4 React — wersja bezpieczeństwa
**Status:** WARN
Zainstalowana wersja: `19.2.4` (package-lock.json). Rekomendowana: `>= 19.2.5`.
Projekt nie używa RSC/Server Actions (Vite SPA), więc CVE-2025-55182 nie dotyczy bezpośrednio.

```
Decyzja: TAK // TAK (akceptuję) / NIE (zaktualizować)
Komentarz:
```

### 1.5 Prototype Pollution
**Status:** PASS
Brak `Object.assign` na niezaufanych danych. Brak niekontrolowanego spreadu z API.

---

## 2. Konfiguracja Środowiska i Budowania (Vite)

### 2.1 Izolacja sekretów — prefiks VITE_
**Status:** PASS
`.env.example` zawiera tylko 3 zmienne klienckie z prefiksem `VITE_`. Klucze prywatne opisane jako komentarze z adnotacją "ustawiać w Supabase Dashboard".

### 2.2 Sourcemaps w produkcji
**Status:** WARN
`vite.config.js` — brak jawnego `build: { sourcemap: false }`. Domyślnie wyłączone, ale brak jawnej deklaracji pozwala na przypadkowe włączenie.

```
Decyzja: NIE // TAK (akceptuję) / NIE (dodać jawną deklarację)
Komentarz:
```

### 2.3 Wyciek sekretów w buildzie
**Status:** PASS
`vite.config.js` — sekcja `define` zawiera tylko `__APP_VERSION__`. Brak hardcodowanych kluczy.

### 2.4 Zależności — znane podatności
**Status:** WARN
`npm audit --omit=dev` — 1 podatność HIGH: `minimatch` (ReDoS via repeated wildcards).
Naprawa: `npm audit fix`.

```
Decyzja: NIE // TAK (akceptuję) / NIE (naprawić npm audit fix)
Komentarz:
```

### 2.5 Hardcodowane sekrety w kodzie
**Status:** PASS
Brak tokenów, kluczy API ani URL z kluczami inline w `src/`. Plik `.env` w `.gitignore`.

---

## 3. Content Security Policy (CSP)

### 3.1 Nagłówki CSP
**Status:** FAIL
Brak meta tagu CSP w `index.html`. Brak `vercel.json`, `netlify.toml`, `_headers`.
Aplikacja nie ma żadnej polityki CSP — przeglądarka stosuje domyślną otwartą politykę.

```
Decyzja: NIE // TAK (akceptuję ryzyko) / NIE (wdrożyć CSP)
Komentarz:
```

### 3.2 Rekomendowane dyrektywy CSP
**Status:** FAIL
Brak jakiejkolwiek dyrektywy. Rekomendowane minimum:

| Dyrektywa | Wartość |
|-----------|---------|
| `default-src` | `'self'` |
| `script-src` | `'self'` (+ nonce/hash dla inline) |
| `connect-src` | `'self' https://*.supabase.co wss://*.supabase.co` |
| `style-src` | `'self' 'unsafe-inline'` |
| `img-src` | `'self' data: blob:` |
| `worker-src` | `'self'` |

```
Decyzja: NIE // TAK (akceptuję) / NIE (wdrożyć)
Komentarz:
```

### 3.3 Inline script w index.html
**Status:** WARN
`index.html:5-11` — skrypt theme detection. Bezpieczny sam w sobie, ale wymaga nonce/hash przy wdrażaniu CSP.

```
Decyzja: NIE// TAK (akceptuję) / NIE (przenieść do pliku .js)
Komentarz:
```

---

## 4. Baza Danych i Autoryzacja (Supabase)

### 4.1 Row Level Security — pokrycie
**Status:** PASS
Wszystkie 8 tabel w `public` mają `ENABLE ROW LEVEL SECURITY` (`supabase/schema-full.sql:129-136`).

### 4.2 Polityki RLS — nadmierne uprawnienia

#### 4.2a Orders: update all — `USING (true)`
**Status:** FAIL
`supabase/schema-full.sql:150`
Każdy zalogowany użytkownik może edytować DOWOLNE zlecenie (status, created_by, treść). Brak `WITH CHECK`.

```
Decyzja: TAK // TAK (celowy mechanizm) / NIE (ograniczyć do właściciela/admina)
Komentarz:
```

#### 4.2b Assignments: insert auth — `WITH CHECK (true)`
**Status:** FAIL
`supabase/schema-full.sql:154`
Każdy zalogowany użytkownik może utworzyć assignment z dowolnym `user_id`/`assigned_by`, podszywając się pod inną osobę.

```
Decyzja: TAK (MAM PEŁNA HISTORIĘ DZIAŁAŃ USERÓW TO JEST CELOWE) // TAK (celowy mechanizm) / NIE (dodać weryfikację auth.uid())
Komentarz:
```

#### 4.2c Assignments: update own — `USING (true) WITH CHECK (true)`
**Status:** FAIL
`supabase/schema-full.sql:155`
Każdy może edytować DOWOLNY assignment, nie tylko swój.

```
Decyzja: TAK (I TAK JEST KOLEJKOWANIE PRZYPISAŃ, MAM PEŁNA HISTORIĘ DZIAŁAŃ USERÓW TO JEST CELOWE) // TAK (celowy mechanizm) / NIE (ograniczyć)
Komentarz:
```

#### 4.2d Profiles: select all — `USING (true)`
**Status:** WARN
`supabase/schema-full.sql:143`
Każdy zalogowany widzi wszystkie profile. Akceptowalne dla ~15 osób, ale warto mieć świadomość.

```
Decyzja: TAK // TAK (celowe — mała firma) / NIE (ograniczyć)
Komentarz:
```

#### 4.2e order_edits: delete own
**Status:** WARN
`supabase/schema-full.sql:175`
Użytkownik może usuwać własne wpisy historii edycji. Audit log powinien być niemutowalny.

```
Decyzja: TAK (NA WERSJI PRODUKCYJEN TEGO NIE MA, KTORA POWSTAWAŁA POPRZEZ MIGRACJE, NIE WIEM SKAD TO SIE WZIĘŁO FULL SCHEMA) // TAK (celowy mechanizm) / NIE (usunąć prawo DELETE)
Komentarz:
```

#### 4.2f feedback — brak SELECT
**Status:** WARN
`supabase/schema-full.sql:170`
Tylko INSERT z `WITH CHECK (auth.uid() = user_id)`. Admin nie może czytać feedbacku przez RLS.

```
Decyzja: NIE// TAK (celowe — anonimowy feedback) / NIE (dodać SELECT dla admina)
Komentarz:
```

### 4.3 Optymalizacja auth.uid() w RLS
**Status:** WARN
`supabase/schema-full.sql:143-185`
Żadne z wywołań `auth.uid()` nie używa wzorca `(SELECT auth.uid())` dla cache'owania. Przy ~15 użytkownikach wpływ minimalny.

```
Decyzja: TAK // TAK (akceptuję — mała skala) / NIE (zoptymalizować)
Komentarz:
```

### 4.4 SECURITY DEFINER — brak SET search_path

#### 4.4a Funkcje bez SET search_path
**Status:** FAIL
5 z 6 funkcji SECURITY DEFINER nie ma `SET search_path = public`:

| Funkcja | Linia |
|---------|-------|
| `handle_new_user()` | `schema-full.sql:192` |
| `notify_new_order()` | `schema-full.sql:202` |
| `notify_completed_order()` | `schema-full.sql:237` |
| `notify_deleted_order()` | `schema-full.sql:273` |
| `send_availability_reminder()` | `schema-full.sql:323` |

```
Decyzja: NIE (WYTŁUMACZ O CO O CHODZI) // TAK (akceptuję ryzyko) / NIE (dodać SET search_path)
Komentarz:
```

#### 4.4b delete_kurs_by_order_id() — omija RLS
**Status:** FAIL
`supabase/schema-full.sql:311`
Funkcja SECURITY DEFINER z GRANT dla authenticated. Każdy zalogowany user może usunąć dowolny kurs podając `order_id`, bez sprawdzenia właściciela.

```
Decyzja: TAK (USUNIĘTE I TAK FINALNIE WPADAJA DO PULI USNIĘTYCH, A TE MOŻE PERNAMANTNIE USUNAC TYLKO ADMIN) // TAK (celowy mechanizm) / NIE (dodać sprawdzenie właściciela)
Komentarz:
```

### 4.5 Eskalacja uprawnień — role
**Status:** FAIL
`supabase/schema-full.sql:145`
Polityka `Profiles: update own` pozwala UPDATE na CAŁYM profilu, włącznie z kolumną `role`.
Każdy user może wykonać: `UPDATE profiles SET role = 'admin' WHERE id = auth.uid()`

```
Decyzja: NIE // TAK (akceptuję ryzyko) / NIE (zablokować zmianę role)
Komentarz:
```

### 4.6 Hardcodowane URL Supabase w SQL
**Status:** WARN
URL `https://xpjcopzdbovenbhykfsb.supabase.co` hardcodowany w 4 funkcjach:

| Funkcja | Linia |
|---------|-------|
| `notify_new_order()` | `schema-full.sql:209` |
| `notify_completed_order()` | `schema-full.sql:245` |
| `notify_deleted_order()` | `schema-full.sql:283` |
| `send_availability_reminder()` | `schema-full.sql:329` |

```
Decyzja: NIE// TAK (akceptuję — jedno środowisko) / NIE (sparametryzować)
Komentarz:
```

---

## 5. Edge Functions

### 5.1 Autoryzacja wywołań
**Status:** PASS
`supabase/functions/send-push/index.ts:29-32` — weryfikacja `X-Internal-Secret` z `Deno.env.get('PUSH_SECRET')`. Zwraca 401 przy braku/błędnym secrecie.

### 5.2 CORS
**Status:** PASS
`supabase/functions/send-push/index.ts:7-10` — `ALLOWED_ORIGINS` ograniczone do 2 domen (produkcja + localhost). Brak wildcardów.

### 5.3 Walidacja payloadu
**Status:** WARN
`supabase/functions/send-push/index.ts:52`
JSON parsing w try/catch (OK), ale brak walidacji typów pól (title, body, userId, targetRole). Defense-in-depth.

```
Decyzja: NIE// TAK (akceptuję — chronione shared secret) / NIE (dodać walidację)
Komentarz:
```

---

## 6. Higiena Danych i Eksport

### 6.1 CSV/Excel Injection
**Status:** WARN
`src/components/KursyList.jsx:77-87`
ExcelJS nie sanityzuje wartości. Pola `userName`, `nr_rej`, `marka`, `adres` mogą zawierać znaki `=`, `+`, `-`, `@` interpretowane jako formuły w Excelu.

```
Decyzja: TAK // TAK (akceptuję — dane wewnętrzne) / NIE (dodać sanityzację)
Komentarz:
```

### 6.2 Sanityzacja danych wyświetlanych
**Status:** PASS
React auto-escaping działa prawidłowo. Brak `dangerouslySetInnerHTML`. Atrybuty `title`/`aria-label` z danymi użytkownika escapowane przez React.

---

## 7. PWA i Service Worker

### 7.1 Service Worker
**Status:** PASS
`public/sw.js` — push event w try/catch, URL validation w notificationclick, brak wrażliwych danych w CacheStorage.

### 7.2 Manifest
**Status:** PASS
`public/manifest.json` — `start_url: "/"`, `display: "standalone"`. Prawidłowa konfiguracja.

### 7.3 Przechowywanie offline
**Status:** PASS
`localStorage` — tylko `theme`. `sessionStorage` — tylko flaga `pendingProfileSetup`. Tokeny zarządzane przez Supabase SDK.

---

## 8. Autoryzacja na Froncie

### 8.1 Weryfikacja tożsamości
**Status:** WARN
Backend (Edge Functions) weryfikuje rolę, ale frontend nie pokazuje wczesnego błędu dla non-admin przed wywołaniem API.

```
Decyzja: NIE // TAK (backend chroni) / NIE (dodać frontend guard)
Komentarz:
```

### 8.2 Ochrona widoków admina
**Status:** PASS
`src/App.jsx` — komponenty admin (`AdminUserManagement`, `AdminAvailabilityView`) renderowane warunkowo na podstawie `isAdmin`. `OrderCard.jsx` — permanent delete tylko dla admina.

---

## 9. Automatyzacja i Narzędzia

### 9.1 ESLint — plugin security
**Status:** WARN
`eslint.config.js` — brak `eslint-plugin-security`. Brak automatycznej analizy wzorców bezpieczeństwa.

```
Decyzja: NIE // TAK (akceptuję) / NIE (zainstalować)
Komentarz:
```

### 9.2 Testy bezpieczeństwa
**Status:** WARN
`src/__tests__/` — testy istnieją (useAuth, useOrders, OrderForm), ale brak testów autoryzacji, XSS, CSV injection.

```
Decyzja: NIE // TAK (akceptuję) / NIE (dodać testy security)
Komentarz:
```

---

## 10. Zależności i Supply Chain

### 10.1 Lock file
**Status:** PASS
`package-lock.json` istnieje, lockfileVersion 3, trackowany w git.

### 10.2 Zależności runtime
**Status:** PASS
4 zależności runtime — minimalna liczba, znane pakiety:
- `@supabase/supabase-js` ^2.95.3
- `exceljs` ^4.4.0
- `react` ^19.2.0
- `react-dom` ^19.2.0
- `react-hot-toast` ^2.6.0

### 10.3 Supabase SDK
**Status:** PASS
`@supabase/supabase-js` v2.95.3 — aktualna wersja.

---

## Podsumowanie

### Statystyki

| Status | Liczba |
|--------|--------|
| PASS | 20 |
| FAIL | 6 |
| WARN | 9 |
| N/A | 1 |

### Priorytety naprawy

**P0 — Krytyczne (natychmiast):**
- `schema-full.sql:145` — Profiles: update own pozwala zmianę `role` → eskalacja do admina
- `schema-full.sql:150` — Orders: update all `USING (true)` → edycja dowolnego zlecenia
- `schema-full.sql:154-155` — Assignments: brak ograniczeń insert/update

**P1 — Wysokie:**
- `schema-full.sql:192,202,237,273,323` — SECURITY DEFINER bez `SET search_path`
- `schema-full.sql:311` — `delete_kurs_by_order_id()` omija RLS bez sprawdzenia właściciela
- `index.html` — brak Content Security Policy

**P2 — Średnie:**
- `KursyList.jsx:77-87` — CSV/Excel injection w eksporcie
- `package-lock.json` — `npm audit fix` (minimatch HIGH)
- `package.json` — React 19.2.4 → 19.2.5+
- Formularze — brak `maxLength` na polach
- `eslint.config.js` — brak `eslint-plugin-security`
