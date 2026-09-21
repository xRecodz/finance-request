# PRD Website Pengajuan Finance dan Sekretariat

**Versi:** 1.7
**Tanggal:** 20 September 2026
**Sumber awal:** kebutuhan pengguna dan struktur `20sep26.sql`

## 1. Tujuan

Menyediakan website agar karyawan dapat membuat, menyimpan, mengirim, memantau, dan mencetak pengajuan Dana, Reimbursement, atau Barang. Manager sesuai divisi pemohon lebih dulu menyetujui, meminta revisi, atau menolak. Setelah disetujui manager, petugas Finance atau Sekretariat sesuai jalur dan tujuan melakukan pencairan. Keputusan dan pencairan tercatat pada sistem dan dokumen PDF.

## 2. Istilah dan aturan utama

- **Jalur pengajuan:** Finance atau Sekretariat. Ini menentukan unit petugas pencairan.
- **Tujuan pengajuan:** Head Office atau Outlet. Ini menentukan petugas pencairan pada jalur Finance serta daftar kategori pada formulir.
- **Kategori:** Untuk Head Office berupa departemen/keperluan; untuk Outlet berupa nama outlet. Kategori tujuan tidak menentukan manager pemohon.
- **Unit pemohon:** Divisi atau outlet tempat akun pemohon bekerja. Ini menentukan manager tahap pertama melalui pengaturan admin.
- **Role:** Hak melakukan tindakan di sistem. Satu orang dapat menjadi manager sekaligus petugas pencairan; tindakan persetujuan dan pencairan tetap dicatat terpisah. Pemohon tidak boleh menyetujui pengajuannya sendiri.

Istilah “Pengajuan kepada Head Office/Outlet” pada formulir dipakai sebagai **tujuan pengajuan**. Pilihan Head Office/Outlet yang disebut setelah jalur adalah field yang sama, sehingga pemohon tidak perlu memilih dua kali.

## 3. Pengguna dan hak akses

| Aktor | Hak utama |
| --- | --- |
| Pemohon | Buat dan ubah draft miliknya, kirim, lihat status, tanggapi permintaan revisi, lihat/unduh PDF miliknya. |
| Manager | Lihat pengajuan yang ditugaskan kepadanya, setujui, minta revisi, atau tolak dengan catatan. |
| Petugas Finance / Sekretariat | Lihat pengajuan yang telah disetujui manager pada antreannya, catat pencairan dan unggah bukti transfer. |
| Admin | Kelola akun, unit/divisi, outlet, kategori, hubungan pemohon–manager, penugasan petugas pencairan, dan audit. |
| IT dengan izin portal | Bantu koreksi akun, reset password, dan penugasan role sesuai izin yang diberikan admin. Divisi IT saja tidak otomatis memberi akses portal. |

Hak akses harus diperiksa di server. Pemohon hanya melihat pengajuan miliknya; manager hanya dapat memutuskan pengajuan yang ditugaskan kepadanya, dan petugas pencairan hanya dapat memproses pengajuan yang telah disetujui manager dan masuk ke antreannya. Admin dapat melihat seluruh data sesuai kebijakan perusahaan.

## 4. Routing manager dan pencairan

### 4.1 Manager berdasarkan divisi pemohon

| Divisi pemohon | Manager awal | NIP |
| --- | --- | --- |
| Marketing | Amrih Hayu Aminanto | 1306.1.81.00690 |
| HRD, GA | Sari Kumala Dewi | 1109.0.86.00052 |
| IT, Accounting, Audit | Muhammad Handoyo | 1511.1.77.00020 |
| Finance, IC | Ega Hardianto | 1805.1.81.03499 |
| Outlet/Operasional | Diatur admin per outlet atau unit operasional | Belum diberikan |

Penentuan manager menggunakan **divisi asal pemohon**, bukan kategori tujuan pada formulir. Contoh user IT yang memilih kategori GA tetap masuk ke Muhammad Handoyo. Mapping di atas adalah konfigurasi awal yang dapat diubah admin tanpa mengubah kode. Saat submit, `Request.managerId` menyimpan akun manager hasil penentuan agar histori pengajuan tetap jelas.

### 4.2 Petugas pencairan berdasarkan jalur dan tujuan

| Jalur | Tujuan | Petugas pencairan awal | NIP |
| --- | --- | --- | --- |
| Finance | Head Office | Resi Kurnia | 1906.0.96.05580 |
| Finance | Outlet | Belly Suci Aolisa | 1512.0.94.01171 |
| Sekretariat | Head Office | Sari Kumala Dewi | 1109.0.86.00052 |
| Sekretariat | Outlet | Sari Kumala Dewi | 1109.0.86.00052 |

Petugas pencairan dipilih dari akun aktif berdasarkan NIP/User ID dan disimpan pada pengajuan saat submit. Nama dan NIP merupakan konfigurasi awal, bukan kondisi yang ditanam permanen di kode. **Perlu verifikasi identitas:** pengguna menyebut “Resi Kurniasih” dengan NIP `1906.0.96.05580`, sedangkan dump menyimpan NIP tersebut sebagai **Resi Kurnia**, aktif dan berperan `APPROVER`. Dump juga memiliki akun berbeda bernama Resi Kurniasih yang tidak aktif. Karena itu routing memakai NIP yang diberikan dan nama tampilan perlu dibetulkan/ditetapkan oleh admin sebelum rilis.

### 4.3 Alur nyata

`Pemohon → Manager sesuai divisi (Setujui / Revisi / Tolak) → Petugas Finance atau Sekretariat (Pencairan) → Selesai`

| Contoh | Asal pemohon dan jalur | Manager yang memutuskan | Setelah disetujui manager |
| --- | --- | --- | --- |
| A | GA → Finance | Sari Kumala Dewi | Finance mencairkan; Resi untuk tujuan Head Office atau Belly untuk Outlet. |
| B | IT → Sekretariat | Muhammad Handoyo | Sari Kumala Dewi mencairkan. |
| C | IT → Finance | Muhammad Handoyo | Finance mencairkan; Resi untuk tujuan Head Office atau Belly untuk Outlet. |
| D | GA/HRD → Sekretariat | Sari Kumala Dewi | Sari Kumala Dewi mencairkan dalam tindakan terpisah. |

Pada contoh D, Sari adalah manager sekaligus petugas pencairan. Sistem tetap membuat dua jejak tindakan: persetujuan manager dan pencairan. Tindakan kedua baru tersedia setelah tindakan pertama selesai. Ini sesuai alur yang diberikan pengguna; bila perusahaan mensyaratkan pemisahan pelaku, admin dapat menetapkan petugas pencairan pengganti.

Penentuan manager saat submit:

1. Gunakan manager khusus pada akun pemohon jika ada.
2. Jika tidak ada, gunakan manager aktif yang dipetakan ke unit/divisi pemohon. Untuk pemohon Outlet, gunakan outlet asal pemohon bila pengelolaan manager dilakukan per outlet; mapping Operasional umum dapat dipakai sebagai fallback yang dikonfigurasi.
3. Jika tidak ada manager valid, tahan pengiriman dan tampilkan pesan bahwa admin perlu melengkapi penugasan. Jangan diam-diam melewati approval manager.
4. Jika pemohon sama dengan manager, gunakan manager pengganti yang telah ditetapkan admin; jika belum ada, tahan pengiriman untuk ditangani admin.

