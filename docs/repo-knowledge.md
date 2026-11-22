# Peta pengetahuan repo `corranot/game-astrocade-ku`

Dibaca sesuai kebutuhan (bukan tiap sesi). Ringkasan dari pembacaan seluruh repo pada 2026-11-20 (1.388 berkas); game, alat uji dan kelas bug diperbarui 2026-11-21.
Aturan kerja harian tetap di `ASTROCADE.md`; berkas ini menjawab "di mana, apa, dan kenapa".

## 1. Apa repo ini
- Fork dari template **Claude Code Game Studios v1.3.0** (upstream `Donchitos/Claude-Code-Game-Studios`, `framework.version` 1.3.0, upgrade terakhir 2026-11-09), dipakai untuk membuat game browser anak untuk **Astrocade**.
- Isi milik fork: `ASTROCADE.md`, `prototypes/` (7 game), `tools/` (alat, tabel §3; `tools/kit/` = berkas bersama yang disalin utuh ke game), `production/market/`, `production/qa/evidence/`, workflow GitHub tambahan, `.claude/settings.local.json`, `project.local.yaml`.
- Satu-satunya repo GitHub yang bisa diakses sesi; pencarian publik atas nama user tidak menemukan repo lain.

## 2. Game di `prototypes/`
| Game | Teknik | Pola yang bisa dipakai ulang | Uji |
|---|---|---|---|
| `fizzy-bath-bomb-maker` | Kanvas 2D, satu `game.js` modul | Contoh i18n: `T()`, `detectLang()`, `rtl()/mx()/hx()` (game.js:57-69); jalur tata letak `LANE` + perekam kotak untuk uji tumpang tindih 18 layar × 7 bahasa; pesanan, buku resep, sistem kasihan, set emas; cadangan emoji/bunyi sintetis | `playtest.js` 13 cek |
| `pinata-maker` | Three 0.187 lewat `import()` dinamis dari 4 CDN dengan `?retry=`; kanvas `gl` + kanvas HUD | `scene.js` `seen()` untuk uji keterlihatan; tabel `SOUND_FIX` (lewati diam awal, atur volume); kualitas 0.5 saat FPS rendah | `playtest.js`, `soak.js`, `look.js` (`__saveFails`) |
| `draw-it-alive` | Kanvas 2D, modul `art.js` / `levels.js` (20 level, dicerminkan jadi 40) / `game.js` | Kit stiker; baca simpanan diulang; `contrast.js` (jarak Lab < 22 dari latar) | `playtest.js` 167 cek, `soak.js` 40 level |
| `soap-carving` | Kanvas 2D multi-modul: `soap` (masker sel + SDF + cat per piksel 2.5D), `make` (7 langkah membuat), `fx`, `ui`, `sprites`, `game` | Rekaman suara lewat `lib.getAsset` + cadangan synth; kecepatan gestur dari `e.timeStamp` event gabungan; `drawAnchored` titik kerja alat; meja ganda bergantian untuk tumpukan serutan; layer HUD di-cache per kunci; hadiah harian `YYYYMMDD` | `playtest.js` 25 bagian, `soak.js` 14, `soap.test.mjs` |
| `crazy-hair-salon` | Kanvas 2D + lapisan WebGL PixiJS 8 (`gl.js`), modul `art / hair / sprites / ui / game` | Seni lukis dari generator Astrocade, kotak potong per lembar + lingkaran kepala diukur sekali di `game_config.json` `sprites`; rambut jumput lukis; resep gestur → penilaian → rak hasil | `playtest.js` 16 bagian, `soak.js` |
| `ice-cream-roll-art` | Three r187 multi-modul: `scene, sheet, roll, logic, game` | Spiral Archimedes `roll.js` (strip lembaran yang benar-benar tergulung, tutup diberi warna titik); lembaran = lapisan kanvas + bump, `compose()` tandai kotor / `flush()` sekali per frame; topping dipasang di permukaan nyata (puncak gulungan / krim), pivot di puncak; token jarak CSS `--m`/`--g`; kartu panel `.card.fit`; bintang SVG | `logic.test.mjs` 24, `playtest.js` 36 + `bugChecks`, `soak.js` 14, `look.js` 7 bahasa, **`layout.js` (jarak HUD + kartu bintang/hadiah, toleransi 2 unit)** |
| `jelly-bump-party` | Three r187 multi-modul: `scene, logic, game` | Local multiplayer 1–4 kursi di pojok (kursi atas diputar 180°), ketukan dipetakan per kuadran; lantai persegi bersudut bulat (`edge()` SDF) yang menyusut seragam; tepi jeli memantulkan blob yang meluncur sendiri; auto-aim; CPU + pilot simulasi untuk tuning; suara & musik sintetis tanpa aset; panel ⚙️ | `logic.test.mjs` 13 (+ pengetuk/pembidik simulasi), `playtest.js` (`ONLY=bugs` bagian 12), `soak.js` 10, `look.js` 7 bahasa × 5 layar |
| `toy-city-stomp` | Three r187 multi-modul: `game, city, bonbon, army, moves, missions, movefx, shapes, toon` | Import map cdnjs + `<script type="module" data-lib>` + event `three-ready`; `run()` mengantre mode, tombol coba lagi 10 dtk, try/catch `startGame`; layar loading `window.__load`; toon 3 pita + garis tepi kedalaman; atlas ikon 9×8×128 + `MutationObserver` pengganti emoji (warna kulit/ZWJ dibiarkan); Baloo 2 / Baloo Da 2 / Baloo Bhaijaan 2 (`data-font`); tier kualitas 0–3 turun otomatis bila median frame > 1/42 dtk; `?tier` `?speed`; gabung koin bila simpanan datang terlambat, tulis menunggu `saveLoaded`; papan skor tambah lalu ambil 3 teratas, nama dipotong per huruf + `dir=auto`; Kota Harian dari nomor hari; mode demo tidak menyimpan; rig bersendi; kamera sinematik dengan penjaga keterlihatan | `playtest.js` (impor 9 modul tanpa THREE, kenyamanan kamera, shader sebelum frame pertama, tekstur GPU saat ganti kota, Bonbon selalu di layar, tanpa WebGL), `screens.js` 7 bahasa |

