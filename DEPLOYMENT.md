# GitHub dan production

## Kondisi proyek saat ini

- Aplikasi terdiri dari Next.js (`web/`), API Express (`src/`), dan MySQL/Prisma (`prisma/`). GitHub menyimpan kode dan migrasi; data transaksi tetap berada di MySQL.
- Repository tujuan adalah `https://github.com/xRecodz/finance-request` dengan branch utama `main`. Direktori `.git` pada salinan kerja ini kosong, sehingga kode harus disatukan melalui clone repository tersebut; jangan menjalankan force push dari folder ini.
- `20sep26.sql` adalah dump berisi data karyawan dan transaksi, sehingga dikecualikan oleh `.gitignore`. `.env`, `web/.env.local`, dan `uploads/` juga tidak ikut Git. `prisma/migrations/**/*.sql` tetap boleh masuk Git.
- Repository GitHub saat ini sudah melacak `prisma/data/hris-employees.json` berisi sekitar 11.900 data karyawan. Berkas itu bukan database MySQL yang hidup. Aturan `.gitignore` baru mencegah penambahan baru, tetapi tidak menghapus berkas yang sudah ada dalam riwayat Git. Tinjau akses repository dan penanganan data karyawan sebelum rilis.
- Migrasi `prisma/migrations/0_init/migration.sql` berisi skema versi lama untuk database kosong. Migrasi `20260920_financev2` menambahkan fitur baru di atasnya. Pada database yang sudah berisi data, tandai hanya `0_init` sebagai sudah diterapkan; jangan jalankan SQL `0_init` terhadap database tersebut.

## Menyatukan kode dengan GitHub

Repository tujuan **sudah berisi kode versi lama**. Clone repository itu ke folder baru, buat branch kerja dari `main`, lalu bandingkan dan pindahkan perubahan proyek ini ke clone tersebut. Pertahankan berkas milik repository lama yang belum ada di folder lokal sampai tujuan dan datanya dipastikan. Periksa perbedaan `package.json`, `prisma/schema.prisma`, migrasi, dan konfigurasi sebelum commit. Buka pull request ke `main` setelah build dan uji berjalan. Jangan force push atau menimpa isi repository yang sudah ada.