Satu pengajuan memiliki satu manager penanggung jawab pada tahap pertama. Perubahan manager setelah submit tidak mengubah pengajuan yang sedang berjalan kecuali admin melakukan penugasan ulang dengan alasan dan jejak audit.

### 4.4 Jawaban atas kebutuhan role/divisi

**Ya, divisi atau unit kerja perlu dimodelkan untuk routing manager; role saja tidak cukup.** Role menjawab “akun ini boleh melakukan apa”, sedangkan unit dan relasi manager menjawab “pengajuan akun ini harus masuk ke siapa”. Teks `User.department` yang ada sekarang tidak cukup: beberapa akun manager di atas sama-sama memiliki nilai `DV0000000013` dalam dump. Perlu pemetaan unit yang jelas atau mapping manager langsung per akun, lalu `Request.managerId` menyimpan manager hasil penentuan per pengajuan.

Role pada dump juga belum cocok sepenuhnya dengan penugasan baru: Amrih masih `PEMOHON`, Sari masih `APPROVER`, sedangkan Handoyo dan Ega sudah `MANAGER`. Sari memerlukan izin manager sekaligus pencairan. Karena itu admin perlu mengatur izin terpisah, bukan sekadar mengganti satu nilai `User.role` dan kehilangan hak yang sudah ada.

## 5. Formulir pengajuan

| Field | Aturan |
| --- | --- |
| Jalur | Wajib: Finance / Sekretariat. |
| Tujuan | Wajib: Head Office / Outlet. |
| Jenis | Wajib: Dana / Reimbursement / Barang. |
| Kategori tujuan | Jika Head Office: Marketing, IT, HRD, GA, Opening Outlet, Lain-Lain. Jika Outlet: pilih satu nama outlet aktif dari master outlet. |
| Judul dan keperluan | Wajib saat kirim; boleh belum lengkap saat simpan draft. |
| Tanggal dibutuhkan | Wajib saat kirim. Tanggal lampau memerlukan validasi/pesan yang jelas; untuk reimbursement kebijakan tanggal perlu ditetapkan. |
| Rekening pencairan | Nama bank, nomor rekening, atas nama; wajib untuk pengajuan yang dicairkan ke rekening. Untuk Barang, tampilkan sesuai metode pemenuhan/pembayaran yang ditetapkan. |
| Item | Minimal satu item saat kirim: nama, kuantitas lebih dari 0, satuan (pcs/liter/kg/dll), harga satuan ≥ 0. Spesifikasi dan catatan opsional. |
| Lampiran | Dapat diunggah sesuai kebutuhan; bukti transaksi untuk Reimbursement ditetapkan wajib bila kebijakan perusahaan mengharuskannya. |

**Perhitungan:** `subtotal item = kuantitas × harga satuan`; `total pengajuan = jumlah subtotal seluruh item`. Contoh 2 pcs × Rp10.000 = Rp20.000. UI menghitung langsung, server menghitung ulang saat menyimpan dan mengirim. Gunakan nilai desimal untuk kuantitas dan mata uang Rupiah tanpa kesalahan pembulatan floating point.

Pemohon dapat menambah, mengubah, menghapus, dan mengurutkan item. Mengganti tujuan Head Office/Outlet menghapus pilihan kategori yang tidak lagi cocok dan meminta pengguna memilih ulang.

## 6. Alur status

| Status | Arti / tindakan berikutnya |
| --- | --- |
| DRAFT | Pemohon dapat menyimpan, membuka kembali, mengedit, dan mengirim. Tidak masuk antrean approval. |
| MENUNGGU_MANAGER | Tugas aktif pada manager yang tersimpan. |
| DISETUJUI | Manager sudah menyetujui; tugas pencairan aktif pada petugas Finance/Sekretariat yang ditunjuk. |
| REVISI | Manager meminta perbaikan dengan catatan. Pemohon mengedit lalu mengirim ulang untuk diperiksa manager. |
| DITOLAK | Pengajuan berhenti; alasan wajib tersimpan. |
| DICAIRKAN | Petugas pencairan mencatat pembayaran/pemenuhan dan bukti yang relevan. |
| SELESAI | Proses selesai, termasuk LPJ bila diperlukan. |
| DIBATALKAN | Pemohon/admin membatalkan sesuai hak dan kebijakan. |

Alur status utama: `DRAFT → MENUNGGU_MANAGER → DISETUJUI → DICAIRKAN → SELESAI` jika tidak ada revisi atau penolakan. `MENUNGGU_APPROVAL` ada pada dump untuk alur lama; pengajuan baru dalam rancangan ini tidak melewati status tersebut. Karena arti `DISETUJUI` pada alur lama berbeda, tiap pengajuan perlu `workflowVersion` agar aplikasi membaca dan menampilkan histori lama dengan benar. Setiap transisi mencatat aktor, waktu, tindakan, status sebelum/sesudah, dan catatan. Persetujuan manager dan pencairan adalah dua tindakan terpisah, termasuk bila pelakunya sama. Pengajuan tidak boleh dicairkan sebelum disetujui manager atau diproses dua kali akibat klik berulang.

## 7. Halaman dan pengalaman pengguna

1. **Halaman awal:** tiga kotak pilihan “Login sebagai Pemohon”, “Login sebagai Approval”, dan “Portal IT”. Pilihan membuka formulir login dengan tujuan portal yang jelas.
2. **Dashboard pemohon:** ringkasan draft, menunggu manager, revisi, disetujui/menunggu pencairan, dicairkan, ditolak; cari dan saring berdasarkan nomor, tanggal, jenis, dan status. Rincian metrik dan grafik ada pada bagian 14.
3. **Buat/edit pengajuan:** formulir bertahap atau satu halaman dengan ringkasan total, tombol Simpan Draft, Pratinjau, dan Kirim Pengajuan. Sebelum kirim, tampilkan manager dan petugas pencairan yang terpilih.
4. **Detail pengajuan:** data lengkap, item, lampiran, timeline approval, catatan revisi, bukti pencairan jika ada, dan tombol PDF.
5. **Portal Approval:** dashboard dan antrean dengan tab “Approval Manager” serta “Pencairan Finance/Sekretariat” sesuai izin akun. Manager memiliki aksi Setujui, Minta Revisi, Tolak; petugas pencairan mencatat nominal, referensi, dan bukti.
6. **Portal IT:** pengaturan admin, akun aktif, unit dan outlet, manager per akun/unit, pengganti, petugas pencairan per kombinasi jalur/tujuan, kategori, audit, dan panel AI bagi yang berizin.
7. **Notifikasi:** pemohon diberi kabar saat diminta revisi, ditolak, disetujui, dan dicairkan; manager saat ada tugas baru; petugas pencairan saat ada pengajuan siap dicairkan. Notifikasi dalam aplikasi cukup untuk rilis awal.

Ketiga kotak memakai akun NIP dan password yang sama. Pilihan kotak hanya menentukan tujuan setelah login, bukan mengubah izin akun. Jika pengguna memilih portal yang tidak berhak diakses, tampilkan pesan jelas dan tombol menuju portal yang tersedia baginya. Akun dengan beberapa izin dapat berpindah portal dari menu profil tanpa login ulang.

## 8. Dokumen PDF dan tanda tangan

