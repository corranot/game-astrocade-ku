# Bedah platform Astrocade: lib, runtime, backend, MCP (2026-11-22)

Sumber: (1) runtime yang disuntik host ke iframe game, ditangkap sebagai tamu (2 kunjungan Steal an Egg);
(2) 9 halaman astrocade.com sebagai tamu + 475 chunk JS-nya; (3) balasan Statsig `/v1/initialize` yang dikirim ke
tamu (nilai config backend; nama config di-hash) → ekstrak tanpa ID user di `statsig-configs.json`; (4) deskripsi semua
tool MCP Astrocade + `get_game_dev_guide`; (5) `list_my_games`. Tanpa login, tanpa panggilan API buatan sendiri.
Efek samping: kode Steal an Egg sendiri mengirim skor tamu "0" ke leaderboard-nya (3 + 1 kali) saat dimuat/digeser.
**TERBUKTI** = terlihat di kode/lalu lintas/config. **DUGAAN** = tafsiran.

## 1. Yang menentukan plays (config server, TERBUKTI nilainya)

| Aturan | Nilai | Arti untuk kita (DUGAAN kecuali disebut) |
|---|---|---|
| Game "mati" (`dead_game_config`) | `plays_threshold 200`, `min_p50_secs 40` | Lulus slot uji = median sesi ≥ 40 dtk saat ±200 plays. Inilah gerbang yang menghentikan 15/17 game kita di 146–465 plays |
| Sisip cold-start galeri | 5% slot, game ≥ 75 plays dan p50 ≥ 40 dtk | Sama: p50 40 dtk adalah syarat masuk |
| Skor galeri | p50 ×1 + rasio sesi signifikan (SPR) ×1 + CTR feed ×0,2; min 150 plays | Durasi dan sesi panjang jauh lebih berat daripada thumbnail/CTR |
| Boost awal (`play_boost`) | naik dari 0, puncak ×1,2 di 5.000 plays, habis di 10.000 atau 30 hari | Dorongan terbesar di 0–5rb plays pertama |
| **Boost update** (`update_recency_boost`) | α 0,12, waktu paruh 3 hari, maks umur 30 hari | **Update game publik tiap ±3 hari menjaga boost** (cocok dengan gelombang kedua Grab and Park) |
| Baris tema | p50 ≥ 40 dtk dan p75 ≥ 75 dtk | Seperempat pemain teratas harus main ≥ 75 dtk |
| Players' Choice | ≥ 50.000 plays; bobot retensi 15, sesi > 300 dtk 10, p50 0,033 | Retensi (kembali main) dan sesi 5 menit yang menentukan |
| Eksperimen galeri `gallery-d0-v3` | ambang signifikan 90 dtk; prior p_sig 0,266, p_2nd 0,526, p_ret 0,177; shrinkage k=200 | Rata-rata platform: 27% sesi signifikan, 53% main ke-2, 18% kembali. Di bawah itu = di bawah rata-rata |
| Duplikasi dibuang | IP/merek, kreator sama dalam 3 slot, keluarga remix, judul mirip (bigram), tag konsep, tema | Jangan rilis game mirip berdekatan; merek terkenal dibuang dari baris kurasi |
| Pencarian | game < 500 plays tidak muncul; bobot nama 0,5, kualitas 0,7, plays 0,8 | Judul berkata kunci baru berguna setelah 500 plays |
| Baris "New" / "Community Playtests" | ≤ 150 / ≤ 75 plays | Etalase game sangat baru |
| Kuota tier gratis | publish game baru 2/hari, republish 5/hari; mulai-kreasi lewat agen 2 seumur hidup | Rencana rilis: maks 2 game baru per hari |
| Pendapatan | $1 per 1.000 plays ke "AI wallet", maks $200, syarat 200 sesi signifikan; halaman Earn via PayPal | |
| Tier user | `free`, `internal`, `shadowbanned` | |

Benchmark yang dipajang ke kreator (halaman analytics): waktu ke interaksi pertama < 5 dtk, FPS > 40, CTR feed > 40%,
sebagian besar sesi 2–5 menit. Sesi tanpa interaksi tidak dihitung sebagai play.

## 2. Runtime game di feed (TERBUKTI dari kode host + lalu lintas)

- Iframe `srcdoc`, `sandbox="allow-scripts allow-pointer-lock"`, `allow="autoplay *"`, 720×1280 diskalakan
  `transform:scale`, origin `null`: localStorage/sessionStorage/IndexedDB/cookie melempar `SecurityError`. Tanpa CSP:
  host lain tidak diblokir, hanya dilaporkan (`GAME_EXTERNAL_REQUESTS`).
- Urutan suntikan: audio-prelude → head game → error-handlers → gesture-tracking → game-library (`lib`) → game →
  ready-signal. `IFRAME_READY` wajib datang ≤ 20 dtk; lalu host mengirim `RUN_WITH_CONFIG` (`mode:"play"`).
- **Pratinjau feed menjalankan game sungguhan dalam keadaan bisu**; `run()` dipanggil sekali. Tombol Play hanya
  "mempromosikan" sesi dan menyalakan suara (fade 250 ms), game tidak di-run ulang.
- **Ketukan di dalam game saat pratinjau = play terhitung** (`POST /v3/games/<id>/plays`, `game_promoted`). Geser
  vertikal ≥ ±70 px atau seret cepat ±154 px = pindah game (skip).
- Gestur dihitung oleh listener sentuh di `document` (bubble): tap < 10 px & < 200 ms, drag > 10 px, swipe > 50 px
  dalam < 500 ms, tahan 500 ms. **Game yang `stopPropagation` sebelum `document` terlihat "tanpa interaksi"**.
- Waktu aktif hanya saat main dan tab terlihat; `game_play_30s` butuh ≥ 30 dtk aktif + ≥ 1 gestur (sekali per sesi
  jelajah, ikut dikirim ke tracker iklan Meta/Google). Milestone 30/60/300/600 dtk memakai jam dinding sejak Play dan
  direset ke 0 saat tab tersembunyi.
- FPS: lib mengukur mulai 5 dtk setelah `run`, jendela ≥ 1 dtk; host mengirim min/p50/p90/p99 setelah 10 sampel,
  lalu tiap 60. Hanya saat terlihat.
- `console.error`, error window, dan rejection → `GAME_ERROR` ke host. Yang bukan error pakai `console.warn`.
- Simpanan dan skor dikumpulkan host per 5 dtk (state: tulisan terakhir menang; skor: terbaik bila arah urut diketahui),
  dicoba ulang sampai 60 dtk, di-flush saat `pagehide`/tab tersembunyi. Skor harus angka ≥ 0 dan ≤ 2^53−1.
- **Haptics, motion, kamera, mikrofon `supported:false` di web** (host web tidak mengirim config device); hanya di
  aplikasi. `capabilities.needs` bernilai `required` memblokir pemain web dengan layar "unduh aplikasi".

## 3. API `lib` lengkap

Terdokumentasi dan ada semua: `getAsset`, `log`, `showGameParameters` (callback lewat `INVOKE_CALLBACK`),
leaderboard (skor dikirim sebagai teks), simpan/baca/hapus state (jalan juga untuk tamu), `shouldUseTouchControls`,
`getAnimationPlayer`/`preloadAnimation`, `llm` (batas 30 dtk), `haptics`, `motion`, `camera`, `mic`.

