export function normalizeClassName(input: string): string {
  let value = input
    .trim()
    .toUpperCase()

  // Hilangkan kata KELAS
  value = value.replace(/^KELAS\s+/, '')

  // Angka Romawi -> Arab
  const romanMap: Record<string, string> = {
    XII: '12',
    XI: '11',
    X: '10',
    IX: '9',
    VIII: '8',
    VII: '7',
    VI: '6',
    V: '5',
    IV: '4',
    III: '3',
    II: '2',
    I: '1',
  }

  Object.entries(romanMap).forEach(([roman, arabic]) => {
    value = value.replace(
      new RegExp(`\\b${roman}\\b`, 'g'),
      arabic
    )
  })

  // Hilangkan pemisah
  value = value.replace(/[\s\-_.\/]/g, '')

  return value
}

export function isValidClassName(input: string): boolean {
  const value = normalizeClassName(input)

  return /^(1|2|3|4|5|6|7|8|9|10|11|12)([A-Z])?$/.test(value)
}