- Pratinjau tersedia di halaman detail sebagai halaman PDF tersemat atau gambar pratinjau yang dibuat dari PDF yang sama. Tombol “Perbesar/Lihat PDF” membuka PDF ukuran penuh di tab/viewer; unduh tersedia sesuai hak akses.
- PDF memuat nomor pengajuan, jalur, tujuan, kategori, identitas dan unit pemohon, tanggal, keperluan, rekening bila relevan, tabel item, total, status, dan riwayat persetujuan.
- Blok tanda tangan menampilkan **Diajukan oleh** (nama pemohon dan waktu kirim), **Disetujui manager** (nama dan waktu keputusan), serta **Dicairkan oleh Finance/Sekretariat** (nama dan waktu pencairan). Sebelum tindakan dilakukan, blok terkait tampil sebagai “Menunggu”.
- Pada tahap kirim/setujui, pemohon dan pemberi persetujuan dapat membubuhkan tanda tangan visual melalui kanvas atau spesimen yang mereka kelola sendiri. PDF menampilkan tanda tangan pada blok masing-masing setelah tindakan sah dilakukan. File tanda tangan disimpan dengan akses terbatas dan tidak dapat digunakan untuk menyetujui atas nama orang lain.
- Tanda tangan elektronik sederhana di sini berarti tindakan akun terautentikasi beserta waktu dan audit; gambar tanda tangan hanya representasi visualnya. Jika perusahaan memerlukan tanda tangan elektronik tersertifikasi, integrasi layanan khusus menjadi kebutuhan tambahan.
- PDF dihasilkan dari data pengajuan dengan versi/template tetap. Setelah approval, perubahan pada data tidak boleh diam-diam mengubah isi dokumen yang telah disetujui; simpan snapshot/versi final atau hasil PDF final.

## 9. Kesesuaian dengan `20sep26.sql`

| Kebutuhan | Kondisi pada dump | Tindak lanjut |
| --- | --- | --- |
| Akun dan role | `User` punya `role`, `department`, `approverTrack`, `isActive`. | Tambah relasi unit dan mapping manager; jangan mengandalkan teks departemen sebagai satu-satunya kunci. |
| Pengajuan dan approval | `Request` punya `requesterId`, `managerId`, `approverId`, `track`, `type`, `categoryId`, `neededDate`, rekening, status, total. | Tambah tujuan eksplisit Head Office/Outlet dan `disbursementOfficerId`; sesuaikan label/nilai jalur Sekretariat. Pertahankan arti historis `approverId`. |
| Item | `RequestItem` sudah punya `quantity`, `unit`, `unitPrice`, `subtotal`. | Gunakan perhitungan ulang di server. |
| Kategori dan outlet | `Category.kind` mendukung `STANDARD` dan `OUTLET`; kategori HO dan nama outlet sudah ada. | Saring pilihan berdasarkan tujuan; pertimbangkan master `Outlet` tersendiri jika outlet juga dipakai untuk keanggotaan pegawai/routing manager. |
| Draft dan histori | Status `DRAFT`, `MENUNGGU_MANAGER`, `MENUNGGU_APPROVAL`, `REVISI`, `DISETUJUI`, `DICAIRKAN` dan `ApprovalLog` tersedia. | Alur baru memakai persetujuan manager lalu pencairan; status lama tetap dibaca untuk histori. |
| Lampiran dan notifikasi | `Attachment` dan `Notification` tersedia. | Pakai untuk bukti dan pemberitahuan. |
| LPJ/pencairan | `Lpj`, `LpjItem`, dan field pencairan sudah ada. | Pertahankan untuk alur Dana bila dibutuhkan; tetapkan perbedaan proses tiap jenis. |

**Catatan migrasi:** `Request.track` dan `User.approverTrack` saat ini hanya mengenal `FINANCE` dan `DIREKTUR`. Data lama dapat tetap dibaca dengan label tampilan “Sekretariat” untuk `DIREKTUR` jika itu memang jalur yang sama menurut bisnis. Jika berbeda, tambahkan nilai `SEKRETARIAT` dan migrasikan hanya data yang benar; jangan mengubah arti data historis tanpa verifikasi. `approverId` pada `Request` saat ini wajib, tetapi alur baru hanya memerlukan manager sebagai pemberi keputusan dan petugas pencairan sebagai penerusnya. Tambahkan `disbursementOfficerId` dan buat `approverId` opsional untuk pengajuan baru, sambil mempertahankan data `approverId` lama; jangan diam-diam memakai kolom approval historis sebagai bukti pencairan.

## 10. Perubahan data yang disarankan

Perubahan berikut bersifat rancangan; belum diterapkan pada database:

- `OrgUnit(id, code, name, kind, isActive)` untuk IT, Marketing, GA, HRD, Operasional, dan unit lain. Outlet dapat menjadi unit khusus atau memiliki relasi ke master Outlet.
- Jika satu akun perlu beberapa hak sekaligus, gunakan tabel `UserRole(userId, role)` atau sistem izin setara. `User.role` saat ini hanya memuat satu nilai.
- `User.orgUnitId` dan `User.managerId` opsional untuk manager khusus akun. Mapping `UnitManager(orgUnitId, managerUserId, validFrom, validTo, isActive)` untuk manager default per unit; dukung pengganti/eskalasi yang diatur admin.
- `DisbursementRoute(track, destination, officerUserId, isActive)` untuk 4 kombinasi pada tabel routing. Berlakukan satu konfigurasi aktif per kombinasi atau prioritas yang jelas.
- `Request.destination` (`HEAD_OFFICE`/`OUTLET`), `Request.orgUnitIdAtSubmit`, `Request.disbursementOfficerId`, `Request.workflowVersion`, dan bila perlu `Request.outletId` agar tujuan, asal pemohon, penanggung jawab pencairan, serta aturan alurnya tersimpan jelas secara historis. Data lama diberi versi 1; alur baru memakai versi 2.
- Bila histori tindakan membutuhkan tugas per langkah, tambahkan `WorkflowStep(requestId, stepOrder, stepType, assignedUserId, status, actedAt, note)` untuk tahap `MANAGER_APPROVAL` dan `DISBURSEMENT`; `ApprovalLog` tetap menjadi audit event. Ini membedakan siapa yang menyetujui dari siapa yang mencairkan, walaupun orangnya sama.
- `Disbursement(id, requestId, officerUserId, amount, disbursedAt, reference, status, createdAt)` mencatat nominal aktual tiap pencairan; bukti transfer dapat dihubungkan melalui `Attachment`. Satu pengajuan bisa memiliki lebih dari satu catatan bila pencairan bertahap nanti diizinkan.
- `SystemSetting` atau konfigurasi server menyimpan kebijakan password awal untuk akun baru/reset. Perubahan pengaturan tidak mengubah password akun yang sudah aktif; reset akun adalah tindakan terpisah yang diaudit.

Migrasi akun dari `User.department` perlu daftar pemetaan dan pemeriksaan manual atas nilai yang tidak cocok. Nama orang digunakan untuk pencarian awal saja; hubungan permanen memakai `User.id`.

## 11. Kriteria penerimaan rilis awal

