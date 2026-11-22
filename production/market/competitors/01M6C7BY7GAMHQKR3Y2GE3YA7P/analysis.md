# Bedah: "Minecraft Tnt City" (Tusk) — 2026-11-22

Sumber: halaman tamu Astrocade, `game.json` dan `full.json.gz` publik (wish, kode, config, aset) untuk tiga game
satu garis keturunan, plus dua kali uji main tamu di Chromium tanpa GPU. Tangkapan: `play/strip.jpg`.

Catatan merek: judul dan rupa game ini memakai merek dagang orang lain. Astra sendiri memperingatkan kreatornya
dua kali. Yang diambil di sini hanya cara kerja dan tekniknya, bukan nama, rupa, atau dunianya.

## 1. Angka

| Game | Dibuat | Plays | per hari | Like ‰ | Share ‰ | Komentar |
|---|---|---|---|---|---|---|
| Creative (akar, `01M43S2D78AQPNMP1B514A96CB`) | 4 Okt | 591.429 | ±12,6 rb | 16,4 | 4,9 | 412 |
| City (induk, `01M55M9QXR4FFKJSJR3EGKB9RV`) | 17 Okt | 261.081 | ±7,3 rb | 13,3 | 4,9 | 93 |
| TNT City (`01M6C7BY7GAMHQKR3Y2GE3YA7P`) | 1 Nov | 164.806 | ±7,8 rb | 14,8 | 2,7 | 20 |

Kreator: 2,59 jt plays total, 273 pengikut. Tiga game ini ±1,02 jt (39%). Ketiganya tanpa leaderboard, remix dikunci.

## 2. Cara kreator bekerja (semua pesan dibaca: 59 di akar, 55 di induk, 14 di TNT City; separuhnya wish, separuhnya jawaban Astra)

- **Satu mesin, banyak game lewat remix game sendiri.** Creative → remix jadi Survival → diubah jadi City (NPC,
  mobil, polisi) → remix jadi TNT City. TNT dibuat di City (30 Okt), game di-remix selagi TNT masih ada (1 Nov
  18.53), lalu empat menit kemudian TNT dicabut dari City ("i take it back remove the tnt"). Hasilnya dua game
  hidup dari satu sesi kerja.
- **Wish pendek dan kasar, Astra yang merinci.** "dude fix it and do it", "make a new huge update", "add a huge
  update thatll get alot of views". Hanya satu wish panjang berstruktur (pencahayaan, terrain, UI mobile).
- **Tiap update diberi nama dan dipasarkan.** BOOM Update, Decor, Redstone, Spawn Egg, Night & Pets, Sapling,
  Netherite, Crafting, Cats & Food. Tiap update: thumbnail baru berpita nama update, banner di layar judul, dan
  judul game ikut diganti. Thumbnail diminta ganti 11 kali di akar.
