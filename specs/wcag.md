# WCAG 2.1 Accessibility Audit Report

**Data audytu:** 2026-02-22
**Wersja aplikacji:** 0.9.3
**Standard:** WCAG 2.1 Level AA

---

## Cztery Filary WCAG 2.1

1. **Perceivable** — informacja musi być dostrzegalna dla wszystkich
2. **Operable** — interfejs musi być obsługiwalny (klawiatura, myszy, touch)
3. **Understandable** — treść i operacje muszą być zrozumiałe
4. **Robust** — kod musi być zgodny z standardami dla assistive technologies

---

## 1. ETYKIETY FORMULARZY (WCAG 2.1.4.1 - Label in Name)

### Problemy znalezione

| Plik | Linia | Problem | Priorytet |
|------|-------|---------|-----------|
| `src/components/AvailabilityManager.jsx` | 226-236 | Inputy `<input type="time">` bez etykiet — brak połączenia `label htmlFor` | 🔴 High |
| `src/components/AvailabilityManager.jsx` | 162-174 | Przyciski nawigacji bez `aria-label` (←, →) | 🔴 High |
| `src/components/FeedbackModal.jsx` | 37-43 | `<textarea>` bez `<label>` — tylko placeholder | 🔴 High |
| `src/components/AdminAvailabilityView.jsx` | 98-114 | Labele inline w divach bez `htmlFor` | 🔴 High |
| `src/components/OrderForm.jsx` | 183-193 | Pole quickPaste — etykieta bez `htmlFor` | 🟡 Medium |
| `src/components/KursyList.jsx` | 314-327 | Select `user-select` — label bez `htmlFor` | 🟡 Medium |
| `src/components/OrderList.jsx` | 300-313 | Labele w filtrach bez `htmlFor` | 🟡 Medium |

### Rekomendacje naprawy

```javascript
// ❌ Źle
<input type="time" value={time} onChange={handleChange} />

// ✅ Dobrze
<label htmlFor="time-input">Godzina:</label>
<input id="time-input" type="time" value={time} onChange={handleChange} />
```

---

## 2. ARIA ATTRIBUTES (Dostępność dla czytników ekranu)

### 2.1 Elementy Alert/Live Region

| Plik | Linia | Problem | WCAG |
|------|-------|---------|------|
| `src/components/OfflineBanner.jsx` | 33-35 | Brak `role="alert"` i `aria-live="assertive"` | 2.4.3, 4.1.3 |

**Poprawka:**
```jsx
<div role="alert" aria-live="assertive" aria-atomic="true">
  Brak połączenia z internetem
</div>
```

### 2.2 Dialog Modals

Wszystkie modalne okna powinny mieć:

| Atrybuty | WCAG |
|----------|------|
| `role="dialog"` | 1.3.1 |
| `aria-labelledby="modal-title"` | 1.3.1 |
| `aria-modal="true"` | 1.3.1 |

**Pliki wymagające poprawki:**
- `src/components/Modal.jsx` (baza dla wszystkich modali) — ⚠️ Krytyczne
- `src/components/AvailabilityManager.jsx:157-288`
- `src/components/FeedbackModal.jsx:32-59`
- `src/components/AdminAvailabilityView.jsx:75-191`
- `src/components/OrderCard.jsx:356-363` (action modal)
- `src/components/OrderList.jsx:395-405` (confirmation dialogs)
- `src/components/AboutModal.jsx:32-67`

### 2.3 Toggle Buttons

**WCAG 2.1.3.1 (Info and Relationships)**

| Plik | Linia | Brakujący atrybut | Wartość |
|------|-------|-------------------|---------|
| `src/components/AdminAvailabilityView.jsx` | 81-92 | `aria-pressed` | `true` lub `false` |

**Poprawka:**
```jsx
<button
  aria-pressed={isActive}
  className={`filter-chip ${isActive ? 'active' : ''}`}
>
  {label}
</button>
```

### 2.4 Expandable Sections