1. Pemohon dapat menyimpan draft parsial, membuka kembali, mengubah, dan mengirim satu kali tanpa membuat duplikat.
2. Formulir menampilkan enam kategori Head Office yang ditentukan; saat tujuan Outlet, hanya outlet aktif yang tampil.
3. Contoh 2 pcs dengan harga satuan Rp10.000 menghasilkan subtotal dan total Rp20.000 di layar, database, dan PDF.
4. Pengajuan IT, Marketing, GA/HRD, Finance/IC, dan Outlet/Operasional masuk ke manager sesuai mapping akun/unit, terlepas dari pilihan Finance/Sekretariat dan kategori tujuan.
5. Setelah manager setuju, Finance + Head Office masuk ke Resi sesuai NIP `1906.0.96.05580`; Finance + Outlet ke Belly; kedua tujuan Sekretariat ke Sari, selama konfigurasi awal aktif.
6. Manager yang belum menyetujui membuat pengajuan tetap berada pada antrean manager dan belum dapat dicairkan.
7. Revisi/penolakan mencatat alasan; pemohon menerima notifikasi dan dapat menindaklanjuti revisi.
8. Detail dan PDF menampilkan pemohon, manager, petugas pencairan, status, waktu keputusan/pencairan, item, dan total secara konsisten. Pemohon dapat melihat PDF miliknya dalam viewer penuh.
9. Akun tanpa manager atau petugas pencairan valid mendapat pesan yang dapat ditindaklanjuti; tidak ada pengajuan yang terkirim ke antrean kosong.
10. Semua keputusan dan perubahan penugasan terekam dalam audit dan hanya dapat dilakukan oleh aktor yang berwenang.
11. Jika manager dan petugas pencairan adalah orang yang sama (contoh GA/HRD → Sekretariat), sistem mencatat dua tindakan berbeda dan tidak membuka aksi pencairan sebelum persetujuan manager.
12. Dashboard menampilkan angka dan grafik sesuai cakupan akun; total pencairan sama dengan jumlah transaksi pencairan aktual yang valid pada periode terpilih, dan klik angka/grafik membuka daftar pengajuan penyusunnya.
13. Admin/IT berizin dapat mencari akun dengan NIP, memperbaiki divisi/outlet dan izin sistem, mengatur password awal, serta mereset satu akun; seluruh perubahan mencatat pelaku, waktu, alasan, nilai sebelum/sesudah.
14. Panel AI hanya tampil untuk Admin/IT berizin; saran perbaikan menampilkan perubahan yang diusulkan dan baru diterapkan setelah pengguna berwenang menekan konfirmasi. AI tidak dapat menyetujui atau mencairkan pengajuan.
15. Halaman awal menampilkan tepat tiga kotak Pemohon, Approval, dan Portal IT. Login melalui tiap kotak memakai kredensial yang sama, masuk ke portal yang dipilih bila berizin, dan memberi jalan kembali bila tidak berizin.
16. Halaman awal, dashboard, formulir, antrean Approval, detail/PDF, dan Portal IT dapat digunakan pada HP, tablet, dan desktop tanpa scroll horizontal pada lebar layar yang didukung.

## 12. Keputusan bisnis yang perlu dipastikan sebelum implementasi

- Apakah **setiap** pengajuan wajib melalui manager, termasuk pengajuan dari manager sendiri? Rancangan ini menganggap ya, dengan pengganti untuk mencegah persetujuan diri sendiri.
- Siapa manager untuk pemohon Outlet/Operasional? Daftar pengguna belum mencantumkan nama dan NIP untuk unit ini.
- Nama resmi akun pencairan Finance Head Office dengan NIP `1906.0.96.05580`: “Resi Kurnia” pada dump atau “Resi Kurniasih” pada daftar pengguna?
- Apakah jalur lama bernama `DIREKTUR` memang identik dengan jalur “Sekretariat”? Ini menentukan strategi migrasi nilai `track`.
- Apakah pengajuan **Barang** dibayar ke rekening pemohon atau dipenuhi langsung oleh perusahaan? Ini menentukan kapan field rekening wajib dan apakah status `DICAIRKAN` relevan.
- Apakah Reimbursement selalu memerlukan bukti transaksi, dan apakah tanggal dibutuhkan boleh tanggal lampau?
- Apakah revisi setelah persetujuan manager selalu mengulang persetujuan manager? Rancangan awal: ya untuk perubahan jalur, tujuan, kategori, item, total, rekening, atau keperluan.

## 13. Pengelolaan pengguna untuk sekitar 1.000 karyawan

### 13.1 Kondisi data saat PRD disusun

Dalam snapshot `20sep26.sql` ada 11.903 baris `User`, dengan 1.210 akun aktif dan 10.693 tidak aktif. Pada akun aktif terdapat 138 nilai `department` yang terisi dan berbeda, serta beberapa akun tanpa nilai tersebut. Ada 66 kategori `OUTLET`. Sebanyak 1.208 akun aktif bersumber dari HRIS. Angka ini adalah kondisi dump, bukan jumlah karyawan saat sistem digunakan.

Karena banyak kode departemen dan outlet, admin **tidak perlu mengatur manager satu per satu pada semua karyawan**. Penugasan massal harus mengikuti struktur organisasi, lalu pengecualian per orang dipakai hanya bila perlu.

### 13.2 Model yang disarankan

Pisahkan empat hal berikut:

| Data | Contoh | Fungsi |
| --- | --- | --- |
| Identitas karyawan | NIP, nama, status aktif dari HRIS | Menentukan siapa yang login dan mengajukan. NIP menjadi kunci sinkronisasi; `User.id` tetap kunci relasi internal. |
| Penempatan | Head Office atau Outlet, kode outlet, unit/divisi asal | Dipilih karyawan pada login pertama dan menentukan manager serta cakupan data yang boleh dilihat. |
| Grup approval | Marketing, HRD/GA, IT/Accounting/Audit, Finance/IC, Operasional | Mengelompokkan banyak kode departemen HRIS ke satu aturan manager. |
| Izin tindakan | PEMOHON, MANAGER, PENCAIRAN, ADMIN | Menentukan tombol dan aksi yang boleh digunakan; satu akun dapat memiliki beberapa izin. |

Contoh: karyawan memilih peran organisasi `IT` pada login pertama. Sistem memetakannya ke grup `IT/Accounting/Audit` dan manager Muhammad Handoyo. Jika satu karyawan memiliki manager khusus, admin memberi override hanya pada akun itu. Jalur Finance/Sekretariat yang dipilih pemohon tidak mengubah manager asalnya.

Struktur minimal yang direkomendasikan:

- `OrgUnit` menyimpan unit perusahaan yang stabil, termasuk tipe `HEAD_OFFICE` atau `OUTLET` dan relasi induk bila ada.
- `DepartmentMapping` menghubungkan pilihan peran/divisi organisasi pada login pertama dan, bila tersedia, kode departemen HRIS ke `OrgUnit`, grup approval, dan outlet. Satu pilihan harus punya satu hasil aktif yang jelas.
- `UnitManager` menetapkan manager default per grup approval/unit/outlet, dengan tanggal berlaku. `User.managerId` opsional menjadi override per karyawan.
- `UserRole` memberi lebih dari satu izin pada orang seperti Sari (manager dan pencairan), tanpa mengubah identitas karyawannya.
- `DisbursementRoute` tetap terpisah, karena petugas pencairan ditentukan oleh pilihan jalur + tujuan pada pengajuan.

