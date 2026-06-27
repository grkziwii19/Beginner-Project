/**
 * Satu-satunya sumber kebenaran untuk normalisasi nama kelas.
 * Dipakai oleh: ClassForm (cek duplikat di frontend), handleAddClass/
 * handleEditClass (hitung normalized_name sebelum insert/update ke
 * Supabase), dan script migrasi data lama (scripts/recompute-normalized-names.ts).
 *
 * PERBAIKAN dari versi sebelumnya:
 * Versi lama menjalankan konversi angka Romawi (regex \b...\b) SEBELUM
 * menghapus separator (spasi, underscore, dll). Ini menyebabkan dua bug:
 *
 * 1. "VI_A" tidak terdeteksi sebagai kata "VI" yang utuh oleh \b, karena
 *    underscore dianggap karakter "word" oleh regex \b — sehingga "VI"
 *    tidak pernah dikonversi jadi "6".
 * 2. "V I A" (dengan spasi memisahkan setiap huruf) membuat "V" dan "I"
 *    terbaca sebagai DUA kata Romawi terpisah ("V"->5, "I"->1), bukan
 *    satu kesatuan "VI"->6.
 *
 * Perbaikan: hapus SEMUA separator dan spasi LEBIH DULU, sehingga string
 * jadi satu blok karakter tanpa pemisah (mis. "VIA", "VI_A" -> "VIA",
 * "V I A" -> "VIA"). Setelah itu, deteksi prefix angka Romawi di awal
 * string dilakukan dengan mencocokkan dari kombinasi terpanjang ke
 * terpendek, supaya "VIII" tidak salah terbaca sebagai "VI" + "II".
 */

// Daftar angka Romawi diurutkan dari yang TERPANJANG ke TERPENDEK.
// Urutan ini wajib, supaya pencocokan "VIII" tidak berhenti di "VI" dulu.
const ROMAN_TO_ARABIC: [string, string][] = [
  ['XII', '12'],
  ['XI', '11'],
  ['VIII', '8'],
  ['VII', '7'],
  ['VI', '6'],
  ['IV', '4'],
  ['IX', '9'],
  ['X', '10'],
  ['V', '5'],
  ['III', '3'],
  ['II', '2'],
  ['I', '1'],
]

/**
 * Mengubah prefix angka Romawi di awal string jadi angka Arab.
 * Hanya mengonversi jika Romawi tersebut benar-benar berada di awal
 * (sebelum huruf kelas, misal "VIA" -> "6A"), bukan di tengah kata.
 */
function convertLeadingRoman(value: string): string {
  for (const [roman, arabic] of ROMAN_TO_ARABIC) {
    if (value.startsWith(roman)) {
      const rest = value.slice(roman.length)
      // Pastikan sisa setelah Romawi bukan huruf yang menyambung jadi
      // kata lain (mis. "VISI" tidak boleh terbaca "5SI"). Sisa harus
      // kosong atau dimulai huruf yang masuk akal sebagai label kelas
      // (A-Z) ATAU angka (untuk kasus seperti gabungan tingkat+nomor).
      if (rest === '' || /^[A-Z0-9]/.test(rest)) {
        return arabic + rest
      }
    }
  }
  return value
}

export function normalizeClassName(input: string): string {
  if (!input) return ''

  let value = input.trim().toUpperCase()

  // Hilangkan kata "KELAS" di awal, termasuk variasi spasinya
  value = value.replace(/^KELAS\s+/, '')

  // Hapus SEMUA separator dan spasi LEBIH DULU (sebelum deteksi Romawi).
  // Ini kunci perbaikannya: "VI_A", "VI-A", "V I A" semua jadi "VIA"
  // pada titik ini, sebelum dicek apakah diawali angka Romawi.
  value = value.replace(/[\s\-_./]/g, '')

  // Konversi prefix angka Romawi (jika ada) jadi angka Arab
  value = convertLeadingRoman(value)

  return value
}

/**
 * Validasi format nama kelas yang dianggap valid setelah dinormalisasi.
 * Pola: angka 1-12, opsional diikuti satu huruf label (A-Z).
 * Contoh valid: "6A" (dari "VI A"), "8C" (dari "8 C"), "10" (dari "X").
 */
export function isValidClassName(input: string): boolean {
  const value = normalizeClassName(input)
  return /^(1[0-2]|[1-9])([A-Z])?$/.test(value)
}

/**
 * Merapikan nama kelas yang DISIMPAN dan DITAMPILKAN ke pengguna —
 * berbeda tujuan dari normalizeClassName() yang dipakai untuk deteksi
 * duplikat. Fungsi ini TIDAK mengonversi Romawi ke Arab (jenis angka
 * yang diketik guru dipertahankan apa adanya), hanya merapikan jarak
 * antara bagian angka/Romawi dengan huruf label kelas.
 *
 * Contoh:
 *   "7A"     -> "7 A"     (angka biasa + huruf -> dipisah spasi)
 *   "7-A"    -> "7 A"
 *   "VIIIB"  -> "VIII B"  (Romawi + huruf -> dipisah spasi)
 *   "VIII_B" -> "VIII B"
 *   "3"      -> "3"       (tanpa huruf, tidak perlu spasi)
 *   "III"    -> "III"     (tanpa huruf, tidak perlu spasi)
 *
 * Dipakai SAAT MENYIMPAN (insert/update), bukan untuk pembanding
 * duplikat — pembanding duplikat tetap memakai normalizeClassName().
 */
export function formatClassName(input: string): string {
  if (!input) return ''

  let value = input.trim().toUpperCase()
  value = value.replace(/^KELAS\s+/, '')

  // Hapus semua separator dulu, sama seperti normalizeClassName,
  // supaya variasi penulisan apapun diproses dari titik awal yang sama.
  value = value.replace(/[\s\-_./]/g, '')

  // Pisahkan bagian "tingkat" (angka biasa ATAU angka Romawi di awal)
  // dari bagian "label" (sisa huruf setelahnya, jika ada).
  const match = value.match(/^([0-9]+|[IVX]+)([A-Z]*)$/)
  if (!match) return value // format tak dikenali, kembalikan apa adanya

  const [, tingkat, label] = match

  return label ? `${tingkat} ${label}` : tingkat
}
