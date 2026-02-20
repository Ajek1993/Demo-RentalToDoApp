import { pricingRules, distanceRules, defaultPrice } from './pricingRules'
import { detectCityInLocation } from './cityService'

/**
 * Parsuje string lokalizacji i wyodrębnia komponenty
 * @param {string} locationString - np. "wydanie Balice OC", "transfer serwis Grota"
 * @returns {{ operationType: string, hasOC: boolean, hasSerwis: boolean, location: string, distanceKm: number|null }}
 */
export function parseLocation(locationString) {
  if (!locationString) {
    return {
      operationType: '',
      hasOC: false,
      hasSerwis: false,
      location: '',
      distanceKm: null
    }
  }

  const str = locationString.toLowerCase().trim()

  // Wykryj typ operacji
  let operationType = ''
  if (str.includes('wydanie')) operationType = 'wydanie'
  else if (str.includes('odbiór') || str.includes('odbior')) operationType = 'odbiór'
  else if (str.includes('transfer')) operationType = 'transfer'

  // Wykryj flagę OC
  const hasOC = /\boc\b/i.test(str)

  // Wykryj flagę serwis/blacharnia/komis
  const hasSerwis = str.includes('serwis')
  const hasBlacharnia = str.includes('blacharnia')
  const hasKomis = str.includes('komis')
  const hasServiceType = hasSerwis || hasBlacharnia || hasKomis

  // Wykryj dystans w km
  let distanceKm = null
  const distanceMatch = str.match(/(\d+)\s*km/)
  if (distanceMatch) {
    distanceKm = parseInt(distanceMatch[1], 10)
  }

  // Pozostała lokalizacja (usuń typ operacji, OC, serwis, blacharnia, komis)
  let location = str
    .replace(/wydanie/gi, '')
    .replace(/odbiór/gi, '')
    .replace(/odbior/gi, '')
    .replace(/transfer/gi, '')
    .replace(/\boc\b/gi, '')
    .replace(/serwis/gi, '')
    .replace(/blacharnia/gi, '')
    .replace(/komis/gi, '')
    .trim()

  return {
    operationType,
    hasOC,
    hasSerwis,
    hasBlacharnia,
    hasKomis,
    hasServiceType,
    location,
    distanceKm
  }
}

/**
 * Parsuje lokalizację wraz z wykryciem miasta z bazy (async)
 * @param {string} locationString - np. "wydanie Warszawa ul. Puławska"
 * @returns {Promise<{ operationType: string, hasOC: boolean, hasSerwis: boolean, location: string, distanceKm: number|null, detectedCity: string|null }>}
 */
export async function parseLocationAsync(locationString) {
  const parsed = parseLocation(locationString)

  // Jeśli nie wykryto dystansu z "XXkm", spróbuj wykryć miasto z bazy
  if (parsed.distanceKm === null) {
    const { city, distanceKm } = await detectCityInLocation(locationString)
    if (distanceKm !== null) {
      parsed.distanceKm = distanceKm
      parsed.detectedCity = city
    }
  }

  return parsed
}

/**
 * Oblicza cenę na podstawie lokalizacji i firmy ubezpieczeniowej
 * @param {string} locationString - string lokalizacji ze zlecenia
 * @param {string} insuranceCompany - firma ubezpieczeniowa (opcjonalne)
 * @param {Object} options - opcje dodatkowe
 * @param {boolean} options.isOneWay - czy kurs tylko w jedną stronę (mnożnik x1,5 dla >100km)
 * @param {number} options.distanceKm - dystans w km (jeśli już wykryty)
 * @returns {{ price: number, ruleId: string, ruleName: string, confidence: 'high'|'medium'|'low', distanceKm: number|null, isOneWayApplied: boolean }}
 */
