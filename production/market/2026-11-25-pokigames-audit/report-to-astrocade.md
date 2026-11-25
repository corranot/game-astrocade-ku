# Draft report to Astrocade: suspected ported third-party games by creator "PokiGames"

> Draft for the owner (Larisha) to review and send herself. Nothing has been sent.
> Indonesian summary for Larisha is at the end (§8).

---

**To:** Astrocade Trust & Safety / Content Review
**Subject:** Creator "PokiGames" publishing ported third-party web games (byte-identical files from Poki titles)
**Date of observation:** 2026-11-25 (all data read as a logged-out guest)

## 1. Summary

The creator **PokiGames** (profile `astrocade.com/profile/PokiGames`, owner id `Google_110536148567105692470`,
1.86M total plays) has published games on Astrocade that are builds of commercial games released on the web
portal Poki by other developers.

For two games, dozens of files in the published Astrocade build are byte-for-byte identical to the files Poki
serves for the original game. A third game uses the same artwork, downscaled. The builds still contain traces
of the original developers and of the Poki ad SDK. A fourth game is a Construct 3 export of a portal game with
its ads removed.

The game that first drew attention, "GTA6 - Ground Throw Anyone", uses:

- a CC-BY model without the required credit;
- character models whose metadata marks them as extracted from another game;
- the "GTA6" trademark as a title hook for a game unrelated to GTA.

Everything below can be checked from Astrocade's own stored data: the published context and asset files, and
version metadata.

## 2. Games involved

