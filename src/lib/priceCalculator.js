import { pricingRules, distanceRules, defaultPrice } from './pricingRules'

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
 * Oblicza cenę na podstawie lokalizacji i firmy ubezpieczeniowej
 * @param {string} locationString - string lokalizacji ze zlecenia
 * @param {string} insuranceCompany - firma ubezpieczeniowa (opcjonalne)
 * @returns {{ price: number, ruleId: string, ruleName: string, confidence: 'high'|'medium'|'low' }}
 */
export function calculatePrice(locationString, insuranceCompany = '') {
  const parsed = parseLocation(locationString)
  const locationLower = (locationString || '').toLowerCase()
  const insuranceLower = (insuranceCompany || '').toLowerCase()

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

    // Dodatkowa opłata za dystans powyżej 100km
    if (parsed.distanceKm && parsed.distanceKm > distanceRules.threshold) {
      const extraKm = parsed.distanceKm - distanceRules.threshold
      const increments = Math.ceil(extraKm / distanceRules.increment)
      price += increments * distanceRules.pricePerIncrement
      confidence = 'medium'
    }

    return {
      price,
      ruleId: rule.id,
      ruleName: rule.name,
      confidence
    }
  }

  // Żadna reguła nie pasuje - zwróć domyślną cenę
  return {
    price: defaultPrice,
    ruleId: 'default',
    ruleName: 'Domyślna cena',
    confidence: 'low'
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