| Plik | Linia | Brakujący atrybut | Problem |
|------|-------|-------------------|---------|
| `src/components/OrderList.jsx` | 340 | `aria-expanded` | Przycisk toggle dla grupy dat |
| `src/components/KursyList.jsx` | 348-354 | `aria-expanded` | Toggle filtru |

**Poprawka:**
```jsx
<button
  aria-expanded={isOpen}
  aria-controls="group-content"
>
  Dzisiaj ({count})
</button>
<div id="group-content" hidden={!isOpen}>
  {/* zawartość */}
</div>
```

### 2.5 Dropdown Menus

| Plik | Linia | Brakujące atrybuty |
|------|-------|-------------------|
| `src/components/OrderCard.jsx` | 310-339 | `role="menu"` na menu, `role="menuitem"` na opcjach |

---

## 3. SEMANTYKA HTML (WCAG 1.3.1 - Info and Relationships)

### 3.1 Nieznaczące elementy (div zamiast semantic HTML)

| Plik | Linia | Obecne | Powinno być | WCAG |
|------|-------|--------|-------------|------|
| `src/components/Modal.jsx` | 3-8 | `<div>` | `<dialog>` lub `role="dialog"` | 1.3.1 |
| `src/components/OfflineBanner.jsx` | 33-35 | `<div>` | `<section role="alert">` | 1.3.1 |
| `src/components/OrderCard.jsx` | 160-268 | `<div>` | `<article>` | 1.3.1 |
| `src/components/OrderList.jsx` | 335-366 | `<div>` (group) | `<section>` | 1.3.1 |

### 3.2 Brakujące powiązania label-input

| Plik | Struktura | Problem |
|------|-----------|---------|
| `src/components/LoginForm.jsx` | ✅ OK | Wszystkie inputy mają `<label htmlFor>` |
| `src/components/OrderForm.jsx` | ⚠️ Częściowo | Niektóre inputy bez `id` |
| `src/components/FeedbackModal.jsx` | ❌ Źle | Textarea bez labelu |

---

## 4. NAWIGACJA KLAWIATURY (WCAG 2.1.1.1 - Keyboard)

### 4.1 Obsługa klawisza Tab

✅ **OK:**
- `src/components/LoginForm.jsx` — wszystkie pola dostępne
- `src/components/OrderForm.jsx` — wszystkie formy dostępne
- `src/components/Modal.jsx` — ⚠️ brak focus trap

### 4.2 Obsługa klawisza Escape

❌ **Brakuje:**
- `src/components/Modal.jsx` — powinno zamykać modal
- `src/components/AvailabilityManager.jsx:157-288` — modal bez obsługi Escape
- `src/components/FeedbackModal.jsx` — modal bez obsługi Escape
- `src/components/OrderCard.jsx:356-447` — modals bez obsługi Escape
- `src/components/OrderList.jsx:395-435` — confirmation dialogs bez obsługi Escape

**Poprawka w Modal.jsx:**
```jsx
useEffect(() => {
  const handleEscape = (e) => {
    if (e.key === 'Escape') onClose?.();
  };
  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [onClose]);
```

### 4.3 Focus Management

❌ **Brakuje focus trap:**
- Wszystkie modale powinny mieć focus trap (Tab nie opuszcza modalu)
- Brak `tabIndex={-1}` na hidden elementach
- Brak autofocus na pierwszy focusable element w modalu

**Biblioteka:** `focus-trap` lub własna implementacja

### 4.4 Custom Click Handlers bez Button

| Plik | Linia | Problem | WCAG |
|------|-------|---------|------|
| `src/components/OrderCard.jsx` | 127-138 | `handleCardClick` na DIV — brak obsługi Enter/Space | 2.1.1 |

**Poprawka:**
```jsx
// ❌ Źle
<div onClick={handleCardClick}>

// ✅ Dobrze
<button onClick={handleCardClick} className="card-button">
```

---

## 5. FOCUS INDICATORS (WCAG 2.4.7 - Focus Visible)

### 5.1 Visual Focus

**Wymaga sprawdzenia w CSS:**
- Czy `:focus` / `:focus-visible` mają wystarczający kontrast?
- Czy outline jest widoczny na wszystkich elementach interaktywnych?