Tidak terdokumentasi:
- **`lib.share({image, title, description, text})`**: tidak pernah reject; `image` boleh kanvas/img/data URL, diskalakan
  maks 720×1080 JPEG q0,9; teks dipotong 60/120/140 grafem; lembar bagikan host hanya di mode play, maks 10/menit.
  Host mengurutkan tujuan per negara (Indonesia: WhatsApp, Instagram, Telegram, Messenger, Twitter).
- `lib.editMenu.open/close`; mode edit: `commitState`, `startDrag`/`endDrag`, `startBatch`/`endBatch`, `batch(fn)`.

Tidak ada: iklan/rewarded, event pause/resume, API volume, info user, `isGuest`, locale, safe-area, petunjuk kualitas.

## 4. Backend dan alur pembuatan (TERBUKTI dari chunk)

- Next.js 16.4.2 (Turbopack) + React 19.3 canary di Vercel; aset di S3/CloudFront; API `astrocade-api-prod.com`
  (DynamoDB); wish lewat AWS API Gateway `/v1/context` (`astroBrainRequest`: `request_type`
  brainstorming|fluff|create|direct_asset_edit, model `fast`/`smart`, mode rencana tugas), hasil lewat langganan
  AppSync GraphQL. Analitik Amplitude + Kinesis lewat `edge.astrocade.com`, New Relic, Sentry, GTM, iklan Google/Meta;
  flag ganda: Amplitude Experiment (158 flag) + Statsig (77 config, rekaman sesi tamu aktif).
- **Bundling di browser** dengan esbuild-wasm: `iife`, `es2020`, sistem berkas virtual berisi hanya berkas workspace;
  entri = `script[src]` pertama di `index.html` (lalu `main.js`, `game.js`); `style.css` di-inline. Itu sebabnya
  `import 'three'` gagal ("File not found in workspace").
- Backend agen (flag `agentic-gcm`): default `pydantic_ai`; varian `claude-sub-*`, `pydantic-ai-codex-sub-*`, uji
  `gemini` 10%, `codex-ultrafast`, sampul `gpt-image-2-5`. Target selesai: create 1.200 dtk, edit 360 dtk.
- Review: `not_ready | pending_review | approved | rejected`, checklist publish ("Test on phone"), pipeline manusia
  `/internal/ugc-pipeline/*` (termasuk `retire`).
- Statistik kreator publik: `/v3/analytics?filter=stats&username=X` (total plays). Kontes: $100rb Creator Contest
  (pendaftaran tutup 20 Nov) dan kompetisi game tiap dua minggu. Aplikasi iOS/Android via `open.astrocade.com`.
- UI bagikan 12 bahasa (en ar fr es vi id hi pt th fa ru tr); sisanya Inggris; feed memfilter bahasa perangkat
  (fallback en); header permintaan `device-language`, `user-country`, `user-day-n`.
- Setelah 30 dtk main, Replay memunculkan ajakan bagikan (sekali per game); modal leaderboard "Challenge your friends
  to beat your score!".

## 5. Permukaan MCP (deskripsi tool, TERBUKTI)

- `create_game` tidak memakai wish; `save_draft` multi-berkas dibundel ulang seperti astrocade.com; satu simpan ≤ 6 MB
  halaman terbundel (sumber ≤ 64 MB terurai); berkas > ±100 KB lewat `begin_upload` (game_file ≤ 10 MB, boleh gzip;
  asset ≤ 5 MB).
- **Judul/deskripsi yang disimpan `save_draft` langsung tampil di game publik** (tidak menunggu publish).
- `publish_game`: game baru/ditolak → review; **update game approved "live right away"** menurut deskripsi tool,
  bertentangan dengan catatan §0.11 (user: update ditinjau dulu). Bukti tayang tetap `servedVersionId`.
  `keep_player_saves`/`keep_leaderboard` (membalik arah urut leaderboard selalu mereset), `publish_limit_reached`.
- `generate_image` (±2 mnt; subtipe object/character/background/ground/effect/ui; maks 4 gambar referensi CDN untuk
  menyamakan gaya; latar transparan), `generate_music` (3–90 dtk, loop), `generate_sound_effect` (2–30 dtk), hasil
  bisa dibaca 7 hari. `lib.getAsset` mengembalikan juga `aspect_ratio`, `size_hint`, `view`, `outline`
  (box/circle/polygon untuk tabrakan), `loop`, `duration_secs`.

## 6. Analisis: yang belum kita lakukan (urut dampak)

1. **Ukur p50 sejak hari pertama.** Gerbang nyata = p50 ≥ 40 dtk di ±200 plays (bukan "10 detik pertama" saja).
   Rancang 40 detik pertama sebagai satu putaran utuh yang memaksa main terus (hadiah di 15, 30, 40 dtk).
2. **Pratinjau bisu = layar pertama.** Game harus terlihat seru tanpa suara dan bereaksi pada ketukan pertama di
   pratinjau (itu yang menghitung play). Jangan menunggu tombol "Play" di dalam game; jangan butuh suara untuk paham.
3. **Jangan hentikan event sentuh sebelum `document`** (cek semua `stopPropagation` di game kita).
4. **Update game publik terjadwal tiap ±3 hari** (boost update), dan 2 game baru/hari maksimum.
5. **Retensi dan sesi 5 menit** menentukan Players' Choice dan GBDT: hadiah harian, simpanan, alasan kembali.
6. **`lib.share`** untuk kartu "pamer hasil" (gambar kanvas + teks pendek) di momen puncak.
7. **Getar tidak jalan di web**: umpan balik visual/suara wajib, getar hanya bonus; jangan pernah `required`.
8. **Ganti `console.error` untuk kondisi wajar** menjadi `console.warn`; FPS dinilai mulai detik ke-5.
9. Judul/deskripsi bisa diubah langsung tanpa publish → uji judul tanpa memakai kuota publish.

---
## Lampiran A — catatan runtime `lib` (subagen, Inggris)


I made 2 guest page loads of `/games/x/01M6TFFBQ2MPBHZWT2KH2ZN01M` ("Steal an Egg") in headless Chromium with a 430x932 touch viewport. There was no login and no likes, comments or shares. The game's own code called `addPlayerScoreToLeaderboard("0")` 3 times on its own, every 60 s or so. We did not call it. I skipped step 7 (the Party/share game) because both sides of share are in the captured code.

**V** = verified (seen in code or traffic). **I** = inferred.

## 1. How the iframe is built (V)
- The host builds one `<iframe srcdoc=…>` with `sandbox="allow-scripts allow-pointer-lock"` and `allow="autoplay *"`. CSS is `width:720px;height:1280px;transform:scale(0.597222);transform-origin:left top` (scale = `min(W/720, H/1280)`). Inside the frame, `innerWidth/innerHeight` = 720x1280. DPR is inherited from the top page (2).
- The origin is `"null"`. `localStorage`, `sessionStorage`, IndexedDB and `document.cookie` all throw `SecurityError`. `document.featurePolicy.allowedFeatures()` returns only `autoplay` and `gamepad`, and `fullscreenEnabled` is false.
- There is no CSP: no meta tag, no `csp` attribute, and no CSP header on the document. External hosts are monitored but not blocked (see section 5).
- Injected scripts, in DOM order (host function `buildGameSrcDoc`), all marked `data-astrocade-injected`:
  1. `audio-prelude` (head, first). It wraps AudioContext and removes its own `<script>` tag.
  2. Optional `input-sensor`, which sends `GAME_INPUT` raw pointer, key and wheel samples. It is only injected when the `GESTURE_LOGGING_V2` experiment is "on". It was absent in our loads.
  3. The game's own head content, then `<style data-astrocade-injected="styles">`: no tap highlight, `user-select:none`, `:where(body,img,canvas){touch-action:manipulation}`.
  4. `error-handlers`, then `gesture-tracking`.
  5. `game-library` as the first element of `<body>`, which defines `window.lib`. Then the game body, then `ready-signal` last.