Urutan penentuan manager: **override karyawan → manager outlet/unit khusus → manager grup approval → gagal kirim dengan pesan pengaturan belum lengkap**. Sistem tidak boleh menebak manager dari teks jabatan, nama, atau kategori tujuan pengajuan.

### 13.3 Operasional admin dan sinkronisasi

1. Sinkronkan identitas dan status aktif dari HRIS secara terjadwal menggunakan NIP. Karyawan baru mendapat akses `PEMOHON`; akun keluar/nonaktif tidak bisa login atau menerima tugas baru. Riwayat pengajuan lama tetap tersimpan.
2. Pada login pertama, karyawan memilih penempatan dan peran/divisi organisasi. Saat kemudian pindah divisi atau outlet, admin memperbarui penempatannya untuk pengajuan **baru**. Pengajuan yang sudah dikirim tetap menyimpan snapshot unit asal, manager, dan petugas pencairan; perubahan tugas lama hanya melalui penugasan ulang yang diaudit.
3. Sediakan layar admin untuk mengatur daftar pilihan divisi/outlet beserta manager tujuan. Kode departemen HRIS dapat dipakai untuk menyarankan pilihan awal, sehingga karyawan tidak harus mencari di daftar panjang. Tampilkan jumlah karyawan terdampak sebelum aturan diubah.
4. Sediakan laporan pengecualian: akun aktif belum memilih penempatan, pilihan tanpa manager, manager/petugas pencairan nonaktif, dan rute yang menimbulkan persetujuan diri sendiri. Admin menyelesaikan daftar ini sebelum pengguna dapat mengirim pengajuan dari unit terkait.
5. Sediakan manager pengganti dengan tanggal mulai/akhir untuk cuti atau pergantian jabatan. Perubahan mapping baru berlaku pada pengajuan baru; tugas berjalan perlu penugasan ulang eksplisit.
6. Daftar pengguna dan pengajuan menggunakan pencarian serta pagination di server agar admin dan manager tidak memuat seluruh karyawan sekaligus.

