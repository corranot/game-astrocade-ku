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

---

## MEMORI PENGETAHUAN STUDIO (MULAI DARI KOSONG & TERUS BERTAMBAH)

### 1. Tren Backend Astrocade & Rahasia Game Viral
**Cek feed 2026-11-17** — 235 game unik dari 25 baris kategori feed publik (`POST astrocade-api-prod.com/v3/feed?filter=gallery`, sesi tamu). Kecepatan = total plays ÷ umur sejak rilis (rata-rata seumur hidup, bukan plays hari ini). Retensi tidak ada di feed.
- **Kategori tercepat (median plays/hari):** Players' Choice ~20rb, Meme ~14rb, Toys ~10rb, Creative/Educational/Farm ~6rb. Paling lambat: Platformer ~340, Action ~650, Simulation ~750.
- **Pola juara untuk anak-anak:**
  1. *ASMR bikin-sendiri bertahap* (slime, kue, donat, ukir kayu, dandani boneka): tuang → aduk → warnai → hias. Slime studio 71rb/hari; Woodturner 43rb/hari dan Squishy Balloon Slime 37rb/hari di minggu pertama.
  2. *"Steal a ..." + base + pet/mutasi* (egg, brainrot, lucky block, car): 16–56rb/hari, banyak tiruan tetap laku.
  3. *Dress-up lalu duel/runway dinilai juri*: 20–24rb/hari.
  4. *Sandbox usil/meme* (Prank City 62rb/hari, brainrot, "+1 ..." incremental).
  5. *Runner gerbang matematika* (Ant Army 21rb/hari di hari ke-2) — cara masuk Educational tanpa terasa belajar.
- **Sinyal lain:** like hanya 1–2,7% dari plays di semua kategori (bukan pembeda). Share tertinggi: Arcade, Platformer, Merge, Meme (3–4%). Judul = kata kerja + benda konkret ("Steal an Egg", "Giant Salami Saw").
- **Hindari:** platformer/action generik; game bermerek (Barbie, Ben 10, Minecraft ada di feed tapi itu IP orang).

**Gali dalam 2026-11-17 (lanjutan)** — 4 snapshot feed selang 13–20 menit + 9 game teratas dijalankan di browser HP tiruan. Layar pertama tiap game: `production/qa/evidence/astrocade-top9-first-screens-2026-11-17.png`.
- **Plays nyata per jam (jendela 13–20 menit, kasar; penghitung game besar di-update per batch):** Gym Masters ~8rb, Woodturner Workshop ~8rb, Poké Phone Case Shop ~6,6rb, Dress up Showdown ~3,2rb, Lasagna Cooking Sim ~3rb, Ant Army Runner ~2,8rb. Game umur ≤7 hari mendominasi.
- **Cara skip di Astrocade:** feed geser seperti video pendek ("Swipe outside game or tap arrow for next game"). Pemain melihat thumbnail + tombol Play, lalu layar pertama game. Layar pertama itulah yang menentukan.
- **Kenapa 9 game teratas tidak di-skip (terlihat di layar):**
  1. *Tujuan + hadiah tampil sebelum main.* Woodturner: pesanan pelanggan, bentuk target, "💰 70", satu tombol hijau.
  2. *Satu kalimat perintah yang menyebut aksinya.* "Carve the log to match the dashed outline", "Drag flour... into the mixing bowl", "Tap THROW near someone".
  3. *Penghitung progres selalu terlihat.* "Step 1 of 10", "Ingredients 2/7", misi "1/17", "Choice 1/10", tab Carve→Sand→Paint.
  4. *Umpan balik tiap aksi.* Toast "Milk added! (2/7)", serpihan kayu, angka pasukan naik di gerbang +25.
  5. *Satu tombol besar di tengah bawah.* Hampir semua tetap punya layar Play 1 ketukan — bukan nol menu, tapi tidak pernah lebih dari 1 ketukan.
  6. *Layar loading dipakai mengajar.* "Tip: drag the bottles onto the bowl", "Punch the bros when they are dizzy!".
  7. *Game "Steal":* langsung di dunia, jari penunjuk + quest pertama, timer hadiah ("Online 3m", malam "in 4m 50s"), papan "Richest Thieves" dengan baris "You $0".
