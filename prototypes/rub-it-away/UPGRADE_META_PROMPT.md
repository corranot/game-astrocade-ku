# Meta-prompt peningkatan — Rub It Away

## Tujuan
Bertindak sebagai tim senior game-studio yang mencakup game director, UX designer, level designer, accessibility specialist, engineer, dan QA. Tingkatkan *Rub It Away* dengan menjaga inti “amati → gosok → lihat adegan pulih”, ilustrasi dan identitas anak-ramah, 60 level dan 10 dunia orisinal, lalu tambahkan 6 level Snow World (61–66), kontrol sentuh, penyimpanan progres, serta dukungan delapan bahasa. Utamakan kejelasan, rasa adil, kenyamanan, dan keandalan; jangan menambah sistem demi retensi semata.

## Prinsip desain yang wajib
1. **Pemain harus memahami tujuannya.** Setiap level perlu memberi petunjuk visual/teks yang cukup agar jawaban terasa masuk akal, bukan hasil tebak-tebakan. Salah menyentuh benda adalah kesempatan bereksperimen, bukan kegagalan.
2. **Progres tanpa tekanan.** Jangan memaksa login harian, batas waktu hadiah, atau perpindahan layar otomatis. Koleksi dan penyelesaian dunia boleh menjadi bonus permanen dan sukarela.
3. **Aksesibilitas bukan mode darurat.** Semua petunjuk penting harus terbaca tanpa audio, haptik, animasi ramai, atau pembedaan warna saja. Berikan kontrol untuk musik, efek, getaran, dan gerakan dekoratif.
4. **Play dan Edit benar-benar terpisah.** Play hanya membaca konfigurasi. Edit menonaktifkan rub/scoring/progres, menyediakan interaksi visual untuk memilih, memindah, dan mengubah ukuran objek, lalu menyimpan perubahan serializable ke `window.gameConfig`.
5. **Iterasi berbasis bukti.** Jangan mengklaim sudah playtest dengan anak atau membuktikan keadilan semua 66 level jika belum dilakukan. Tambahkan pemeriksaan otomatis untuk invariants data; tandai uji manusia/lokalisasi sebagai langkah QA yang masih perlu dilakukan.
6. **Visual tersusun rapi.** Gunakan grid, jarak konsisten, area sentuh besar, urutan informasi jelas, batas objek dan kontrol tidak saling menimpa; validasi layar menu, permainan, hasil, pengaturan, peta, dan editor dalam iframe 720×1280.

## Urutan eksekusi
### Tahap 1 — Fondasi aman
- Buat linter/test data level: jumlah level tepat, satu target per level, id unik, ukuran/koordinat valid.
- Sediakan meta-prompt ini sebagai spesifikasi, bukan sekadar janji.

### Tahap 2 — Pengalaman pemain
- Hilangkan auto-next singkat dan hukuman bintang atas salah gosok; tombol Next menjadi pilihan pemain.
- Hapus streak harian, bonus mingguan berbatas waktu, hadiah karena kembali, kejutan berkala, serta leaderboard kompetitif berbasis hari/menit. Pertahankan progres, hint permanen, dan koleksi gag lucu yang tidak kedaluwarsa.
- Tambahkan layar pengaturan yang dapat diakses dari menu dan permainan: musik, efek suara, haptik, dan gerakan dekoratif yang lebih tenang. Simpan preferensi pemain.
- Tambahkan pengaturan kreator lewat `lib.showGameParameters()` dengan default serializable.

### Tahap 3 — Editor dan variasi level
- Buat Edit mode visual non-gameplay untuk memilih level, memilih/memindahkan/mengubah ukuran benda, mengembalikan level ke default, dan menulis perubahan ke `gameConfig`.
- Pertahankan variasi yang sudah dibuat dalam 60 level orisinal; bangun pola baru hanya bila dapat diajarkan dan diuji. Jangan mengubah puzzle yang belum divalidasi dengan perubahan yang berisiko merusak logika adegan.

### Tahap 4 — Validasi
- Jalankan unit test dan pemeriksaan sintaks.
- Jalankan game di browser dalam mode Play dan Edit; periksa screenshot serta kontrol menu, settings, editor, dan aksi gosok sentuh.
- Perbaiki bug/error yang teramati. Nyatakan dengan jujur uji yang sudah dijalankan dan yang masih membutuhkan pemain sungguhan.