## 3. Alat di `tools/`
| Alat | Fungsi | Kapan |
|---|---|---|
| `single-file.js <dir> <out.html> [modul…]` | Menggabung modul 2D jadi satu halaman artifact, `lib` tiruan, cek parse `vm.Script` | Artifact game 2D |
| `artifact-modules.js <dir> <out.html>` | Halaman artifact yang mengimpor `./game.js`; import map dan loader tetap; @fontsource → Google Fonts; gambar lokal sebagai aset | Artifact game Three multi-modul (terbitkan modul lewat `files`) |
| `check-artifact.js <page> <png>` | Cek kanvas `#game` 2D tergambar + satu seret | Hanya game 2D (gagal di tata letak Three `#app`) |
| `astrocade-bundle-test.js <dir> [png]` | Bundel esbuild 0.24 IIFE dalam iframe srcdoc dengan `lib` host, laporkan `started` + error | Wajib sebelum tiap `save_draft` |
| `astrocade-upload-set.sh <dir> <out>` | Set unggah bersih: buang header prototipe, `README.upload.md` → `README.md`, tolak kata alur kerja, `node --check` | Sebelum unggah |
| `bake.js <dir> [--check]` | Sprite kode-kanvas (didaftarkan `sprite()` dari `bake.js` game = salinan `tools/kit/bake.js`) dipanggang di browser jadi `baked.webp` + `bake-manifest.js`; kunci = nama+ukuran+opsi (bukan teks fungsi: esbuild menulis ulang kode); `--check` gagal bila sprite hilang/berlebih, sheet hilang/beda ukuran, piksel sheet ≠ gambar langsung (premultiplied, ambang 8; sprite yang memakai `fillText`/`strokeText` hanya didaftar karena font tiap mesin beda), atau di bundel esbuild ada sprite yang masih digambar langsung. Tanpa sheet, sprite digambar langsung (pemain tak pernah rusak) | Game yang memakai `bake.js`; CI (job bundle) |
| `assets.js <dir> [--adopt | --record <file> <url> [id]]` | `assets.lock.json` (sha256 per berkas media): ok / preview (salinan kecil untuk artifact) / NEW / CHANGED; `--record` menulis lock + `asset_map.json`; `--adopt` mencatat berkas yang byte-nya sama dengan CDN dan hanya *menyebut* calon preview (catat dengan `--record … --preview` setelah dilihat); JSON rusak = error, tidak ditimpa | Sebelum unggah: hanya yang berubah naik |
| `pipeline.test.mjs` | Uji Node (9): pack sheet, kunci resep, lock aset + adopt (server palsu), blok DEV termasuk penanda satu baris/terbalik/dalam string | Dijalankan `ci-checks.sh` |
| `market-check.js [--report|--selftest]` | Tangkap astrotopper + flag beranda + feed ke `production/market/<UTC>/`, beda dengan cek sebelumnya | Saat "cek backend" |
| `competitor-check.js <id> <folder>` | Main satu game Astrocade sebagai tamu: tangkapan layar awal, ketuk, seret + `stack.json` (pustaka, ukuran kode, daftar aset, `disableRemix`) dari context-nya | Sebelum memilih genre atau menggambar (ASTROCADE.md §0.13, §0.18) |