- The lib template is `LIB_RUNTIME` with `{{ASSET_MAP}}` replaced by the asset map JSON. The asset map's image URLs are rewritten per device/network profile (`highEnd|lowEnd`-`goodNet|poorNet` → `quality`/`scale` query parameters, plus `asset.scale`). Audio may be swapped to `format=opus`.
- `window.lib`, `window.gameConfig` and `window.mode` are all set by the lib. `gameConfig = Proxy(RUN_WITH_CONFIG.gameConfig)`, and `mode` = the run mode. Other globals the host adds: `__astroAudio` (frozen `{freeze,thaw,manages}`), `IGNORED_ERROR_PATTERNS`, `shouldIgnoreError`, `__gestureTrackingInitialized`. It also patches `console.error` and wraps `window.WebSocket` in a Proxy. `navigator.vibrate`, `MediaDevices.prototype.getUserMedia` and `DeviceMotionEvent.requestPermission` are only patched when the host enables those devices. On the web they stayed native.

## 2. Lifecycle (V)
1. The `ready-signal` script posts `{type:"IFRAME_READY"}`. It runs after all synchronous body scripts, including blocking CDN `<script src>`. The host waits **20 s of visible time** for it, then fails with "Game injection timeout".
2. The host sends `RUN_WITH_CONFIG {gameConfig, mode:"play", gameMetadata:{title,username,previewImageUrl,gameId}, hideClickToPlayOverlay:true, runId}`. On the feed and game page the host always sends `mode:"play"` with the overlay hidden, even while the card is only a muted **preview**.
3. The lib awaits `run(mode)` and posts `RUN_COMPLETED {runId}`. If `run` throws, it posts `GAME_ERROR "Game run() function threw an error: …"`. If `run` is missing, it posts `ANALYTICS_MESSAGE run_function_missing` and logs every script tag.
4. `run()` is called **once** per document. Tapping Play only "promotes" the run on the host side (`GAME_PROMOTED`, `stageAtTap:"running"`). The game is not re-run. Sound is unmuted through `AUDIO_STATE {gain:1,fadeMs:250,reason:"playing"}`. In our trace the preview sent `gain:0`, first with reason `swiping` and then `preview`.
5. The click-to-play overlay ("Tap to play!", Poppins 900, it posts `play_overlay_clicked`) only appears when `hideClickToPlayOverlay` is false.
6. The bundle is not IIFE-wrapped by the host. The game's inline script runs as-is in the body.
7. There is no error overlay and no watchdog in the feed host. `GAME_ERROR` is only listened to by the editor (`editor_js_error_*` events). New Relic browser monitoring runs on the top page.

## 3. `lib` API

| Member | Signature (from source) | Doc? | Behaviour |
|---|---|---|---|
| `getAsset(id)` | → asset object `{url,type,subtype,description,aspect_ratio,duration_secs,loop,animation,scale,…}` | yes | Missing id → `LOG` "Asset with id … not found", returns undefined |
| `log(msg)` | → void | yes | Posts `{type:"LOG",payload}` |
| `showGameParameters({name,params:{Label:{key,type,min,max,step,onChange}}})` | → void | yes | Posts `SHOW_INFO_UI {isGameParameters:true}`. `onChange` is registered as callback `game_param_<key>`. The host calls it with `INVOKE_CALLBACK {callbackId,args:[value,isFinal]}`. `isFinal===true` → commitState |
| `addPlayerScoreToLeaderboard(score, numEntries)` | async → `{entries:[{userId,isOwn,username,profilePicture,score}]}` | yes | Sent as `String(score)`. The host rejects a non-finite score, `<0` or `>MAX_SAFE_INTEGER` with "Invalid score value". 10 s timeout resolves `{error:"Request timed out"}`. Throws if there is no gameId |
| `getTopNEntriesFromLeaderboard(n)` | async → same shape | yes | `LEADERBOARD_GET_ENTRIES` |
| `saveUserGameState(obj)` / `getUserGameState()` / `deleteUserGameState()` | async | yes | The state is JSON-cloned. GET returns `{userId,gameId,state}`, and `state:null` the first time. Works as guest |
| `shouldUseTouchControls()` | → bool | yes | `(pointer:coarse)` matches, or there is no `(hover:hover)`; falls back to `ontouchstart`/`maxTouchPoints` |
| `getAnimationPlayer(id)` | → `{update(t),draw(ctx,x,y,w,h),getCurrentFrame(),reset()}` or null | yes | Sprite-sheet player; fps defaults to 30, loop unless `loop:false` |
| `preloadAnimation(id)` | async | yes | |
| `llm({messages,systemPrompt,config})` | async → `data` | yes | Drops empty messages, `LLM_REQUEST`, **30 s** timeout |
| `haptics` `{supported, play(name\|{intensity,sharpness,duration}\|array≤8), start({intensity,sharpness}), stop()}` | | yes | Presets: tick, tap, thud, success, warning, error. Defaults: intensity 0.6, sharpness 0.5, duration ≤1000 ms. It is sent as `DEVICE_URGENT` in a microtask batch. It also overrides `navigator.vibrate(pattern)` |
| `motion` `{supported, start({responsiveness:'snappy'\|'balanced'\|'smooth'})→'granted'\|'denied'\|'unavailable', stop(), recenter(), tilt{x,y,source}, rotationRate{x,y,z}, onShake(fn)→unsub, onSample(fn({t,interval,gravity,linear,rotationRate}))→unsub}` | | yes | Tilt is −1..1 with a 2°–25° dead-zone/range. Falls back to touch-drag (20% of the short side) or arrow keys when there is no sensor. A shake is ≥3 direction-reversing jolts >6 m/s² within 1 s, with a 600 ms cooldown |
| `camera` `{supported, start({facing:'user'\|'environment',width,height,frameRate})→status, stop(), stream, video, snapshot({maxSize≤4096 (default 1280), type:'image/png'\|jpeg, quality})→Blob}` | | yes | Defaults 1280x720 (low tier 640x360). Auto-reopens a stalled camera on a 2.5–32 s backoff |
| `mic` `{supported, start(), stop(), stream, level (0..1), onPeak(fn({level})), onWord(words[], fn({word,index}), {language}), wordSupport(lang)→'ready'\|'unavailable'}` | | yes | Up to 256 entries × 16 variants, each ≤200 chars. PCM is downsampled to 16 kHz and sent as `DEVICE_LISTEN` |
| **`share({image,title,description,text})`** | async → void, never rejects | **no** | `image` = a canvas, an `<img>` or a PNG/JPEG data: URL, scaled to ≤720x1080 JPEG q0.9 (tainted canvas → logged and no image). Text is cut to 60/120/140 graphemes in the lib; the host clamps it again to 600/1200/1400. Only one share runs at a time. Waits 2 s for `SHARE_ACK`, then up to 300 s for `SHARE_RESPONSE`. The host shows its sheet only when the run is in play mode, and allows at most 10 per 60 s; otherwise it answers immediately |
| **`editMenu.open({name,params,onCopy,onDelete})` / `editMenu.close()`** | | **no** | `SHOW_INFO_UI` / `HIDE_INFO_UI` for editor object menus (callbacks `param_<key>`, `<name>_copy_action`, `<name>_delete_action`) |
| **`commitState()`, `startDrag()/endDrag()`, `startBatch()/endBatch()`, `batch(fn)`** | | **no** | Edit-mode only. Mutating the `gameConfig` Proxy sends `IFRAME_LIVE_UPDATE`, then a debounced (500 ms) `IFRAME_COMMIT_STATE {state}`. Drag or batch suppresses the commit. No-op in play mode |