- **Belum terbukti:** retensi/skip rate asli tidak ada di feed; poin di atas dari pengamatan layar, bukan data skip.

**Gali sangat dalam 2026-11-17 (ronde 3)** — 650 game dari feed, 79 kandidat diukur ulang lewat halaman game masing-masing (jendela ±32 menit), 9 game dimainkan 25 detik dan kodenya dibaca. Layar: `production/qa/evidence/astrocade-top9-first-25s-2026-11-17.jpg`.
- **Cara ukur yang benar:** feed diacak per sesi (dua snapshot hanya berbagi ±48 game), jadi jangan bandingkan snapshot feed. Buka `astrocade.com/games/x/<gameId>` dua kali; halaman itu sendiri memuat hitungan plays terbaru. HTML halaman di-cache dan basi.
- **Plays nyata per jam:** Counter Arena 4.279, Squishy Balloon Slime 3.346, Papercut.io 2.261, DIY Beauty Salon 2.147, Crash Bot Lab 1.712, Dress up Showdown 1.661, Slap and steal a car 1.628, Zombies vs Humans 1.597, Ant Army Runner 1.546, Sniper Ghost 3D 1.531.
- **Tipe tercepat sekarang (jumlah plays/jam di 79 kandidat):** (1) bikin/dandani bertahap — slime, salon, dress-up, donat, phone case: ±13rb/jam dari 10 game, paling ramah anak; (2) tembak-tembakan arena blok 3D: ±11rb/jam, tapi penonton lebih tua; (3) sandbox hancurkan ragdoll: ±3,3rb/jam; (4) "Steal": ±3,2rb/jam; (5) runner gerbang matematika: ±2rb/jam.
- **Sedang menanjak (laju sekarang ÷ rata-rata seumur hidup):** Counter Arena ×3,3, Draw It! ×3,3, Chainsaw Man ×2,7, Slime ×2,2. Game lama besar melambat (×0,4–0,7).
- **Yang dicatat platform (terlihat di kode situs):** waktu sampai gestur pertama, gestur selama main, tonggak main 30/60/300/600 detik, detak interaksi (dasar retensi D1/D3/D7/D30), FPS rata-rata + simpangan yang dikirim game, waktu muat preview. Bobot di peringkat tidak terlihat.
- **Temuan baru soal skip:**
  1. *Game sudah jalan di belakang kartu Play.* Pemain melihat layar pertama game (buram) sebelum mengetuk. Ant Army: pasukan dan gerbang sudah tampak. Layar pertama harus hidup tanpa input.
  2. *Muat cepat:* iframe muncul ±4,5 detik, layar pertama game 7–9 detik dari buka halaman. Ant Army paling lambat (15,6 detik) dan menutupinya dengan dunia yang sudah terlihat.
  3. *Penolakan lembut, bukan kalah.* Slime: "Pour a bit more gel!", "Keep stirring!", lalu "Nice pour! Tap NEXT". Tidak ada layar gagal di game bikin-bikin.
  4. *Pilihan tiap beberapa detik.* Ant Army: 10 gerbang per stage ("CHOICE 2/10"), angka pasukan berubah di tiap gerbang; kalah menampilkan sebab jelas ("Crushed by the thorn rams!") + "PLAY AGAIN".
  5. *Mainan tanpa aturan.* Crash Bot Lab: 15 senjata terbuka sejak awal, satu kalimat per senjata ("Tap to drop an anvil"), penghitung DAMAGE.
  6. *Kejutan acak di game panjang.* Lucky Block: "CASH RAIN!", "GOLD RUSH!", "LUCKY PORTAL!", "WELCOME BACK!", uang jalan "+$0/s", papan "Top Steals".
  7. *Papan skor:* 7 dari 10 game tercepat punya leaderboard; game bikin-bikin (Slime, Beauty Salon) tidak, jadi bukan syarat.
- **Ukur ulang 29 menit kemudian (±16.20–16.50 UTC):** total 79 kandidat turun dari ±47rb ke ±35rb plays/jam, jadi laju bergantung jam. Urutan: Woodturner Workshop 2.525, Counter Arena 2.245, Squishy Balloon Slime 1.653, Prank City 1.389, Poké Phone Case Shop 1.242, Papercut.io 1.140, DIY Beauty Salon 1.083. Lima dari tujuh teratas adalah game bikin bertahap atau sandbox usil; kesimpulan tipe tidak berubah.
- **Belum terbukti:** skip rate dan retensi per game tetap tidak terbuka; dua jendela ±30 menit berurutan saja, belum tentu sama di jam lain.

