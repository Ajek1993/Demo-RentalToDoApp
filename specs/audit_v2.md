# Audyt Bezpieczeństwa — Plan Naprawczy v2

**Data:** 2026-03-02
**Branch:** DEV
**Źródło:** `specs/audit.md`

---

## Zaakceptowane ryzyka (TAK)

Poniższe punkty zostały świadomie zaakceptowane i **nie wymagają zmian**.
Kontekst: ~15 zaufanych pracowników bez wiedzy technicznej, wewnętrzna aplikacja firmowa.

| # | Punkt | Powód akceptacji |
|---|-------|-----------------|
| 1.4 | React 19.2.4 (CVE nie dotyczy Vite SPA) | Brak RSC/Server Actions |
| 4.2a | Orders: update all `USING (true)` | Celowy mechanizm — wszyscy mogą edytować zlecenia |
| 4.2b | Assignments: insert `WITH CHECK (true)` | Celowe — pełna historia działań użytkowników |
| 4.2c | Assignments: update `USING (true)` | Celowe — kolejkowanie przypisań z historią |
| 4.2d | Profiles: select all | Celowe — mała firma ~15 osób |
| 4.2e | order_edits: delete own | Nie istnieje na produkcji (migracje), artefakt schema-full |
| 4.3 | auth.uid() bez cache | Mała skala, wpływ minimalny |
| 4.4a | SECURITY DEFINER bez `SET search_path` | Zaufani użytkownicy, brak wiedzy technicznej do exploitu |
| 4.4b | delete_kurs_by_order_id() omija RLS | Celowe — soft delete, admin kontroluje permanentne usunięcia |
| 4.6 | Hardcodowane URL Supabase w SQL | Jedno środowisko, zaufani użytkownicy |
| 6.1 | CSV/Excel injection w eksporcie | Dane wewnętrzne firmy |
| 8.1 | Brak frontend guard dla admin views | Backend chroni, zaufani użytkownicy |

---

## Do naprawy (NIE)

### P0 — Krytyczne

#### 4.5 Eskalacja uprawnień — zmiana `role` przez usera
- **Plik:** `supabase/schema-full.sql:145`
- **Problem:** Polityka `Profiles: update own` pozwala UPDATE na całym profilu, w tym kolumnie `role`. Zalogowany user może przez REST API (DevTools) zrobić `UPDATE profiles SET role = 'admin'` — nie wymaga to wiedzy technicznej, wystarczy tutorial/ChatGPT
- **Naprawa:** Dodać `WITH CHECK` blokujący zmianę `role`, lub ograniczyć UPDATE policy do konkretnych kolumn (`name`, `avatar_url`)
- **Rekomendacja:** Jedna linijka SQL — minimalny wysiłek, maksymalna ochrona

---

### P1 — Wysokie

#### 3.1 + 3.2 + 3.3 Content Security Policy
- **Pliki:** `index.html`, brak `vercel.json`/`_headers`
- **Problem:** Brak jakiejkolwiek polityki CSP. Inline script theme detection wymaga nonce/hash
- **Naprawa:**
  - Przenieść inline script z `index.html:5-11` do osobnego pliku `.js`
  - Dodać meta tag CSP do `index.html`:
    ```
    default-src 'self';
    script-src 'self';
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:;
    worker-src 'self';
    ```

#### 4.2f Feedback — brak SELECT dla admina
- **Plik:** `supabase/schema-full.sql:170`
- **Problem:** Tylko INSERT. Admin nie może czytać feedbacku przez RLS
- **Naprawa:** Dodać politykę SELECT dla admina:
  ```sql
  CREATE POLICY "Feedback: admin read" ON feedback
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
  ```

---

### P2 — Średnie

#### 2.2 Sourcemaps — jawna deklaracja
- **Plik:** `vite.config.js`
- **Naprawa:** Dodać `build: { sourcemap: false }` do konfiguracji Vite

#### 2.4 npm audit — minimatch HIGH
- **Naprawa:** `npm audit fix`

#### 1.3 Brak `maxLength` na formularzach
- **Pliki:**
  - `OrderForm.jsx:197-205` — plate → `maxLength={10}`
  - `OrderForm.jsx:296-302` — location → `maxLength={200}`
  - `OrderForm.jsx:377-385` — notes → `maxLength={2000}`
  - `LoginForm.jsx:189-210` — name, password → dodać odpowiednie `maxLength`
  - `FeedbackModal.jsx:41-47` — message → dodać `maxLength` + walidację JS
  - `CompleteProfile.jsx:52-57` — name → dodać `maxLength`

#### 5.3 Walidacja payloadu Edge Function
- **Plik:** `supabase/functions/send-push/index.ts:52`
- **Naprawa:** Dodać walidację typów pól (`title`, `body`, `userId`, `targetRole`) po JSON.parse

#### 9.1 ESLint — plugin security
- **Naprawa:** `npm install -D eslint-plugin-security` + dodać do `eslint.config.js`

#### 9.2 Testy bezpieczeństwa
- **Naprawa:** Dodać testy: autoryzacji (czy non-admin nie widzi admin views), walidacji formularzy (maxLength)

---

## Kolejność implementacji

### Faza 1 — Baza danych (krytyczne)
- Zablokować zmianę `role` w polityce profiles update (P0)
- Dodać politykę SELECT feedback dla admina (P1)

### Faza 2 — Frontend security
- Wdrożyć CSP (meta tag + przeniesienie inline script) (P1)
- Dodać `maxLength` na formularzach (P2)
- Dodać sourcemap: false w vite.config (P2)

### Faza 3 — Tooling i testy
- `npm audit fix` (P2)
- Zainstalować eslint-plugin-security (P2)
- Dodać walidację payloadu Edge Function (P2)
- Dodać testy bezpieczeństwa (P2)

---

## Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Zaakceptowane (TAK) | 12 |
| Do naprawy (NIE) | 11 |
| — P0 Krytyczne | 1 |
| — P1 Wysokie | 2 |
| — P2 Średnie | 8 |
