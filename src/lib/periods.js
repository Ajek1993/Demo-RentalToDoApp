// Helper do formatowania daty
function formatDatePL(date) {
  return date.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Funkcja zwracająca listę dostępnych okresów rozliczeniowych
export function getPeriods(monthsBack = 12) {
  const periods = [];
  const today = new Date();
  const currentDay = today.getDate();

  // Oblicz bazowy okres (bieżący)
  let baseDate = new Date(today);
  if (currentDay < 16) {
    baseDate.setMonth(baseDate.getMonth() - 1);
  }

  for (let i = 0; i < monthsBack; i++) {
    const periodDate = new Date(baseDate);
    periodDate.setMonth(periodDate.getMonth() - i);

    const year = periodDate.getFullYear();
    const month = periodDate.getMonth();

    const start = new Date(year, month, 16);
    const end = new Date(year, month + 1, 15);

    periods.push({
      id: `period-${i}`,
      label: i === 0
        ? `Bieżący (${formatDatePL(start)} - ${formatDatePL(end)})`
        : `${formatDatePL(start)} - ${formatDatePL(end)}`,
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    });
  }

  return periods;
}

// Funkcja filtrowania kursów po okresie
export function filterByPeriod(kursy, periodStart, periodEnd) {
  return kursy.filter((kurs) => {
    const kursDate = kurs.data; // Zakładam format YYYY-MM-DD
    return kursDate >= periodStart && kursDate <= periodEnd;
  });
}
