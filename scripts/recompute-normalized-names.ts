/**
 * Script sekali-jalan untuk menghitung ulang normalized_name pada SEMUA
 * baris di tabel `classes`, menggunakan helper normalizeClassName() yang
 * SAMA PERSIS dipakai aplikasi (src/lib/normalizeClassName.ts).
 *
 * Ini memastikan tidak ada dua sumber kebenaran: nilai yang tersimpan di
 * database dihitung oleh kode TypeScript yang sama dengan yang dipakai
 * untuk validasi form, bukan oleh logika SQL yang terpisah.
 *
 * CARA MENJALANKAN:
 *   1. Pastikan file .env.local berisi NEXT_PUBLIC_SUPABASE_URL dan
 *      SUPABASE_SERVICE_ROLE_KEY (bukan anon key — script ini butuh
 *      akses tulis ke semua baris lintas user, jadi pakai service role).
 *   2. Jalankan migration SQL fix-normalisasi.sql TERLEBIH DAHULU.
 *   3. npx tsx scripts/recompute-normalized-names.ts
 *   4. Setelah selesai tanpa error, aktifkan kembali constraint UNIQUE
 *      sesuai instruksi di akhir file SQL migration.
 *
 * Jika ada baris yang ternyata bertabrakan setelah dihitung ulang
 * (dua kelas berbeda penulisan tapi sama setelah dinormalisasi, milik
 * user yang sama), script ini akan MELAPORKAN tabrakan tersebut di
 * konsol tanpa menghapus data apa pun — Anda perlu menggabungkan atau
 * mengganti nama salah satu kelas secara manual sebelum mengaktifkan
 * constraint UNIQUE.
 */

import { createClient } from '@supabase/supabase-js'
import { normalizeClassName, formatClassName } from '../src/lib/normalizeClassName'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi di .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function main() {
  console.log('📥 Mengambil semua baris dari tabel classes...')

  const { data: classes, error } = await supabase
    .from('classes')
    .select('id, user_id, name')

  if (error) {
    console.error('❌ Gagal mengambil data:', error.message)
    process.exit(1)
  }

  if (!classes || classes.length === 0) {
    console.log('Tidak ada data kelas untuk diproses.')
    return
  }

  console.log(`Ditemukan ${classes.length} kelas. Menghitung normalized_name...`)

  // Deteksi tabrakan dulu sebelum menulis apa pun ke database
  const seen = new Map<string, { id: string; name: string }[]>()

  for (const c of classes) {
    const normalized = normalizeClassName(c.name)
    const key = `${c.user_id}::${normalized}`
    const list = seen.get(key) ?? []
    list.push({ id: c.id, name: c.name })
    seen.set(key, list)
  }

  const collisions = [...seen.entries()].filter(([, rows]) => rows.length > 1)

  if (collisions.length > 0) {
    console.log('\n⚠️  DITEMUKAN TABRAKAN — kelas berikut akan dianggap SAMA setelah dinormalisasi:')
    collisions.forEach(([key, rows]) => {
      const normalized = key.split('::')[1]
      console.log(`\n  Normalized: "${normalized}"`)
      rows.forEach(r => console.log(`    - id=${r.id}  nama asli="${r.name}"`))
    })
    console.log('\n❌ Script DIHENTIKAN. Gabungkan atau ganti nama kelas yang bertabrakan')
    console.log('   secara manual di database, lalu jalankan script ini lagi.')
    process.exit(1)
  }

  console.log('✅ Tidak ada tabrakan. Menulis normalized_name dan merapikan name...')

  let successCount = 0
  for (const c of classes) {
    const normalized = normalizeClassName(c.name)
    const formatted = formatClassName(c.name)
    const { error: updateError } = await supabase
      .from('classes')
      .update({ normalized_name: normalized, name: formatted })
      .eq('id', c.id)

    if (updateError) {
      console.error(`❌ Gagal update kelas id=${c.id} (${c.name}):`, updateError.message)
    } else {
      successCount++
      if (c.name !== formatted) {
        console.log(`  📝 "${c.name}" dirapikan jadi "${formatted}"`)
      }
    }
  }

  console.log(`\n✅ Selesai. ${successCount}/${classes.length} baris berhasil diperbarui.`)
  console.log('\nLangkah selanjutnya: jalankan di SQL Editor untuk mengaktifkan constraint:')
  console.log('  ALTER TABLE classes ALTER COLUMN normalized_name SET NOT NULL;')
  console.log('  ALTER TABLE classes ADD CONSTRAINT classes_user_normalized_name_unique')
  console.log('    UNIQUE (user_id, normalized_name);')
}

main()
