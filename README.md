# SL INDONESIA — Sistem Permohonan Finance

Portal pengajuan dana/barang, approval (Direktur / Finance), pencairan, dan LPJ.

## Stack

- API: Express + Prisma + MySQL (`:3100`)
- Web: Next.js 15 (`:3000`)
- Upload: lokal `uploads/` (dev) atau Cloudflare R2 (produksi)

## Setup lokal

```bash
# 1) DB
mysql -uroot -p1 -e "CREATE DATABASE IF NOT EXISTS sl_finance;"

# 2) Env
cp .env.example .env
# pastikan DEFAULT_PASSWORD=100100

# 3) Schema + seed NIP dari HRIS
npm install
npm run hris:extract   # dari /home/loc/dumps/hris.sql (opsional jika JSON sudah ada)
npx prisma db push
npm run db:seed

# 4) Jalankan
npm run dev            # API :3100
npm run dev:web        # Web :3000
```

## Akun uji

| NIP | Role | Password awal |
|-----|------|---------------|
| NIP dari HRIS | Pemohon | `100100` |
| `DIR001` | Approval Direktur | `100100` |
| `FIN001` | Approval Finance | `100100` |
| `ADMIN001` | Admin | `100100` |

Login pertama **wajib ganti password** (minimal 6 karakter, huruf + angka).

## Deploy singkat (VPS)

1. Push repo ke GitHub, pull di VPS
2. Isi `.env` production (`DATABASE_URL`, `JWT_SECRET`, opsional R2)
3. `npm install && npx prisma db push && npm run db:seed`
4. `npm run build && npm start` (API) + `npm run build:web && npm --prefix web start`