None of these exist in the lib: ads, rewarded, pause/resume events, volume/mute API, user info, `isGuest`, locale, safe-area, quality hints. The only "user" data reachable is `userId`/`isOwn`/`username` in leaderboard entries and `userId` in the GET state response (V).

**Device on the web (V):** the web host's `RUN_WITH_CONFIG` has no `device` field, so `lib.configure()` never runs. `haptics`, `motion`, `camera` and `mic` all report `supported:false`. No web chunk sends `DEVICE_*`. (I) These four only work in the native app shell, which also explains the `nativeMotion`, `captureRelay` and `DEVICE_FRAME` relay paths. `configure` also reads `tier`, `axisSign`, `cameraReopen`, `micReopen`, `words` and `orientationEvents`.

## 4. Bridge protocol (V)
Every message is `postMessage(obj,"*")`. Requests are correlated by `messageId` (`<kind>_<random>`). On success the lib answers every inbound message that has a `messageId` with `IFRAME_ACK {messageId,status}`. The host ignores messages whose `source` is not the current iframe's contentWindow.

- **Frame → host:** `IFRAME_READY`, `RUN_COMPLETED{runId}`, `LOG{payload}`, `GAME_ERROR{error:{message,stack,line,column,filename,timestamp}}`, `GAME_GESTURE_EVENT{gesture:{type:tap|click|drag|swipe|long_press|pinch|keyboard|scroll,timestamp,x,y,deltaX,deltaY,distance,duration,direction}}`, `GAME_FPS_UPDATE{fps,fpsStd,fpsSamples,durationMs,timestamp}`, `ASSET_DOWNLOAD_COMPLETE{gameId,assets:[{name,extension,url,startTime,endTime,durationMs,transferSize,decodedBodySize}]}`, `GAME_EXTERNAL_REQUESTS{gameId,requests:[{host,url,initiatorType,elapsedMs}]}`, `AUDIO_STATUS{v:1,doc,…~35 audio metrics}`, `ANALYTICS_MESSAGE{eventName,eventData}`, `SHOW_INFO_UI`, `HIDE_INFO_UI`, `IFRAME_COMMIT_STATE`, `IFRAME_LIVE_UPDATE`, `LEADERBOARD_ADD_SCORE{payload:{gameId,score,numEntries}}`, `LEADERBOARD_GET_ENTRIES`, `USER_GAME_STATE_SET|GET|DELETE{payload:{gameId,state?}}`, `LLM_REQUEST{payload:{messages,systemPrompt,config}}`, `SHARE_REQUEST{payload:{image,title,description,text}}`, `DEVICE_REQUEST{payload:{request:'motion.start'|'motion.stop'|'capture.begin'|'capture.end'|'words.listen'|'words.support',…}}`, `DEVICE_URGENT{w,c,r,fx}`, `DEVICE_MOTION_FEED`, `DEVICE_LISTEN{action:start|pcm|end}`, `DEVICE_CAPTURE_FALLBACK`, (`GAME_INPUT` from input-sensor).
- **Host → frame:** `RUN_WITH_CONFIG`, `AUDIO_STATE{v:1,gain,fadeMs,reason}`, `INVOKE_CALLBACK{callbackId,args}`, `PREPARE_FOR_RELOAD` (flushes a pending edit commit), `LEADERBOARD_RESPONSE`, `USER_GAME_STATE_RESPONSE`, `LLM_RESPONSE`, `SHARE_ACK`, `SHARE_RESPONSE` (all shaped `{messageId,response:{data|error}}`), `DEVICE_RESPONSE{result}`, `DEVICE_FRAME`, `DEVICE_MIC`, `DEVICE_MOTION{raw}`, `DEVICE_WORDS`, `DEVICE_CAPTURE`.
- Observed example: `USER_GAME_STATE_RESPONSE {"response":{"data":{"userId":"guest-<redacted>","gameId":"01M6…","state":null}}}`. `AUDIO_STATE` hitting the lib's switch produces the harmless `LOG "[lib.ts] Unknown message type"`.
- Host side: state and score writes go through a **coalescer with a 5 s window**. State is last-write-wins. Score keeps the best score when the game's `leaderboardSortAscending` is known, otherwise the last score. Retry backoff goes up to 60 s. Pending writes are flushed on `pagehide`, a hidden tab or a game change. A GET flushes the pending write first. A state request whose `gameId` ≠ the current game gets "Game state does not match current game".

## 5. Telemetry
- **FPS (V):** the lib's rAF loop reports only in `mode==="play"`, starting **5 s after RUN_WITH_CONFIG**, in windows of ≥1 s, with Welford mean/std of the frame delta. It resets on `focus` and on visible. The host keeps samples only while host-mode is "play" (after the tap or promote) and the tab is visible. It emits `feed_game_fps {fps,fpsStd,fpsSamples,fpsMin,fpsP50,fpsP90,fpsP99}` after the first **10** samples, then every **60**, and on hide or game change. A percentile is `sorted[floor(p/100·n)]`.
- **Gestures (V):** the gesture-tracking thresholds are tap <10 px and <200 ms, drag >10 px, swipe >50 px in <500 ms, long_press 500 ms, keyboard only after 1 s of inactivity, and scroll throttled to 200 ms. The touch listeners are on `document` (bubble phase, passive). The mouse fallback is on `window` capture and trusted events only.
- **Active time (V):** a timer runs while the host is "playing" and `!document.hidden`. It pauses on hidden/pagehide and resumes on visible/pageshow, with a 5 s tick. Events:
  - `active_game_event {gestures (counts by type), gestures_v2?, gestureEvents (sampled), active_ms, firstGestureMs (epoch ms of the first gesture), playlist_category}`.
  - `game_interaction_heartbeat {hadInput}`.
  - `game_play_time_updated {playMs}`.
  - `game_play_30s {play_id, game_id, elapsed_seconds}`. It needs **active ≥30 s AND ≥1 gesture**, and it fires **once per browsing session** (cookie `GAME_PLAY_30S_SESSION` claim). It is mirrored to Meta (`mpc-pilot…run.app/events` `game_play_30s`) and Google Ads.
