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

### 2. Update Engine & API Terbaru (Three.js / 2D)
*(Kosong — Claude akan mengisi otomatis saat membuat game)*

### 3. Catatan Optimasi Retensi, Bug & Performa
*(Kosong — Claude akan mengisi otomatis setiap selesai review kode)*
