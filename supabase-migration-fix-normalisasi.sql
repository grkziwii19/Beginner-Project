-- ============================================================
-- MIGRATION: Perbaikan Normalisasi Nama Kelas
-- Jalankan di: Supabase Dashboard > SQL Editor
-- ============================================================
--
-- MASALAH SEBELUMNYA:
-- normalized_name dihitung dengan logika SQL sendiri (UPPER + REPLACE
-- spasi/tanda hubung/titik), yang BERBEDA dari helper TypeScript
-- normalizeClassName(). SQL versi lama tidak mengonversi angka Romawi
-- dan tidak menghapus underscore/garis miring — sehingga "VI A" jadi
-- "VIA" di database, padahal di aplikasi seharusnya "6A". Dua sumber
-- kebenaran yang berbeda inilah akar masalah duplikasi yang lolos.
--
-- SOLUSI:
-- normalized_name TIDAK LAGI dihitung oleh SQL. Nilainya sekarang
-- WAJIB dikirim eksplisit oleh aplikasi (TypeScript) setiap kali insert
-- atau update, dihitung dari helper normalizeClassName() yang sama
-- dipakai untuk validasi di form. SQL hanya berperan sebagai penjaga
-- terakhir lewat UNIQUE constraint, bukan penghitung nilai.
--
-- Setelah migration ini, jalankan script
-- scripts/recompute-normalized-names.ts (Node, lihat README) untuk
-- mengisi ulang seluruh data lama dengan nilai yang benar dari
-- TypeScript, BARU kemudian constraint UNIQUE diaktifkan kembali.
-- ============================================================

-- 1) Lepas dulu constraint UNIQUE lama (kalau sempat dipasang),
--    supaya proses pengisian ulang nilai tidak diblokir oleh
--    constraint yang masih berisi data dari logika lama.
ALTER TABLE classes
  DROP CONSTRAINT IF EXISTS classes_user_normalized_name_unique;

-- 2) Kosongkan dulu semua nilai lama. Nilai yang benar akan diisi oleh
--    script Node (recompute-normalized-names.ts), BUKAN oleh SQL.
ALTER TABLE classes
  ALTER COLUMN normalized_name DROP NOT NULL;

UPDATE classes SET normalized_name = NULL;

-- 3) SETELAH script Node selesai mengisi ulang semua baris dengan nilai
--    yang benar, jalankan 2 baris berikut secara MANUAL (terpisah, di
--    SQL Editor) untuk mengaktifkan kembali constraint:
--
--    ALTER TABLE classes ALTER COLUMN normalized_name SET NOT NULL;
--    ALTER TABLE classes ADD CONSTRAINT classes_user_normalized_name_unique
--      UNIQUE (user_id, normalized_name);
--
-- Jangan jalankan 2 baris di atas sekarang — masih dikomentari di sini
-- sebagai pengingat urutan langkah, supaya tidak gagal karena data
-- belum terisi ulang.