## Kriteria selesai
- Tidak ada gameplay/progres/save/leaderboard dalam Edit mode; Play tetap memakai progres tersimpan.
- Tidak ada timer hadiah harian/mingguan atau auto-next yang dapat melewatkan hasil.
- Salah gosok tidak mengurangi bintang; pemain bisa menyelesaikan puzzle dan mengumpulkan reaksi lucu tanpa hukuman skor.
- Preferensi aksesibilitas berfungsi dan bertahan setelah reload.
- Perubahan editor dipakai oleh Play dan hanya dibuat saat mode Edit.
- Semua test otomatis lulus dan tampilan utama sudah diperiksa dalam browser.

## Catatan eksekusi
Spesifikasi ini tidak menganggap pengujian dengan anak/pengasuh atau validasi profesional untuk delapan bahasa telah dilakukan. Itu tetap rekomendasi QA sebelum mengiklankan game sebagai teruji untuk audiens anak.

### Status implementasi bertahap
- [x] Tahap 1: linter murni dan tes struktural 66 level; tes string prompt/hasil, label pengaturan dan delapan bahasa.
- [x] Tahap 2: bintang hanya diberikan saat puzzle selesai (3 bintang; salah gosok tidak mengurangi skor), Next manual, penghapusan reward berbatas waktu/streak/leaderboard kompetitif, layar pengaturan pemain dengan preferensi tersimpan.
- [x] Tahap 3: Edit mode statis tanpa gameplay/save, navigasi level, drag, resize, reset, serta penerapan override hanya-baca di Play; panel default kreator.
- [x] Tahap 4: tes aturan dan sintaks lulus; screenshot dan smoke test browser 720×1280 untuk Play/Edit, termasuk sentuhan gosok dan edit objek. Tidak ada error browser/harness pada sesi yang diperiksa.
- [ ] Penambahan keluarga mekanik puzzle baru dan penilaian tingkat kesulitan per level ditahan sampai uji pemain manusia. 60 level/10 dunia awal dipertahankan; enam Snow World ditambahkan. Linter otomatis tidak dapat membuktikan fairness atau fun.

### Addendum konten Snow World
Pertahankan thumbnail dan seluruh 60 level/10 dunia awal tanpa perubahan. Tambahkan Snow World sebagai dunia ke-11 dengan level 61–66, enam adegan salju dan tepat satu target jelas serta dua decoy lucu per level. Tambahkan nama/prompt/win dan teks share yang terlokalisasi ke delapan bahasa; map menampilkan badge NEW sampai level Snow pertama dibuka. Migrasikan save dengan aman: jangan rename/reset field lama, perluas array level lama dengan nol untuk enam level baru, dan tambahkan `snowWorldSeen: false`.

Untuk penutup setiap dunia, pertahankan tombol Next dan tambahkan Share opsional satu ketukan. Kirim gambar kanvas 720×1080 berisi adegan bahagia, nama dunia, dan tiga bintang memakai `lib.share`. Snow VFX/audio hanya memakai aset bundel: serpihan salju, puff saat rub, glow/sparkle, napas dingin, rub salju lembut dan lonceng. Gerakan dekoratif mengikuti pengaturan reduced motion; rub/bell mengikuti toggle efek suara. Hindari fetch layanan pihak ketiga.
### Addendum: pembaruan sesi panjang dan Snow World rapi
- Map: tile level kembali 200 px di semua dunia; 11 tab dunia di satu grid 4-4-3 dengan ukuran tab dan ukuran label yang sama; badge NEW di tepi atas tab, tidak menutupi teks.
- Share di akhir dunia mengirim judul dan teks saja (tanpa gambar), sehingga kartu share memakai sampul game.
- Kartu hasil: tombol NEXT menampilkan gambar adegan berikutnya; poster dunia 6 bingkai terisi satu per level; akhir dunia mendapat pita WORLD COMPLETE, kembang api dan 1 hint bonus.
- Variasi tanpa mengubah gosok satu jari: alat gosok berganti per dunia (penghapus, spons, sikat, pengikis es); sekitar 1 dari 8 level menjadi gambar emas (+1 hint, bergeser tiap hari); PERFECT! untuk penyelesaian tanpa salah gosok dan tanpa hint; kotak hadiah kejutan setelah setiap 10 level dalam satu sesi.
- Gambar hari ini: satu level per hari dari menu, +1 hint, dengan intipan gambar besok. Tidak ada streak; melewatkan hari tidak menghilangkan apa pun.
- Tutorial level 1: layar meredup kecuali awan yang harus digosok, lalu tombol NEXT; maju hanya lewat aksi nyata, bisa dilewati, tersimpan. Garis panduan titik-titik dari jari ke target saat hint.
- Snow World digambar ulang dengan gaya stiker datar bergaris tebal seperti dunia lain; boneka salju yang sudah dibantu tersenyum lebar.
