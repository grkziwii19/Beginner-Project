# 📚 Asisten Guru — MVP

Sistem manajemen kelas digital untuk guru. Dibangun dengan Next.js, TypeScript, Supabase, dan Tailwind CSS.

---

## 🚀 Cara Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Setup Supabase

1. Buat akun dan project baru di [supabase.com](https://supabase.com)
2. Buka **SQL Editor** di dashboard Supabase
3. Copy & paste isi file `supabase-schema.sql`, lalu jalankan
4. Salin **Project URL** dan **Anon Key** dari Settings → API

### 3. Buat file `.env.local`
```bash
cp .env.example .env.local
```
Lalu isi dengan nilai dari Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
```

### 4. Jalankan aplikasi
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000)

---

## 📁 Struktur Folder

```
src/
├── app/
│   ├── (dashboard)/          ← Layout dengan sidebar
│   │   ├── dashboard/        ← Ringkasan statistik kelas
│   │   ├── students/         ← CRUD data siswa
│   │   ├── attendance/       ← Input absensi harian
│   │   ├── grades/           ← Input & rekap nilai
│   │   ├── import/           ← Import siswa dari Excel
│   │   └── settings/         ← Pengaturan akun
│   ├── login/                ← Halaman login & register
│   ├── layout.tsx
│   └── globals.css
├── components/
│   └── layout/
│       └── Sidebar.tsx
├── lib/
│   └── supabase/
│       ├── client.ts         ← Browser client
│       └── server.ts         ← Server client
├── types/
│   └── index.ts              ← Semua tipe TypeScript + helper
└── middleware.ts              ← Proteksi route
```

---

## ✨ Fitur MVP

| Fitur | Status |
|---|---|
| Login & Register (Supabase Auth) | ✅ |
| Manajemen Siswa (CRUD) | ✅ |
| Import Siswa dari Excel | ✅ |
| Input Absensi Harian | ✅ |
| Update absensi (upsert, bukan duplikat) | ✅ |
| Input Nilai (Tugas, UTS, UAS, Proyek) | ✅ |
| Predikat otomatis (A/B/C/D) | ✅ |
| Dashboard ringkasan kelas | ✅ |
| Isolasi data per guru (user_id) | ✅ |
| Row Level Security (Supabase RLS) | ✅ |

---

## 🗃️ Database

Semua tabel dilindungi RLS. Setiap guru hanya bisa akses datanya sendiri.

- **students** — Data siswa
- **attendance** — Absensi harian (UNIQUE: student_id + date)
- **grades** — Nilai per jenis (tugas/uts/uas/proyek)
- **classes** — Daftar kelas (opsional)

---

## 🛠️ Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Supabase** (Auth + PostgreSQL + RLS)
- **Tailwind CSS**
- **xlsx** (import/export Excel)
- **lucide-react** (ikon)
