/**
 * Serwis do wyszukiwania miejscowości i ich dystansów od Krakowa
 */

let citiesCache = null

/**
 * Ładuje bazę miejscowości z pliku CSV
 * @returns {Promise<Map<string, number>>} - mapa miasto -> dystans w km
 */
export async function loadCities() {
  if (citiesCache) {
    return citiesCache
  }

  try {
    const response = await fetch('/cities.csv')
    if (!response.ok) {
      console.warn('Nie udało się załadować cities.csv')
      citiesCache = new Map()
      return citiesCache
    }

    const text = await response.text()
    const lines = text.trim().split('\n')
    const cities = new Map()

    // Pomiń nagłówek
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const [miasto, dystans] = line.split(',')
      if (miasto && dystans) {
        // Normalizuj nazwę miasta (małe litery, bez polskich znaków)
        const normalizedName = normalizeCity(miasto.trim())
        const distanceKm = parseInt(dystans.trim(), 10)
        if (!isNaN(distanceKm)) {
          cities.set(normalizedName, distanceKm)
        }
      }
    }

    citiesCache = cities
    return citiesCache
  } catch (error) {
    console.error('Błąd ładowania cities.csv:', error)
    citiesCache = new Map()
    return citiesCache
  }
}

/**
 * Normalizuje nazwę miasta do porównań
 * @param {string} city - nazwa miasta
 * @returns {string} - znormalizowana nazwa
 */
function normalizeCity(city) {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // usuń akcenty
    .replace(/ł/g, 'l')
    .replace(/ą/g, 'a')
    .replace(/ę/g, 'e')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/ć/g, 'c')
    .replace(/ń/g, 'n')
    .replace(/ź/g, 'z')
    .replace(/ż/g, 'z')
    .trim()
}

/**
 * Szuka dystansu dla podanej miejscowości
 * @param {string} cityName - nazwa miasta
 * @returns {Promise<number|null>} - dystans w km lub null jeśli nie znaleziono
 */
export async function findCityDistance(cityName) {
  const cities = await loadCities()
  const normalized = normalizeCity(cityName)

  // Dokładne dopasowanie
  if (cities.has(normalized)) {
    return cities.get(normalized)
  }

  // Szukaj częściowego dopasowania
  for (const [city, distance] of cities) {
    if (normalized.includes(city) || city.includes(normalized)) {
      return distance
    }
  }

  return null
}

/**
 * Wykrywa miasto w stringu lokalizacji i zwraca jego dystans
 * @param {string} locationString - string lokalizacji np. "wydanie Warszawa ul. Puławska"
 * @returns {Promise<{city: string|null, distanceKm: number|null}>}
 */
export async function detectCityInLocation(locationString) {
  if (!locationString) {
    return { city: null, distanceKm: null }
  }

  const cities = await loadCities()
  const normalizedLocation = normalizeCity(locationString)

  // Szukaj najdłuższego dopasowania (preferuj "Bielsko-Biała" nad "Biała")
  let bestMatch = null
  let bestDistance = null
  let bestLength = 0

  for (const [city, distance] of cities) {
    if (normalizedLocation.includes(city) && city.length > bestLength) {
      bestMatch = city
      bestDistance = distance
      bestLength = city.length
    }
  }

  return {
    city: bestMatch,
    distanceKm: bestDistance
  }
}