**Rekomendacja CSS:**
```css
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
```

### 5.2 Focus Restore

❌ **Brakuje:**
- Po zamknięciu modalu fokus powinien wrócić do elementu, który go otworzył
- Dotyczy wszystkich modali w aplikacji

---

## 6. ALTERNATYWNY TEKST & MEDIA (WCAG 1.1.1 - Text Alternatives)

### 6.1 Emoji bez aria-label

| Plik | Linia | Emoji | Problem |
|------|-------|-------|---------|
| `src/components/OrderCard.jsx` | 179 | 📜 | Brak `aria-label="Historia przypisań"` |
| `src/components/OrderCard.jsx` | 194 | ℹ️ | Brak `aria-label="Informacje"` |
| `src/components/OrderCard.jsx` | 224-228 | 🖨️ | Brak `aria-label="Drukuj PDF"` |
| `src/components/OrderCard.jsx` | 236 | ✏️ | Brak `aria-label="Edytuj"` |
| `src/components/OrderCard.jsx` | 238 | ✕ | Brak `aria-label="Usuń"` |
| `src/components/AvailabilityManager.jsx` | 166 | ← | Brak `aria-label` |
| `src/components/AvailabilityManager.jsx` | 173 | → | Brak `aria-label` |
| `src/components/LoginForm.jsx` | 85 | ✉️ | Decorative, OK |

**Poprawka:**
```jsx
// ❌ Źle
<button>{emoji}</button>

// ✅ Dobrze
<button aria-label="Historia przypisań">{emoji}</button>
// lub
<button title="Historia przypisań" aria-label="Historia przypisań">{emoji}</button>
```

### 6.2 SVG Icons bez aria-label

| Plik | Linia | Problem |
|------|-------|---------|
| `src/components/OrderList.jsx` | 257 | SVG ikonka filtra bez `aria-label` |

**Poprawka:**
```jsx
<svg aria-label="Filtruj zlecenia" role="img">
  {/* SVG content */}
</svg>
```

---

## 7. KONTRAST KOLORÓW (WCAG 2.1.4.3 - Contrast Minimum)

### 7.1 Wymaga sprawdzenia w CSS

🔍 **Elementy do sprawdzenia:**
- Kolorowe nagłówki grup dat (niebieski, amber, szary, czerwony)
- Tekst szary (`--gray-500`) — potencjalnie zbyt jasny
- Dark mode — sprawdzić kontrast w obu trybach
- Disabled state — czy wystarczy kontrast?

**Wymóg WCAG 2.1 Level AA:**
- Tekst zwykły: minimum 4.5:1
- Duży tekst (18pt+ lub 14pt+ bold): minimum 3:1

**Narzędzia do testowania:**
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Browser DevTools → Accessibility
- axe DevTools

---

## 8. HIERARCHIA NAGŁÓWKÓW (WCAG 1.3.1 - Info and Relationships)

### 8.1 Brakujące lub niespójne nagłówki

| Plik | Problem | Poprawka |
|------|---------|----------|
| `src/components/AssignmentHistory.jsx` | `<h4>` bez `<h3>` — skok w hierarchii | Zmienić na `<h3>` |
| `src/components/OrderForm.jsx` | Brak głównego nagłówka formularza | Dodać `<h2>` |
| `src/components/OrderList.jsx` | Brak nagłówka dla sekcji zleceń | Dodać `<h1>` lub `<h2>` |
| `src/components/KursyList.jsx` | Hierarchia OK | ✅ |
| `src/components/LoginForm.jsx` | Hierarchia OK | ✅ |

**Poprawka:**
```jsx
// ❌ Źle — skok h1 → h4
<h1>App</h1>
<h4>Historia przypisań</h4>

// ✅ Dobrze
<h1>App</h1>
<h2>Zlecenia</h2>
<h3>Historia przypisań</h3>
```

---

## 9. STRUKTURY LIST (WCAG 1.3.1 - Info and Relationships)

### 9.1 Prawidłowe użycie list