- **Milestones (V):** `game_played_30/60/300/600_seconds {actualPlayTimeMs}` use wall-clock time since playing started, checked every 5 s. Going hidden **resets** the milestone clock. One milestone (an unexported constant) records "recently played" and the thumbnail. Seen: 30 s at 30.8 s and 60 s at 60.8 s.
- **Impression (V):** `game_impression_completed {play_duration, view_duration, gesture_count, was_skipped = end_reason==="swipe" && !hasStartedPlaying, end_reason}`. Also `feed_swipe` (swipeCount) and `feed_next_game`.
- **Plays (V):** `POST astrocade-api-prod.com/v3/games/<id>/plays {"playsToAdd":1}` is sent at `game_appeared`, which means the Play tap or a promote. It is not sent for the preview.
- **Load (V):** `game_load_started`, `game_run_completed`, `game_preview_load_time`, `game_playable`, `game_promoted {stageAtTap, previewAgeMs}`, `iframe_ready_received`, `feed_game_asset_download_batch` (with `cached = transferSize===0`), `feed_game_asset_mismatch`, `game_external_request_batch`. The external-request report covers hosts outside `*.astrocade.com`, the astrocade-api domains, 20 CloudFront hosts and the asset hosts, with at most 25 hosts. `game_audio_session` comes from AUDIO_STATUS.
- **Errors (V):** every `console.error`, `window.onerror` and unhandledrejection is posted as `GAME_ERROR`. Messages matching "Script error", amplitude, "Failed to fetch", "NetworkError" or "Load failed" are ignored.
- **Endpoints (hostnames, V):** `edge.astrocade.com` (`/v3/client-events`, body not visible to Playwright; Amplitude-style), `newrelic-log-api.astrocade.com` (JSON logs), `d1l0j8dkss2bpi.cloudfront.net` (New Relic browser), `d2o3flhvpmc11d.cloudfront.net` (feature-flag initialize/rgstr), `astrocade-api-prod.com`, `analytics.google.com`, `stats.g.doubleclick.net`, `googleads.g.doubleclick.net`, `www.googleadservices.com`, `www.google.com` (ccm/rmkt/conversion), `connect.facebook.net`, `www.facebook.com`, `mpc-pilot-2-…a.run.app`.
- **Server flags seen in the flag payload (V values, I meanings):**
  - `{"plays_threshold":200,"min_p50_secs":40}`
  - `featured_min_p50:50`
  - gallery `score_p50_weight:1, score_spr_weight:1`, `min_plays:150`, `max_plays_for_new:150`, `max_plays_for_beta:75`
  - priors `p_sig 0.266` (significant-play rate), `p_2nd 0.526`, `p_ret 0.177`
  - creator wallet `rate_micro_usd_per_1000_plays:1000000, min_significant_plays:200, wallet_cap_micro_usd:200000000`
  - `sfxVolumeCoefficient/musicVolumeCoefficient 0.5`, `max_heartbeat_age_in_secs:15`
  - play_boost peaking at 5000 plays

## 6. Audio prelude (V)
- It wraps every AudioContext. The master chain is host gain → DynamicsCompressor (threshold −3 dB, ratio 20, knee 0, attack ~3 ms) → makeup gain → WaveShaper hard-clip at **−1 dBFS**.
- `AUDIO_STATE` fades the gain. If no AUDIO_STATE arrives within 1 s of RUN_WITH_CONFIG, the gain goes to 1.
- It routes media elements, unlocks audio on the first gesture, and blocks writes to `navigator.audioSession.type`.
- It re-arms on visibilitychange, pageshow and focus, and reports on pagehide.
- `AUDIO_STATUS` reports `firstGestureAtMs`, `firstSoundAtMs`, `peakDbfs`, `limiterMaxReductionDb`, `soundingMs`, `decodedBytes`, stalls and the like.

## 7. Facts a game developer can exploit
1. **The game runs during the muted feed preview** (V). `run("play")` fires before the user taps Play and there is no "start" event, so the first seconds are a silent attract loop. Game time spent in preview is not counted. Music starts when the gain fades in (250 ms). Design for sound arriving late.
2. **A tap inside the game during preview starts the play** (V, run 2: tap → `feed_game_area_clicked` → `game_appeared` → plays+1 → `game_promoted`). Gestures in the first 300 ms are ignored. A **vertical** swipe (≥5.5% of 1280 ≈ 70 px) or a drag of ≤1 s and ≥12% (≈154 px) during preview **changes the feed game** instead. A mostly vertical first gesture in a preview therefore loses the player.
3. **Count as engaged.** Get ≥1 recognised gesture and ≥30 s of visible active time. **Do not `stopPropagation()` on touch events below `document`**, or the host sees no gestures (gesture_count 0, no `game_play_30s`). Note that `pointerdown.preventDefault()` cancels mouse compatibility events, which the lib covers with a window-capture pointer path for the mouse only.
4. **Hidden tabs:** the active timer pauses, the 30/60/300/600 s milestones reset to 0, FPS is not sampled, and saves and scores are flushed. Save your own state on `visibilitychange`/`pagehide`. Writes are debounced by 5 s on the host, so a final save right before you leave can still be lost if the page dies.
5. **FPS is graded from the first rAF after 5 s,** on percentiles. Avoid long loading hitches after the first 5 s and while visible, and keep rAF running (FPS = 1000/mean rAF delta).
6. **Storage:** no localStorage or cookies (they throw). Use `saveUserGameState`, which works for guests too. Scores must be integers within 0..2^53−1, sent as a string. Negative scores are rejected.
7. **`console.error` is reported as a game error.** Use `console.warn` for expected noise. `lib.log` messages go to the host log.
8. **Limits:** IFRAME_READY within 20 s of visible time (CDN scripts included). Lib request timeouts are 10 s, and 30 s for llm. Share is ≤10 per minute, play mode only. Image assets may be served at reduced `quality`/`scale` on low-end or poor-network devices. Respect `asset.scale` and use `aspect_ratio`, not `naturalWidth`.
9. The viewport is a fixed 720x1280 CSS space scaled by transform. There is no fullscreen, no camera or mic permission on the web, and no pointer events outside the frame. Pointer lock is allowed.

## Saved files (all under `…/scratchpad/plat/lib/`)
- `run1.js`, `run2.js`: capture scripts
- `cap1/responses.json`: 353 responses (URL, content-type, status, size) plus POST bodies
- `cap1/pm.json`: postMessage, console and action timeline
- `cap1/frames.json`, `cap1/frame0.html`, `cap1/frame1.html`, `cap1/frame1.srcdoc.html`, `cap1/srcdoc_skeleton.html`, `cap1/top.html`
- `cap1/scripts/00_audio-prelude.js` (+`.pretty.js`), `01_error-handlers.js`, `02_gesture-tracking.js`, `03_game-library.js` (+`.pretty.js` = the full lib), `04_game.js`, `05_ready-signal.js`, `input-sensor.template.js`
- `cap1/lib_enum.json`, `cap1/lib_enum_late.json`: recursive `window.lib` keys, arity and `toString`, plus non-native globals
- `cap1/host/*.js`: prettified host chunks
  - 0084: buildGameSrcDoc and LIB_RUNTIME
  - 0070: telemetry and the message router
  - 0069/0129: iframe embed and RUN_WITH_CONFIG
  - 0071: write coalescer and share
  - 0072: share sanitiser
  - 0156/0188: state and leaderboard handlers
  - 0020: LOGGER_EVENTS
- `cap1/bodies/`: raw response bodies. `cap1/s*.png` and `cap2/s_after_preview_tap.png`: screenshots. `cap2/log.json`: storage/feature-policy checks and the preview-tap promotion trace.

## Lampiran B — catatan web app (subagen, Inggris)


Method: 9 guest page loads (Playwright, 430x932 mobile): `/`, `/create`, `/games/x/01M6TF…` (Steal an Egg), `/profile/alex`, `/create/analytics`, `/create/earn`, `/gallery`, `/contests`, `/creators`. I recorded the pages' own responses and downloaded 475 Next.js static chunks (the ones the pages loaded, plus the lazy chunks they reference) from `d2oir5eh8rty2e.cloudfront.net`. I made no API calls of my own and sent no headers or tokens.
**Side effect to disclose:** the wheel-scroll on the game page swiped the feed. Steal an Egg's own code then sent `PUT /v3/leaderboard {"score":"0","numEntries":9}` as a guest. I did not trigger that call on purpose. Later loads ran without scrolling.
Data: `plat/web/data/` (see the list at the end). V = VERIFIED (file + snippet). I = INFERRED.

