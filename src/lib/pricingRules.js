/**
 * Reguły cenowe dla kursów
 * Priorytet: niższa liczba = wyższy priorytet (sprawdzana wcześniej)
 */
export const pricingRules = [
  // Transfer/odbiór serwis/blacharnia/komis - najwyższy priorytet
  {
    id: 'transfer_grota',
    name: 'Transfer/odbiór serwis/blacharnia/komis Grota',
    operationTypes: ['transfer', 'odbiór'],
    locationKeywords: ['grota'],
    excludeKeywords: [],
    requiresOC: false,
    requiresSerwis: false, // może być serwis, blacharnia lub komis
    requiresServiceType: true, // wymaga słowa: serwis, blacharnia lub komis
    price: 25,
    priority: 1
  },
  {
    id: 'transfer_opolska',
    name: 'Transfer/odbiór serwis/blacharnia/komis Opolska',
    operationTypes: ['transfer', 'odbiór'],
    locationKeywords: ['opolska'],
    excludeKeywords: [],
    requiresOC: false,
    requiresSerwis: false,
    requiresServiceType: true,
    price: 35,
    priority: 2
  },

  // OC Pia/Piekary - przed ogólnym OC
  {
    id: 'oc_pia',
    name: 'Wydanie/odbiór OC Pia/Piekary',
    operationTypes: ['wydanie', 'odbiór'],
    locationKeywords: ['pia', 'piekary'],
    excludeKeywords: [],
    requiresOC: true,
    price: 45,
    priority: 10
  },

  // OC ogólne (różne ubezpieczalnie)
  {
    id: 'oc_general',
    name: 'Wydanie/odbiór OC (ubezpieczalnie)',
    operationTypes: ['wydanie', 'odbiór'],
    locationKeywords: [
      'anwa', 'anndora', 'opolska', 'grota',
      'kia patecki', 'patecki', 'partyka',
      'romanowski', 'dobrygowski', 'dobrzański',
      'kolanowski', 'kraków', 'krakow'
    ],
    excludeKeywords: ['balice'],
    requiresOC: true,
    price: 40,
    priority: 20
  },

  // Balice i do 40km
  {
    id: 'balice_40km',
    name: 'Wydanie/odbiór Balice i do 40km',
    operationTypes: ['wydanie', 'odbiór'],
    locationKeywords: ['balice'],
    excludeKeywords: [],
    requiresOC: false,
    price: 50,
    priority: 30
  },

  // Dystans 40-100km
  {
    id: 'distance_40_100',
    name: 'Wydanie/odbiór 40-100km',
    operationTypes: ['wydanie', 'odbiór'],
    locationKeywords: ['40km', '50km', '60km', '70km', '80km', '90km', '100km', '40 km', '50 km', '60 km', '70 km', '80 km', '90 km', '100 km'],
    excludeKeywords: [],
    requiresOC: false,
    price: 70,
    priority: 40
  },

  // Domyślna reguła dla wydanie/odbiór Kraków
  {
    id: 'krakow_default',
    name: 'Wydanie/odbiór Kraków',
    operationTypes: ['wydanie', 'odbiór'],
    locationKeywords: ['kraków', 'krakow'],
    excludeKeywords: ['balice'],
    requiresOC: false,
    price: 40,
    priority: 100
  }
]

// Dodatkowa opłata za każde 50km powyżej 100km
export const distanceRules = {
  threshold: 100,
  increment: 50,
  pricePerIncrement: 12
}

// Domyślna cena gdy żadna reguła nie pasuje
export const defaultPrice = 40