Untuk akses data, server harus memeriksa izin serta hubungan pengguna dengan pengajuan pada **setiap** permintaan. Ketika tidak ada aturan yang memberi izin, akses ditolak; ini sejalan dengan [panduan otorisasi OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

### 13.4 Login pertama dan pilihan role/divisi

Karyawan masuk pertama kali dengan **NIP dan password awal `100100`**, lalu wajib membuat password pribadi sebelum dapat menggunakan halaman pengajuan. Field `mustChangePassword` pada tabel `User` dipakai untuk menandai akun yang belum menyelesaikan langkah ini. Setelah password berhasil diganti, password awal tidak berlaku lagi untuk akun tersebut.

Pada langkah berikutnya, karyawan memilih **role organisasi/divisi asal** dari daftar yang diatur admin: misalnya Marketing, IT, Accounting, Audit, HRD, GA, Finance, IC, atau Operasional. Karyawan juga memilih Head Office atau Outlet sebagai penempatan asal; jika Outlet, mereka memilih nama outlet. Sistem langsung menampilkan manager hasil mapping pilihan tersebut, lalu karyawan mengonfirmasi dan mulai dapat membuat pengajuan.

Pilihan **role organisasi** ini digunakan untuk menentukan manager, berbeda dari **izin sistem**. Semua karyawan biasa memperoleh izin sistem `PEMOHON`. Izin `MANAGER`, `PENCAIRAN`, dan `ADMIN` tetap berasal dari pengaturan admin agar pilihan divisi pada login pertama tidak membuka tombol persetujuan atau pencairan.

Alur praktis: `NIP + 100100 → wajib ganti password → pilih role/divisi dan penempatan → lihat manager → mulai mengajukan`. Setelah aktivasi, perubahan role/divisi atau outlet asal dilakukan admin dan dicatat dalam audit agar routing pengajuan berikutnya jelas.

Karena password awal diketahui bersama, sistem membatasi percobaan login, hanya mengizinkan akun aktif, dan sebelum penggantian password hanya membuka halaman ganti password. Admin dapat melihat akun yang belum menyelesaikan login pertama. Pengaturan ini menjaga alur tetap sederhana tanpa menambah langkah aktivasi lain.

## 14. Dashboard, riwayat, dan grafik

### 14.1 Cakupan per pengguna

| Dashboard | Angka utama | Daftar dan grafik |
| --- | --- | --- |
| Pemohon | Jumlah pengajuan saya, draft, menunggu manager, revisi, menunggu pencairan, total uang yang sudah dicairkan untuk pengajuan saya. | Riwayat seluruh pengajuan sendiri; tren pengajuan dan pencairan bulanan; komposisi status dan jenis pengajuan. |
| Manager | Jumlah antrean approval saya, pengajuan yang sudah saya setujui/tolak, total nominal antrean, umur antrean tertua. | Daftar tugas `MENUNGGU_MANAGER`; riwayat keputusan saya; tren jumlah dan nominal pengajuan unit yang ditugaskan kepada saya. |
| Petugas Finance/Sekretariat | Jumlah pengajuan siap dicairkan, nominal siap dicairkan, jumlah dan nominal yang sudah dicairkan, pencairan bulan berjalan. | Antrean `DISETUJUI` yang ditugaskan kepada akun tersebut; riwayat pencairan; tren pencairan per bulan dan per tujuan Head Office/Outlet. |
| Admin/IT berizin laporan | Jumlah pengajuan seluruh perusahaan, antrean manager dan pencairan, total pencairan, akun/rute yang perlu diperbaiki. | Tren perusahaan per bulan, per jalur, divisi, outlet, jenis, dan status; drill down ke daftar pengajuan sesuai izin laporan. |

Jika satu akun memiliki beberapa izin (misalnya Sari sebagai manager dan petugas pencairan), dashboard menampilkan tab atau filter per tugas. Angka manager dan pencairan tidak digabung tanpa label. Pengguna IT yang tidak diberi izin laporan perusahaan hanya melihat dashboard pemohon dan tugas pribadinya.

### 14.2 Definisi angka agar konsisten

- **Pengajuan terkirim:** `submittedAt` terisi; draft tidak dihitung. Riwayat tetap menampilkan draft sebagai status tersendiri.
- **Antrean manager:** pengajuan aktif berstatus `MENUNGGU_MANAGER` dan `managerId` sama dengan akun yang login.
- **Antrean pencairan:** pengajuan aktif berstatus `DISETUJUI` dan `disbursementOfficerId` sama dengan akun yang login.
- **Nominal diajukan:** jumlah `Request.totalAmount` pada pengajuan yang sesuai filter; label ini tidak boleh disamakan dengan uang yang sudah dibayar.
- **Total uang dicairkan:** jumlah `Disbursement.amount` dengan transaksi valid/selesai pada rentang **tanggal pencairan** yang dipilih. Transaksi batal tidak dihitung. Pengajuan dengan dua kali pencairan dihitung dari dua transaksi itu, sekali masing-masing.
- **Nominal antrean pencairan:** sisa nominal yang belum dibayar dari pengajuan disetujui, berdasarkan nominal disetujui dikurangi pencairan valid. Jika perusahaan tidak mengizinkan pencairan bertahap, satu transaksi melunasi nominal tersebut.
- Nilai mata uang dalam Rupiah; rentang tanggal memakai zona waktu **Asia/Jakarta**. Kartu, grafik, daftar, dan ekspor harus memakai filter serta definisi yang sama.

Untuk pengajuan lama, dump memiliki waktu/status pencairan tetapi belum menyediakan nominal transaksi pencairan tersendiri. Sebelum kartu “total dicairkan sepanjang waktu” dianggap lengkap, data historis perlu direkonsiliasi dari bukti transfer atau sumber keuangan dan dimasukkan ke `Disbursement` dengan penanda migrasi. Jangan menebak nominal aktual dari `totalAmount` atau `approvedAmount`. Sampai rekonsiliasi selesai, dashboard menampilkan periode cakupan data yang sudah valid.

Filter bersama: periode (bulan ini, tahun ini, rentang khusus), jalur, tujuan, jenis, status; untuk dashboard dengan cakupan lebih luas tambahkan divisi dan outlet. Kartu metrik dapat diklik untuk membuka daftar baris penyusunnya. Riwayat mendukung pencarian nomor/nama/judul, urut terbaru, pagination di server, detail, timeline, bukti, serta lihat/unduh PDF sesuai izin.

### 14.3 Tampilan grafik

- Grafik garis/area bulanan untuk **nominal diajukan vs nominal dicairkan**, dengan dua seri dan label Rupiah yang jelas.
- Diagram batang bertumpuk untuk jumlah pengajuan menurut status per bulan atau divisi.
- Diagram batang horizontal untuk nominal per divisi atau outlet teratas; sisanya dikelompokkan sebagai “Lainnya” bila outlet banyak.
- Grafik kecil pada kartu antrean untuk melihat perubahan jumlah tugas dari minggu ke minggu.

Grafik harus nyaman dilihat di ponsel, memiliki legenda, label periode, tooltip nilai tepat, dan tampilan “belum ada data” yang jelas. Hindari menampilkan rekening atau data pribadi dalam tooltip. Grafik adalah pintu masuk ke daftar dan bukan satu-satunya cara membaca angka.

## 15. Portal Admin dan IT

Portal ini berlabel **“Portal IT” pada halaman awal**, tetapi dapat dibuka oleh akun Admin atau petugas IT yang diberi izin `ADMIN_PORTAL` atau `IT_PORTAL`. **Memilih divisi IT saat login pertama tidak memberi izin portal.** Admin mengatur siapa petugas IT yang mendapat izin tersebut. Akses ke laporan keuangan global dapat diberikan terpisah dari izin mengelola akun.

### 15.1 Halaman dan tindakan

| Halaman | Fungsi |
| --- | --- |
| Pengguna | Cari NIP/nama, lihat status aktif dan login pertama, divisi, outlet, manager, izin sistem; koreksi data dan aktif/nonaktifkan akun sesuai wewenang. |
| Password | Ubah nilai password awal untuk akun yang baru dibuat atau direset; reset password **akun terpilih** ke nilai awal saat ini dan wajibkan ganti pada login berikutnya. Tampilkan jumlah akun terdampak sebelum tindakan massal. |
| Role dan penempatan | Ubah role organisasi/divisi, Head Office/Outlet, outlet asal, dan izin sistem secara terpisah; tampilkan manager hasil mapping sebelum simpan. |
| Routing | Atur manager default/pengganti per unit atau outlet dan petugas pencairan per jalur/tujuan; uji simulasi rute untuk NIP tertentu. |
| Pengajuan | Cari pengajuan yang salah rute, lihat histori, lakukan penugasan ulang manager/petugas pencairan bila memang diperlukan; alasan wajib. Tidak mengubah keputusan/pencairan yang sudah terjadi secara diam-diam. |
| Audit dan kesehatan data | Lihat perubahan akun, reset password, perubahan mapping, penugasan ulang, serta daftar akun tanpa manager/rute atau tugas ke akun nonaktif. |

Perubahan password awal berlaku untuk **akun baru atau reset berikutnya**. Akun yang sudah memiliki password pribadi tidak ikut berubah. Pengaturan password awal disimpan sebagai hash dan nilainya tidak dapat dibaca kembali dari portal setelah disimpan. Saat reset per akun, sistem menandai `mustChangePassword=1`; admin tidak dapat melihat password pribadi pengguna. Perubahan role/izin, reset, dan penugasan ulang mencatat pelaku, waktu, alasan, serta ringkasan nilai sebelum dan sesudah pada `ActivityLog` atau tabel audit yang setara; nilai password tidak dimasukkan ke log. Antarmuka menyediakan pencarian cepat, filter, konfirmasi perubahan, dan pesan kesalahan yang menyebut tindakan perbaikannya.

### 15.2 Batas izin portal

- `ADMIN_PORTAL`: mengelola konfigurasi global, izin portal, routing, dan laporan perusahaan.
- `IT_PORTAL`: mengelola akun, password, role organisasi, dan penempatan sesuai penugasan; hak mengubah izin manager/pencairan atau melihat nominal perusahaan diberikan secara eksplisit bila dibutuhkan.
- `MANAGER`, `PENCAIRAN`, dan `PEMOHON`: memakai halaman tugas masing-masing; tidak mendapat portal hanya karena jabatan atau nama divisi.

## 16. Panel chat AI untuk Admin/IT

Panel AI hanya muncul dalam Portal Admin/IT bagi akun yang diberi izin `AI_ASSISTANT`. Tujuannya membantu menemukan penyebab data salah dan menyiapkan perbaikan, misalnya “NIP ini masuk ke manager siapa?”, “Tampilkan akun aktif yang belum punya manager”, “Mengapa pengajuan nomor ini belum muncul di antrean Finance?”, atau “Siapkan perubahan divisi karyawan ini dari GA ke IT”. Jawaban menyertakan data yang dipakai, tautan ke halaman terkait, dan langkah yang bisa diperiksa admin.

### 16.1 Tahapan kemampuan

1. **Baca dan jelaskan:** cari data yang memang boleh dilihat petugas, jelaskan status/routing, rangkum audit, dan sarankan perbaikan. Tahap ini cukup untuk rilis awal panel AI.
2. **Siapkan perubahan:** AI dapat mengisi rancangan perubahan terstruktur untuk akun, mapping, atau penugasan. Portal menampilkan nilai lama → baru, NIP/pengajuan terdampak, alasan, dan validasi sebelum disimpan.
3. **Terapkan setelah konfirmasi:** admin/IT berizin menekan tombol konfirmasi di portal; server menjalankan operasi dengan izin pengguna tersebut dan mencatat audit. AI tidak menjalankan SQL bebas, tidak mengubah data langsung melalui teks chat, dan tidak dapat melakukan approval atau pencairan.

### 16.2 Integrasi model

Aplikasi memakai layanan backend `AIProvider` agar panel yang sama dapat memakai **Gemini langsung** atau **9Router** yang disediakan kemudian. Dokumentasi [Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling) mendukung pola model meminta fungsi dan aplikasi yang mengeksekusinya; [repositori 9Router](https://github.com/decolua/9router) mendokumentasikan endpoint API yang kompatibel dengan format OpenAI. Pilihan provider, URL, model, dan kredensial diatur dari server oleh admin teknis, tidak dikirim ke browser.

Fungsi yang boleh dipanggil AI dibatasi, misalnya `find_user`, `find_request`, `explain_route`, `list_unassigned_users`, dan `draft_user_change`. Backend selalu memeriksa izin akun yang sedang login pada **setiap** fungsi. Data rekening, password, dan informasi pribadi yang tidak diperlukan disembunyikan sebelum konteks dikirim ke model. Riwayat chat menyimpan pengguna, waktu, provider/model, ringkasan aksi, dan status konfirmasi dengan masa simpan yang dapat diatur. Tampilkan pesan jelas bila provider sedang tidak tersedia; portal admin tetap berfungsi tanpa AI.

Pesan dan dokumen pengajuan dapat berisi instruksi yang menyesatkan model. Karena itu konten tersebut diperlakukan sebagai data, bukan perintah untuk aplikasi; akses alat tetap dibatasi server dan perubahan perlu konfirmasi manusia. Ini sesuai risiko [prompt injection yang dijelaskan OWASP](https://genai.owasp.org/llmrisk/llm01-prompt-injection/).

## 17. Rancangan teknologi website

**Stack implementasi:** Next.js dengan App Router dan TypeScript untuk website, Express dan Prisma untuk API, serta MySQL dari skema yang sudah ada. [Dokumentasi Next.js App Router](https://nextjs.org/docs/app) menjelaskan pembagian halaman/layout serta komponen server dan klien. Kode aplikasi berada di direktori `web/`, `src/`, dan `prisma/`; petunjuk menjalankan aplikasi ada di `README.md`.

| Bagian | Rancangan |
| --- | --- |
| Halaman dan navigasi | Next.js App Router; halaman awal dengan tiga pilihan login, lalu layout terpisah untuk portal Pemohon, Approval, dan Portal IT. |
| Tampilan data | Pengambilan data, agregasi dashboard, pengecekan sesi, dan cakupan akses dilakukan di server. Interaksi formulir, filter grafik, pratinjau, dan chat memakai komponen klien seperlunya. |
| Operasi data | Endpoint/aksi server menangani submit, keputusan manager, pencairan, reset password, dan perubahan admin. Semua memeriksa izin, status, dan validasi di server. |
| Database | MySQL yang ada; migrasi menambah mapping organisasi, pencairan aktual, izin multi-role, dan data lain sesuai bagian 10. Data dump tidak langsung ditampilkan tanpa migrasi dan pemeriksaan akses. |
| PDF dan lampiran | Pembuatan PDF serta akses lampiran melalui server; penyimpanan file terpisah dari tabel utama dan URL akses mengikuti izin pengguna. |
| AI | Panel menghubungi endpoint backend aplikasi; backend memanggil Gemini atau 9Router sesuai konfigurasi. Kunci API tetap di server. |

Panduan [autentikasi Next.js](https://nextjs.org/docs/app/guides/authentication) menyarankan logika akses terpusat pada lapisan data, sehingga setiap halaman dan operasi hanya mengembalikan data yang boleh dilihat pengguna. Aplikasi ini membutuhkan runtime server; halaman dashboard dan portal admin tidak diekspor sebagai situs statis.

## 18. Arah UI/UX dan wireframe awal

### 18.1 Prinsip tampilan

- **Mobile first untuk outlet:** tombol utama mudah dijangkau, form tidak menampilkan terlalu banyak field sekaligus, dan riwayat tetap nyaman dibuka di ponsel. Desktop memberi ruang lebih untuk tabel, grafik, dan panel AI.
- **Satu navigasi yang jelas:** Beranda, Pengajuan, Tugas Saya (bila menjadi manager/petugas pencairan), Notifikasi, dan Profil. Portal Admin/IT muncul hanya bagi akun berizin.
- **Status terbaca cepat:** setiap kartu dan baris menampilkan label status, siapa yang sedang bertugas, tanggal perubahan terakhir, serta tindakan berikutnya. Warna membantu, tetapi label teks tetap wajib.
- **Aksi penting terlihat:** Simpan Draft dan Kirim Pengajuan terpisah; Setujui/Revisi/Tolak pada manager tidak bercampur dengan aksi Catat Pencairan. Dialog konfirmasi menampilkan nomor dan total pengajuan.
- **Angka dapat ditelusuri:** kartu total dan titik grafik membuka daftar pengajuan atau transaksi yang membentuk angka tersebut, dengan filter tetap aktif.
- **Keadaan kosong dan kesalahan:** jelaskan apa yang belum ada serta langkah berikutnya, misalnya “Belum ada pengajuan”, “Manager untuk divisi ini belum diatur”, atau “AI sedang tidak tersedia”.

Wireframe berikut menunjukkan susunan dan prioritas isi, belum warna, ikon, atau ukuran akhir.

### 18.2 Halaman awal, login, dan penempatan

```text
┌─────────────────────────────────────────────────────────────────┐
│ Logo Perusahaan                         Portal Pengajuan       │
│ Pilih portal untuk melanjutkan                                 │
│                                                                 │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│ │ PEMOHON          │ │ APPROVAL         │ │ PORTAL IT        │ │
│ │ Buat pengajuan,  │ │ Setujui/revisi   │ │ Akun, routing,   │ │
│ │ lihat riwayat    │ │ atau cairkan     │ │ laporan, AI      │ │
│ │ [Masuk]          │ │ [Masuk]          │ │ [Masuk]          │ │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

Sesudah memilih salah satu kotak:

┌─────────────────────────────────────────────┐
│ ← Kembali       Login sebagai: Approval    │
│ NIP              [______________________]   │
│ Password         [______________________]   │
│                  [ Masuk ]                  │
│                                             │
│ Login pertama → ganti password → pilih      │
│ penempatan dan divisi → lihat manager      │
└─────────────────────────────────────────────┘
```

Pada ponsel, tiga kotak tersusun vertikal dengan area sentuh besar. Setelah login pertama, langkah ganti password dan pilih penempatan tampil berurutan, bukan seluruhnya sekaligus. Manager ditampilkan dari mapping dan tidak dapat diketik bebas oleh pemohon. Alur login pertama tetap berlaku walaupun pengguna memulai dari kotak Approval atau Portal IT; setelah selesai, sistem memeriksa izin lalu membuka portal yang dipilih.

### 18.3 Dashboard pemohon

```text
┌──────────────────────────────────────────────────────────────────┐
│ Logo  Beranda  Pengajuan  Notifikasi                 Profil ▼   │
├──────────────────────────────────────────────────────────────────┤
│ Selamat datang, Nama Karyawan             [+ Buat Pengajuan]   │
│ Periode [Bulan ini ▼]  Jalur [Semua ▼]  Jenis [Semua ▼]         │
│                                                                  │
│ [Semua 12] [Menunggu Manager 2] [Revisi 1] [Dicairkan Rp 5 jt] │
│                                                                  │
│ Tren pengajuan dan pencairan              Status pengajuan      │
│ ┌──────────────────────────────┐           ┌─────────────────┐  │
│ │ grafik per bulan             │           │ grafik status   │  │
│ └──────────────────────────────┘           └─────────────────┘  │
│                                                                  │
│ Riwayat saya    [Cari nomor/judul]  [Status ▼]                   │
│ No.          Tanggal     Jenis       Total       Status          │
│ ...          ...         ...         ...         ...             │
└──────────────────────────────────────────────────────────────────┘
```

Pada ponsel, kartu menjadi dua kolom atau satu kolom, grafik disusun vertikal, dan riwayat tampil sebagai kartu berisi nomor, total, status, serta tombol Detail.

### 18.4 Form buat pengajuan dan pratinjau

```text
┌──────────────────────────────────────────────────────────────────┐
│ Pengajuan Baru                         Draft tersimpan 10:42   │
│ 1. Jalur & Tujuan   2. Detail   3. Item   4. Pratinjau         │
├──────────────────────────────────────────────────────────────────┤
│ Jalur:    (•) Finance  ( ) Sekretariat                         │
│ Tujuan:   (•) Head Office  ( ) Outlet                           │
│ Jenis:    [Dana ▼]      Kategori: [IT ▼]                        │
│ Dibutuhkan: [tanggal]  Judul: [_______________________]         │
│ Keperluan: [___________________________________________]       │
│                                                                  │
│ Item          Qty    Satuan   Harga satuan    Subtotal           │
│ Kabel LAN     2      pcs      Rp10.000        Rp20.000          │
│ [+ Tambah item]                           Total Rp20.000        │
│                                                                  │
│ Rekening pencairan [Bank] [Nomor] [Atas nama]                  │
│ Manager: Muhammad Handoyo   Pencairan: Resi Kurnia             │
│                                                                  │
│ [Simpan Draft]            [Pratinjau PDF] [Kirim Pengajuan]     │
└──────────────────────────────────────────────────────────────────┘
```

Pada ponsel, item tampil sebagai kartu yang dapat diedit; total dan tombol Simpan/Kirim tetap mudah dijangkau di bagian bawah. Pratinjau menampilkan dokumen yang sama dengan PDF final sesuai status saat itu.

### 18.5 Tugas manager dan pencairan

```text
┌──────────────────────────────────────────────────────────────────┐
│ Tugas Saya   [Approval Manager] [Pencairan]                    │
│ Menunggu saya: 8       Nominal antrean: Rp24.500.000            │
│ [Cari nomor/NIP] [Tanggal ▼] [Divisi ▼]                         │
├──────────────────────────────────────────────────────────────────┤
│ No. Pengajuan    Pemohon     Dibutuhkan   Total      Umur       │
│ ...              ...         ...          ...        2 hari     │
├──────────────────────────────────────────────────────────────────┤
│ DETAIL TERPILIH: item, rekening, lampiran, timeline, PDF        │
│ Manager: [Minta Revisi] [Tolak] [Setujui]                       │
│ Pencairan: [Nominal aktual] [Referensi] [Bukti] [Catat]        │
└──────────────────────────────────────────────────────────────────┘
```

Tab Pencairan hanya muncul bagi petugas yang berizin. Pada layar kecil, daftar dibuka lebih dulu lalu detail menjadi halaman tersendiri sehingga tombol keputusan tidak berdesakan.

### 18.6 Portal Admin/IT dan panel AI

```text
┌──────────────────────────────────────────────────────────────────┐
│ Portal Admin/IT                                  Profil ▼       │
├───────────────┬───────────────────────────────┬──────────────────┤
│ Dashboard     │ Pengguna / Routing / Audit    │ Asisten AI       │
│ Pengguna      │                               │                 │
│ Password      │ [Cari NIP atau nomor]         │ Tanya masalah... │
│ Role & Unit   │ [Filter divisi/outlet]         │                 │
│ Routing       │                               │ Hasil & sumber  │
│ Pengajuan     │ Detail akun/pengajuan          │ data terkait    │
│ Audit         │ Nilai lama → nilai baru        │                 │
│               │ [Simpan perubahan]            │ Usulan perubahan│
│               │                               │ [Tinjau dulu]   │
└───────────────┴───────────────────────────────┴──────────────────┘
```

Di ponsel, panel AI menjadi halaman tersendiri dalam portal Admin/IT. Usulan AI membuka formulir perubahan yang sama dengan tindakan manual; admin melihat dampaknya sebelum konfirmasi. Percakapan tidak menutupi informasi penting atau tombol simpan.

### 18.7 Layout responsif HP, tablet, dan desktop

Layout menyesuaikan **lebar layar**, bukan mengandalkan jenis perangkat yang dilaporkan browser. Batas desain awal: HP hingga sekitar 639 px, tablet 640–1023 px, desktop mulai 1024 px; komponen tetap dibuat lentur di antara batas tersebut. Rotasi tablet atau layar desktop kecil harus tetap rapi.

| Bagian | HP | Tablet | Desktop |
| --- | --- | --- | --- |
| Halaman awal | Tiga kotak login tersusun vertikal. | Tiga kotak sejajar bila cukup ruang, atau dua lalu satu. | Tiga kotak sejajar di tengah halaman. |
| Navigasi | Bilah bawah untuk portal pemohon/Approval; menu tambahan dari profil. | Header dengan menu ringkas atau sidebar yang dapat dibuka. | Header dan sidebar tetap untuk area kerja yang luas. |
| Dashboard | Kartu metrik 1–2 kolom; grafik dan riwayat satu kolom. | Kartu 2 kolom; grafik 1–2 kolom. | Kartu 3–4 kolom; grafik dan tabel berdampingan. |
| Form pengajuan | Satu kolom; item sebagai kartu; tombol Simpan/Kirim mudah dijangkau. | Dua kolom untuk field pendek; ringkasan total terlihat. | Form utama dan ringkasan/pratinjau berdampingan. |
| Antrean dan riwayat | Baris menjadi kartu ringkas; detail dibuka di halaman sendiri. | Tabel ringkas dengan detail melalui drawer atau halaman. | Tabel lengkap dengan filter dan panel detail. |
| PDF | Viewer memenuhi layar dengan tombol perbesar/unduh. | Viewer dalam area konten yang dapat diperbesar. | Viewer berdampingan dengan data pengajuan bila ruang cukup. |
| Portal IT dan AI | Menu portal sebagai halaman/drawer; chat AI halaman tersendiri. | Area kerja utama dan panel AI bergantian/drawer. | Sidebar, area kerja, dan panel AI dapat tampil bersamaan. |

Sketsa perubahan tata letak dashboard:

```text
HP (satu kolom)          TABLET (dua kolom)            DESKTOP (area luas)
┌──────────────────┐     ┌───────────────────────┐     ┌───────────────────────────────┐
│ Header           │     │ Header                │     │ Sidebar │ Header              │
│ [Buat Pengajuan] │     │ Kartu A   │ Kartu B    │     │         │ Kartu A B C D        │
│ Kartu A          │     │ Kartu C   │ Kartu D    │     │         │ Grafik │ Status       │
│ Kartu B          │     │ Grafik 1  │ Grafik 2   │     │         │ Riwayat lengkap      │
│ Grafik           │     │ Riwayat ringkas       │     │         │                       │
│ Riwayat (kartu)  │     └───────────────────────┘     └───────────────────────────────┘
│ Navigasi bawah   │
└──────────────────┘
```

Kriteria pengecekan UI: uji setidaknya pada lebar 360 px (HP), 768 px (tablet), dan 1440 px (desktop), serta mode tablet lanskap. Tidak ada teks/tombol yang terpotong, scroll horizontal pada halaman utama, atau aksi penting yang tersembunyi oleh navigasi. Tabel panjang boleh mengganti bentuk menjadi kartu; viewer PDF boleh memiliki kontrol zoom internal. Semua fungsi inti tetap tersedia di ketiga ukuran, termasuk approval, pencairan, reset password, dan penggunaan panel AI oleh akun berizin.
