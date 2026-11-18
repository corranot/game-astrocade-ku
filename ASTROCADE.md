# ASTROCADE HIT-MAKER & ADAPTIVE STUDIO BRAIN

## PRINSIP KERJA OTOMATIS (TANPA PERINTAH GARIS MIRING)
User berkomunikasi dengan bahasa Indonesia santai dan memiliki workflow kreatif yang spontan (2D, 3D, riset tren, atau bedah game kreator lain). Target utama adalah mengoptimalkan analitik (lonjakan *daily plays* & retensi tinggi) untuk audiens **anak-anak (Gen Alpha)** dan mencegah *dead game*.

1. **Mode Dasar Selalu Aktif:** Gunakan gaya komunikasi **Caveman** (ringkas, padat, hemat token) dan standar kode **Ponytail** (bersih, ringan, anti-berbelit, 60 FPS di HP kentang) sejak detik pertama.
2. **Mode Intelijen & Bedah Game (Leanrea):**
   - Jika user menyuruh **cek backend Astrocade**, jalankan **Leanrea** untuk mengidentifikasi tipe game dengan *daily plays* paling ngebut hari ini beserta pemicu retensinya.
   - Jika user menyuruh **bedah game kreator lain**, jalankan **Leanrea** untuk membongkar rahasia *hook* 3 detik pertama, *juice*, kontrol, dan *core loop*-nya sebagai bahan belajar (ambil ilmunya, bukan menjiplak mentah).
3. **Hukum Desain Game Viral Anak-Anak (WAJIB UNTUK SEMUA GAME 2D & 3D):**
   - **3-Second Hook:** Tanpa tutorial panjang atau menu berbelit. Pemain langsung masuk ke aksi utama dalam < 2 detik dengan *lazy loading* super ringan.
   - **Maximum Juice & Feel:** Setiap interaksi wajib punya *feedback* instan (partikel cerah, animasi *squash & stretch*, *screen shake* halus, dan efek suara memuaskan).
   - **15-Second Dopamine Loop:** Berikan hadiah mikro, kombo, atau progres visual setiap 10–15 detik agar anak tidak bosan dan tidak melakukan *skip*.
   - **Zero-Latency Replay:** Layar menang/kalah wajib menampilkan tombol ulang besar di tengah layar yang me-reset game secara instan (< 0,1 detik).
   - **Visual & HUD Standar Emas:** Warna cerah tajam (DILARANG tema gelap/neon/pudar), teks UI/HUD sangat besar dan terbaca di layar kecil, notifikasi di tengah layar sejajar pandangan mata (*eye-level*), tata letak simetris/proporsional, serta *guideline* penunjuk arah dinamis yang mengikuti karakter.
   - **Tech Stack Adaptif:** Jika **3D**, otomatis cek versi **Three.js terbaru** (`npm view three version` / CDN terbaru) dan gunakan karakter **R15** (FK/IK, ekspresi wajah, animasi *idle*, VFX). Jika **2D**, gunakan HTML5 Canvas atau PixiJS super ringan. Simpan tiap proyek di folder terpisah (`prototypes/nama-proyek/`) dan bantu dorong ke **Astrocade MCP**.
   - **Auto-Deteksi Device (WAJIB):** Game mengenali sendiri HP, tablet, dan desktop tanpa menu pengaturan. Kontrol sentuh atau mouse/keyboard dipilih otomatis (`lib.shouldUseTouchControls()`), tata letak tetap pas di kanvas potret 720×1280, tombol minimal 96 px, dan efek berat (partikel, bayangan) dikurangi sendiri saat FPS turun di HP kentang.
   - **Auto-Deteksi Bahasa (WAJIB):** Game membaca bahasa device pemain (`navigator.languages`) dan langsung tampil dalam bahasa itu, supaya anak paham tanpa bantuan. Pakai 7 bahasa teratas di komentar Astrocade: **Inggris (`en`), Arab (`ar`), Spanyol (`es`), Vietnam (`vi`), Hindi (`hi`), Bengali (`bn`), Indonesia (`id`)**. Bahasa device di luar 7 itu otomatis jatuh ke Inggris. Berlaku untuk semua game mulai 2026-11-18. Aturan turunannya:
     - Semua teks pemain ada di satu tabel string per bahasa (data, bukan di dalam kode); dilarang menulis teks langsung di fungsi gambar.
     - Arab ditulis kanan-ke-kiri: HUD, baris tombol, dan bar progres dicerminkan; angka dan ikon tidak dibalik. Hindi, Bengali, dan Arab memakai aksara sendiri, jadi cek hurufnya tampil (bukan kotak kosong) di HP sungguhan.
     - Utamakan ikon dan gambar daripada kata; kalimat perintah maksimal 3–4 kata di tiap bahasa, dan ukuran huruf mengecil otomatis kalau terjemahan lebih panjang.
     - Sediakan tombol 🌐 untuk ganti bahasa manual; pilihan disimpan per pemain.
     - Contoh jadi: `prototypes/fizzy-bath-bomb-maker/` (tabel `strings` di `game_config.json`, fungsi `T`, `detectLang`, `mx` di `game.js`; uji bahasa lewat locale browser di `playtest.js`).
     - Sebelum rilis, ambil tangkapan layar tiap layar di ketujuh bahasa ke `production/qa/evidence/`; teks terpotong atau kotak kosong (font tidak ada) berarti belum lulus.
     - Perbarui daftar bahasa tiap kali cek komentar Astrocade diulang.
   - **Thumbnail Urusan User (sejak 2026-11-18):** Jangan membuat atau memasang thumbnail (`generate_thumbnail`, `set_thumbnail`). User membuat sendiri thumbnail GIF untuk tiap game. Cukup ingatkan bahwa `publish_game` menolak game tanpa thumbnail.
