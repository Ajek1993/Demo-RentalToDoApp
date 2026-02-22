# Changelog

Wszystkie istotne zmiany w projekcie System Zleceń Wypożyczalni.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.0.0/),
wersjonowanie według [Semantic Versioning](https://semver.org/lang/pl/).

## [0.9.2] - 2026-02-22

### Dodane
- Numery rejestracyjne zawsze przechowywane jako UPPERCASE (frontend + backend + constraint w bazie)
- Kolorowe nagłówki grup dat: dzisiaj (niebieski), jutro (amber), później (szary), przeterminowane (czerwony)

### Zmienione
- Grupy dat domyślnie zwinięte (poza "Dzisiaj")
- Każda grupa dat ma kolorowy badge z liczbą zleceń

## [0.9.1] - 2025-02-20

### Dodane
- Trwałe usuwanie zleceń dla admina (nieodwracalne)
- Automatyczne przeliczanie kwoty przy edycji adresu w kursach
- Wyświetlanie wykrytego miasta i dystansu w formularzu kursu

### Zmienione
- Godzina zlecenia jest teraz opcjonalna
- Poprawione wyświetlanie historii przypisań i edycji

## [0.9.0] - 2025-02-19

### Dodane
- Panel kursów z eksportem do Excel
- Automatyczne obliczanie kwot na podstawie lokalizacji
- Modalne potwierdzenia operacji z typami akcji
- Widok dyspozycyjności dla admina

## [0.8.0]

### Dodane
- OC sprawcy - wybór ubezpieczyciela (PZU, WARTA, VIG, ALLIANZ, TUW, INNE)
- Drukowanie dokumentów PDF ubezpieczycieli
- Role użytkowników (admin/user)
- Kaskadowe usuwanie użytkowników

### Poprawione
- Zabezpieczenie aplikacji przed nieautoryzowanym dostępem

## [0.7.0]

### Dodane
- Dark mode z przełącznikiem
- Menu dropdown w headerze
- Wyszukiwarka zleceń (rejestracja, miejsce, data, notatki)
- Filtr zakresu dat (od-do)
- Potwierdzenie email po rejestracji
- Reset hasła
- Przycisk feedbacku z zapisem do Supabase
- Kompaktowy widok mobile
- Szybkie wklejanie daty i godziny na desktop

### Zmienione
- Rebranding na Abacus

## [0.6.0]

### Dodane
- Historia edycji zleceń (kto, kiedy, jakie pola)
- Zarządzanie dyspozycyjnością pracowników
- Opcja dyspozycyjności "Brak"
- Grupowanie zleceń po datach
- Filtr "Tylko moje"

### Poprawione
- Ikony PWA (purpose + meta tagi iOS)

## [0.5.0]

### Dodane
- Progressive Web App (PWA) z manifestem
- Service Worker do obsługi offline
- Push notifications (backend + UI)
- Real-time updates bez odświeżania strony
- System przypisywania użytkowników do zleceń
- Historia przypisań z timestampami
- Modal potwierdzenia usuwania zleceń z przypisanymi
- Kompletny system zarządzania zleceniami (CRUD)
- Autoryzacja przez Supabase Auth