## 1. Tech stack
- V **Next.js 16.4.2, Turbopack build, React 19.3.0-canary** (from `1lo4v1edm6o98.js` `Symbol.for("@next/"…"16.4.2")`, `2kl21o2f9xnz1.js` `version:"19.3.0-canary-278794d7-20261002",rendererPackageName:"react-dom"`). Deploy id `dpl=PROD-44873300862-1`.
- V Hosting: the HTML returns `server: Vercel`. Middleware sets the experiment cookies (`amplitude_<flag>=…`), plus `guestUserId`, `userLanguage`, `userDayN`, `userCountry` and `feels_seen`. Static files come from S3 behind CloudFront (`server: AmazonS3`, `x-cache: Hit from cloudfront`).
- V The API is `astrocade-api-prod.com` (on the `astrocade.com` origin the base is `/api`, `1s-pgs8tjuy72.js`). Other hosts:
  - Wish/agent intake: `ju78j49am9.execute-api.us-west-2.amazonaws.com/prod/v1/context` (AWS API Gateway).
  - Realtime: AWS AppSync, `wss://mc7gq5lyizat5ec67swbk7ue7m.appsync-realtime-api.us-west-2…/graphql`.
  - Events: `edge.astrocade.com/v3/client-events`. Logs: `newrelic-log-api.astrocade.com/log/v1`.
- V Storage is DynamoDB single-table. Pagination tokens decode to `{"GSI-SK-2":…,"PK":"Game#…","SK":"Info"}`.
- V Analytics and telemetry:
  - Amplitude (`api2.amplitude.com`) plus Kinesis. Both run through the edge collector, whose reply is `{"amplitude":{"events_succeeded":11},"kinesis":{"events_succeeded":12}}`.
  - New Relic Browser (`NRJS-f03ec6d4deff385adcf`).
  - Sentry (`o4507380850163712.ingest.us.sentry.io`, tunnel `/api/monitoring`, `tracesSampleRate:.1`).
  - Google Tag Manager `GTM-539CLFG5`, and Google Ads conversions on accounts 16991013916 and 17683991082.
  - Statsig (`StatsigClient("client-smlI6…")`, proxied through `d2o3flhvpmc11d.cloudfront.net/v1/initialize`, `session_recording_rate:1`).
  - Web-vitals events.
- V There are two flag systems:
  - **Amplitude Experiment** (`/api/exp-flags/sdk/v2/flags`, `/api/exp-vardata`) serves the A/B flags.
  - **Statsig** serves the dynamic configs. Its `/v1/initialize` reply to guests holds the **backend ranking and quota configs** (section 5).
- V Auth: Auth.js/next-auth (`errors.authjs.dev`, `/api/auth/session`), Google One Tap and FedCM (`accounts.google.com/gsi`), and Apple ("This account is already registered with Apple"). The flows are email/password with a verification code, plus Cognito/Amplify. A `/oauth/authorize` route and `/v3/oauth/grants` ("connected-app-grants") exist for MCP.
- V Libraries: Radix UI, Konva 10.3.0 (canvas editor), KaTeX 0.16.46, Lexical, Monaco/CodeMirror, Rive, motion, zustand, **esbuild-wasm** (`wasmURL:"/esbuild.wasm"`) and Prettier.
- V Native apps: iOS `apps.apple.com/app/id6786137532` and Android `com.astrocade.app` (Play links carry `&referrer=`). App links go to `open.astrocade.com`, and the "w2a" (web-to-app) experiments use them.
- V I found no payment SDK (Stripe hits are game text) and no in-game ad SDK (no IMA, AdSense, AppLovin or rewarded ads).

## 2. API surface (paths found in the chunks; method from code)
- **Feed and gallery:**
  - `POST /v4/feed` (body `{history:[]}` when `beam-web` is on; `filter` is `combined_feed|categorized_feed`).
  - `GET /v3/feed` (legacy). `GET /v3/games?filter=bookmarked|recentlyPlayed|playlists`.
  - `GET /v3/search?`, `GET /v3/suggest/p/…`.
- **Games:** `GET/DELETE /v3/games?gameId=`. Then, on `/v3/games/{id}/…`:
  - `PUT visibility {isPublic}`, `PUT remix {disableRemix}`, `PUT pin {pin}`.
  - **`POST plays {playsToAdd:1}`**, `PUT like {like}`, `PUT bookmark {bookmark}`, `POST recently-played {}`, `POST share {}`.
  - `PUT wish-requests/{reqId} {wishRequestStatus}`, `POST submit-for-review {}`.
- **Drafts, versions and workspace:** `POST /v3/games-draft` (save, or `{gameId,restoreGameVersionId}`), `GET /v3/game-versions?showAllVersions`, `POST /v3/update-workspace` (max 5 MB, returns `workspaceUrl`), `POST /v3/remix`, `GET /v3/quota`, `GET /v3/has-approved-game`.
- **Wishes:** `GET /v3/wish-requests` (pending only), and `POST …/prod/v1/context` (below).
- **Uploads:** `GET /v3/image/upload` (presigned URL), plus `/v3/screenshot/upload`, `/v3/profile-picture/upload` and `/v3/cover-photo/upload`.
- **Social:** `/v3/comments` (GET/PUT/DELETE, `/comments/{id}`), `/v3/user-follow`, `POST /v3/share-links` (short links, 5 s timeout), `/api/translate {text,targetLanguage}`, `/v3/notifications` (GET/DELETE; types `GameReview`, `NewComment`), `/v3/push-token`.
- **In-game services:** `PUT/GET /v3/leaderboard`, `/v3/user-game-state` (with `userStateVersionId`), `/api/llm` (backs `lib.llm`), `POST /v3/game-feedback {feedbackType,feedbackText,imageUrls}`.
- **Users and analytics:**
  - `GET /v3/users?username=` returns totalPlays, follower counts and bio.
  - `GET /v3/analytics?filter=stats|play_count_graph|play_duration_graph|fps_distribution_graph|time_to_interact_graph|ctr_graph|asset_download_graph&gameId&numDays|startDate&endDate&username`.
  - `filter=stats&username=X` is **public** (it returned `{"playCount":8307883,"commentsCount":6350,"likeCount":64289}` for alex). The other filters return 401 to guests.
- **MCP:** `https://mcp.astrocade.com/mcp`, with setup snippets for claude-code and gemini-cli (`285i7_lh7pfiy.js`).

## 3. Game creation pipeline (client side)
- V **Sending a wish** (`285i7_lh7pfiy.js`, module 13259): `POST /v1/context` with the body `{astroBrainRequest: JSON.stringify({request_id, session_id, user_id, game_id, user_input, game_context, request_type, user_selected_model, task_plan_mode_enabled, supports_game_context_url:true, supports_brainstorm_channel, client_capabilities:["capacity_refusal"], direct_asset_edit_payload}), isJsRequest:true, title, description, thumbnailUrl, gameVersionId}`.
  - `request_type` is one of `brainstorming|fluff|create|direct_asset_edit`. Models are `FAST="fast"`, `SMART="smart"`. Editor tabs are `home|media|code`, and the modes are "Simple" and "Advanced" (`pro`).
  - Errors: 409 means a version conflict (modal), 429 means rate limited, and "at capacity" sends `retryAfterSeconds`.