export function calculatePrice(locationString, insuranceCompany = '', options = {}) {
  const { isOneWay = false, distanceKm: providedDistance = null } = options
  const parsed = parseLocation(locationString)
  const locationLower = (locationString || '').toLowerCase()
  const insuranceLower = (insuranceCompany || '').toLowerCase()

  // Użyj dostarczonego dystansu lub wykrytego z parsowania
  const distanceKm = providedDistance !== null ? providedDistance : parsed.distanceKm

  // Sprawdź czy OC jest w insurance_company nawet jeśli nie ma w location
  const hasOC = parsed.hasOC || insuranceLower.length > 0

  // Sortuj reguły po priorytecie
  const sortedRules = [...pricingRules].sort((a, b) => a.priority - b.priority)

  for (const rule of sortedRules) {
    // Sprawdź typ operacji
    if (rule.operationTypes.length > 0 && parsed.operationType) {
      if (!rule.operationTypes.includes(parsed.operationType)) {
        continue
      }
    }

    // Sprawdź wymaganie serwisu
    if (rule.requiresSerwis && !parsed.hasSerwis) {
      continue
    }

    // Sprawdź wymaganie typu serwisowego (serwis/blacharnia/komis)
    if (rule.requiresServiceType && !parsed.hasServiceType) {
      continue
    }

    // Sprawdź wymaganie OC
    if (rule.requiresOC && !hasOC) {
      continue
    }

    // Sprawdź słowa kluczowe lokalizacji
    const hasKeyword = rule.locationKeywords.some(keyword =>
      locationLower.includes(keyword.toLowerCase()) ||
      insuranceLower.includes(keyword.toLowerCase())
    )

    if (!hasKeyword && rule.locationKeywords.length > 0) {
      continue
    }

    // Sprawdź słowa wykluczające
    const hasExcluded = rule.excludeKeywords.some(keyword =>
      locationLower.includes(keyword.toLowerCase())
    )

    if (hasExcluded) {
      continue
    }

    // Reguła pasuje
    let price = rule.price
    let confidence = 'high'
    let isOneWayApplied = false

    // Dodatkowa opłata za dystans powyżej 100km
    if (distanceKm && distanceKm > distanceRules.threshold) {
      const extraKm = distanceKm - distanceRules.threshold
      const increments = Math.ceil(extraKm / distanceRules.increment)
      price += increments * distanceRules.pricePerIncrement
      confidence = 'medium'

      // Mnożnik x1,5 dla kursów w jedną stronę powyżej 100km
      if (isOneWay) {
        price = Math.round(price * 1.5)
        isOneWayApplied = true
      }
    }

    return {
      price,
      ruleId: rule.id,
      ruleName: rule.name,
      confidence,
      distanceKm,
      isOneWayApplied
    }
  }

  // Żadna reguła nie pasuje - użyj kalkulacji dystansowej
  if (distanceKm !== null) {
    let price = calculateDistancePrice(distanceKm)
    let isOneWayApplied = false

    // Mnożnik x1,5 dla kursów w jedną stronę powyżej 100km
    if (isOneWay && distanceKm > distanceRules.threshold) {
      price = Math.round(price * 1.5)
      isOneWayApplied = true
    }

    return {
      price,
      ruleId: 'distance_calculated',
      ruleName: `Dystans ${distanceKm}km`,
      confidence: 'medium',
      distanceKm,
      isOneWayApplied
    }
  }

  // Żadna reguła nie pasuje - zwróć domyślną cenę
  return {
    price: defaultPrice,
    ruleId: 'default',
    ruleName: 'Domyślna cena',
    confidence: 'low',
    distanceKm: null,
    isOneWayApplied: false
  }
}

/**
 * Oblicza cenę asynchronicznie - wykrywa miasta z bazy
 * @param {string} locationString - string lokalizacji ze zlecenia
 * @param {string} insuranceCompany - firma ubezpieczeniowa (opcjonalne)
 * @param {Object} options - opcje dodatkowe
 * @param {boolean} options.isOneWay - czy kurs tylko w jedną stronę
 * @returns {Promise<{ price: number, ruleId: string, ruleName: string, confidence: 'high'|'medium'|'low', distanceKm: number|null, isOneWayApplied: boolean, detectedCity: string|null }>}
 */
export async function calculatePriceAsync(locationString, insuranceCompany = '', options = {}) {
  const parsed = await parseLocationAsync(locationString)
  const result = calculatePrice(locationString, insuranceCompany, {
    ...options,
    distanceKm: parsed.distanceKm
  })

  return {
    ...result,
    detectedCity: parsed.detectedCity || null
  }
}

/**
 * Oblicza cenę dla dystansu powyżej 100km
 * @param {number} distanceKm - dystans w km
 * @returns {number} - cena
 */
export function calculateDistancePrice(distanceKm) {
  if (distanceKm <= 40) {
    return 50 // Balice i do 40km
  }
  if (distanceKm <= 100) {
    return 70 // 40-100km
  }

  // Powyżej 100km: bazowa 70zł + 12zł za każde 50km powyżej 100km
  const extraKm = distanceKm - distanceRules.threshold
  const increments = Math.ceil(extraKm / distanceRules.increment)
  return 70 + (increments * distanceRules.pricePerIncrement)
}
