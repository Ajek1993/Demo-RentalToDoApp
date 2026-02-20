# Rozszerzenie funkcjonalności kursów

## Stan obecny

### Tabela `kursy`
- `id`, `user_id`, `wykonawca_id`, `order_id`
- `data`, `nr_rej`, `marka`, `adres`, `kwota`

### Przepływ danych
- `completeOrder()` → tworzy rekord w `kursy` (kopiuje dane z order)
- `restoreOrder()` → usuwa powiązany kurs
- `deleteOrder()` → usuwa powiązany kurs
- Edycja w KursyList → aktualizuje tylko `marka` i `kwota`
- Edycja Order → **NIE** synchronizuje z kursem (problem)

### Problemy
- Brak synchronizacji między edycją zlecenia a kursem
- Ograniczona edycja kursu (tylko marka/kwota)
- Brak powiązania nr_rej → marka z bazy pojazdów

---

## Wymagania

### Edycja kursów z zakładki Kursy
- Wszystkie pola edytowalne: `data`, `nr_rej`, `marka`, `adres`, `kwota`
- Zakończone kursy można edytować TYLKO z zakładki Kursy
- Funkcja przywróć+edytuj+zamknij pozostaje (wykonawca się nie zmieni)

### Synchronizacja Order ↔ Kurs
- Gdy user edytuje zlecenie → jeśli istnieje powiązany kurs → zaktualizuj: `data`, `nr_rej`, `adres`
- Kwota przeliczana automatycznie wg reguł cenowych (calculatePrice)
- Marka NIE jest synchronizowana (edytowana tylko w zakładce Kursy)
- Dotyczy zleceń ze statusem `completed` które mają rekord w `kursy`

### Autocomplete numeru rejestracyjnego
- Źródło: plik `public/vehicles.csv`
- Format CSV: `nr_rej,marka` (np. `KR12345,Opel Astra`)
- Działa w:
  - OrderForm (tworzenie/edycja zlecenia)
  - KursyList (edycja kursu)
- Po wpisaniu nr_rej → auto-uzupełnienie pola marka (jeśli znaleziono)
- Jeśli nr_rej nie istnieje w CSV → pole marka pozostaje puste (użytkownik może wpisać ręcznie)
- Pole marka jest nieobowiązkowe

---

## Plan implementacji

### Nowe pliki

- `public/vehicles.csv` - baza pojazdów (nr_rej,marka)
- `src/lib/vehicleService.js` - serwis do parsowania CSV i wyszukiwania

### Modyfikacje

**src/lib/vehicleService.js** (nowy)
- `loadVehicles()` - parsuje CSV z public/vehicles.csv
- `findVehicleByPlate(plate)` - zwraca markę dla danego nr_rej lub null
- Cache w pamięci (lazy loading)

**src/components/KursyList.jsx**
- Rozszerzenie formularza edycji o pola: `data`, `nr_rej`, `adres`
- Przy zmianie `nr_rej` → wywołanie `findVehicleByPlate()` → auto-uzupełnienie `marka`
- Aktualizacja `handleSaveEdit()` - zapisuje wszystkie pola
- Dla admina: widok wszystkich kursów (nie tylko swoich), możliwość edycji

**src/components/OrderForm.jsx**
- Dodanie pola `marka` (opcjonalne, niewidoczne domyślnie lub pod nr_rej)
- Przy zmianie `plate` → wywołanie `findVehicleByPlate()` → auto-uzupełnienie `marka`
- Opcjonalnie: debounce na wyszukiwanie

**src/hooks/useOrders.js**
- Modyfikacja `updateOrder()`:
  - Po aktualizacji order sprawdź czy istnieje powiązany kurs (`order_id`)
  - Jeśli tak → zaktualizuj kurs: `data`, `nr_rej`, `marka`, `adres`, `kwota`
  - Użyj `calculatePrice()` do przeliczenia kwoty (opcjonalnie)

**Schemat bazy (opcjonalnie)**
- Dodanie kolumny `marka` do tabeli `orders` (jeśli chcemy przechowywać markę w zleceniu)
- Alternatywnie: marka tylko w `kursy`

---

## Szczegóły techniczne

### vehicleService.js

```javascript
let vehiclesCache = null

export async function loadVehicles() {
  if (vehiclesCache) return vehiclesCache

  const response = await fetch('/vehicles.csv')
  const text = await response.text()

  const lines = text.trim().split('\n')
  const vehicles = new Map()

  for (const line of lines.slice(1)) { // pomiń nagłówek
    const [plate, brand] = line.split(',').map(s => s.trim())
    if (plate) vehicles.set(plate.toUpperCase(), brand || '')
  }

  vehiclesCache = vehicles
  return vehicles
}

export async function findVehicleByPlate(plate) {
  const vehicles = await loadVehicles()
  return vehicles.get(plate?.toUpperCase()) || null
}
```

### Format vehicles.csv

```csv
nr_rej,marka
KR12345,Opel Astra
KR67890,Toyota Corolla
WA11111,Skoda Octavia
```

### Synchronizacja w updateOrder

```javascript
// Po udanej aktualizacji order - sprawdź czy istnieje powiązany kurs
const { data: kurs } = await supabase
  .from('kursy')
  .select('id')
  .eq('order_id', id)
  .maybeSingle()

if (kurs) {
  // Przelicz kwotę automatycznie
  const priceResult = calculatePrice(
    updates.location || data.location,
    updates.insurance_company || data.insurance_company
  )

  await supabase
    .from('kursy')
    .update({
      data: updates.date || data.date,
      nr_rej: updates.plate || data.plate,
      adres: updates.location || data.location,
      kwota: priceResult.price
      // marka pozostaje bez zmian (edytowana tylko w zakładce Kursy)
    })
    .eq('id', kurs.id)
}
```

---

## Decyzje projektowe

- **Przeliczanie kwoty**: TAK - przy edycji zlecenia (completed) kwota w kursie przelicza się automatycznie wg reguł cenowych
- **Marka w orders**: NIE - marka przechowywana tylko w tabeli `kursy` (wypełniana przy zamknięciu zlecenia)
- **Uprawnienia admina**: TAK - admin może edytować kursy wszystkich użytkowników

---

## Kolejność implementacji

- Utworzenie `public/vehicles.csv` (pusty szablon lub z przykładowymi danymi)
- Stworzenie `vehicleService.js`
- Rozszerzenie formularza edycji w KursyList (wszystkie pola + autocomplete)
- Dodanie autocomplete do OrderForm
- Synchronizacja Order → Kurs w `updateOrder()`
- Testy manualne