Branch `feature/financev2-production` sudah didorong ke GitHub melalui pull request draft [#1](https://github.com/xRecodz/finance-request/pull/1). Workflow `.github/workflows/ci.yml` memeriksa test dan build pada pull request; pemeriksaan awalnya lulus. Workflow ini tidak mengubah VPS atau MySQL. Pull request belum digabungkan ke `main`.

Saat menyalin kode ke branch kerja, kecualikan `.git`, `20sep26.sql`, `.env*`, `node_modules`, `dist`, `.next`, dan `uploads`. Commit kode, migrasi, `.env.example`, serta dokumentasi. Periksa daftar file yang akan di-commit dengan `git status --short` dan `git diff --cached --name-only` sebelum push.

Panduan resmi: [menambahkan kode lokal ke GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github) dan [alur pull request](https://docs.github.com/en/pull-requests/get-started/pull-request-quickstart).

## Menentukan sumber data production

Sumber utama yang dipilih adalah **MySQL production yang sudah aktif**. Pertahankan database itu. Ambil backup, bandingkan skemanya dengan `prisma/schema.prisma` pada salinan staging, lalu terapkan hanya perubahan yang belum ada. Jangan impor ulang `20sep26.sql` karena itu membawa snapshot lama dan dapat berbenturan dengan transaksi terbaru.

Jika kelak perlu memindahkan data ke server database baru, pilih **satu** sumber utama untuk data transaksi dan akun:

1. **Ingin membawa data lama:** pulihkan backup MySQL terbaru dari tempat penyimpanan privat. `20sep26.sql` hanya layak dipakai jika memang itulah snapshot yang dipilih dan tidak ada data lebih baru. Setelah dipulihkan, terapkan perubahan skema yang sesuai.
2. **Mulai dari nol:** dua migrasi yang sudah ada dapat membuat skema baru secara berurutan, tetapi data awal yang diperlukan harus disiapkan terpisah. Ini bukan alur untuk mengganti database production yang sudah berisi data.

Untuk database yang berasal dari skema versi lama, pulihkan backup terbaru ke database staging. Di staging, jalankan `npx prisma migrate resolve --applied 0_init`, kemudian `npx prisma migrate deploy` dan `npm run db:backfill`. Periksa jumlah data dan alur utama. Ulangi pada production hanya setelah hasil staging sesuai. `migrate resolve` mencatat migrasi awal tanpa menjalankan SQL-nya; `migrate deploy` menerapkan perubahan baru. Jangan menjalankan `prisma migrate reset` atau `prisma db push` pada database berisi data production.

Panduan resmi: [baselining database yang sudah ada](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining) dan [migrasi production](https://docs.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate).

## Menjalankan aplikasi production

Target production: Ubuntu 24.04 pada VPS `185.250.38.226`, direktori `/var/www/finance`, domain `pengajuan.slcorp.or.id`, dan MySQL yang sudah berisi data. Pada 20 September 2026, domain sudah merespons lewat Nginx/Next.js dan `/api/health` melaporkan `env=production`. Jadi ini adalah pembaruan layanan yang sedang aktif. Lokasi dan akses MySQL perlu diverifikasi di VPS; gunakan database yang sekarang sebagai sumber utama.

Pengguna memilih menjalankan perintah di VPS sendiri. Akses SSH otomatis dari mesin pengembang ke `root@185.250.38.226` belum tersedia. Perintah audit pertama hanya membaca status Git, nama variabel `.env`, proses, dan lokasi upload. Jangan mengirim isi `.env` atau kredensial melalui chat.

`.env` lama dapat dipertahankan: nama variabel inti API pada versi baru sama dengan versi sebelumnya. Pertahankan `DATABASE_URL` dan konfigurasi R2 yang benar; pastikan `NODE_ENV=production`. `JWT_SECRET` wajib berupa nilai acak sendiri minimal 32 karakter: nilai contoh di `.env.example` ditolak oleh API production. Menggantinya membuat sesi login lama perlu masuk ulang, tetapi tidak mengubah data transaksi. Variabel `AI_*` dan `SMTP_*` bersifat opsional. Jangan menyalin `.env.example` di atas `.env` production dan jangan menampilkan isinya dalam tiket atau chat.

Jalankan dua proses Node.js dan satu database MySQL yang persisten:

1. API: `npm ci`, `npx prisma generate`, `npm run build`, lalu `npm start` pada port internal 3100.
2. Website: `npm --prefix web ci`, `npm --prefix web run build`, lalu `npm --prefix web run start` pada port internal 3000.
3. Atur `API_URL` untuk Next.js ke alamat internal API yang bisa dijangkau server website. Jika kedua proses berada pada mesin yang sama, gunakan `http://127.0.0.1:3100`. Konfigurasi rewrite `/api` dan `/uploads` berada di `web/next.config.ts`.
4. Letakkan Nginx dengan HTTPS di depan website: `/` ke Next.js port 3000, `/api/` dan `/uploads/` ke Express port 3100. Teruskan header `Host` dan `X-Forwarded-*`. Port 3000, 3100, dan MySQL hanya boleh diakses secara internal. Jika R2 belum dipakai, direktori `uploads/` harus berada pada storage persisten dan tetap tersedia saat rilis baru.

Simpan `DATABASE_URL`, `JWT_SECRET`, kredensial R2, dan kunci AI sebagai environment variable/secret pada server deployment. Jangan mengandalkan `.env.example` sebagai konfigurasi production. Set `NODE_ENV=production`. Uji `/api/health`, login, pembuatan draft, approval, pencairan, dan akses lampiran pada staging sebelum memindahkan traffic.

Panduan resmi: [self-hosting Next.js](https://nextjs.org/docs/app/guides/self-hosting).

## Urutan pembaruan di VPS

1. Inventarisasi service, direktori aplikasi, konfigurasi Nginx, lokasi upload, dan koneksi MySQL yang sedang dipakai. Catat commit yang sedang berjalan dan siapkan cara kembali ke rilis itu jika pemeriksaan gagal.
2. Setelah pull request masuk `main`, ambil commit baru pada direktori aplikasi di VPS. Simpan environment production di server, di luar Git. Gunakan kredensial MySQL production yang sudah ada, `NODE_ENV=production`, dan `JWT_SECRET` yang tetap sama agar sesi yang masih berlaku tidak terputus.
3. Ambil backup MySQL terbaru, pulihkan ke database staging, tandai migrasi skema lama dengan `npx prisma migrate resolve --applied 0_init`, lalu uji `npx prisma migrate deploy` serta backfill pada staging. Cocokkan jumlah data dan skema production dengan staging sebelum menerapkan langkah yang sama pada production. Jangan menjalankan migrasi yang sama dua kali secara manual.
4. Build API dan website. Atur proses permanen dengan systemd, lalu jalankan keduanya di localhost. Nginx meneruskan trafik publik ke kedua proses. Uji `/api/health`, login, pengajuan draft dan submit, approval, pencairan, serta lampiran.
5. Untuk rilis berikutnya: backup database, `git pull` dari `main` atau deploy commit/tag yang disetujui, `npm ci` untuk kedua aplikasi, `npx prisma migrate deploy`, build, restart service, lalu smoke test. Jangan menjalankan seed atau reset password admin pada database production yang sudah dipakai.