**Cek bahasa penonton 2026-11-18 (gali dalam)** — 3.630 komentar dari 30 game (20 paling ramai komentar + 10 game umur ≤8 hari), ±120 per game. Tiap komentar membawa label `language` dari platform; label itu cocok 98% dengan pendeteksi bahasa terpisah pada 298 komentar panjang.
- **Porsi dari 3.361 komentar berlabel:** Inggris 57%, Arab 24%, Spanyol 5,6%, Vietnam 2,8%, Hindi 2,7%, Bengali 2,3%, Indonesia 1,6%, Turki 0,8%, Prancis 0,7%, Urdu 0,6%. Di bawahnya: Portugis 0,4%, Tagalog, Rusia, Italia (masing-masing ≤0,2%).
- **Stabil dari semua sudut:** Inggris dan Arab muncul di 30 dari 30 game; urutan sama untuk rata-rata per game, komentar 14 hari terakhir, dan game baru. Posisi 8–10 (Turki, Prancis, Urdu) hanya 20–27 komentar, jadi bisa bertukar dengan Portugis kalau dicek ulang.
- **Batas data:** komentar ditulis anak yang lebih besar, bukan semua pemain; bahasa komentar belum tentu sama dengan bahasa device (penutur Hindi sering memakai HP berbahasa Inggris). 7% komentar tanpa label (emoji atau terlalu pendek).
- **Cara cek yang cepat:** buka halaman game dengan game-nya diblokir (`play.json`, `/context/`), tekan tombol Comments, gulir hanya di dalam lembar komentar; satu sesi tamu per pekerja (halaman paralel dalam satu sesi gagal). 30 game selesai ±5 menit.

### 2. Update Engine & API Terbaru (Three.js / 2D)
**Platform Astrocade (terbukti 2026-11-18 lewat `get_game_dev_guide` dan unggah nyata)**
- **Kanvas:** iframe persis 720×1280; game mendefinisikan `window.run = run`, host memanggil `run('play'|'edit')`. Mode edit: gambar hidup tanpa gameplay sudah diterima.
- **Dilarang di iframe:** `localStorage`, cookie, `alert`, popup, jaringan selain CDN yang disetujui dan aset platform. Simpanan hanya lewat `lib.saveUserGameState`/`getUserGameState` (satu slot, selalu kirim state penuh).
- **Suara:** `fetch(url aset)` + `decodeAudioData` jalan (CDN aset mengirim `access-control-allow-origin: *`). Web Audio lebih baik daripada `<audio>`: loop mulus dan volume bisa diatur. Suara baru boleh bunyi setelah sentuhan pertama; jeda saat `document.hidden`.
- **Wajib ada:** `lib.showGameParameters` kalau config punya angka; leaderboard dideklarasikan di `persistent_storage_config`; getar hanya lewat `lib.haptics`.
- **Gambar:** emoji koin 🪙 tidak ada di HP lama, jadi gambar koin sendiri di kanvas. Gambar generator konsisten kalau semua prompt memakai kalimat gaya yang sama ("glossy 3D kawaii toy style, bright saturated colors, big sparkly eyes").

### 3. Catatan Optimasi Retensi, Bug & Performa