- V **Streaming** is not SSE. Results come back over an AppSync GraphQL subscription (`subscription Subscribe($name:String!){subscribe(name:$name){data name}}`). Retry backoff is `1000*2**n` with jitter, and it gives up after 5 consecutive errors or 20 resubscribes. The chat role of the agent is `"astra"` ("Granting your wish…").
- V **Agent backends** (Amplitude flags and Statsig quota names):
  - `agentic-gcm` variants: `pydantic_ai` (the default for "All Other Users"), `claude-sub-01..03` plus named claude-sub arms, and `pydantic-ai-codex-sub-01..04`.
  - `new-creator-gcm1-vs-gcm2`: `control/gcm2/gcm1-trial-creations-opus-5-5/gcm2-trial-creations-opus-5-5` (25% each once enabled, currently `off`).
  - `agentic-gcm-medium-model=gemini` (10% range), `agentic-gcm-ultrafast=codex-ultrafast`, `gpt-image-2-5-covers`, `enable-gcm-lib-vibrate`, `enable-gcm-lib-llm`.
  - Statsig quota dimensions: `user:claude_agent_sdk_gcm_request`, `user:pydantic_ai_codex_sub_gcm_request`, `user:soc_request:expensive:lifetime` (free=2), `user:edit_request:*` (in dollars), `user:publishes:day` (free=2), `user:republishes:day` (5) and `user:push:newgame:day` (10).
  - Another config holds `planner_num_examples:2, code_num_examples:2` and `create_wish_completion_time_seconds:1200`, `edit…:360`, `max_queue_depth:50`.
- V **Bundling happens in the browser** with esbuild-wasm (`1x6sgeehedxt1.js`): `bundle:true, format:"iife", platform:"browser", target:"es2020"`.
  - A virtual FS holds only workspace files. Any unresolved import gives "File not found in workspace". This explains the `import 'three'` failure.
  - The entry is the first `script[src]` in `index.html`, falling back to `main.js`, then `game.js`. `style.css` is inlined.
  - Reserved names: `asset_map.js`, `read-only/asset_map`, `read-only/astrolib`.
- V **Game runtime `astrocade-lib.js`** (`065k_mfghx5ts.js`), as postMessage types:
  - Messages: `RUN_WITH_CONFIG`, `RUN_COMPLETED`, `PREPARE_FOR_RELOAD`, `IFRAME_LIVE_UPDATE`, `IFRAME_COMMIT_STATE` (edit mode), `SHOW_INFO_UI/HIDE_INFO_UI` (showGameParameters, with onCopy/onDelete), `LEADERBOARD_ADD_SCORE/GET_ENTRIES`, `USER_GAME_STATE_GET/SET/DELETE`, `SHARE_REQUEST{image,title≤60,description≤120,text≤140}`, `LLM_REQUEST` (30 s timeout), `DEVICE_MOTION/MIC/FRAME/WORDS`, `GAME_FPS_UPDATE`, `GAME_ERROR`, `ANALYTICS_MESSAGE`.
  - **`GAME_EXTERNAL_REQUESTS`** reports every non-allowlisted network host the game contacts. The allowlist is astrocade domains plus about 20 CloudFront hosts. jsDelivr is not on it, so CDN loads are reported, though not blocked as far as the client shows.
  - If `run` is missing, the runtime fires `run_function_missing`. It also has a click-to-play overlay.
- V **capabilities.needs**: `{haptics|motion|camera|mic: "required"|"optional"}`. A "required" feature the host cannot serve shows **`device_game_block_shown`**, which blocks the game behind a get-the-app prompt. All feed games today carry `haptics:"optional"`.
- V **Review states**: `not_ready | pending_review | approved ("Published") | rejected`. There is a Publish Checklist ("Is your game ready for the public feed? Complete these requirements…", with a "Test on phone" item) and a flag `publish-requirements` (off). Updates stay in review while players keep the live version.
- V There is a human review pipeline: routes `/internal/ugc-pipeline/{games-queue,reviews,retire,t-plus-x,reviewer-accuracy,daily-rates}` and `/qa/game-curation*`, `/qa/game-tag-annotation`. Statsig `{"enable_verdict_enforcement":true,"enforce_from_event_date":"2026-09-09"}`.
- I `{"review_on_demand_enabled":true,"trigger_24h_ratio":0.05,"trigger_48h_ratio":0.05,"trigger_min_plays":1000,"shadow_mode":true}` looks like a re-review triggered by growth.
- V `cardBadges` exists in feed items but is `null` everywhere and unused in the client.

## 4. Creator analytics (`37svu44lwn72f.js`)
- V Definitions:
  - "Significant Plays: Number of plays that were over 30 seconds in length."
  - **"0-interaction: Sessions where the player did not interact with the game at all. They are not counted towards total play count."**
  - FPS "Optimal (40+), Moderate (20-40), Poor (0-20)".
  - "Time to First Interaction: average time from game loading to the first player interaction".
  - CTR is "% of impressions that converted into a play".
- V Benchmark text:
  - TTFI is under 5 s for top games.
  - FPS is above 40.
  - Feed CTR is above 40% ("Top games avg 40%").
  - Most sessions last 2–5 min.
- V Benchmark distributions:
  - Duration: `{"0-10s":5,"10-30s":12,"30-60s":17,"1-2m":22,"2-5m":25,"5-10m":16,"10m+":3}`.
  - FPS: `{"0-20":5,"20-40":15,"40+":80}`.
  - TTFI: `{"0-5s":58,"5-10s":25,"10-15s":10,"15-30s":4,"30-60s":2,"60s+":1}`.
- V When a play is counted: the client sends `POST /games/{id}/plays {playsToAdd:1}` in `startPlay`. That runs on a Play tap or an `instantPlayTrigger` (first gesture on the preview), not on the preview impression (`3zkxwfuahb-kq.js`, `0iv7_u9pkbmxo.js`). The server then drops 0-interaction sessions.

## 5. Ranking and feed: new beyond 20 Nov (Statsig values, names hashed; V unless marked)
- **Gallery** (`variant_name:"gallery-v0-hybrid"`):
  - Weights: `score_p50_weight:1, score_spr_weight:1, score_feed_ctr_weight:0.2`, `gumbel_temperature:0.05`, `min_plays:150`, `min_games_for_language_filter:50`.
  - GBDT serving: `gbdt_serving{endpoint:"gbdt-ranker",timeout_ms:150}`, retriever 300.
  - Dedup: `replay_reduce`, `creator_reduce_min_gap:3`, `remix_family_dedup`.
  - **`cold_game_insert_fraction:0.05, protected_head:3, cold_game_lower_play_threshold:75, cold_game_min_p50:40`**.
