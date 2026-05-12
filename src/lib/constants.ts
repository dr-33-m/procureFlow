export const LOW_STOCK_THRESHOLD = 10

export const SHIFTS = [
  { label: 'Night Shift', start: 0, end: 8 },
  { label: 'Day Shift', start: 8, end: 16 },
  { label: 'Evening Shift', start: 16, end: 24 },
]

export function getCurrentShift(): string {
  const hour = new Date().getHours()
  if (hour < 8) return 'Night Shift'
  if (hour < 16) return 'Day Shift'
  return 'Evening Shift'
}

// Common serving presets keyed by serving name.
// When the user types a serving name and the product's baseUnit matches,
// the UI auto-fills servingSize for convenience.
export const SERVING_PRESETS: Record<string, { baseUnit: string; size: number }[]> = {
  glass:      [{ baseUnit: 'ml', size: 250 }],
  cup:        [{ baseUnit: 'ml', size: 250 }],
  tablespoon: [{ baseUnit: 'ml', size: 15 }],
  tbsp:       [{ baseUnit: 'ml', size: 15 }],
  teaspoon:   [{ baseUnit: 'ml', size: 5 }],
  tsp:        [{ baseUnit: 'ml', size: 5 }],
  portion:    [{ baseUnit: 'g', size: 200 }],
  scoop:      [{ baseUnit: 'g', size: 30 }],
  slice:      [{ baseUnit: 'g', size: 30 }],
}