✅ **OK:**
- `src/components/AssignmentHistory.jsx:37-74` — `<ul>` + `<li>`
- `src/components/AdminAvailabilityView.jsx:138-151` — `<ul>` + `<li>`
- `src/components/KursyList.jsx:413-438` — `<ul>` + `<li>`
- `src/components/AboutModal.jsx:53-57` — `<ul>` + `<li>`

❌ **Powinno być listą:**
- `src/components/OrderList.jsx:335-366` — grupy zleceń jako `<ul>` zamiast `<div>`

---

## 10. DOSTĘPNOŚĆ ELEMENTÓW INTERAKTYWNYCH

### 10.1 Button vs Link

✅ **OK:**
- Większość interaktywnych elementów to `<button>`
- Nawigacja to `<a>`

### 10.2 Tab Interface

❌ **Wymaga ARIA:**

`src/components/OrderList.jsx:229-247`

```jsx
// ❌ Obecnie
<div className="toolbar-buttons">
  <button onClick={() => setFilter('all')}>Wszystkie</button>
  <button onClick={() => setFilter('mine')}>Tylko moje</button>
</div>

// ✅ Powinno być
<div role="tablist" aria-label="Filtry zleceń">
  <button
    role="tab"
    aria-selected={filter === 'all'}
    aria-controls="tabpanel-all"
    id="tab-all"
    onClick={() => setFilter('all')}
  >
    Wszystkie
  </button>
  <button
    role="tab"
    aria-selected={filter === 'mine'}
    aria-controls="tabpanel-mine"
    id="tab-mine"
    onClick={() => setFilter('mine')}
  >
    Tylko moje
  </button>
</div>
<div id="tabpanel-all" role="tabpanel" aria-labelledby="tab-all">
  {/* zawartość */}
</div>
```

### 10.3 Potwierdzenia & Confirmation Dialogs

Wszystkie confirmation dialogs powinny mieć:
- `role="dialog"` i `aria-labelledby`
- Jasne instrukcje dla użytkownika
- Dwa przyciski: "Anuluj" i "Potwierdź" (nie "Tak" / "Nie")

---

## PODSUMOWANIE PROBLEMÓW — MACIERZ PRIORYTETÓW

### 🔴 Krytyczne (High Priority)

| Lp. | Problem | Gdzie | WCAG | Łatwa naprawa? |
|-----|---------|-------|------|----------------|
| 1 | Brak `role="dialog"` na modaliach | 7 plików | 1.3.1, 4.1.3 | ✅ Tak |
| 2 | Brak `role="alert"` na bannerie offline | OfflineBanner | 2.4.3 | ✅ Tak |
| 3 | Etykiety bez `htmlFor` | 5+ instancji | 2.1.4.1 | ✅ Tak |
| 4 | Brak focus trap w modaliach | 7 plików | 2.4.3 | ⚠️ Średnio |
| 5 | Emoji bez `aria-label` | 10+ instancji | 1.1.1 | ✅ Tak |
| 6 | Brak obsługi klawisza Escape | 7 plików | 2.1.1 | ✅ Tak |
| 7 | Textarea bez labelu | FeedbackModal | 2.1.4.1 | ✅ Tak |

### 🟡 Wysokie (Medium Priority)

| Lp. | Problem | Gdzie | WCAG |
|-----|---------|-------|------|
| 1 | Brak `aria-pressed` na toggle buttons | AdminAvailabilityView | 1.3.1 |
| 2 | Brak `aria-expanded` na collapse buttons | OrderList, KursyList | 1.3.1 |
| 3 | SVG bez `aria-label` | OrderList | 1.1.1 |
| 4 | Brak tab interface ARIA | OrderList | 1.3.1 |
| 5 | Hierarchia nagłówków niespójna | 5+ sekcji | 1.3.1 |
| 6 | Brak focus restore po zamknięciu modalu | 7 plików | 2.4.3 |
| 7 | Dropdown bez `role="menu"` | OrderCard | 1.3.1 |

### 🟢 Średnie (Low Priority)

| Lp. | Problem | WCAG |
|-----|---------|------|
| 1 | Generyczne divy zamiast semantic HTML | 1.3.1 |
| 2 | Brak keyboard navigation na custom components | 2.1.1 |
| 3 | Title zamiast aria-label | 1.3.1 |
| 4 | Placeholder zamiast etykiety | 2.1.4.1 |