- **Feed GBDT:** `retriever_max_candidates:2500, retriever_gumbel 0.1, rank_gumbel 0.3, model "production_fixed"`.
- **`{"plays_threshold":200,"min_p50_secs":40}`.** I: this is the cold-start graduation gate, a 40 s median play at 200 plays. It is consistent with our 80% significant-play observation.
- **Rows config** (version 64):
  - Thresholds: `max_plays_for_new:150`, `max_plays_for_beta:75`. `theme {min_p50:40,min_p75:75}`, `featured_min_p50:50`.
  - **`play_boost{peak_plays:5000,fall_end_plays:10000,max_multiplier:1.2,max_age_days:30}`** and **`update_recency_boost{alpha:0.12,half_life_days:3,max_age_days:30}`**. Updating a game gives a decaying 3-day boost, which explains the Grab and Park second wave.
  - **Top picks (Players' Choice):** `min_plays:50000, p50_weight:.033, p75_weight:.01, deep_spr_threshold_sec:300, deep_spr_weight:10, retention_weight:15, knn_dedup "dedup-description"`.
  - Rows: `top_picks, featured("Recommended For You"), trending, because_you_played, local_multiplayer, beta("Community Playtests", max_plays 150), halloween_2026`.
  - `theme_row_cold_game_insert_fraction:0.25`, and `premium_row_dedup_themes ["chess","merge","creative","minecraft"]`.
  - `hidden_theme_rows ["minecraft","chess"]`.
  - `beta_remix_penalty:0.9`, `beta_same_creator_penalty:0.25`.
- **Curated gallery dedup** drops games for `ip` (brand IP: 9–15 games dropped), `creator`, `family`, `bigram`, `concept_tag`, `language_locked`. Its `sig_threshold=90s`, with EB shrinkage priors `p_sig .266, p_2nd .526, p_ret .177`. This config dates from May.
- **Shorts ("feels") surface:**
  - Row `shorts_jam_2026` with `configVersion:"v3-score-2026-11-20a"`.
  - The score text reads "row-card taps per impression × finishing × Share … length-adjusted reach (log-odds vs house survival curve) … bottom quarter ×0.5, hits ×1.25".
  - "community Shorts (no ending event, so no length adjustment)". House Shorts are at most 45 s.
  - The feed response now has `feels_stage{stage:"gentle",rule_version:"shorts-taste-v1"}`, and the routes `/feels/{selector-v3,mixed-v3,…}/feed`.
- **Feed response:** `experiment_data:{"realtime_gameplay_trigger":false,"hide_play_count":true}`. The algorithm is still `feed-v0-d0-f1`; pools are `d0_ranked_neighbors / stochastic_v0_quality / cold_game_candidates`.
- **Search:** `{"ranking":{"name_match_weight":0.5,"game_quality_weight":0.7,"game_plays_weight":0.8,"min_game_plays":500}}`. Games under 500 plays are not searchable (I: that is what the floor means).
- **Flags:** `/flags` lists 158 flags (2026-11-20 had 104 with values). New names include `cold-game-feed-insert=treatment`, `feed-share-count=treatment`, `share-prompt-after-playtime=control`, `leaderboard-share-experiment=share-to-compete-dynamic-thumbnail`, `share-on-replay`, `feed-not-interested`, `immersive-feed`, `tier-curation`, `live-thumbnail-experiment` and `web-game-screenshots` (the last six are off).
- **Paid ads:** Statsig `adsets` map 7 Meta ad sets to community games ("41 Ragdoll Executions", "Stickman archer", three "Feels" shorts). Ad clicks land players on those games.

## 6. Monetisation and social
- V **Creator pay:** "Earn based on plays. We pay out more than any other short-form content platform". The `/create/earn` page needs login; payouts go through PayPal (`/create/earn/paypal/callback`, `earn_paypal_connect_result`), and there is an `earn_significant_plays_fetch_error` event.
- V **AI wallet** (Statsig): `{"dimension_key":"user:ai_wallet:balance","wallet_cap_micro_usd":200000000,"rate_micro_usd_per_1000_plays":1000000,"min_significant_plays":200}`. I: this is $1 of generation credit per 1,000 plays, capped at $200, after 200 significant plays. It pays for "expensive" edits.
- V **Contests:** "$100K Creator Contest: 25 creators build in public for 3 weeks. The top five share $100,000. Apply by November 20". "Game Competitions … every other week for rewards and a week in the spotlight". Jam rows are `local_multiplayer` and `shorts_jam_2026` ("Community competition - you be the judge!").
- V **Referral:** cookie `referralCode`, `/internal/referral-payouts`, `referral_landing_viewed`.
- V **Sharing:**
  - Share links carry `sharedByCreator, sharedByPlayer, shareVariant, surface`.
  - Short links come from `/v3/share-links`. `share-preview-card=branded`.
  - Share targets are ordered by country, for example `ID:["whatsapp","instagram","telegram","messenger","twitter"]`, `VN:["zalo",…]`, `TH:["line",…]`.
  - The share UI is localized.
- V No subscriptions; the tier is `"free"`. No paid gifts or in-game ads.

## 7. Localization
- V The share UI ships 12 languages: `["en","ar","fr","es","vi","id","hi","pt","th","fa","ru","tr"]` (with aliases in→id, iw→he).
- V The platform UI itself is English. Comments get a "Translate" button (`/api/translate`).
- V Request headers carry `device-language, user-country, user-timezone, user-day-n, user-connection-type, user-utm-campaign, x-experiment-variants`. The feed filters by language once `min_games_for_language_filter` is met, with `fallback_language:"en"`.

## 8. What a creator can use (V = in code/config; I = advice)
1. V **After 30 s of play**, the game enters "recently played" (`RECENTLY_PLAYED_MIN_PLAY_MS = 3e4`). If the player then taps **Replay**, the host shows the My Arcade FUE first. Otherwise it shows a **share prompt with source "replay"**, once per game.
   - I: give the game a natural end/replay moment after 30 s or more.
2. V **Leaderboard share modal:** "Challenge your friends to beat your score!", with `priority: LEADERBOARD` and a per-user opt-out. The current arm is `share-to-compete-dynamic-thumbnail` (the score is drawn into the thumbnail).
   - I: always submit a meaningful best score.
3. V **`lib.share({image,title,description,text})`** exists in the runtime. A game can open the native share sheet with its own image.
4. V **Updates are rewarded:** `update_recency_boost` (half-life 3 days, 30-day window). Plays 0–10k get a `play_boost` of up to ×1.2.
   - I: ship meaningful updates in waves.
5. V **Cold-start gate:** about 200 plays with median ≥40 s (theme rows also want p75 ≥75 s). Players' Choice weighs retention (15) and plays over 300 s (10). Duration gates matter more than CTR.
6. V **0-interaction sessions are not counted**, and a play counts on tap. An instantly interactive first frame converts preview taps into counted plays.
7. V Do not mark camera/mic/motion as `required`. Web players get blocked.
8. V Brand-IP games are dedup-dropped from curated rows, and Minecraft/chess theme rows are hidden.
9. V Games under 500 plays do not appear in search.
10. V `hide_play_count:true` is live in the feed, so social proof from play counts is not shown to guests.
11. V Statsig session recording is enabled for guests (`can_record_session:true, rate 1`). I: Astrocade can watch real sessions of your game.
12. V Surprise: `/profile/alex` is `userId Google_102064273444123805802`, bio "Founding Creative Director at Astrocade". That is the same owner id our 22 Nov "Modcade" teardown studied. This account is individually included in `theme-affinity-ordering`, `recsys-gallery-gbdt-*`, `enable-game-device-features` and `analytics-username-override`. Our account (`<akun kita>`) appears in no flag or config.

## Saved files (under `plat/web/`)
- `scripts/capture.js`, `scripts/ctx.sh`, `scripts/unhash.js`
- `data/run1/`, `data/run2/` (`log.json`, `api/*` response bodies, `doc*.html`, `shot*.png`, `text*.txt`, `static/*`)
- `data/all/` (475 chunks), `data/chunks/`, `data/lazy/`
- `data/events.txt` (539-event analytics catalog with amplitude/kinesis flags)
- `data/statsig-configs.txt` (77 dynamic configs), `data/statsig-names.txt`
- `data/exp-flags-splits.txt` (158 Amplitude flags with segments), `data/exp-keys.txt`
- `data/paths.txt`, `data/hosts.txt`
