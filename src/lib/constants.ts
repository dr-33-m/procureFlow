export const LOW_STOCK_THRESHOLD = 10

export const SHIFTS = [
  { label: 'Night Shift', start: 0, end: 8 },
  { label: 'Day Shift', start: 8, end: 16 },
  { label: 'Evening Shift', start: 16, end: 24 },
]

export const STATIONS = [
  'Main Kitchen',
  'Pastry Section',
  'Bar',
  'Banquet Hall',
  'Room Service',
  'Main Line Station',
]

export function getCurrentShift(): string {
  const hour = new Date().getHours()
  if (hour < 8) return 'Night Shift'
  if (hour < 16) return 'Day Shift'
  return 'Evening Shift'
}