Pola uji per game yang dipakai ulang (bukan alat bersama): `playtest.js` dengan mode `ONLY=bugs` untuk uji mutan cepat, dan pilot simulasi (pengetuk asal vs pembidik) di `logic.test.mjs` untuk game ber-CPU (`prototypes/jelly-bump-party/`).

## 4. Sistem studio (`.claude/`)
- **49 agen** (`.claude/agents/`, daftar di `.claude/docs/agent-roster.md`): tingkat 1 opus (creative-director, technical-director, producer), tingkat 2 kepala bagian, tingkat 3 spesialis, set khusus Godot/Unity/Unreal. **Tidak ada agen Web/Astrocade.** Semua agen bertanya "May I write…" kecuali berkas baru di jalur yang ditentukan skill pemanggil.
- **91 skill** (`.claude/skills/`; katalog tes hanya mencatat 75). Yang relevan untuk game browser: `/prototype` (kartu → bangun → cek diri → serah → ubah → tumbuhkan; `one-shot-share.sh` membuat `dist/`), `/cut`, `/smoke-check`, `/setup-engine web`, `/bug-report`, `/playtest-report`, utilitas `caveman`, `ponytail`, `leanrea` (leanrea mengandaikan macOS). Skill khusus pengguna (tidak bisa dipanggil model): dev-story, story-done, hotfix, day-one-patch, launch-checklist, ultracave, megacave, help, settings, changelog. **Tidak ada skill yang membahas Astrocade**; alurnya ada di `ASTROCADE.md`.
- **Aturan** (`.claude/rules/`) hanya termuat saat berkas yang cocok **dibaca**. Aturan kode menyasar `src/…` yang kosong, jadi praktis hanya `prototype-code.md` yang berlaku.
- **Hook** (`.claude/settings.json`): SessionStart (status + celah), validate-commit (memblokir JSON data rusak hanya di `assets|Assets|Content`), validate-push (peringatan), validate-write, **validate-read memblokir baca utuh > 40 KB di jalur design/architecture/session-state** (pakai offset/limit), validate-assets, log subagen, session-stop (arsip ke `production/session-logs/`, diabaikan git). Kebanyakan gagal-terbuka (hanya peringatan).
- **Izin**: mode tanya-dulu; ditolak: semua `rm -rf`, push paksa, `git reset --hard`, `git clean -f`, `sudo`, `chmod 777`, baca/sunting `.env`.
- **Hook lokal** (`.claude/settings.local.json`): SessionStart menyuruh membaca `ASTROCADE.md` + caveman + ponytail; UserPromptSubmit membuat meta-prompt lalu langsung mengerjakan.
- **`project.yaml`**: `modes {rigor: minimal, review_mode: solo, automation: guided}`, tanpa blok `engine` (`CLAUDE.md` masih menulis engine "[CHOOSE…]"). Tingkat `minimal`: hanya `design/game-brief.md` sebelum kode, tanpa GDD/ADR/gerbang.
- **Dokumen inti** (`.claude/docs/`): workflow-modes, config-resolution (`resolve_config` via `yaml-helper.sh`), context-management (`production/session-state/active.md` sebagai titik simpan; berkas ini belum ada), run-and-observe (bukti tangkapan layar), model-tiers, coding-standards, effects-map (baca satu bagian saja).
- **Genre** (`.claude/genres/`): 69 lembar genre (kamera, kartu bawaan, rasa, pilihan, yang tidak masuk one-shot). Tidak ada genre "merge" dan tidak ada yang khusus anak. Cocok untuk anak: idle-incremental, sandbox (toybox), pet-raising, cozy-cleanup, arcade-classic, farming, physics-puzzle, hidden-object, grid-puzzle. `art-direction.md`: emoji tidak boleh jadi seni, siluet tiap musuh unik.
- **Engine** (`.claude/engines/engines.tsv`, scaffold Web Vite + TS, `docs/engine-reference/web/` dipatok 2026-10-29: vite 8.3.4, TS 7.0.2, vitest 5.0.5, Playwright 1.64.1). Game kita **tidak** memakai scaffold ini: Three 0.187 dari CDN lewat import map. Starter three di scaffold 0.186.1.
- **Skrip** (`.claude/scripts/`, 54): one-shot (new/run/check/tune/grow/share, vendor-three, page-shot), ADR/registri, sesi, penjaga baca/tulis, QA. Tidak dipanggil siapa pun: asset-scan, content-count, debt-register, flaky-stats, inputs-check, plan-math, skill-lint.
- **`studio-tests/`**: uji untuk skill dan agen studio itu sendiri (`/skill-test`, `/skill-improve`); `catalog.yaml` belum pernah dijalankan.

