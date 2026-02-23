# Integracja abacus-kursy-app z rental-app

## Kontekst

Dwie istniejące aplikacje:
- **rental-app** — główna aplikacja (React + Vite + Supabase Auth, projekt `xpjcopzdbovenbhykfsb`)
- **abacus-kursy-app** (`C:\Users\ajek1\Desktop\abacus-kursy-app`) — aplikacja do śledzenia kursów kierowców (Next.js + PIN auth)

Cel: wbudować funkcjonalność kursów bezpośrednio do rental-app jako nowa zakładka „Kursy" w tym samym pasku nawigacji. Zalogowany użytkownik jest automatycznie przypisany do swoich kursów — bez osobnego logowania.

Baza danych: ta sama instancja Supabase (`xpjcopzdbovenbhykfsb`), nowa tabela `kursy`.

---

## Etap 1: Baza danych (Supabase)

Uruchomić ręcznie w **Supabase SQL Editor** (projekt `xpjcopzdbovenbhykfsb`):

```sql
CREATE TABLE kursy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  nr_rej TEXT NOT NULL,
  marka TEXT NOT NULL,
  adres TEXT NOT NULL,
  kwota NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE kursy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own kursy" ON kursy
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

> Kolumna `user_id` (UUID) zastępuje `login` (text) z oryginalnej aplikacji — dopasowanie do Supabase Auth. RLS zapewnia, że każdy użytkownik widzi tylko swoje kursy.

---

## Etap 2: Przygotowanie projektu

```bash
# W katalogu rental-app:
npm install exceljs
```

Skopiować plik szablonu:
```
abacus-kursy-app/public/szablon.xlsx  →  rental-app/public/szablon.xlsx
```

---

## Etap 3: Nowe pliki

### `src/lib/periods.js`
Skopiować bezpośrednio z `abacus-kursy-app/lib/periods.js` bez zmian.
Zawiera: `getPeriods(monthsBack)` i `filterByPeriod(kursy, start, end)`.

---

### `src/components/KursyList.jsx`
Zaadaptowany z `abacus-kursy-app/components/KursyList.jsx`.

**Kluczowe zmiany względem oryginału:**
- `fetch('/api/kursy')` → bezpośrednie wywołania Supabase client (`import { supabase } from '../lib/supabase'`)
- Props: `currentUser` (Supabase Auth user z `id`) + `profile` (obiekt z `name`)
- `login` → `user_id = currentUser.id`
- Export XLS: zamiast server-side `path.join` + `readFile`:
  - `fetch('/szablon.xlsx')` → `arrayBuffer()` → `ExcelJS.Workbook().xlsx.load(buffer)`
  - Nazwa użytkownika z `profile.name`
- Supabase query dla fetch kursów: `.from('kursy').select('*').eq('user_id', currentUser.id).order('data', { ascending: false })`

---

### `src/components/KursForm.jsx`
Zaadaptowany z `abacus-kursy-app/components/KursForm.jsx`.

**Kluczowe zmiany:**
- `fetch('/api/kursy', { method: 'POST' })` → `supabase.from('kursy').insert({ ...fields, user_id: currentUser.id })`
- `fetch('/api/kursy', { method: 'PUT' })` → `supabase.from('kursy').update(fields).eq('id', initialValues.id)`
- Props: `currentUser` zamiast `user` (string login)

---

### `src/components/KursItem.jsx`
Zaadaptowany z `abacus-kursy-app/components/KursItem.jsx`.

**Kluczowe zmiany:**
- `fetch('/api/kursy', { method: 'DELETE' })` → `supabase.from('kursy').delete().eq('id', kurs.id)`
- `window.confirm` → zachowane (lub opcjonalnie modal w stylu aplikacji)

---

## Etap 4: Style

Dodać na końcu `src/index.css` zawartość:
- `abacus-kursy-app/styles/KursyList.css`
- `abacus-kursy-app/styles/KursForm.css`

CSS używa tych samych zmiennych CSS (`--primary`, `--input-bg`, `--border`, itd.) co rental-app — działa bez zmian.

Jedyna korekta: w `.kursy-panel` usunąć `margin: 40px auto` — zakładka ma już własny kontener z paddingiem.

---

## Etap 5: Modyfikacje istniejących plików

### `src/App.jsx`
Przekazać `profile` do komponentu `OrderList`:

```jsx
// PRZED:
<OrderList currentUser={user} isAdmin={isAdmin} />