4. **Upgrade Otak Mandiri (Self-Evolving):**
   - Setiap selesai riset tren, membedah game kreator lain, mengecek API Three.js terbaru, atau memperbaiki bug performa, ringkas pelajaran tersebut ke bagian bawah file ini (jaga total file maksimal 150 baris).
   - Langsung jalankan `git add ASTROCADE.md && git commit -m "chore: upgrade otak ASTROCADE.md" && git push` agar memori tersimpan permanen.
   - Saat menambah pelajaran, ringkas ulang bagian yang sudah usang; jangan hanya menumpuk di bawah. Kesalahan baru masuk ke bagian 0.
5. **Audit Sebelum Bilang Selesai (WAJIB):** Sebelum melapor "selesai", "aman", atau mengunggah draft, baca bagian 0 (kesalahan yang pernah terjadi) dan jalankan bagian 5 (audit berurutan) di memori di bawah. Uji yang lulus bukan bukti tampilan benar: tiap layar dilihat ukuran penuh.

---

## MEMORI PENGETAHUAN STUDIO (DIRINGKAS ULANG 2026-11-18; TERUS BERTAMBAH)

### 0. Kesalahan yang sudah pernah terjadi (baca ini dulu, jangan diulang)
Semua terjadi di sesi Pinata Maker 2026-11-18. Tiap butir: apa yang salah, lalu aturannya.
1. **Bilang "audit bersih" padahal layarnya salah.** Tangkapan layar hanya dilihat kecil berjajar; user yang menemukan stiker tertutup jumbai, kepala piñata tertutup kotak pesanan, tamu menutupi piñata. *Aturan:* buka tiap layar ukuran penuh 720×1280 satu per satu, untuk tiap varian (semua bentuk, semua langkah), sebelum bilang selesai. Sebutkan layar mana yang dilihat.
2. **Uji lulus tidak berarti tampilan benar.** Uji tata letak hanya memeriksa kotak HUD. *Aturan:* benda utama (3D atau kanvas) punya ujinya sendiri: terlihat dari kamera, tidak tertutup, muat di jalurnya (`scene.seen()` di `prototypes/pinata-maker/`).
3. **Mengubah tampilan tanpa melihat ulang layar yang terdampak.** Jumbai ditambah, layar dekorasi tidak dilihat lagi. *Aturan:* setelah perubahan visual apa pun, lihat ulang semua layar yang memakai benda itu.
4. **Menerapkan saran penilai (agen) tanpa mengecek akibatnya.** Kamera digeser membuat kepala tertutup; "sembunyikan dekor di HP lambat" membuat halaman kosong. *Aturan:* tiap saran dicek di layar setelah diterapkan; saran adalah usul, bukan kebenaran.
5. **Suntingan lewat skrip merusak satu baris** (komentar disisipkan di tengah baris menelan kode), lalu `try/catch` yang mencoba ulang diam-diam menelan errornya. *Aturan:* setelah suntingan skrip jalankan `node --check` dan satu putaran main; jangan bungkus kode game sendiri dengan penangkap error yang diam.
6. **Uji bergantung waktu tunggu, bukan keadaan** (tombol hadiah). *Aturan:* uji menunggu keadaan game, bukan milidetik.
7. **Merge tanpa bertanya.** Hook repo meminta izin untuk merge. *Aturan:* tanya dulu. Pengecualian yang sudah diizinkan user: merge `main` ke branch kerja tanpa perubahan berkas (`git merge -s ours origin/main`) untuk membereskan konflik riwayat setelah PR di-squash, asal dicek dulu `git diff --quiet <ujung lama> origin/main`, lalu dilaporkan.
8. **Lama diam saat bekerja.** *Aturan:* satu kalimat kabar tiap ganti tahap.
9. **Istilah user yang tidak dikenal** ("daemon (panca) indera lengkap", "para top pakar super jenius"). Tidak ada alat atau panel seperti itu. Maksudnya: periksa seperti pemain sungguhan dan kerjakan sebaik mungkin. Katakan terus terang, lalu jalankan audit penuh di bagian 5.
10. **Menyimpulkan "bukan kreator teramai" dari total seumur hidup dan sampel 301 game** (2026-11-18); user yang membetulkan lewat astrotopper. Juga menulis "tidak ada game gagal" padahal hanya melihat game yang lolos ke feed. *Aturan:* traffic berarti plays per minggu/bulan; sebut ukuran sampel; game yang tidak terlihat bukan berarti tidak ada.
11. **Berkas unggahan memuat jejak cara kerja** (README yang menyebut `ASTROCADE.md`, riset feed dan `playtest.js`; komentar "playtest"; header `PROTOTYPE - NOT FOR PRODUCTION`). User: AI Astrocade membaca semua kode untuk mengelompokkan game. *Aturan:* lihat bagian 4, "Unggahan bersih".
12. **Bilang "versi bersih sudah tayang" padahal pemain masih disajikan versi lama** (Fizzy, 2026-11-18), lalu memanggil publish dua kali. User: update game yang sudah tayang ditinjau dulu sebelum tayang lagi, walau `publish_game` menjawab "approved, live". *Aturan:* setelah publish update, laporkan "dikirim, menunggu tinjauan", bukan "tayang". Bukti tayang hanya `servedVersionId` di respons `/v3/games?gameId=` halaman publik (atau `is_published` di `list_versions`). Publish cukup sekali.

