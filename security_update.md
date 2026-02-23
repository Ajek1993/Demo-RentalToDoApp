# Security Update Plan

## Krok 1 — Weryfikacja historii git (przed jakimikolwiek zmianami)

Sprawdź czy wrażliwe dane trafiły kiedykolwiek do historii git:

```bash
# Sprawdź czy klucze Supabase były w historii
git log --all -S "eyJhbGciO"

# Sprawdź czy dist/ był śledzony
git ls-files dist/

# Sprawdź katalog .temp
git log --all --oneline -- supabase/.temp/
```

Jeśli którekolwiek z powyższych zwróci wynik — zregeneruj klucze w Supabase Dashboard (Settings → API) **zanim** przejdziesz dalej.

---

## Krok 2 — Naprawa krytycznych podatności RLS

### HIGH-1: `Orders: update all` — każdy może edytować zlecenia innych

- Plik: `supabase/migrations/supabase-schema.sql:57`
- Problem: `using (true)` — brak weryfikacji właściciela

Poprawka:
```sql
create policy "Orders: update all" on public.orders
  for update using (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### HIGH-2: `Assignments: update own` — `OR true` anuluje całą politykę

- Plik: `supabase/migrations/002_add_unassigned_at.sql:19-20`
- Problem: `USING (user_id = auth.uid() OR true)` — warunek zawsze prawdziwy

Poprawka:
```sql
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);
```

### HIGH-3: `Assignments: insert auth` — każdy może przypisać kogokolwiek

- Plik: `supabase/migrations/supabase-schema.sql:60`
- Problem: `with check (true)` — brak weryfikacji `user_id`

Poprawka:
```sql
create policy "Assignments: insert auth" on public.assignments
  for insert with check (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## Krok 3 — Zabezpieczenie Edge Function `send-push`

- Plik: `supabase/functions/send-push/index.ts:8-11`
- Problem: CORS `*` i brak autoryzacji — każdy może wysłać push do wszystkich użytkowników

Kroki:
- Ogranicz `Access-Control-Allow-Origin` do domeny produkcyjnej
- Dodaj weryfikację JWT lub shared secret przy każdym wywołaniu
- Rozważ wywołanie funkcji tylko z triggerów bazy danych (nie bezpośrednio z zewnątrz)

---

## Krok 4 — Poprawki `.gitignore`

- Plik: `.gitignore:17-18`
- Problem: `.env.production`, `.env.staging` nie są chronione

Dodaj do `.gitignore`:
```
.env.*
!.env.example
*.pem
*.key
secrets/
```

---

## Krok 5 — Usunięcie debug logów z produkcji

- Plik: `src/hooks/useOrders.js:69`
- Problem: `console.log('🔥 EVENT PRZYSZEDŁ:', payload.eventType, payload.new)` — loguje dane użytkowników

Usuń lub ogranicz wszystkie `console.log` z danymi użytkowników. Zamień `console.error` na logging do zewnętrznego serwisu (np. Sentry) bez eksponowania szczegółów błędów w UI.

Miejsca do sprawdzenia:
- `src/hooks/useOrders.js:37,69,227,257,297`
- `src/hooks/useAuth.js:51,96`
- `src/components/FeedbackModal.jsx:24`

---

## Krok 6 — Walidacja formularzy (maxLength)

- Plik: `src/components/OrderForm.jsx:37-55`
- Problem: brak limitu długości pól — można wstawić megabajtowe stringi do bazy

Dodaj walidację w JS i constrainty w SQL:
```javascript
// OrderForm.jsx — w funkcji validate()
if (plate.length > 10) return 'Numer rejestracyjny jest za długi'
if (location.length > 200) return 'Lokalizacja jest za długa'
if (notes.length > 2000) return 'Uwagi są za długie'
```

```sql
ALTER TABLE orders ADD CONSTRAINT notes_length CHECK (char_length(notes) <= 2000);
ALTER TABLE orders ADD CONSTRAINT location_length CHECK (char_length(location) <= 200);
```

---

## Krok 7 — Zabezpieczenia opcjonalne (niski priorytet)

### Wyłączenie publicznej rejestracji
Jeśli aplikacja jest wewnętrzna (zamknięty zespół) — wyłącz rejestrację w Supabase Dashboard:
`Authentication → Settings → Disable signups`

### Minimalna długość hasła
- Plik: `src/App.jsx:122`
- Zwiększ z 6 do minimum 8 znaków
- Zmień też w Supabase Dashboard: `Authentication → Settings → Minimum password length`

### Content Security Policy
Dodaj CSP headers przez serwer lub `vercel.json` (jeśli deploy na Vercel).

### Rate limiting
Rozważ CAPTCHA lub throttling dla formularza logowania i feedbacku.

---

## Status

- [x] Krok 1 — Weryfikacja historii git
- [x] Krok 2 — Naprawa RLS (HIGH-1, HIGH-2, HIGH-3)
- [x] Krok 3 — Zabezpieczenie Edge Function send-push
- [x] Krok 4 — Poprawki .gitignore
- [x] Krok 5 — Usunięcie debug logów
- [x] Krok 6 — Walidacja formularzy (maxLength)
- [ ] Krok 7 — Opcjonalne zabezpieczenia
