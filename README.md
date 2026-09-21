# Website Pengajuan Finance SL Indonesia

Website Next.js (`web/`), API Express (`src/`), dan MySQL/Prisma (`prisma/`). Alur pengajuan baru: pemohon → manager divisi → petugas pencairan Finance atau Sekretariat. Pengajuan lama tetap terbaca dengan `workflowVersion=1`.

Untuk menyatukan kode dengan repository GitHub dan menjalankannya pada VPS tanpa mengganti database production, lihat [DEPLOYMENT.md](DEPLOYMENT.md).

## Menjalankan secara lokal

Di Linux dengan MySQL 8, jalankan dari direktori proyek. Perintah ini membuat **salinan lokal** dari `20sep26.sql`; database lain tidak disentuh.

```bash
sudo systemctl start mysql
sudo mysql
```

Di prompt MySQL, jalankan (ganti password contoh bila perlu):

```sql
CREATE DATABASE sl_finance_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'finance_local'@'127.0.0.1' IDENTIFIED WITH caching_sha2_password BY 'FinanceLocal2026';
GRANT ALL PRIVILEGES ON sl_finance_local.* TO 'finance_local'@'127.0.0.1';
EXIT;
```

Kemudian impor dump dan isi environment:

```bash
mysql -h 127.0.0.1 -u finance_local -p sl_finance_local < 20sep26.sql
cp .env.example .env
openssl rand -hex 32
```

Di `.env`, ubah `DATABASE_URL` menjadi `mysql://finance_local:FinanceLocal2026@127.0.0.1:3306/sl_finance_local` dan ganti `JWT_SECRET` dengan keluaran `openssl` tadi. `DEFAULT_PASSWORD=100100` boleh dibiarkan untuk uji lokal.

```bash
npm ci
npm --prefix web ci
npm run db:migrate:existing
npm run db:generate
npm run db:backfill
RESET_ADMIN_PASSWORD=1 npm run admin:ensure
```

Jalankan dua terminal dari direktori proyek:

```bash
# Terminal 1: API di port 3100
npm run dev
```

```bash
# Terminal 2: Next.js di port 3000
npm run dev:web
```

Buka `http://localhost:3000`. Untuk login pertama Portal IT pada **salinan lokal**, gunakan NIP `SLI.ADMIN` dan password `100100`, lalu buat password pribadi dan lengkapi profil. Flag `RESET_ADMIN_PASSWORD=1` sengaja mereset akun admin lama hanya saat perintah itu dipakai. Perintah migrasi hanya dijalankan **sekali** pada database hasil dump; `db:backfill` aman dijalankan ulang. Pada database kosong, gunakan `npm run db:push` dan `npm run db:seed` sebagai ganti impor serta migrasi existing.

`web/next.config.ts` meneruskan `/api` dan `/uploads` ke API port 3100. Jika alamat API berbeda, isi `API_URL` pada environment proses Next.js. Kunci AI hanya berada di `.env` server.

## Portal

- **Pemohon:** NIP + password, ganti password pertama kali, pilih divisi dan penempatan, buat draft/kirim, pantau status dan pencairan, preview dokumen serta unduh PDF/PNG.
- **Approval:** manager hanya memutuskan pengajuan yang ditugaskan; petugas pencairan hanya mencatat pengajuan yang sudah disetujui. Satu akun dapat menjalankan kedua tugas.
- **IT:** kelola user, profil/divisi, aturan manager dan petugas pencairan, password awal, koreksi penugasan yang masih menunggu, audit, dashboard operasional, dan chat AI.

Manager default: Marketing → Amrih, GA/HRD → Sari, IT/Accounting/Audit → Handoyo, Finance/IC → Ega. Manager Operasional harus diatur Portal IT. Petugas default: Finance HO → Resi, Finance Outlet → Belly, Sekretariat HO/Outlet → Sari. Aturan dapat diubah di Portal IT. Perubahan aturan berlaku untuk pengajuan berikutnya; tugas yang sudah dibuat dapat dikoreksi dengan alasan melalui menu **Perbaiki penugasan pengajuan**.

## AI opsional

Isi `AI_PROVIDER=gemini`, `AI_MODEL`, dan `AI_API_KEY` untuk Gemini. Untuk endpoint chat completions 9Router, isi `AI_PROVIDER=9router`, `AI_MODEL`, `AI_API_KEY`, dan `AI_API_URL`. Panel hanya tersedia bagi akun IT/Admin; model mendapat ringkasan jumlah dan tidak dapat menulis database. Tanpa konfigurasi, portal lain tetap berjalan.

## Verifikasi

`npm run build` dan `npm --prefix web run build` memeriksa kompilasi. Untuk uji antarmuka, buat user baru di Portal IT, login sebagai pemohon, pilih divisi dan penempatan, kirim pengajuan, lalu login sebagai manager dan petugas pencairan yang ditampilkan pada preview rute. `npm run verify:workflow` hanya dapat dijalankan pada database uji terpisah bernama `sl_finance_test`; skrip membuat transaksi uji untuk lima variasi alur, jadi jangan jalankan terhadap data produksi.
