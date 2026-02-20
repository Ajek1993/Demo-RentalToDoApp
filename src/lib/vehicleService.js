/**
 * Serwis do wyszukiwania marki pojazdu po numerze rejestracyjnym
 * Dane pobierane z pliku public/vehicles.csv
 */

let vehiclesCache = null
let loadingPromise = null

/**
 * Ładuje i parsuje plik CSV z pojazdami
 * @returns {Promise<Map<string, string>>} Mapa nr_rej -> marka
 */
export async function loadVehicles() {
  if (vehiclesCache) return vehiclesCache

  // Zapobiegaj wielokrotnym równoległym requestom
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    try {
      const response = await fetch('/vehicles.csv')
      if (!response.ok) {
        console.warn('Nie udało się pobrać vehicles.csv:', response.status)
        vehiclesCache = new Map()
        return vehiclesCache
      }

      const text = await response.text()
      const lines = text.trim().split('\n')
      const vehicles = new Map()

      // Pomiń nagłówek (pierwsza linia)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // Parsuj CSV (obsługa przecinków w cudzysłowach)
        const match = line.match(/^([^,]+),(.*)$/)
        if (match) {
          const plate = match[1].trim().toUpperCase()
          const brand = match[2].trim().replace(/^"|"$/g, '') // usuń cudzysłowy
          if (plate) {
            vehicles.set(plate, brand)
          }
        }
      }

      vehiclesCache = vehicles
      return vehiclesCache
    } catch (error) {
      console.error('Błąd ładowania vehicles.csv:', error)
      vehiclesCache = new Map()
      return vehiclesCache
    } finally {
      loadingPromise = null
    }
  })()

  return loadingPromise
}

/**
 * Znajduje markę pojazdu po numerze rejestracyjnym
 * @param {string} plate - Numer rejestracyjny
 * @returns {Promise<string|null>} Marka pojazdu lub null jeśli nie znaleziono
 */
export async function findVehicleByPlate(plate) {
  if (!plate) return null

  const vehicles = await loadVehicles()
  const normalizedPlate = plate.trim().toUpperCase().replace(/\s+/g, '')

  return vehicles.get(normalizedPlate) || null
}

/**
 * Czyści cache (np. po aktualizacji pliku CSV)
 */
export function clearVehiclesCache() {
  vehiclesCache = null
  loadingPromise = null
}