### 1. Pasar Astrocade (data 2026-11-17 dan 18; ukur ulang sebelum memilih game baru)
- **Tipe tercepat (plays/jam nyata, 160 game, 18 Nov 11.00 UTC):** bikin/dandani bertahap ±22rb dari 15 game (paling ramah anak); hancurkan/sandbox usil ±16,7rb dari 8; runner berubah bentuk/pasukan ±12rb dari 6; gambar/mewarnai ±11rb dari 3 (rata-rata per game tertinggi); telur/steal ±9,6rb dari 30 (padat: 41 game "egg", median 1.000 plays/hari).
- **Median kategori (plays/hari seumur hidup):** Players' Choice ~20rb, Meme ~14rb, Toys ~10rb, Creative/Educational/Farm ~6rb; Platformer ~340, Action ~650, Simulation ~750.
- **Game umur ≤7 hari mendominasi;** game besar lama melambat (×0,4–0,7 dari rata-ratanya). Laju bergantung jam: total bisa turun 25% dalam 30 menit.
- **Contoh teratas:** Slime studio 71rb/hari, Prank City 62rb/hari, Woodturner 43rb/hari, Squishy Balloon Slime 37rb/hari, Dress-up duel 20–24rb/hari, Ant Army Runner 21rb/hari di hari ke-2.
- **Standar isi game Steal teratas:** 8 bahasa, hadiah harian dan online bertimer, uang offline, quest, achievement, Index pet, fusi, mutasi, leaderboard. Game bikin bertahap teratas tidak memakainya.
- **Judul:** kata kerja + benda konkret ("Steal an Egg", "Giant Salami Saw"); game bikin memakai "... Maker: DIY ASMR". Deskripsi dibuka dengan kata kerja langkahnya dan menyebut hadiah.
- **Hindari:** platformer/action generik; game bermerek atau tiruan game orang (Roblox, Barbie, Minecraft): ambil genrenya saja.
- **Bahasa penonton (3.361 komentar berlabel):** Inggris 57%, Arab 24%, Spanyol 5,6%, Vietnam 2,8%, Hindi 2,7%, Bengali 2,3%, Indonesia 1,6%. Inggris dan Arab ada di 30 dari 30 game. Batas: komentar ditulis anak yang lebih besar.
- **Belum pernah terbukti:** skip rate dan retensi per game tidak terbuka; semua kesimpulan dari plays dan pengamatan layar.

