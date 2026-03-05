# Plan naprawy WCAG 2.1

**Data:** 2026-02-23
**Powiązany raport:** specs/wcag_raport.md

## Priorytet: Krytyczny

### Nieprawidłowy atrybut lang na stronie
- **Kryterium:** 3.1.1 Language of Page (A)
- **Pliki:** `index.html:2`
- **Wpływ:** Czytniki ekranowe odczytują polską treść z angielską wymową — tekst niezrozumiały dla użytkowników

**Przed:**
```html
<html lang="en">
```

**Po:**
```html
<html lang="pl">
```

## Priorytet: Wysoki

### Brak skip navigation
- **Kryterium:** 2.4.1 Bypass Blocks (A)
- **Pliki:** `index.html`, `src/index.css`
- **Wpływ:** Użytkownicy klawiatury muszą tabulować przez cały header przy każdym ładowaniu strony

**Dodaj w `index.html` po `<body>`:**
```html
<a href="#main-content" class="sr-only" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:9999">Przejdź do treści</a>
```

**Dodaj w CSS atrybut focus:**
```css
a.sr-only:focus {
  position: fixed;
  top: 8px;
  left: 8px;
  width: auto;
  height: auto;
  padding: 8px 16px;
  background: var(--primary-color);
  color: white;
  z-index: 10000;
  clip: auto;
  overflow: visible;
  border-radius: 4px;
  font-weight: 600;
}
```

**Dodaj `id="main-content"` na kontenerze głównej treści w App.jsx (np. `<main id="main-content">`).**

### Brak etykiet formularza w CompleteProfile
- **Kryterium:** 3.3.2 Labels or Instructions (A)
- **Pliki:** `src/components/CompleteProfile.jsx:49-77`
- **Wpływ:** Czytniki ekranowe nie komunikują przeznaczenia pól formularza

**Przed:**
```jsx
<label>Imię i nazwisko</label>
<input type="text" ... />
```

**Po:**
```jsx
<label htmlFor="complete-name">Imię i nazwisko</label>
<input id="complete-name" type="text" ... />
```

Analogicznie dla pól: hasło (`id="complete-password"`), potwierdź hasło (`id="complete-password-confirm"`).

### Brak etykiety email zaproszenia w AdminUserManagement
- **Kryterium:** 3.3.2 Labels or Instructions (A)
- **Pliki:** `src/components/AdminUserManagement.jsx:98-105`
- **Wpływ:** Input email bez powiązanej etykiety

**Dodaj:**
```jsx
<label htmlFor="invite-email" className="sr-only">Adres email zaproszenia</label>
<input id="invite-email" type="email" ... />
```

### Brak ARIA na modalach AdminUserManagement
- **Kryterium:** 4.1.2 Name, Role, Value (A)
- **Pliki:** `src/components/AdminUserManagement.jsx:83`, `src/components/AdminUserManagement.jsx:166`
- **Wpływ:** Czytniki ekranowe nie rozpoznają okien dialogowych

**Modal główny (linia 83):**
```jsx
<div className="modal-content" role="dialog" aria-modal="true" aria-label="Zarządzanie użytkownikami" onClick={e => e.stopPropagation()} ...>
```

**Modal potwierdzenia (linia 166):**
```jsx
<div className="modal-content" role="dialog" aria-modal="true" aria-label="Potwierdzenie usunięcia użytkownika" onClick={e => e.stopPropagation()} ...>
```

## Priorytet: Średni

### Outline: none bez kompensacji focus (3 selektory CSS)
- **Kryterium:** 2.4.7 Focus Visible (AA)
- **Pliki:** `src/index.css:2145`, `src/index.css:2218`, `src/index.css:2257`
- **Wpływ:** Pola .period-select, .extra-filter-input i .kurs-form input tracą widoczny focus przy nawigacji klawiaturą

**Naprawa — dodaj box-shadow do każdego selektora:**
```css
.period-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3);
}

.extra-filter-input:focus {
  border-color: var(--primary-color);
  outline: none;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3);
}

.kurs-form input {
  /* dodaj do istniejącego selektora: */
  outline: none;
}
.kurs-form input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3);
}
```

### Menu hamburger bez semantyki ARIA
- **Kryterium:** 4.1.2 Name, Role, Value (A)
- **Pliki:** `src/App.jsx:307-383`
- **Wpływ:** Czytniki ekranowe nie komunikują stanu i roli menu

**Naprawa przycisk (linia 308):**
```jsx
<button
  onClick={() => setShowMenu(v => !v)}
  className="btn-icon"
  aria-label="Menu"
  aria-expanded={showMenu}
  aria-haspopup="true"
>
```

**Naprawa dropdown (linia 315):**
```jsx
<div className="header-menu" role="menu">
```

**Dodaj `role="menuitem"` do każdego `header-menu-item`.**

**Dodaj `aria-hidden="true"` do dekoracyjnych emoji:**
```jsx
<span className="header-menu-icon" aria-hidden="true">☀️</span>
```

### Kursy modal wrapper bez ARIA
- **Kryterium:** 4.1.2 Name, Role, Value (A)
- **Pliki:** `src/App.jsx:455-456`
- **Wpływ:** Modal kursów nie jest rozpoznawany jako dialog

**Naprawa:**
```jsx
<div className="modal-content kursy-modal" role="dialog" aria-modal="true" aria-label="Kursy" onClick={(e) => e.stopPropagation()}>
```

## Priorytet: Niski

### Niski kontrast tekstu "brak nazwy"
- **Kryterium:** 1.4.3 Contrast (Minimum) (AA)
- **Pliki:** `src/components/AdminUserManagement.jsx:139`
- **Wpływ:** Tekst z opacity: 0.45 może nie spełniać minimalnego współczynnika kontrastu 4.5:1

**Naprawa:** Zwiększ opacity do min. 0.6 lub użyj dedykowanego koloru z wystarczającym kontrastem.

## Kolejność implementacji

- **Quick wins** (szybkie poprawki, duży wpływ):
  - Zmiana `lang="en"` → `lang="pl"` w index.html
  - Dodanie `role="dialog"` + `aria-modal` + `aria-label` do 2 modali w AdminUserManagement
  - Dodanie `htmlFor`/`id` do formularzy CompleteProfile i AdminUserManagement
  - Dodanie `box-shadow` do 3 reguł CSS
- **Średni nakład pracy:**
  - Skip navigation link (HTML + CSS + id w App.jsx)
  - Semantyka ARIA w menu hamburger (App.jsx)
  - `aria-hidden` na dekoracyjnych emoji w menu
- **Duże zmiany:**
  - Brak (wszystkie pozostałe poprawki to punktowe edycje)
