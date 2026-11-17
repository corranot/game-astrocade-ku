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

### 2. Update Engine & API Terbaru (Three.js / 2D)
*(Kosong — Claude akan mengisi otomatis saat membuat game)*

### 3. Catatan Optimasi Retensi, Bug & Performa
*(Kosong — Claude akan mengisi otomatis setiap selesai review kode)*
