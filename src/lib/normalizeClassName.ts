export function normalizeClassName(name: string): string {
  let normalized = name
    .trim()
    .toUpperCase()

  // Hilangkan kata "KELAS" di depan
  normalized = normalized.replace(/^KELAS\s+/, '')

  // Konversi angka Romawi ke angka
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
    normalized = normalized.replace(
      new RegExp(`\\b${roman}\\b`, 'g'),
      arabic
    )
  })

  // Hapus spasi, -, _, ., /
  normalized = normalized.replace(/[\s\-_.\/]/g, '')

  return normalized
}