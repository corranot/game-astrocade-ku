# Backend Astrocade + strategi game berikut (2026-11-20)

Sumber: snapshot pasar folder ini (astrotopper top-50 mingguan/bulanan, flag, feed tamu), `list_my_games`,
2 sesi feed tamu direkam pasif (40 game), 174 chunk JS halaman, 7 game naik dibedah dari `contextCdnUrl`.
**TERBUKTI** = terlihat di data/kode. **DUGAAN** = disimpulkan, belum diuji.

## 1. Cara game sampai ke pemain (pipeline)

| Tahap | Isi | Status |
|---|---|---|
| Feed geser tamu (`feed-v0-d0-f1`, `dayN 0`) | per 20 game: tetangga game pembuka (`d0_ranked_neighbors` 12 + 10), kolam kualitas acak ber-seed (`stochastic_v0_quality` 6 + 9), **cold-start** (`cold_game_candidates` 2 + 1, slot 11/16/19) | TERBUKTI |
| Slot cold-start | game umur 0,2–1,2 hari, 48–155 plays | TERBUKTI |
| Feed user login (`beam-web` stream) | rank 2.000 → rerank 100, `i2i_ratio 0,5`, `served_model modelEntity-2`, fitur dari Databricks, riwayat disimpan di server (klien kirim `history:[]`) | TERBUKTI (flag), isi model DUGAAN |
| Galeri | rank 5.000 → rerank 100, GBDT (`recsys-gallery-gbdt-1`), gerbang baris (`gbdt-2: gate_row`), Gumbel sort (urutan acak terkontrol per sesi), baris per genre diurutkan `theme-affinity` | TERBUKTI (flag), cara kerja DUGAAN |
| Players' Choice | `top-picks-realtime-v2` (95%), median umur 22 hari, 19rb plays/hari | TERBUKTI |

**Arti untuk kita:** game baru tidak "ditolak"; ia mendapat ±150–450 impresi dari slot cold-start
dalam ±1 hari. Kalau sinyal sesi bagus, ia masuk kolam tetangga/kualitas dan terus disajikan; kalau
tidak, berhenti. Itu persis pola akun kita: 15 dari 17 game sejak 2 Nov berhenti di 146–465 plays.

## 2. Sinyal yang dicatat klien (bahan latih model)

TERBUKTI dikirim ke Kinesis (pipa data), DUGAAN dipakai ranker:
- `game_impression_started`: sumber (feed/galeri/link), posisi, game sebelumnya.
- `active_game_event`: jumlah dan jenis gestur (tap/drag/swipe), `firstGestureMs`, `active_ms`.
- Milestone `game_play_30s` (juga konversi Google Ads), 60/300/600 dtk = **Significant Play**.
- `feed_game_fps`: fps p50/p90/p99. Waktu muat: `contextFetchMs`, `runMs`, `totalMs`.
- `feed_swipe` / `feed_skip_clicked`, like, bookmark, komentar, follow, share, replay.
- Item feed **tidak** punya tag/tema/skor; kategori hanya di baris galeri. Kemiripan i2i kemungkinan
  dari perilaku pemain (yang main A juga main B), bukan dari metadata.

Cocok dengan analytics kreator kita (§11 ASTROCADE.md): gerbang lolos = significant ≥80% + FPS Optimal.

## 3. Pasar minggu ini (top-50 mingguan)