- **Komentar pemain jadi wish.** Dua wish jelas disalin dari komentar ("Here are some of my suggestions: 1.
  Buckets…", "some mistakes; when I add a door…"). Game dengan komentar terbanyak (412) adalah yang paling sering
  di-update.
- **Tempo:** akar ±29 wish dalam 41 hari, rapat di awal lalu tiap 1–4 hari.
- **Berani membuang.** Penjara, pantai, toko, lampu jalan, malam, grappler, reset world dicabut begitu terasa
  mengganggu. Kode matinya dibiarkan di berkas.
- **Wish berulang:** "no lag" 5 kali, "0 bugs/remove all bugs" 3 kali. Astra hampir selalu menjawab
  "belum saya uji main".
- **Thumbnail dari luar:** di City tiga kali mengunggah gambar buatan generator lain sebagai thumbnail.

## 3. Tech stack

- Satu `index.html` 237 KB, 2.863 baris, 239 fungsi. Three.js r128 dari CDN. Tanpa mesin fisika, tanpa worker.
- Dunia voxel: chunk 16×16, tinggi 96, grid kota sel 36 blok (jalan 11, trotoar 2, kavling 21×21);
  `lotPlan(cX,cZ)` menentukan isi kavling (plaza, sungai tiap 9 baris, menara, taman, deret rumah, landmark).
- Tekstur: atlas prosedural 8×22 petak yang digambar kode di kanvas; 22 aset gambar bawaan hampir tak terpakai.
- Mesh: tiap chunk satu `BufferGeometry` dengan pembuangan sisi tersembunyi; antrean bangun chunk dibatasi 7 ms
  per frame; peta tinggi 18×18 di-cache per chunk.
- Performa adaptif (`perfTune`): rata-rata frame > 26 ms selama 2 detik → pixel ratio turun 0,1, lalu jarak
  pandang turun satu chunk; < 17,5 ms tiga kali berturut → naik 0,05. Mobile mulai di pixel ratio 0,75.
- Ledakan: `tntSet` mencatat TNT terpasang; BOOM menyalakan hingga 80 TNT dalam radius 120, sumbu 1,3 dtk +
  jeda bertingkat (≤ 0,12 dtk per TNT) sehingga meledak beruntun; guncangan hingga 1,8 menurut jarak; kilat
  layar; TNT yang kena ledakan ikut menyala (rantai).
- 16 jenis TNT, tiap jenis satu kata kerja: klasik, mega, nuklir (awan jamur), cluster (pecah 8), pelangi
  (mengecat), es (membekukan), alam (menumbuhkan pohon), pantul, lubang hitam, tsunami, berlian (mengubah blok),
  kembang api, petir, pembangun (rumah jadi), laser (terowongan), bulan (gravitasi rendah 20 dtk).
- API platform yang dipakai hanya `lib.getAsset` dan `lib.showGameParameters`: tidak ada simpanan, leaderboard,
  share, atau getar di TNT City (akar punya 5 slot dunia tersimpan).
- 20 suara + 2 musik dari generator Astrocade; 31 nilai di `game_config.json`.

## 4. Uji main tamu (yang dilihat)

- Layar judul: kamera terbang di antara gedung, balok dan benda berjatuhan, logo besar, tombol PLAY, teks
  "PLACE · PRESS R · KABOOM". Jadi satu ketukan sebelum main.
- Dalam game: HUD berisi baris koordinat, pelacak GOAL, tombol BAG, BOOM merah besar dengan hitungan TNT,
  GRAPPLE, MINE, PLACE, JUMP, 20 hati, 20 lapar, hotbar 9 TNT.
- Petunjuk di HP masih teks desktop ("Right-click to place TNT · Press R").
- Empat ketukan PLACE saat kamera menghadap langit: hitungan tetap "0 TNT", tidak terjadi apa-apa.
- **Belum terlihat:** ledakan itu sendiri. Uji otomatis tidak berhasil mengarahkan kamera ke tanah, dan satu
  tangkapan layar makan 37 detik di mesin tanpa GPU.

## 5. Kenapa ramai, dan kelemahannya

Kemungkinan pendorong (dugaan, bukan terukur): kata kunci merek di judul dan thumbnail, basis pemain kreator,
sandbox yang sudah dikenal sehingga sesi panjang, dan tempo update bernama.

Kelemahan nyata:
1. Layar judul + PLAY sebelum aksi.
2. Deskripsi masih "peaceful blocky world with no enemies" walau isinya TNT dan polisi; Astra menegur dua kali (di dua game).
3. Kontrol orang pertama: mudah menghadap langit lalu tombol tidak berbuat apa-apa.
4. HUD padat: 6 tombol, 2 bar, hotbar, 2 baris teks.
5. Sisa survival (lapar, zombie siang hari) dan kode mati (toko, kerja, rampok).
6. Tanpa simpanan, leaderboard, share: share 2,7 ‰, terendah dari tiga game.
7. Berat di perangkat lemah.

## 6. Yang dipakai untuk game kita

- Variasi = kata kerja baru, bukan angka lebih besar. 16 TNT adalah 16 cara berbeda mengubah dunia.
- Satu tombol pemicu besar yang meledakkan semua yang sudah dipasang, beruntun.
- Update bernama tiap beberapa hari: pita di thumbnail, banner di layar pertama, judul ikut berubah.
- Komentar pemain = daftar wish berikutnya.
- Remix game sendiri untuk mencabangkan tema sambil game lama tetap mengumpulkan plays.
- Performa adaptif dua tahap (pixel ratio dulu, baru jarak pandang).
- Yang tidak ditiru: nama dan rupa bermerek, layar judul, kontrol orang pertama, HUD padat.
