# Cek backend Astrocade 2026-11-24 (dibanding bedah 2026-11-22)

Sumber: 10 halaman astrocade.com sebagai tamu (149 respons JSON, 204 chunk JS), balasan Statsig `/v1/initialize`
(77 config), `/v4/feed` (20 baris, 178 game), astrotopper, `list_my_games`, MCP `search_game_files`/`list_versions`.
Tanpa login, tanpa panggilan API buatan sendiri. **TERBUKTI** = terlihat di kode/config/respons. **DUGAAN** = tafsiran.
Rincian runtime `lib`, API, dan MCP tidak diulang: lihat `../2026-11-22-platform/bedah.md`.

## 1. Algoritma: tidak ada yang berubah sejak 22 Nov (TERBUKTI)
Ke-17 config peringkat yang disimpan 22 Nov dibandingkan nilai per nilai: 15 identik, 2 berubah di luar peringkat
(daftar game kurasi per bahasa; kuota biaya agen: tier gratis kini boleh edit "expensive" via jalur codex $1.000/minggu,
"medium" turun ke $500/minggu). Jadi aturan ini masih berlaku persis:

| Aturan | Nilai |
|---|---|
| Game mati | 200 plays dengan median sesi < 40 dtk |
| Sisip cold-start | 5% slot galeri (25% di baris tema), game ≥ 75 plays dan p50 ≥ 40 dtk |
| Skor galeri | p50 ×1 + rasio sesi signifikan ×1 + CTR ×0,2; min 150 plays |
| Boost awal | sampai ×1,2 di 5.000 plays, habis di 10.000 plays atau 30 hari |
| Boost update | α 0,12, waktu paruh 3 hari, umur maks 30 hari |
| Baris tema | p50 ≥ 40 dtk dan p75 ≥ 75 dtk |
| Players' Choice | ≥ 50.000 plays; retensi ×15, sesi > 300 dtk ×10 |
| Pencarian | game < 500 plays tidak muncul |
| Feed | `feed-v0-d0-f1`; kolam `d0_ranked_neighbors` (tetangga game masuk) + `stochastic_v0_quality` |

## 2. Yang baru terlihat hari ini (TERBUKTI)
- **Pendapatan kreator (chunk halaman Earn, konstanta `E=10, W=4, D=1e5, w=25, $=21`):** mulai dibayar setelah
  **100.000 significant plays seumur hidup, gabungan semua game**; **$0,10 per 1.000 significant plays × bonus 4×**
  ("for the early stage; subject to change") = $0,40 per 1.000; minimal cair $25 (kurang dari itu digulirkan);
  dihitung per bulan, cair tanggal 21–26; harus **enroll** dulu; ada status `isDemonetized`. Indonesia ada di daftar
  negara (jalur Stripe). Ini mengoreksi catatan 24 Nov pagi yang menyebut "100 ribu per 30 hari" (itu teks halaman
  pemasaran) dan "tarif tidak dipublikasikan".
- **Kontes $100K:** teks aplikasi: "25 creators build in public for 3 weeks. **The top five share $100,000.**"
  (Dexerto menulis pemenang tunggal; kode aplikasi lebih baru). Daftar tutup 21 Nov 07.59 UTC.
- **Rub It Away di backend:** `hasLeaderboard: true, leaderboardSortAscending: false` walau `game_config.json`
  tidak lagi memuat `persistent_storage_config` dan kode tidak memanggil leaderboard. 51.127 plays, 915 like
  (17,9‰), **1.254 share (24,5‰)**. Median share pasar 6,7‰; dari 178 game di feed hari ini 18 yang share-nya lebih tinggi.
- **Field game baru di feed:** `capabilities` (90 dari 178 game `haptics: optional`; game ber-`required` diberi kartu
  "device-blocked" di web), `sourcePool`, `cardBadges` (kosong di semua), `reviewStatus`, `lastUpdatedAt`.
