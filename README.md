# SL INDONESIA — Sistem Permohonan Finance

Aplikasi internal untuk permohonan dana/barang, approval (Direktur / Finance), pencairan, hingga LPJ (Laporan Pertanggungjawaban).

## Fitur

- Login NIP (data karyawan dari HRIS) + wajib ganti password saat pertama masuk
- Portal **Pemohon**: buat pengajuan, pilih jalur approval, cetak dokumen, upload LPJ
- Portal **Approval**: antrian pending, setujui/tolak/revisi, pencairan, verifikasi LPJ, grafik dashboard
- Preview dokumen pengajuan & lampiran (PDF/gambar)
- Upload file lokal (development) atau Cloudflare R2 (produksi)

## Stack

| Layer | Teknologi |
|-------|-----------|
| API | Express, Prisma, MySQL, JWT |
| Web | Next.js 15, Tailwind CSS, Recharts |
| Storage | Lokal `uploads/` atau Cloudflare R2 |

## Struktur

```
finance/
├── src/                 # API Express
├── prisma/              # Schema, seed, whitelist approver
├── web/                 # Frontend Next.js
├── scripts/             # Utilitas (extract HRIS, sync approver, dll)
└── .env.example         # Template environment
```

## Setup development

### Prasyarat

- Node.js 20+
- MySQL 8+

### Langkah

```bash
# 1. Clone & install
git clone <url-repo-ini>
cd finance
npm install
npm --prefix web install

# 2. Environment
cp .env.example .env
# Edit DATABASE_URL, JWT_SECRET, DEFAULT_PASSWORD, dll.

# 3. Database
mysql -u <user> -p -e "CREATE DATABASE IF NOT EXISTS sl_finance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
npx prisma db push

# 4. (Opsional) Import NIP dari dump HRIS
# npm run hris:extract -- /path/ke/hris.sql
npm run db:seed
npm run approvers:sync

# 5. Jalankan
npm run dev          # API  → http://localhost:3100
npm run dev:web      # Web  → http://localhost:3000
```

Web mem-proxy `/api/*` ke API (lihat `web/.env.local` / `API_URL`).

## Environment

Salin dari `.env.example`. Yang wajib diisi:

| Variabel | Keterangan |
|----------|------------|
| `DATABASE_URL` | Koneksi MySQL Prisma |
| `JWT_SECRET` | Secret JWT (minimal 32 karakter, beda tiap environment) |
| `DEFAULT_PASSWORD` | Password awal akun baru / hasil seed |
| `R2_*` | Opsional; jika kosong, file disimpan di folder `uploads/` |

Jangan commit file `.env`.

## Role & whitelist Approval

- Default karyawan hasil seed = **Pemohon**
- NIP yang boleh masuk portal Approval diatur di `prisma/whitelist-approvers.ts`
- Setelah mengubah whitelist: `npm run approvers:sync`

## Alur pengajuan (ringkas)

1. Pemohon login → ganti password → buat pengajuan → pilih jalur (Direktur / Finance)
2. Approver setujui / tolak / minta revisi
3. Approver cairkan dana (+ bukti transfer)
4. Pemohon upload LPJ
5. Approver verifikasi LPJ → selesai

## Scripts

| Command | Fungsi |
|---------|--------|
| `npm run dev` | API development |
| `npm run dev:web` | Web development |
| `npm run build` / `build:web` | Build production |
| `npm start` | Jalankan API hasil build |
| `npm run db:push` | Sinkron schema Prisma → MySQL |
| `npm run db:seed` | Seed kategori + import NIP HRIS |
| `npm run approvers:sync` | Terapkan whitelist Approval |
| `npm run hris:extract` | Ekstrak NIP dari dump SQL HRIS |

## Deploy (VPS)

1. Pull repo di server
2. Siapkan `.env` production (DB, `JWT_SECRET`, R2 bila dipakai)
3. Install & sinkron schema:

```bash
npm install
npm --prefix web install
npx prisma db push
```

4. Build & restart (contoh PM2):

```bash
npm run build && npm run build:web
pm2 restart finance-api finance-web
```

Pastikan firewall / Nginx mem-proxy web dan API sesuai kebutuhan.

### Deploy role IT (aman production)

Migrasi hanya menambah enum `UserRole.IT`. **Tidak** mengubah password atau pengajuan yang sudah ada.

1. Backup DB dulu:

```bash
mysqldump sl_finance > backup-before-it-role.sql
```

2. `git pull` → `npx prisma db push` → build → `pm2 restart finance-api finance-web`

3. Promote **satu** NIP menjadi IT (ganti NIP):

```sql
UPDATE User SET role='IT', approverTrack=NULL WHERE nip='NIP_IT_ANDA';
-- JANGAN ubah passwordHash
```

4. Verifikasi: user lama masih login; pengajuan lama utuh; Portal IT bisa create NIP baru.

**Jangan** jalankan ulang `npm run db:seed` / reset password massal di production yang sudah berisi data. Seed hanya untuk setup awal / staging kosong.

## Keamanan

- Repo ini untuk penggunaan internal perusahaan
- Ganti `JWT_SECRET` dan password default sebelum production
- Batasi akses database & jangan expose MySQL ke publik
- Whitelist Approval hanya berisi NIP yang berwenang
- Portal IT: buat/edit user & reset password eksplisit saja; tidak hard-delete user yang punya pengajuan

## Lisensi

Private / internal — SL INDONESIA.