| Tipe | Jumlah | Contoh |
|---|---|---|
| Bikin/DIY/kecantikan | 13 | Woodturner, Lip Art, Squishy Balloon, DIY Beauty Salon, Poké Ice Cream |
| Hancurkan/ragdoll | 6 | Smash Everything, Prank City, Crash Bot Lab, Robo-Crash |
| Runner tumbuh/gerbang | 6 | Gym Masters, Snack Frenzy, Mecha Arm +1, Ant War |
| Voxel bermerek | 4 | Minecraft TNT/Guns/lava (risiko merek, jangan) |
| Penembak | 3 (+2 voxel) | Counter Arena, Sniper Ghost, Zombies vs Humans |
| Curi (steal) | 3 | Steal an Egg ×2, Slap and steal a car |
| Gambar/warnai | 2 | Draw One Part (#1, +1,3 jt), Coloring Quest |
| Sembunyi-sembunyi ujian | 2 | Cheater Student, Cheat Sheet |

- Remix 36% dari top-50 mingguan. Like median 14,5 per 1.000 plays, komentar 0,44 per 1.000.
- Share tertinggi yang terukur: Poké Ice Cream Rolls 31/1.000, Draw One Part 30/1.000, Crash Bot Lab 32/1.000.
- Akun kita: Rub It Away 3,4rb/hari (umur 6 hari), Grab and Park 1,2rb/hari, Splash Master #1 724/hari
  di umur 103 hari. Pinata 177 dan Fizzy 197 berhenti di slot cold-start.

## 4. Pola desain dari 7 game yang naik (dibedah 20 Nov)

1. **Thumbnail = layar pertama.** Feed menampilkan kartu diam + Play sambil game dimuat; pratinjau sudah
   berjalan sebelum diketuk. Lembar login Google menutup ±15% bawah di detik ±10 (untuk tamu).
2. **Resep multi-gestur** (Poké Ice Cream, share tertinggi): 8 langkah, tiap langkah gestur beda ±5 dtk,
   tangan demo hanya pertama kali, tanpa gagal, bintang dari kecocokan pesanan, rak 6 hasil terakhir.
3. **Badan = bar progres** (Gym Masters): karakter makin besar, pangkat bernama tanpa akhir (×1,8 per tingkat).
4. **Kelimpahan, bukan toko** (Lip Art 12 alat/28 warna, Dress up 468 item): semua terbuka + tombol 🎲.
5. **Reveal dinilai** (Dress up): 3 juri, skor, gelar, bintang di akhir tiap ronde.
6. **Input = strategi** (Draw The Wheels): bentuk yang digambar menentukan cara melaju.
7. **Standar teknis:** 7/7 `lib.haptics` + `saveUserGameState`, 6/7 leaderboard satu angka, 5/7
   `showGameParameters`, DPR adaptif 0,6–1,5 dan mode ringan di game 3D.
8. **Yang mendongkrak klik tapi berisiko:** merek (Pokémon, Barbie, Minecraft, Ben 10), gore, tema teroris,
   curang ujian. Ambil strukturnya, bukan temanya.

## 5. Strategi (urut dampak)

1. **Menangkan slot cold-start (hari 1, ±200 pemain).** Semua yang lain tidak berguna kalau ini gagal.
   - Bingkai 0 = mainan yang sudah bergerak; aksi pertama ≤1 detik setelah Play; tanpa cutscene/menu.
   - Target per sesi: gestur pertama < 3 dtk, ≥30 dtk aktif di ≥80% sesi, FPS p50 ≥ 40 di HP lambat.
   - Muat cepat: tanpa loader panjang (`game_play_load_time` dicatat). Three.js hanya kalau perlu.
   - Kontrol utama di 15–80% tinggi layar (lembar login menutup bawah).
2. **Rancang untuk tetangga i2i.** Separuh kandidat = "pemain game X juga main ini". Bikin game di
   keluarga yang sudah ramai (bikin/DIY, gambar, hancurkan) supaya ditempel ke game besar; genre sepi
   tidak punya tetangga untuk menumpang.
3. **Share sebagai fitur, bukan harapan.** Leaderboard + `addPlayerScoreToLeaderboard` memicu ajakan
   "Challenge your friends" setelah 30 dtk (TERBUKTI 100%). Tambah hasil yang layak dipamerkan
   (rak/galeri, reveal dinilai, rekor "NEW BEST"). Share kita masih 0.
4. **Loop resep 4–8 langkah + reveal + rak** untuk game bikin (pola share tertinggi), atau
   **progres terlihat di badan/benda** untuk game aksi.
5. **Kelimpahan dulu, satu mata uang ringan sesudahnya.** 30+ pilihan gratis di hari 1, 🎲 acak;
   kalau ada koin, unlock pertama ±4 sesi, terakhir ±40.
6. **Seri, bukan game lepas.** Sekuel dari pemenang sendiri (Splash Master #2 dapat 71% dari #1),
   satu kit, rilis rapat saat pendahulu masih naik. Update besar bisa memberi uji kedua (Grab and Park).
7. **Jangan:** platformer/aksi umum, merek, kekerasan berdarah, game tanpa kata sama sekali.

## 6. Rekomendasi game berikut (konkret)

- **Rub It Away #2** (pemenang termuda kita, 3,4rb/hari): tambahkan rak hasil, reveal bintang,
  leaderboard "terbaik", 30+ gambar tersembunyi gratis. Rilis selagi #1 masih naik.
- **Game bikin resep multi-gestur** (mis. es krim/kue/sabun), 8 langkah, tanpa merek, 7 bahasa.
- Draft Draw It Alive dan Toy City Stomp: cek terhadap §5.1 sebelum publish (aksi ≤1 dtk, kontrol
  tidak di 15% bawah, leaderboard + kirim skor ada).

## 7. Yang belum diketahui

Fitur dan label GBDT, suhu Gumbel, cara memilih game cold-start dan berapa lama layak, feed user login
(tamu selalu `d0`), apakah plays bot/tamu dihitung, arti `realtime_gameplay_trigger`,
`community-playtest`, `app-review-play-exit`.