// PO:
<OrderList currentUser={user} isAdmin={isAdmin} profile={profile} />
```

`profile` jest już dostępny z `useAuth()` w `App.jsx`.

---

### `src/components/OrderList.jsx`

**Zmiana 1** — destrukturyzacja propsów:
```jsx
// PRZED:
export function OrderList({ currentUser, isAdmin }) {

// PO:
export function OrderList({ currentUser, isAdmin, profile }) {
```

**Zmiana 2** — nowa zakładka w `.tabs`:
```jsx
<button
  className={`tab ${activeTab === 'kursy' ? 'active' : ''}`}
  onClick={() => setActiveTab('kursy')}
>
  Kursy
</button>
```

**Zmiana 3** — warunkowe renderowanie:
Gdy `activeTab === 'kursy'`:
- zamiast toolbar, orders content i FAB → renderować `<KursyList currentUser={currentUser} profile={profile} />`
- ukryć search/filter toolbar i przycisk FAB (+)

Logika: owinąć toolbar i FAB warunkiem `activeTab !== 'kursy'`, a przed `orders-container` dodać:
```jsx
{activeTab === 'kursy' ? (
  <KursyList currentUser={currentUser} profile={profile} />
) : (
  // dotychczasowa zawartość orders
)}
```

---

---

## Etap 6: Rozszerzona logika kursów

### Kolejkowanie kierowców na kurs

Kurs może mieć wielu przypisanych kierowców (kolejka). Nowa tabela:

```sql
CREATE TABLE kursy_przypisania (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kurs_id UUID NOT NULL REFERENCES kursy(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pozycja INT NOT NULL,  -- kolejność w kolejce (1 = pierwszy)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kurs_id, user_id),
  UNIQUE(kurs_id, pozycja)
);
```

### Zamknięcie kursu → przypisanie do pierwszego kierowcy

Gdy kurs zostaje zamknięty:
- System pobiera kierowcę z `pozycja = 1` z tabeli `kursy_przypisania`
- Kurs zostaje finalnie przypisany do tego kierowcy (kolumna `wykonawca_id` w tabeli `kursy`)
- Kurs trafia do "Moje kursy" tego kierowcy

Dodać kolumnę do tabeli `kursy`:
```sql
ALTER TABLE kursy ADD COLUMN wykonawca_id UUID REFERENCES auth.users(id);
ALTER TABLE kursy ADD COLUMN status TEXT DEFAULT 'otwarty' CHECK (status IN ('otwarty', 'zamkniety'));
```

### Wypisanie się kierowcy z kursu

Gdy kierowca wypisuje się z kursu:
- Usunięcie z `kursy_przypisania`
- Jeśli kurs był już zamknięty i `wykonawca_id` = ten kierowca:
  - System przypisuje kurs do kolejnego kierowcy w kolejce (`pozycja = 2`, teraz staje się `1`)
  - Jeśli kolejka pusta → `wykonawca_id = NULL`, kurs nie trafia do niczyich "Moje kursy"

### Dwuetapowe potwierdzenie

Dla akcji krytycznych (wypisanie się, zakończenie kursu) wymagane dwuetapowe potwierdzenie:
- Kliknięcie przycisku → pojawia się modal z pytaniem "Czy na pewno?"
- Dopiero po potwierdzeniu → wykonanie akcji

Analogicznie jak przy usuwaniu kursu, ale zamiast `window.confirm` → dedykowany modal w stylu aplikacji.

---

## Etap 7: Dyspozycyjność kierowców

> Tabela `dyspozycyjnosc` już istnieje i działa. Nie trzeba tworzyć nowych tabel.

### Menu nawigacji — różne widoki

**Dla zwykłego użytkownika (kierowcy):**
- "Moja dyspozycyjność" — istniejąca funkcjonalność, bez zmian

**Dla admina:**
- "Dyspozycyjność" — dedykowany widok wykorzystujący te same dane co przy dodawaniu zlecenia
- Po wybraniu daty/zakresu → pokazują się dostępni kierowcy
- Wykorzystuje istniejącą logikę pobierania dostępności (ta sama co w formularzu dodawania zlecenia)

---

## Etap 8: Menu "Moje kursy" (Beta)

### Nowa pozycja w menu

Dodać do nawigacji dla wszystkich użytkowników (user i admin):
- "Moje kursy" z oznaczeniem **(Beta)**
- Wyświetla kursy gdzie `wykonawca_id = auth.uid()` i `status = 'zamkniety'`

### Oznaczenie Beta

W menu przy nazwie zakładki dodać badge/etykietę:
```jsx
<span className="beta-badge">Beta</span>
```

Style:
```css
.beta-badge {
  font-size: 0.7em;
  background: var(--warning);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 4px;
  vertical-align: middle;
}
```

---

## Weryfikacja po implementacji

- `npm run dev` w rental-app
- Zalogować się → sprawdzić czy zakładka „Kursy" pojawia się w navbarze
- Kliknąć „Kursy" → powinien się załadować panel kursów
- Dodać kurs → sprawdzić tabelę `kursy` w Supabase (Dashboard → Table Editor)
- Edytować kurs → dane powinny się zaktualizować
- Usunąć kurs → wiersz znika z listy i bazy
- Zmienić okres rozliczeniowy → filtrowanie działa
- Kliknąć „Pobierz XLS" → pobiera się plik `.xlsx` z danymi
- Zalogować się na drugiego użytkownika → widzi tylko swoje kursy (RLS)
- Przełączyć się z powrotem na zakładkę „Aktywne" → zlecenia działają jak wcześniej

### Nowe testy (Etap 6-8)

- Przypisać wielu kierowców do kursu → sprawdzić kolejkę w `kursy_przypisania`
- Zamknąć kurs → `wykonawca_id` = pierwszy kierowca z kolejki
- Wypisać się z zamkniętego kursu → kurs przechodzi na kolejnego lub `wykonawca_id = NULL`
- Dwuetapowe potwierdzenie → modal pojawia się przed wypisaniem/zakończeniem
- User widzi "Moja dyspozycyjność" w menu
- Admin widzi "Dyspozycyjność" w menu i listę dostępnych kierowców
- "Moje kursy (Beta)" w menu → pokazuje zamknięte kursy użytkownika