### 2. Kenapa game teratas tidak di-skip (pengamatan layar, bukan data skip)
- Feed geser seperti video pendek; **game sudah jalan di belakang kartu Play**, jadi layar pertama harus hidup tanpa input.
- Tujuan + hadiah tampil sebelum main; satu kalimat perintah yang menyebut aksinya; penghitung progres selalu terlihat; umpan balik tiap aksi; satu tombol besar di tengah bawah; layar loading dipakai mengajar.
- Penolakan lembut, bukan kalah ("Keep stirring!"); pilihan tiap beberapa detik; kejutan acak di game panjang ("CASH RAIN!").
- Muat: iframe ±4,5 detik, layar pertama 7–9 detik dari buka halaman.
- Platform mencatat: waktu sampai gestur pertama, gestur selama main, tonggak 30/60/300/600 detik, FPS yang dikirim game, waktu muat. Bobotnya tidak terlihat.

### 3. Cara mengukur (cepat, dari halaman tamu di browser biasa)
- Daftar game: `POST astrocade-api-prod.com/v3/feed?filter=gallery` per kategori (`category`, `categoryPageSize=30`, token base64 `{category, offset, algorithm_metadata, gallery_id}`), header dari permintaan halaman itu sendiri. 25 kategori, ±1.900 game. Stempel waktu dalam detik. Tanpa `&category=<nama>` di query, server diam-diam mengembalikan feed awal. `seed` lebih besar dari 2^53: simpan sebagai teks.
- Tiap game di feed membawa `ownerTotalPlays`, `ownerFollowerCount`, `likeCount`, `shares`, `commentsCount`.
- **Peringkat kreator dan game harian/mingguan/bulanan:** `astrotopper.vercel.app` (pihak ketiga, 517 kreator). Kreator: `/?window=weekly|monthly`; game: `/?view=games&window=weekly&q=<nama kreator>`. Cek ini dulu sebelum menyimpulkan siapa yang ramai.
- **Cek backend rutin (manual, saat user bilang "cek backend"):** `node tools/market-check.js` menyimpan satu cek ke `production/market/<waktu>/` (game dan kreator tercepat minggu ini, semua flag halaman, Players' Choice, Discover More) dan mencetak laporan dibanding cek sebelumnya: game BARU/MUDA, flag yang berubah (tanda algoritma diubah). Lalu simpan hasil `list_my_games` sebagai `my-games.json` (`{at, games:[{game_id,title,plays}]}`) di folder itu dan jalankan `--report` untuk laju plays per game. Tutup laporan dengan satu baris: tipe apa yang layak dibuat sekarang (ngebut dan belum padat).
- **Akun sendiri:** `list_my_games` (MCP) memberi total plays tiap game; tanggal buat terbaca dari 10 huruf pertama `game_id` (ULID).
- Crawl penuh dengan token rakitan sendiri ditolak sistem izin sesi (2026-11-18). Jangan diakali; yang lolos: merekam permintaan halaman tamu sendiri, mengunduh `contextCdnUrl`, dan astrotopper.
- Plays terbaru: `GET /v3/games?gameId=<id>`; baca dua kali selang ±30 menit. Jangan bandingkan snapshot feed (diacak per sesi). 160 game ±10 detik.
- Bedah game: `contextCdnUrl` (`full.json.gz`) memuat kode, `game_config.json`, dan dokumen desain game mana pun. Ambil ilmunya, bukan isinya.
- Bahasa: buka halaman game dengan game diblokir (`play.json`, `/context/`), tekan Comments, baca label `language`; satu sesi tamu per pekerja.
- Panggilan API langsung dengan header tiruan ditolak; pakai `page.evaluate(fetch)` dari halaman.

### 4. Platform Astrocade dan Three.js (terbukti lewat unggah nyata)
- Iframe persis 720×1280; `window.run = run`; host memanggil `run('play'|'edit')`, bisa lebih dari sekali. Mode edit: gambar hidup tanpa gameplay dan tanpa input.
- Dilarang: `localStorage`, cookie, `alert`, popup, jaringan selain CDN (jsDelivr, unpkg, cdnjs) dan aset platform. Simpanan hanya `lib.saveUserGameState`/`getUserGameState` (satu slot, state penuh). Getar hanya `lib.haptics`. `lib.showGameParameters` wajib kalau config punya angka; leaderboard di `persistent_storage_config`.
- Akun ini multi-berkas: `index.html` memuat `./game.js` sebagai modul; server uji lokal wajib mengirim `content-type: text/javascript`.
- Unggah: `create_game` tanpa berkas, lalu `begin_upload` (purpose `game_file`) + `curl -X PUT -T` + `save_draft` dengan `file_upload_ids`; semua berkas sumber harus ikut tiap simpan (`game_config.json` dan `asset_map.json` boleh ditinggal). Draft pribadi; publish menunggu kata user dan thumbnail GIF buatan user.
- **Unggahan bersih (WAJIB, sejak 2026-11-18):** yang naik ke Astrocade hanya bicara soal gamenya. Siapkan berkas dengan `tools/astrocade-upload-set.sh <folder game> <folder keluar>`: ia menyalin `index.html`, `game.js`, `scene.js`, membuang header prototipe, dan gagal kalau masih ada kata soal cara kerja (prototipe, playtest, audit, agen, AI, riset, tren, nama kreator lain). README tidak diunggah (berkas yang tidak dikirim terhapus dari game). Header prototipe tetap di repo karena aturan repo. `creator_request`, `change_summary`, `reason` hanya berisi perubahan pada game; kolom itu dibaca peninjau. Kode `DEBUG` (`?local`) boleh tetap: uji memakainya, dan game teratas kreator lain juga membawa mode uji.
- `game_config.json` yang tidak dikirim tetap utuh, tapi server memformat ulang (ukuran berubah, nilai sama).
- Generator aset jalan sebelum game dibuat, 8 sekaligus; serahkan ke satu subagen supaya konteks utama hemat. Gaya konsisten kalau semua prompt memakai kalimat yang sama ("glossy 3D kawaii toy style, bright saturated colors, big sparkly eyes").
- Three.js terbaru (0.187.0) hanya modul ES. Terkecil: `await import('https://cdn.jsdelivr.net/npm/three@0.187.0/+esm')` (satu berkas ±157 KB terkompres), cadangan `build/three.module.js` di jsDelivr dan unpkg; tiap percobaan ulang pakai query baru. Lampu sejak r155 perlu intensitas ±2. Cahaya pantul krem, bukan hijau (kuning jadi zaitun).
- Performa 3D: satu `InstancedMesh` per jenis benda; dekor statis digabung jadi satu mesh berwarna per titik; `renderer.compile` di awal; HP lambat (di bawah 40 FPS selama 3 detik) turun ke resolusi ×0,75 dan setengah partikel, dekor tetap tampil. Teks dan emoji HUD digambar sekali ke kanvas kecil lalu disalin.
- Suara: Web Audio (`fetch` + `decodeAudioData`), bunyi setelah sentuhan pertama, jeda saat `document.hidden`. Ukur dengan `ffmpeg -af volumedetect,silencedetect`: suara generator sering punya 0,07–0,1 detik hening di awal (lompati dengan `src.start(0, skip)`) dan volume puncak sangat berbeda (samakan).
- Emoji koin 🪙 tidak ada di HP lama (gambar sendiri). Teks Arab di kanvas butuh `direction = 'rtl'`.

### 5. Audit wajib sebelum bilang selesai dan sebelum unggah (urut)
1. `node playtest.js <folder bukti>`: alur penuh, ketuk saja, ketuk beruntun, aturan hadiah, tanpa aset, mode edit, 600 input acak ber-seed, bahasa HP, tumpang tindih HUD di semua layar × 7 bahasa, menit pertama, keamanan, dan "yang dilihat pemain".
2. `node soak.js 14`: belasan putaran dalam satu halaman; gagal kalau ada error, simpanan rusak, umpan balik hilang di putaran lanjut, atau objek GPU terus bertambah.
3. Grep aturan platform (penyimpanan, `alert`, URL jaringan), `node --check`, kunci config dan string yang dipakai tapi tidak ada. Berkas unggah dibuat dengan `tools/astrocade-upload-set.sh` (bagian 4).
4. Satu subagen membaca kode dari nol mencari bug (bukan gaya). Di Pinata ia menemukan 10 bug yang lolos semua uji.
5. Lihat tiap layar ukuran penuh, tiap varian (aturan 0.1): `node prototypes/pinata-maker/look.js <folder game> <folder keluar>` merender tiap bentuk × tiap langkah pada 720×1280; buka gambarnya satu per satu, jangan dijajar kecil. Baru setelah itu versi artifact, lalu draft.
6. Laporkan: uji yang lulus, bug yang ditemukan, dan yang hanya bisa dinilai user di HP (suara sebenarnya, rasa sentuhan, FPS, terjemahan).

### 6. Kelas bug yang harus dicek di tiap game
- Simpanan ditulis sebelum simpanan pemain selesai dibaca (progres tertimpa kosong): tahan tulis sampai baca berhasil; baca gagal diulang.
- Pustaka CDN gagal dimuat membuat layar mati: coba ulang sendiri dan pada tiap ketukan.
- Penghitung waktu tingkat modul tidak direset tiap putaran (bunyi hilang di putaran kedua).
- Tombol digambar dengan satu syarat, bisa diketuk dengan syarat lain: pakai satu fungsi untuk keduanya. Jangan ada tombol tak terlihat yang masih aktif.
- `run()` kedua: input di mode edit, panggung ganda, benda dari scene lama.
- Benda yang dilepas dari grup (`scene.attach`) tidak ikut terhapus; tekstur dan geometri yang dibuat tiap putaran harus dibuang atau dipakai ulang.
- Daftar kosong ke pemilih acak menghasilkan `undefined`; pecahan 6 × 1/6 tidak pernah genap 1; simpanan lama tanpa kolom baru; mainan tersimpan dobel kalau simpanan datang terlambat.
- Ketukan yang meleset harus tetap berefek (kertas atau stiker terdekat; lubang donat).
- Hari kalender dihitung dengan `setDate`, bukan "24 jam lalu"; jam yang dimundurkan tidak membayar hadiah dua kali.

### 7. Resep game bikin bertahap (Fizzy Bath Bomb, Pinata Maker)
- **Hadiah dulu, baru membuat:** pemain baru langsung memegang hasil jadi (3 ketukan, hadiah pertama dalam ±2 detik), lalu "buat sendiri". Putaran membuat pertama dipendekkan.
- **Jalur tata letak tetap:** HUD, bar langkah, progres, perintah, pesan, pesanan, area main, baris pilihan, tombol aksi. Benda utama diskalakan supaya muat di area main untuk tiap varian. Layar hadiah dan menu jadi panel penuh yang tidak tembus pandang.
- **Bantuan:** sorotan + tangan bayangan di benda yang harus disentuh (termasuk bentuk dan warna yang diminta pesanan); muncul lagi setelah 4 detik diam; perkenalan fitur tidak boleh menelan ketukan.
- **Ramah anak:** ketuk sama dengan tahan; tanpa layar kalah; yang tidak sempat diambil terkumpul sendiri; hadiah terbuka sendiri setelah 3 detik; tombol punya ikon; benda terkunci tetap terlihat dengan lencana gembok; ikon dan angka menggantikan kata; 7 bahasa.
- **Alasan main lama:** pesanan berbayar koin (meminta benda yang baru terbuka), album + set emas, bar hadiah berikutnya berupa potongan, toko yang memberi manfaat nyata, putaran khusus tiap ke-3, hadiah harian, tema baru. Koin selalu punya tujuan; mode pintas tidak boleh lebih untung dari alur utama; dobel memberi bintang.
- **Rasa:** jeda sekejap saat kena, bekas yang menetap, gerak lambat di puncak, getar, kamera menyentak; permen dan konfeti banyak tapi tidak di belakang karakter; warna benda tidak sama dengan latarnya.

### 8. Cara kerja bareng user
- Alur: user minta rekomendasi → daftar berprioritas → "kerjakan semuanya bertahap" → kerjakan semua, kabari per tahap. User mencoba di artifact dan di draft Astrocade; publish menunggu kata user.
- Artifact: satu berkas HTML, aset data URI (gambar diperkecil 384 px), `lib` tiruan dengan `localStorage`, `fetch` data URI ditangani sendiri.
- Jangan menjanjikan "tanpa bug" atau "audit bersih" tanpa syarat di bagian 5. Riset backend ±30 halaman per cek kecuali diminta gali dalam.
- Penilaian "pakar": yang ada adalah agen peran (game-designer, ux-designer, art-director, performance-analyst) dan satu pencari bug. Berguna, tapi tetap AI: sebutkan begitu.
- Sesi cloud: perintah shell yang menggabung `git` dengan heredoc besar, atau memuat `rm -rf`, bisa ditolak; tulis skrip suntingan ke berkas di scratchpad lalu jalankan, bukti baru ke folder baru. Push paksa ditolak. Hook berhenti meminta commit + push; repo menggabung PR otomatis dalam hitungan detik.
- Git setelah PR di-squash: lihat aturan 0.7.

### 9. Game yang sudah dibuat
- **Pinata Maker: Smash Party** — draft Astrocade `01M7QHXBYRP167NRSCKP8M33V7` (belum publish, belum ada thumbnail; draft sudah versi bersih); sumber `prototypes/pinata-maker/` (`game.js`, `scene.js`, `playtest.js` 13 uji, `soak.js`, `look.js`); bukti `production/qa/evidence/pinata-maker/`. User menyatakan aman setelah perbaikan dekorasi (2026-11-18).
- **Fizzy Bath Bomb Maker: DIY ASMR** — publik `01M7PTJ29PVDBSQ2H2Z9FF7SD1`, 160 plays di hari pertama; draft sudah versi bersih (playtest 13/13), update dikirim 2026-11-18 dan menunggu tinjauan; pemain masih disajikan versi lama `01M7PW01…` sampai lolos. Sumber `prototypes/fizzy-bath-bomb-maker/`. Belum mendapat audit bagian 5 penuh.

### 10. Kreator teratas, Players' Choice, dan akun kita (2026-11-18)
- **Traffic terbaru (astrotopper):** mingguan CashFlowGames #1 (+2,3 juta), CrazyHaribo #2 (+1,4 juta); bulanan CrazyHaribo #1 (+6,8 juta), CashFlowGames #4 (+4,4 juta). Seumur hidup mereka hanya #28 dan #23 (teratas erika 46 juta).
- **Dua cara menang.** CashFlowGames: satu ledakan, Draw One Part (game gambar asli) +1,7 juta dari +2,3 juta seminggu; sisanya puluhan remix Yummy Blends berkulit karakter terkenal, kecil per game (jangan ditiru). CrazyHaribo: 20 lebih game asli masing-masing +20–110 ribu seminggu, dibuat sebagai seri dari satu kit. Keduanya punya 180–210 game dengan median 1.400–3.100: kebanyakan game mereka juga gagal.
- **Rumus CrazyHaribo (4 game dibedah; Three.js r128, satu `index.html`):** tanpa menu; satu input (seret untuk jalan, semua aksi cukup berdiri di tempat); kumpulkan → tumpukan terlihat di punggung → setor → antrean pembeli → tumpukan uang; petak lantai berbayar yang terisi hijau dan membuka petak berikut; satu panah hijau ke satu tujuan + panel NEXT; tiap unlock dapat banner, potongan kamera, bunyi; pembantu mengotomatiskan stasiun lama; akhir cerita lalu "KEEP PLAYING". Unlock pertama $25–40 setelah 2 penjualan; rantai 10–17 petak, harga naik lurus. Tema selalu salju. Tidak memakai hadiah harian, uang offline, quest, leaderboard, terjemahan, getar; simpanan baru ada di dua game terbaru. Performa: `InstancedMesh`, dekor digabung per material, pixel ratio 1,25–1,5 di HP, mode `?bot`.
- **Players' Choice** (`top_picks`, 21–24 game per sesi, flag `top-picks-realtime-v2`): median umur 22 hari, 19 ribu plays/hari, 16 dari 23 punya leaderboard. Share per 1.000 plays 11,8 (umum 6,7); game CrazyHaribo hanya ±2,7, jadi ia tidak masuk lewat share. Penyebabnya belum terbukti (dugaan: lama main).
- **Algoritma (flag halaman):** model GBDT menilai 5.000 game lalu menyusun ulang 100 teratas; `cold-game-feed-insert` menyisipkan game baru untuk diuji; `theme-affinity-ordering` mengurutkan menurut tema yang disukai pemain.
- **Akun kita:** 44 game publik, 1,37 juta plays, median 5.143. Median per umur: 0–21 hari 253, 21–45 hari 17 ribu, 45–75 hari 32 ribu, 75 hari lebih 121 ribu. Sejak 2 Nov, 15 dari 17 game baru berhenti di 146–465 plays (dugaan: jatah uji platform); yang lolos hanya Reel & Hatch (31 ribu) dan Rub It Away (16 ribu dalam 4 hari). Teratas: Splash Master #1 215 ribu, #2 152 ribu (sekuel dapat 71%), Blueprint Builder 121 ribu, RUN! Pet Thief 113 ribu. Aksi/arcade umum gagal terus.
- **Strategi yang disepakati:** sekuel dari pemenang sendiri dulu; satu kit, satu tema, rilis rapat; menangkan 10 detik pertama untuk 200–300 pemain uji; tinggalkan game yang gagal uji; tanpa karakter bermerek. Langkah berikut: bandingkan Rub It Away dan Reel & Hatch dengan 3 game yang gagal, lalu bangun Rub It Away #2.

### 11. Analytics kreator: lolos vs gagal uji (tangkapan layar user, 2026-11-18; baru 2 game)
- Halaman `astrocade.com/create/analytics` (hanya user yang bisa buka; minta tangkapan layar) memajang: All Plays, **Significant Plays**, median durasi + distribusi dengan garis benchmark, Median FPS (Optimal 40+, Moderate 20–40, Poor 0–20), Time to First Interaction, Click-Through Rate, 0-Interaction Play Rate.
- **Significant Play = sesi 30 detik atau lebih** (cocok persis di dua game: Rub It Away 80% = 100 − 7 − 13; Pet Smile Clinic 66% = 100 − 9 − 25).
- **Rub It Away (lolos, 16,8 ribu):** significant 80%, median 1:35, P75 3:10, FPS Optimal, sentuhan pertama 2,1 d, CTR 51,3%, 0-interaksi 4%, 42% sesi di atas 2 menit. Harian: 1,3 ribu, 1,3 ribu, 3,5 ribu, lalu ±14 ribu (naik bertingkat). Lemah: share 0, hanya 12,5% sesi di atas 5 menit.
- **Pet Smile Clinic (gagal, 212):** significant 66%, median 0:51, P75 1:26, FPS **Moderate**, sentuhan pertama 3,0 d, CTR 45,1%, 0-interaksi 6%, 13,5% sesi di atas 2 menit. Harian: 180 dalam satu hari, lalu 30, lalu 3: jatah uji ±200 plays sehari, lalu diputus.
- **Target tiap game baru (dari yang lolos; belum terbukti sebagai ambang):** 80% sesi melewati 30 detik, median 1:30 ke atas, FPS 40+ di HP murah, sentuhan pertama 2 detik, CTR 50%. Beda terbesar ada di durasi dan FPS; CTR dan 0-interaksi hampir sama.