## 5. GitHub Actions
- `checks.yml` (pengganti `auto-merge-claude.yml` sejak 2026-11-20): `ci-checks.sh` + uji bundel tiap game; bila lulus, PR pemilik ditandai siap lalu di-squash-merge (±2 mnt). Branch kerja lalu perlu `git merge -s ours origin/main` (isi sama) sebelum push berikutnya.
- `auto-sync-all.yml` (harian 02:00 UTC): merge upstream lalu klon ulang skill ponytail/caveman/leanrea. **Rusak:** URL klon hanya `https://github.com` tanpa nama repo (gagal diam-diam karena pengaman `if`), email bot salah bentuk, dan merge upstream langsung ke `main`.
- `CODEOWNERS` dan `FUNDING.yml` masih milik upstream.

## 6. Data pasar (`production/market/`, 18–19 Nov)
- Tercepat: bikin bertahap/DIY (total terbesar), hancur-hancuran (rata-rata per game tertinggi: Si1ver Smash Everything, Prank City, Kaiju City 4,3 rb plays/jam di umur 3 hari), menggambar (Draw One Part 5 rb/jam), puzzle naik; runner/morph dan space survivor turun. Game ≤ 7 hari mendominasi.
- Akun kita (19 Nov): Rub It Away 23 rb, Fizzy 175, Pinata 49, Draw It Alive 0 (draft).
- Retensi: ekonomi terlihat, tanpa kalah keras, hadiah kecil tiap 3–6 dtk + momen besar tiap 20–90 dtk, simpanan, papan skor (16 dari 23 Players' Choice), pesanan/koleksi.
- `2026-11-19T1140/feed.json` kosong: tangkapan feed rusak. Tabel `live-rates` dibuat manual (belum ada alatnya).

## 7. Kelas bug yang berulang (dari riwayat git)
1. Simpanan datang terlambat/gagal menimpa progres → gabung sekali, tahan tulis sampai baca berhasil.
2. Mode demo (sebelum sentuhan pertama) ikut menghitung koin/misi/FEVER/rekor.
3. State tidak direset di putaran ulang atau `run()` kedua (musik, shot sinematik, bos, Mode Pelangi).
4. Kebocoran GPU saat ganti kota/tier (render target, MSAA, tekstur) → dispose + uji jumlah tekstur.
5. Kamera/keterlihatan (pahlawan keluar layar, kata komik di belakang kamera, guncangan) → arah orbit dikunci, penjaga, redaman.
6. Gagal muat/parse (komentar menelan kode, `THREE` di tingkat atas modul, tabrakan nama modul di artifact, WebGL gagal membuat loader macet).
7. Tepi hadiah harian (jam mundur, NaN, hari ke-8+, muncul di tengah ronde).
8. Pemborosan per frame (tulis DOM, alokasi array) → `addUpdateRange`, tulis hanya saat berubah.
9. Alarm palsu alat (`\btrend` vs `setRenderTarget`).
10. Input (klik kanan, jari kedua, ketukan tembus toko, kecepatan dari `performance.now()` pada event gabungan).
11. Petunjuk/pratinjau basi (tangan ke rata-rata bukan sasaran nyata, intip pesanan di-cache, benda di jari terbawa ke sentuhan baru).
12. Tata letak yang lolos uji kotak tapi terlihat berantakan (Ice Cream Roll Art, 21 Nov): kartu tanpa padding (isi > min-height → tombol nempel tepi, bayangan terpotong `overflow:hidden`); glyph ★/emoji yang tintanya tidak mengisi kotak baris (beda tiap font HP) → gambar SVG / geser menurut tinta; badge & bayangan di luar kotak barisnya; `clip-path` ikut memotong `filter` di elemen yang sama → garis tepi di pembungkus; RTL membalik `+60` jadi `60+`. Alat: `layout.js` (salin dari `ice-cream-roll-art`, ganti selektornya).
13. Uji yang tidak menangkap bug-nya (Jelly Bump, 21 Nov): lulus walau perbaikannya dibuang karena berjalan di state yang salah (blob sudah jatuh) atau memeriksa hal lain. Obat: uji mutan per perbaikan (`ONLY=bugs`, salinan folder per mutan, paralel).
14. Tabrakan nama: kelas CSS efek = kelas tombol (`.big`), spesifisitas `.hud button` menimpa warna `.out`, nama variabel `ai` kena pemeriksa kata terlarang.

## 8. Dibereskan 2026-11-20 dan yang masih terbuka
Dibereskan:
- `auto-sync-all.yml`: URL clone ke repo asli (`DietrichGebert/ponytail`, `JuliusBrussee/caveman`, `aicodeking/leanrea`), clone gagal = langkah gagal, email bot benar, `caveman-compress` dan `caveman-stats` ikut (dulu disebut `caveman-help` tetapi tidak ada).
- `checks.yml` menggantikan auto-merge instan: `tools/ci-checks.sh` (sintaks, JSON, modul tanpa THREE saat impor lewat `tools/no-three-import.mjs`, set unggah bersih) + uji bundel untuk keempat game; PR pemilik digabung hanya setelah keduanya lulus.
- `tools/astrocade-bundle-test.js`: "mulai" = hook debug ada atau kanvas 2D benar-benar tergambar (berlaku untuk keempat game).
- `.gitignore` menjelaskan bahwa `.claude/settings.local.json` dan `project.local.yaml` sengaja dilacak (sesi cloud butuh hook-nya).
- Bukti 61 MB → 30 MB: PNG Toy City Stomp dan Draw It Alive jadi JPG (skrip pembuatnya kini menulis JPG), tangkapan playtest Toy City Stomp ke folder sementara, `astrocade-top9-*` ke `production/market/2026-11-17/`, folder `fizzy` → `fizzy-bath-bomb-maker`.
- `market-check.js` memperingatkan bila feed kosong (tangkapan 19 Nov hanya gagal sesaat; cek 2026-11-20 terisi 12 kategori).
- Skill baru `astrocade-ship` (urutan kirim ke draft + artifact); `design/game-brief.md` untuk Toy City Stomp.

Masih terbuka (keputusan pemilik):
- Hook lokal "langsung kerjakan" vs protokol tanya-dulu di `CLAUDE.md`: menambah pengecualian ke `CLAUDE.md` ditolak pemeriksa keamanan sesi (melonggarkan pengawasan), jadi perlu disunting pemilik sendiri bila diinginkan.
- `project.yaml` mematok `review_mode: solo`; `CLAUDE.md` engine "[CHOOSE…]"; README template bilang game tidak dikirim di repo ini.
- Riwayat git tetap memuat gambar lama (tanpa tulis ulang riwayat).
- Hitungan skill di katalog tes (75) vs folder (93); referensi engine bilang batas pengetahuan Mei 2025; template patch-notes hilang; `log-instructions.sh` tidak terpasang; `config.json` Web tidak divalidasi hook; `CODEOWNERS`/`FUNDING.yml` milik upstream.