---

## PLAN NAPRAWY — TOP 5 AKCJI

### 1️⃣ Ulepszenie `Modal.jsx` (baza dla wszystkich modali)

**Pliki zależne:** 7 modali w całym projekcie

**Zmiany:**
- Dodaj `role="dialog"`, `aria-labelledby`, `aria-modal="true"`
- Implementuj focus trap (biblioteka `focus-trap`)
- Dodaj obsługę klawisza Escape
- Przywróć fokus do triggera po zamknięciu

**Szacunkowy czas:** 30-45 minut

### 2️⃣ Etykiety formularzy (htmlFor + id)

**Pliki:** OrderForm, KursyList, OrderList, AdminAvailabilityView, AvailabilityManager, FeedbackModal

**Zmiany:**
- Dodaj `id` do wszystkich `<input>`, `<select>`, `<textarea>`
- Dodaj `htmlFor` do wszystkich `<label>`
- Zamień placeholder na proper `<label>`

**Szacunkowy czas:** 20-30 minut

### 3️⃣ Aria-label dla emoji i ikon

**Pliki:** OrderCard, AvailabilityManager, OrderList, LoginForm

**Zmiany:**
- Dodaj `aria-label` do wszystkich buttonów z emoji
- Zamień emoji-only buttons na text + emoji
- Dodaj `aria-label` do SVG ikon

**Szacunkowy czas:** 15-20 minut

### 4️⃣ Obsługa klawisza Escape

**Pliki:** Modal + wszystkie komponenty używające Modal

**Zmiany:**
- Dodaj event listener w Modal.jsx
- Propaguj `onClose` do wszystkich modali

**Szacunkowy czas:** 10-15 minut

### 5️⃣ Toggle buttons & Expandable sections

**Pliki:** AdminAvailabilityView, OrderList, KursyList

**Zmiany:**
- Dodaj `aria-pressed` do toggle buttons
- Dodaj `aria-expanded` do collapse buttons
- Powiąż `aria-controls` z ID sekcji

**Szacunkowy czas:** 15-20 minut

---

## TESTY MANUALNE

### Wymagane narzędzia:
- axe DevTools (browser extension)
- NVDA (czytnik ekranu dla Windows)
- WebAIM Contrast Checker

### Checklist testowania:

- [ ] Cały interfejs dostępny via Tab + Shift+Tab
- [ ] Wszystkie modale obsługują Escape key
- [ ] Focus wraca do triggera po zamknięciu modalu
- [ ] Wszystkie przyciski dostępne dla czytnika ekranu
- [ ] Kontrast kolorów >= 4.5:1 (Level AA)
- [ ] Hierarchia nagłówków spójna (h1 → h2 → h3 → ...)
- [ ] Listy używają `<ul>` + `<li>`
- [ ] Formularze mają etykiety powiązane z inputami
- [ ] Emoji mają aria-label lub text alternative

---

## LINKI I ZASOBY

- **WCAG 2.1 Specification:** https://www.w3.org/TR/WCAG21/
- **ARIA Authoring Practices:** https://www.w3.org/WAI/ARIA/apg/
- **WebAIM Articles:** https://webaim.org/
- **Focus Trap Library:** https://github.com/davidtheclark/focus-trap
- **React Accessibility:** https://reactjs.org/docs/accessibility.html

---

## STATUS IMPLEMENTACJI

- [ ] Etap 1 — Modal.jsx (focus trap, role, aria attributes)
- [ ] Etap 2 — Etykiety formularzy (htmlFor + id)
- [ ] Etap 3 — Aria-labels dla emoji
- [ ] Etap 4 — Obsługa Escape key
- [ ] Etap 5 — ARIA dla toggle/expand buttons
- [ ] Etap 6 — Hierarchia nagłówków
- [ ] Etap 7 — Testy manualne
- [ ] Etap 8 — axe DevTools audit

---

**Dokument aktualizowany:** 2026-02-22
