# Peta pengetahuan repo `corranot/game-astrocade-ku`

Dibaca sesuai kebutuhan (bukan tiap sesi). Ringkasan dari pembacaan seluruh repo pada 2026-11-20 (1.388 berkas).
Aturan kerja harian tetap di `ASTROCADE.md`; berkas ini menjawab "di mana, apa, dan kenapa".

## 1. Apa repo ini
- Fork dari template **Claude Code Game Studios v1.3.0** (upstream `Donchitos/Claude-Code-Game-Studios`, `framework.version` 1.3.0, upgrade terakhir 2026-11-09), dipakai untuk membuat game browser anak untuk **Astrocade**.
- Isi milik fork: `ASTROCADE.md`, `prototypes/` (4 game), `tools/` (6 alat), `production/market/`, `production/qa/evidence/`, workflow GitHub tambahan, `.claude/settings.local.json`, `project.local.yaml`.
- Satu-satunya repo GitHub yang bisa diakses sesi; pencarian publik atas nama user tidak menemukan repo lain.

## 2. Game di `prototypes/`
| Game | Teknik | Pola yang bisa dipakai ulang | Uji |
|---|---|---|---|
| `fizzy-bath-bomb-maker` | Kanvas 2D, satu `game.js` modul | Contoh i18n: `T()`, `detectLang()`, `rtl()/mx()/hx()` (game.js:57-69); jalur tata letak `LANE` + perekam kotak untuk uji tumpang tindih 18 layar × 7 bahasa; pesanan, buku resep, sistem kasihan, set emas; cadangan emoji/bunyi sintetis | `playtest.js` 13 cek |
| `pinata-maker` | Three 0.187 lewat `import()` dinamis dari 4 CDN dengan `?retry=`; kanvas `gl` + kanvas HUD | `scene.js` `seen()` untuk uji keterlihatan; tabel `SOUND_FIX` (lewati diam awal, atur volume); kualitas 0.5 saat FPS rendah | `playtest.js`, `soak.js`, `look.js` (`__saveFails`) |
| `draw-it-alive` | Kanvas 2D, modul `art.js` / `levels.js` (20 level, dicerminkan jadi 40) / `game.js` | Kit stiker; baca simpanan diulang; `contrast.js` (jarak Lab < 22 dari latar) | `playtest.js` 167 cek, `soak.js` 40 level |
| `toy-city-stomp` | Three r187 multi-modul: `game, city, bonbon, army, moves, missions, movefx, shapes, toon` | Import map cdnjs + `<script type="module" data-lib>` + event `three-ready`; `run()` mengantre mode, tombol coba lagi 10 dtk, try/catch `startGame`; layar loading `window.__load`; toon 3 pita + garis tepi kedalaman; atlas ikon 9×8×128 + `MutationObserver` pengganti emoji (warna kulit/ZWJ dibiarkan); Baloo 2 / Baloo Da 2 / Baloo Bhaijaan 2 (`data-font`); tier kualitas 0–3 turun otomatis bila median frame > 1/42 dtk; `?tier` `?speed`; gabung koin bila simpanan datang terlambat, tulis menunggu `saveLoaded`; papan skor tambah lalu ambil 3 teratas, nama dipotong per huruf + `dir=auto`; Kota Harian dari nomor hari; mode demo tidak menyimpan; rig bersendi; kamera sinematik dengan penjaga keterlihatan | `playtest.js` (impor 9 modul tanpa THREE, kenyamanan kamera, shader sebelum frame pertama, tekstur GPU saat ganti kota, Bonbon selalu di layar, tanpa WebGL), `screens.js` 7 bahasa |

## 3. Alat di `tools/`
| Alat | Fungsi | Kapan |
|---|---|---|
| `single-file.js <dir> <out.html> [modul…]` | Menggabung modul 2D jadi satu halaman artifact, `lib` tiruan, cek parse `vm.Script` | Artifact game 2D |
| `artifact-modules.js <dir> <out.html>` | Halaman artifact yang mengimpor `./game.js`; import map dan loader tetap; @fontsource → Google Fonts; gambar lokal sebagai aset | Artifact game Three multi-modul (terbitkan modul lewat `files`) |
| `check-artifact.js <page> <png>` | Cek kanvas `#game` 2D tergambar + satu seret | Hanya game 2D (gagal di tata letak Three `#app`) |
| `astrocade-bundle-test.js <dir> [png]` | Bundel esbuild 0.24 IIFE dalam iframe srcdoc dengan `lib` host, laporkan `started` + error | Wajib sebelum tiap `save_draft` |
| `astrocade-upload-set.sh <dir> <out>` | Set unggah bersih: buang header prototipe, `README.upload.md` → `README.md`, tolak kata alur kerja, `node --check` | Sebelum unggah |
| `market-check.js [--report|--selftest]` | Tangkap astrotopper + flag beranda + feed ke `production/market/<UTC>/`, beda dengan cek sebelumnya | Saat "cek backend" |

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
- `auto-merge-claude.yml`: tiap PR dari `corranot` langsung ditandai siap lalu di-squash-merge. **Tidak ada CI uji.**
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
10. Input (klik kanan, jari kedua, ketukan tembus toko).

## 8. Yang usang, bertentangan, atau perlu dibereskan (temuan, belum diubah)
- Workflow sinkronisasi skill rusak (bagian 5); auto-merge tanpa CI.
- `.claude/settings.local.json` dan `project.local.yaml` ter-commit padahal ada di `.gitignore`.
- Hook lokal "langsung kerjakan" bertentangan dengan protokol tanya-dulu di `CLAUDE.md`.
- `project.yaml` mematok `review_mode: solo` padahal komentarnya melarang knob yang dikuasai `rigor`.
- `CLAUDE.md` engine masih "[CHOOSE…]"; `README` bilang game tidak dikirim di repo ini.
- Dua konvensi bukti: framework `story-slug/NN-…png + stamp.txt` vs fork satu set per game (yang dipakai: fork).
- Ukuran bukti: draw-it-alive 31 MB (ada duplikat `book*.png`, `contrast/`), toy-city-stomp 19 MB (PNG ±790 KB; JPG jauh lebih kecil), dua berkas `astrocade-top9-*` di akar evidence semestinya di `production/market/`, folder `fizzy` ≠ nama prototipe.
- `prototypes/toy-city-stomp/0x-*.png` (tangkapan playtest) ada di folder prototipe.
- Commit menyebut `design/game-brief.md` tetapi berkas itu tidak ada; `production/session-state/active.md` juga tidak ada.
- Hitungan skill tidak cocok (75 / 69 / 91); referensi engine bilang batas pengetahuan Mei 2025; `caveman-help` menyebut `/caveman-compress` dan `/caveman-stats` yang tidak ada; template patch-notes hilang.
- `log-instructions.sh` tidak terpasang; `config.json` Web dan `prototypes/*/config.js` tidak pernah divalidasi hook.
