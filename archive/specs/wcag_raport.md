# Raport audytu WCAG 2.1

**Data:** 2026-02-23
**Zakres:** `src/` (komponenty React, style CSS), `index.html`
**Pliki przeskanowane:** 18 (16 JSX, 2 CSS, 1 HTML)
**Poziom zgodności:** A + AA

## Podsumowanie

Aplikacja przeszła obszerny refactoring WCAG (etapy 1-12), dzięki czemu większość komponentów posiada poprawne role ARIA, etykiety formularzy, focus trap w modalach oraz semantyczny HTML. Pozostaje kilka luk: brak `lang="pl"` w HTML, brak skip navigation, niekompletna dostępność dwóch komponentów (AdminUserManagement, CompleteProfile) oraz trzy reguły CSS z `outline: none` bez kompensacji `box-shadow`. Menu hamburger w App.jsx nie ma pełnej semantyki ARIA.

**Ocena ogólna:** Średnia zgodność (wymaga dodatkowych poprawek w kilku obszarach)

## Statystyki naruszeń

| Kategoria WCAG | Naruszenia | Priorytet |
|---|---|---|
| Perceivable (Postrzegalność) | 1 | Niski |
| Operable (Funkcjonalność) | 5 | Krytyczny-Średni |
| Understandable (Zrozumiałość) | 3 | Wysoki-Średni |
| Robust (Solidność) | 4 | Wysoki-Średni |
| **Łącznie** | **13** | |

## Wykryte naruszenia

### Perceivable (Postrzegalność)

| Plik:Linia | Kryterium | Poziom | Problem | Priorytet |
|---|---|---|---|---|
| `src/components/AdminUserManagement.jsx:139` | 1.4.3 Contrast (Minimum) | AA | Tekst "brak nazwy" z `opacity: 0.45` — potencjalnie niewystarczający kontrast | Niski |

### Operable (Funkcjonalność)

| Plik:Linia | Kryterium | Poziom | Problem | Priorytet |
|---|---|---|---|---|
| `index.html:2` | 2.4.1 Bypass Blocks | A | Brak skip navigation link (`<a href="#main-content">Przejdź do treści</a>`) | Wysoki |
| `src/index.css:2145` | 2.4.7 Focus Visible | AA | `.period-select:focus` — `outline: none` bez `box-shadow` kompensacji | Średni |
| `src/index.css:2218` | 2.4.7 Focus Visible | AA | `.extra-filter-input:focus` — `outline: none` bez `box-shadow` kompensacji | Średni |
| `src/index.css:2257` | 2.4.7 Focus Visible | AA | `.kurs-form input` — `outline: none` bez `box-shadow` kompensacji | Średni |
| `src/App.jsx:308` | 2.1.1 Keyboard | A | Menu hamburger — brak Escape do zamknięcia, brak focus trap, nawigacja strzałkami | Średni |

### Understandable (Zrozumiałość)

| Plik:Linia | Kryterium | Poziom | Problem | Priorytet |
|---|---|---|---|---|
| `index.html:2` | 3.1.1 Language of Page | A | `lang="en"` zamiast `lang="pl"` — treść aplikacji jest po polsku | Krytyczny |
| `src/components/CompleteProfile.jsx:49-77` | 3.3.2 Labels or Instructions | A | Brak `htmlFor`/`id` na polach: imię, hasło, potwierdź hasło | Wysoki |
| `src/components/AdminUserManagement.jsx:98-105` | 3.3.2 Labels or Instructions | A | Input email zaproszenia — brak powiązanego `<label>` z `htmlFor`/`id` | Wysoki |

### Robust (Solidność)

| Plik:Linia | Kryterium | Poziom | Problem | Priorytet |
|---|---|---|---|---|
| `src/components/AdminUserManagement.jsx:83` | 4.1.2 Name, Role, Value | A | Modal główny — brak `role="dialog"` `aria-modal="true"` `aria-label` | Wysoki |
| `src/components/AdminUserManagement.jsx:166` | 4.1.2 Name, Role, Value | A | Modal potwierdzenia usunięcia — brak `role="dialog"` `aria-modal="true"` `aria-label` | Wysoki |
| `src/App.jsx:308-312` | 4.1.2 Name, Role, Value | A | Przycisk menu — brak `aria-expanded`, `aria-haspopup="true"`, `aria-label` | Średni |
| `src/App.jsx:315` | 4.1.2 Name, Role, Value | A | Menu dropdown — brak `role="menu"`, items bez `role="menuitem"` | Średni |
| `src/App.jsx:455-456` | 4.1.2 Name, Role, Value | A | Kursy modal wrapper — brak `role="dialog"` `aria-modal="true"` `aria-label` | Średni |

## Rekomendacje ogólne

- Zmienić `lang="en"` na `lang="pl"` w `index.html` — priorytet krytyczny
- Dodać skip navigation link na początku `<body>` z kotwicą `#main-content`
- Dokończyć WCAG w `AdminUserManagement.jsx` i `CompleteProfile.jsx` (ARIA modali, etykiety formularzy)
- Dodać `box-shadow` do trzech reguł CSS z `outline: none` bez kompensacji
- Uzupełnić semantykę ARIA w menu hamburger (App.jsx)
- Dodać `aria-hidden="true"` do dekoracyjnych emoji w menu (App.jsx)