- **Baris galeri:** 20 baris; sumbernya `stochastic_v0_quality` (Recommended, Discover More), `top_picks_score`,
  `theme_eligible` (11 baris tema), dan `game_jam_local_multiplayer` ("👥 Multiple Players", "Community competition -
  you be the judge!"). Baris tema yang tampil: Action, Adventure, Chat, Creative, Farm, Horror, Meme, Puzzle, Rhythm,
  Simulation, Sports, Survival, Tactics, Toys, Zen.
- **Tag selera pemain baru (onboarding):** simulation, sports, creative, arcade, zen, cooking, action, puzzle,
  survival, rhythm, adventure, horror; 10 game contoh per tag, 4 playlist kurasi (Thrill, Classics, Relax, Compete).
- **Config yang maknanya belum jelas (DUGAAN):** `{review_on_demand_enabled, shadow_mode:true, trigger_24h_ratio 0.05,
  trigger_48h_ratio 0.05, trigger_min_plays 1000}` (pemicu tinjauan ulang untuk game ≥ 1.000 plays, masih mode
  bayangan); `enable_verdict_enforcement` sejak 2026-09-09; `existing_creator_cutoff_time_ms` = 17 Nov 02.30 UTC.
- Akun kita tidak muncul di config atau flag mana pun (tidak ada perlakuan khusus, tidak ada penalti yang terlihat).

## 3. Pasar hari ini
**Tercepat minggu ini (astrotopper):** Draw One Part +456rb, Smash Everything +415rb, 41 Ragdoll +284rb, Minecraft
Sandbox TNT +279rb, Counter Arena +255rb, Lip Art Studio +241rb, Kaiju City +231rb, Woodturner +226rb, Papercut.io
+212rb, Giant Salami Saw +211rb. Keluarga yang menang sama dengan 19 Nov: gambar-satu-bagian, hancurkan, bikin/DIY.

**Yang baru menonjol di feed (178 game, laju = plays ÷ umur):**
| Pola | Contoh (plays/hari, umur) | Catatan |
|---|---|---|
| Party 1–4 pemain | 8 game standardcombo 6–14rb/hari, 3,5 hari, share 20–39‰ | Baris jam sendiri; semua satu kreator |
| Hidup/kencan/sekolah 3D | Evening Date Drive 25,5rb (17 h), Dating My Idol Boyfriend 18rb, Sunrise High School 16rb, City Life RP 10rb | Gelombang baru; banyak remix |
| "Steal a/an X" + "+1 per langkah" | Steal an Egg 18rb, Climb for Animal Eggs 19rb, Steal a Lucky Block 14rb, +1 rail 15rb | Mengisi Players' Choice |
| Arena tembak/.io | Counter Arena 32rb (14 h), Zombies vs Humans 23rb, Spin Blades.io | |
| Runner pasukan/gym | 10,000 Army Runner 25rb, Gym Giants 14rb (share 27‰), Protein Smash 19rb | |
| Salon/dandan/DIY | Squishy Balloon Slime 31rb, Makeover Studio 18rb, Dress up Showdown 21rb, Nail Art 7rb (2 h), Squishy Maker 7rb (2 h) | DIY masih lolos untuk kreator lain |
| Remix bermerek | Minecraft Guns 56rb, +1 SPEED Spider Hero 19rb | 100 dari 178 game adalah remix. Jangan ditiru: merek dibuang dari baris kurasi |

**Akun kita (53 game, 1.428.791 plays):** ±11.000 plays/hari selama 4 hari terakhir; **Rub It Away 6.100/hari = 56%**.
Lalu Grab and Park 1.226/hari, Reel & Hatch 777, Draw It Alive 730 (3.000 total), Cozy Room 348, Splash Master #1
241, Pin & Bloom 238 (1.389 total). Sisanya < 200/hari. Dari 10 game publik sejak 14 Nov, yang jauh melewati 200 plays hanya tiga,
semuanya teka-teki satu jari: Rub It Away, Draw It Alive, Pin & Bloom. Empat game bikin/ASMR berhenti di 192–393;
tiga game 3D terbaru di 27–118.

## 4. Strategi untuk game berikutnya
1. **Kerjakan keluarga yang terbukti lolos di akun ini: teka-teki satu jari dengan gag lucu, level 10 detik.**
   Hanya keluarga ini yang lolos gerbang sejak 14 Nov, dan share Rub It Away (24,5‰) ada di 10% teratas feed hari ini. Berikutnya: mekanik beda di mesin yang sama (bukan tema baru di atas gosok), rilis dengan 12 level,
   tumbuh lewat update.
2. **Gerbangnya tetap median 40 detik di 200 plays pertama.** Sebelum publish, ukur dengan simulasi garis waktu:
   tidak ada kartu hasil, menu, atau kalah sebelum detik 60; hadiah di ±10/20/30/40 dtk.
3. **Update game yang hidup tiap ±3 hari** (waktu paruh boost 3 hari): Rub It Away, Draw It Alive, Pin & Bloom,
   Grab and Park. Level baru cukup; update harus lolos tinjauan dulu.
4. **Berhenti menambah game bikin/ASMR dan 3D sandbox baru** sampai ada bukti satu saja lolos 200 plays; empat +
   tiga percobaan terakhir gagal di gerbang yang sama. Kreator lain lolos di DIY, jadi masalahnya di 40 detik pertama
   game kita, bukan genrenya: bedah dulu sebelum mencoba lagi.
5. **Jelly Bump Party cocok dengan baris "Multiple Players"** (8 game di sana 6–14rb/hari). Belum diketahui apakah
   game di luar standardcombo bisa masuk baris itu; publish adalah uji termurah.
6. **Pasang share di momen puncak** (`lib.share` dengan gambar hasil): share Rub It Away sudah tinggi tanpa itu.
7. **Pendapatan:** buka `astrocade.com/create/earn` dan enroll. Dengan 1,43 jt plays, ambang 100 ribu significant
   seumur hidup hampir pasti sudah lewat; ±11.000 plays/hari × ±80% signifikan ≈ $3,5/hari pada tarif sekarang.
8. Tetap hindari merek/IP (remix Minecraft/Spider ramai tapi dibuang dari baris kurasi dan berisiko tinjauan).

## 5. Yang tidak bisa dicek dari sini
Analytics per game (significant %, median, plays harian) hanya ada di akun user; dampak versi 22 Nov Rub It Away
belum terukur. Syarat masuk baris jam, arti config tinjauan ulang, dan bobot model GBDT tidak terlihat dari klien.
Panduan dev MCP tidak dibaca ulang hari ini (terakhir 22 Nov).