**Resep bangun game bertahap (hasil Fizzy Bath Bomb Maker, pakai ulang untuk game berikutnya)**
1. *Jalur tata letak tetap.* Bagi layar jadi jalur (HUD, bar langkah, perintah, pesan, pesanan, area main, baris pilihan, tombol aksi); tiap elemen hanya di jalurnya. Layar hadiah dan menu jadi panel penuh.
2. *Uji anti-tumpang-tindih.* Di mode debug game mencatat kotak tiap elemen; uji gagal kalau dua kotak bersinggungan atau keluar layar, di semua layar × semua bahasa.
3. *FTUE.* Putaran pertama dipendekkan (hadiah pertama ±10 detik); sorotan + tangan bayangan di benda yang harus disentuh; fitur muncul satu per satu dan masing-masing minta satu ketukan (batas 6 detik); bantuan muncul lagi setelah 4 detik diam.
4. *Alasan main lama.* Pesanan pelanggan berbayar koin, buku resep kombinasi, album koleksi + set emas, bar hadiah berikutnya di HUD, toko sebagai tempat belanja koin, mini-game tiap putaran ke-3, tempo makin cepat. Dobel tidak boleh terasa rugi (beri bintang).
5. *Ramah anak kecil.* Ketuk harus berefek sama seperti tahan; tidak ada layar kalah; tombol ulang ditunda 1,5 detik supaya tidak terpencet; ikon dan angka menggantikan kata.
6. *Visual.* Satu gaya untuk semua gambar; benda kanvas diberi gradasi, kilau, dan bayangan meja; benda utama punya volume; air bergerak; hadiah dibuka dengan kilatan; langkah meluncur masuk; chip HUD berwarna per fungsi.
7. *Uji wajib sebelum unggah* (`playtest.js`): alur penuh, ketuk saja, ketuk beruntun, aturan hadiah, layar tanpa aset, mode edit, 600 input acak ber-seed, tiap bahasa lewat locale browser, tumpang tindih, FTUE. Uji tidak boleh bergantung pada keberuntungan.

**Cara kerja bareng user (pola yang berulang di sesi 2026-11-17/18)**
- Alurnya: user minta rekomendasi → jawab dengan daftar berprioritas dan urutan kerja → user bilang "kerjakan semuanya bertahap" → kerjakan semua, laporkan per tahap.
- Game diuji dulu di artifact (satu berkas HTML, aset ditanam sebagai data URI, `lib` tiruan dengan `localStorage`); baru setelah user puas dibuat di Astrocade. Publish selalu menunggu kata user.
- User sering menyebut "para pakar": jawab dengan penilaian sendiri dari data dan tangkapan layar, dan katakan terus terang bahwa itu bukan panel pakar.
- Jangan menjanjikan "tanpa bug": laporkan uji yang lulus, bug yang ditemukan uji, dan apa yang hanya bisa dinilai user di HP (suara, rasa gerakan, terjemahan).
- User tidak suka menunggu lama: riset backend maksimal ±30 halaman per cek, dan beri kabar singkat saat proses panjang.
- Batas alat di sesi cloud: panggilan API Astrocade langsung dengan header tiruan ditolak (pakai browser biasa); `rm` dengan pola `*` ditolak (tulis bukti baru ke folder baru); push paksa ditolak.

**Fizzy Bath Bomb Maker (draft Astrocade 2026-11-18)** — game id `01M7PTJ29PVDBSQ2H2Z9FF7SD1`, sumber di `prototypes/fizzy-bath-bomb-maker/`, belum dipublikasikan.
- **Format akun ini multi-berkas:** `index.html` memuat `./game.js` sebagai `type="module"`. Server uji lokal wajib mengirim `content-type: text/javascript`, kalau tidak modul menolak dimuat dan game tampak mati.
- **Cara unggah hemat:** `begin_upload` (purpose `game_file`) per berkas, `curl -X PUT -T`, lalu `save_draft` dengan `file_upload_ids`. Jangan kirim isi berkas lewat `files`.
- **Generator aset tidak butuh game:** `generate_image`/`generate_sound_effect`/`generate_music` jalan sebelum game dibuat; maksimal 8 sekaligus. Thumbnail baru bisa dibuat setelah draft tersimpan.
- **Supaya mudah dikenali genre-nya:** judul memakai pola game sejenis yang laris ("... Maker: DIY ASMR"), deskripsi dibuka dengan kata kerja langkah-langkahnya (pour, color, stir, press, decorate) dan menyebut hadiah (surprise toy, collect). Cara kerja rekomendasi Astrocade tidak terlihat dari luar; ini mengikuti pola yang tampak di feed.
- **Bug yang hanya tertangkap uji:** jumlah pecahan 6 × 1/6 tidak pernah genap 1; tombol HUD mati saat fitur diperkenalkan; simpanan lama tanpa kolom baru; uji yang bergantung pada keberuntungan. Selalu jalankan `node playtest.js` sebelum unggah.
- **Git:** setelah PR di-squash, mulai branch dari `origin/main`, lalu gabungkan ujung branch lama dengan `git merge -s ours` (jangan `-X ours`: itu pernah menyelipkan baris lama ke berkas).