| Astrocade game | Plays (2026-11-25) | Published version | Likely original | Confidence |
|---|---|---|---|---|
| [Zen Burger](https://www.astrocade.com/games/x/01M6K5JHKZS4ACHJR1Q84QAG6F) `01M6K5JHKZS4ACHJR1Q84QAG6F` | 3,500 | `01M6KE5FS7E097V2EXDWFZWHTA` | [Burger Bounty on Poki](https://poki.com/en/g/burger-bounty) (developer appears as OnRush Studio) | **High** |
| [Phone Case DIY](https://www.astrocade.com/games/x/01M6NHYMNVCVP3FXH0H5QAMYWD) `01M6NHYMNVCVP3FXH0H5QAMYWD` | 16,607 | `01M6NTHJAJYNP7E0M35GQKRNN6` | [Phone Case DIY on Poki](https://poki.com/en/g/phone-case-diy) (on Poki since 2026-06-12) | **High** |
| [DIY Beauty Salon](https://www.astrocade.com/games/x/01M6J7K826JG0GJKKJMPVYE4M0) `01M6J7K826JG0GJKKJMPVYE4M0` | 770,201 | `01M6JM8CDR90XA922E9ZGW457G` | [Beauty Salon on Poki](https://poki.com/en/g/beauty-salon) | **Medium-high** |
| [Cute Haircut](https://www.astrocade.com/games/x/01M6ZCT1VBSRZMBXS7RTC3E8KA) `01M6ZCT1VBSRZMBXS7RTC3E8KA` | 162,767 | `01M6ZQG28CG56D01K3JGPNR4V4` | A Construct 3 portal game "Hair Salon" (original not identified) | **Medium** |
| [GTA6 - Ground Throw Anyone](https://www.astrocade.com/games/gta6-ground-throw-anyone/01M868Y4VQ0QNY36FN4KHQT50H) `01M868Y4VQ0QNY36FN4KHQT50H` | 240 | `01M86E51HDX3TFB6YTK0Q0CSWZ` | Code appears original. Assets: uncredited CC-BY model, extracted character models, trademark title | **Medium** (assets) |
| [GTA 6 - Grand Taxi Auto](https://www.astrocade.com/games/x/01M82AMWB3BQR9N3Y2QA2TR60R) `01M82AMWB3BQR9N3Y2QA2TR60R` | 653 | `01M84RJFTK7BDKPQFYJ434RG2N` | Same extracted character pool; "GTA 6" trademark title | **Medium** (assets) |

All six are approved and public. DIY Beauty Salon alone holds about 41% of the account's plays.

## 3. Evidence per game

### 3.1 Zen Burger = Poki "Burger Bounty"

- The published build is a full PlayCanvas export, stored as an embedded file archive: 471 files, including
  `playcanvas-stable.min.js`, `config.json` and the scene `1686599.json`.
- Compared with the build Poki serves for Burger Bounty (version path `069b7bca-7b57-455f-a872-b804c825da0d`):
  - 176 of Poki's 248 file paths are present.
  - **87 files are byte-identical.**
  - The other 89 share path and name but differ in bytes, consistent with recompressed models and audio and
    edited loader scripts.
- SHA-256 of identical files. Each was also re-checked against Poki's live copy on 2026-11-25:

  | File | Size | SHA-256 |
  |---|---|---|
  | `1686599.json` (scene) | 2,972,171 B | `ca0c24b3b1f925a19e8d37f1539f41360425ca82818e26a96d3bc90e409d770a` |
  | `__settings__.js` | 1,515 B | `9b26392f8162635ac64effaa1d320e67d4dce85c8036cc1b89f3ef6588f23f3f` |
  | `files/assets/125011678/1/Station.js` | 15,390 B | `a2de6136ef8c194bd8da79ac7d5c8d3e60f3a9976a9d9d6362ee9461aec21bf8` |
  | `files/assets/125011694/1/BakedPhysicsPlayer.js` | 5,832 B | `9fb3c57a44794a77fc0522ff4c0dff71bf9d94331a549f5d381d9bebc0881540` |

- **Original developer's traces left in the build:**
  - `index.html` loads `files/assets/127265571/1/PokiPlugin.js`.
  - The embedded asset `files/assets/125011655/1/Readme.md.txt` is the original team's dev log. It is titled
    "# Burger Rush", talks about ad-unlock design, and links `github.com/OnRushStudio/burger-bounty/issues/81`.
- The PlayCanvas scene metadata names the scene "Prototype", created 2022-12-26. The Astrocade game was created
  2026-11-04.
- Only the title changed: `<title>Zen Burger</title>` and `manifest.json` "Zen Burger".

### 3.2 Phone Case DIY = Poki "Phone Case DIY"

- The published build is a PixiJS v8 game with 808 files inlined as data URIs (`game.js`, 5.3 MB). The page
  title is "Case Coloring".
- Compared with Poki's build (version path `fb791e7e-b5b5-45aa-bdf1-1fa97b61057a`):
  - 169 of 200 Poki file paths are present. Examples: `assets/files/Obj/ToolsObj/Washing/Washing0.webp`,
    `assets/files/fonts/B_en.json`.
  - **70 files are byte-identical.**
  - The rest are re-encoded or downscaled images.

  | File | Size | SHA-256 |
  |---|---|---|
  | `assets/files/i18n/en.json` | 5,136 B | `99d1baa43a7f25468b8adfbdef22a4736a06b367633319a36d6ccad2472ddd90` |
  | `assets/files/fonts/B_en.json` | 4,197 B | `ea628852e7b248aedfa2f91826b477f4e37b6c9e3c58b658977d32b421cb0fe7` |
  | `assets/images/9patchbetween.webp` | 288 B | `e4a8ee7003f1196db91b283537bedcabcf337930994108ecb32a204f7f8720c8` |

- The code still has a Poki ad adapter. Its log strings include `"[Poki] commercialBreak failed"`,
  `"[Poki] SDK not present; ads are simulated."` and `"[Poki] rewardedBreak … failed"`. The workspace README
  meanwhile states "No ads, no Poki SDK".
- The game's only wish (2026-11-05) is a pasted runtime error. The game itself was supplied from outside.

### 3.3 DIY Beauty Salon = artwork of Poki "Beauty Salon"

- The code has a Poki SDK loader, with error strings such as "Poki SDK script could not load" and
  "Poki SDK initialization timed out" and `globalThis.PokiSDK`. The page title is "Beauty Salon".
- The file names match Poki's build (version path `f9f25ebe-0633-4f1a-9217-ba77962c929b`), for example
  `assets/girl/[girl]{default2}_0.webp`, `assets/hand/[hand_tools].webp` and `assets/Loader/*`.
- 3 loader files are byte-identical:

  | File | SHA-256 |
  |---|---|
  | `assets/Loader/progress_pattern.webp` | `de50f5609d9393e6b2fa423563f3c3f0ace412a9f5621b1409863ce6b78aacb3` |
  | `assets/Loader/sparkle.webp` | `ab973e330ea0a5d33e566a45316e11e08881dbac249ae754100c6ff3f33cbf01` |
  | `assets/Loader/loading.png` | `cf23355f5b218fce2204460cf8859c077ee44507d794e39387a6a47c9c4c98f9` |

- The character atlases are the same images at about 40% size, e.g. 2027×2031 px on Poki vs 811×812 px on
  Astrocade. Mean pixel difference after resizing is 0.2–0.6 of 255. The loader logo "DIY Beauty Salon" is the
  same art with a recoloured background.
- The context has an empty wish history. The game was supplied from outside.
- Only the first screen of the Poki game was loaded for this comparison, so the full overlap is likely higher.

### 3.4 Cute Haircut = Construct 3 portal game with ads stripped

- Its own workspace README calls it "a compiled Construct 3 web export (Scirra), uploaded as a static file tree".
- The embedded `data.json` names the project "Hair Salon", version 1.0.0.0, first layout `Change_girl`, exported
  2026-10-01. That is 5 weeks before the Astrocade game (2026-11-09).
- The event sheet is named `Gamepush_ads`, which points to the GamePush portal-ads SDK. The inserted bridge
  carries Indonesian comments: "Iklan: DIHAPUS" ("Ads: REMOVED") and "langsung memberi reward tanpa menonton apa
  pun" ("grants the reward without watching anything").
- The original title was not identified. It is not Poki's "Diva Hair Salon".

### 3.5 GTA6 - Ground Throw Anyone (the reported game)

- **No wish history.** The context has no `chat_history`, no design document and no task plan.
- **Upload timeline:**
  - Game created 2026-11-24 07:57:13 UTC.
  - All 25 assets uploaded between 07:59:09 and 08:02:53 (224 s).
  - First publish 08:07:18. Published version 09:28 UTC.
  - None of the assets are platform-generated.
- **Code:** a three.js r181 bundle that calls Astrocade's `lib` API. It appears to be written for Astrocade. No
  copied game logic was found.
- **Uncredited CC-BY asset:** `basketball.glb` (SHA-256
  `63d3636cc71f02ca33452cd0c614b9e1917106b437cfa039c08b587b726185ed`) carries its own glTF metadata:
  generator `Sketchfab-15.4.0`, title "Basket Ball", author "vvesy", license CC-BY-4.0, source
  `sketchfab.com/3d-models/basket-ball-5f9da304f5a44196804068647abae104`. The game and its description give no
  credit.
- **Character models with extraction markers:**
  - Seven female models (`cewe-2` … `cewe-8`) share one identical base body and face texture, the pattern of a
    single game's avatar system.
  - `cewe-5` and `cewe-6` keep material names such as `Tex_0028_0.dds` and `Tex_0384_0.dds.003`. That naming is
    typical of GPU-capture extraction tools.
  - `cowo-2` keeps the material name `Male_Hat_Cos_Seafood_GP_CabinShow.003`, which comes from a commercial
    costume pipeline.
  - The source game was not identified.
- **Trademark as a hook:** "GTA6" sits in the title and logo of a beach basketball-toss game.
- The same character pool is reused in "GTA 6 - Grand Taxi Auto".

## 4. Account-level pattern

- Many games start with a near-empty wish ("I want to make a game called X", "Ok, create it!"). Several games
  have no wish history at all. The real build then arrives through file uploads or the creator API. In one game
  the creator wrote "saya akan membuatnya melalui mcp" ("I'll build it through MCP"). In another the creator
  pasted 6.7 MB of pre-made code in two `.txt` attachments, asking the agent "jangan buat ulang gamenya"
  ("don't rebuild the game").
- The account name "PokiGames" uses the name of the portal the games come from.
- The account's top earners are the ported portal titles.
- Other trademarks in titles: "Naruto No Jutsu +999", "ONE PUNCH - THUNG SAUR".

Using MCP or uploads is not a problem in itself. The concern is the content that arrives through that route.

## 5. Confidence and limits

- **High:** Zen Burger and Phone Case DIY. Byte-identical files and original developer traces.
- **Medium-high:** DIY Beauty Salon. Same art, partial byte match, Poki SDK.
- **Medium:** Cute Haircut (stripped portal export, original not found) and the two GTA games' character models.
- **Not excluded:** the creator could hold a licence or be one of the original developers. Astrocade can ask for
  proof. The English dev log of a different studio, the Indonesian-language porting comments and the account
  name make that unlikely.
- Only public data was used. Per-version history before publish is owner-only and was not seen.

## 6. How Astrocade can verify (from its own data)

1. Open the published context of each version listed in §2 and hash the files named in §3. The values should
   match the tables, and the same hashes should match the files Poki serves for the named games.
2. Search the stored files for `PokiPlugin.js`, `PokiSDK`, `[Poki]`, `OnRushStudio`, `Gamepush_ads` and
   `Iklan: DIHAPUS`.
3. Check each game's wish history against its first content upload. Several have no wishes, or one trivial wish,
   before a multi-megabyte build appears.

## 7. Suggestions for the platform

- **Duplicate-content detection:** hash uploaded files and embedded data URIs. Flag builds that share many
  hashes with known portal games or with other creators' games.
- **Portal-SDK fingerprints at upload/review:** flag `PokiSDK`, `PokiPlugin`, GamePush, CrazyGames and
  GameDistribution SDK strings, Construct/PlayCanvas exports with foreign project metadata, and `Sketchfab`
  licence extras without credit.
- **Extra review for externally supplied builds:** apply it to games whose content arrives by upload or creator
  API without agent wishes, especially large self-contained bundles.
- **Trademark check on titles** (GTA, Naruto, One Punch Man).
- **Creator-side credits field** so CC-BY assets can be credited properly.

---

## 8. Ringkasan untuk Larisha (Bahasa Indonesia)

- Draft laporan resmi di atas (bahasa Inggris) siap kamu kirim ke tim Astrocade. Saya tidak mengirim apa pun.
- **Inti laporannya:** akun PokiGames mengunggah game buatan developer lain dari portal Poki.
  - **Zen Burger** = "Burger Bounty". 87 file sama persis byte per byte, termasuk file scene 2,97 MB. Di
    dalamnya masih ada `PokiPlugin.js` dan dev log asli tim OnRush (dengan link GitHub mereka).
  - **Phone Case DIY** = "Phone Case DIY" di Poki. 70 file sama persis, dan kode iklan Poki masih ada.
  - **DIY Beauty Salon** (770 ribu plays) memakai gambar "Beauty Salon" dari Poki yang diperkecil, ditambah
    Poki SDK.
  - **Cute Haircut** adalah ekspor Construct 3 game portal yang iklannya dibuang, dengan komentar "Iklan:
    DIHAPUS".
  - **GTA6 - Ground Throw Anyone:**
    - Tidak ada wish; 25 aset diunggah dalam 4 menit.
    - Bola basket dari Sketchfab CC-BY dipakai tanpa kredit.
    - Model karakternya punya tanda hasil rip.
    - Judul "GTA6" cuma umpan merek.
- **Yang bisa Astrocade cek sendiri:** hash SHA-256 di tabel, nama file, string `PokiSDK`/`PokiPlugin`/
  `OnRushStudio`, dan riwayat wish yang kosong.
- **Saran untuk platform:** deteksi hash duplikat, cek SDK portal saat upload, review tambahan untuk game yang
  diunggah tanpa wish, cek merek di judul.
- **Catatan jujur di laporan:** masih ada kemungkinan dia punya lisensi atau memang developer aslinya. Laporannya
  menyarankan Astrocade meminta bukti. Laporan ini hanya berisi bukti dan pola, bukan cara membongkar game.
