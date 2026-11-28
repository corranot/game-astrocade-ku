# Snowy Snapshot, round 13: comfort, round 2 (28 Nov)

This round follows the round 12 comfort report (`../r12/comfort-report.md`). It ships the two items that report
left waiting and the results of a second blind-spot pass. Chapter 2 is still planned for the next update.

**Result:** new draft **01M8FSWGC7SHPF4VD9THKTAHPV**, built on 01M8FSCZH9PS0R90PB1D6XTK0E and verified byte for byte
after upload. It is not published.

## Shipped

| Change | Owner | Why |
|---|---|---|
| Two thumbs work in either order. A player who is already looking on the right can put a thumb down on the left to walk. Lifting the walking thumb keeps the look going, and the lifted thumb never counts as a tap. | Input | Round 12 handled only "walk first, then look". |
| Every coat and camera has its own name in all 7 languages (Mint coat, Sky camera and so on). | Writer / Localization | The shop showed six items all called "Outfit" and three all called "Camera color". |
| Cameras show a camera icon tinted in their colour. Coat icons show the hat colour too. | UI | Cameras used the coat picture, so they read as more coats. |
| Phones set to reduce motion get no camera shake. | Accessibility | The CSS animations already respected the setting; the 3D camera shake did not. |
| A long press never opens the browser menu. | Platform QA | A long press is common during two-thumb play. |
| The new camera icon draws its rounded boxes with arcTo, not canvas `roundRect`. | Platform QA | Older phones lack `roundRect`, and the call would throw while the shop builds. A scan found no other recent JS APIs. |

## Checked

- Shop names at 360 wide: no overflow in en, hi, bn, ar, vi, es or id (`shop-names-*.jpg`).
- Full playtest: 101/101. Two new checks: "look first, then walk", and "lifting the walking thumb keeps the look going".
- 29 unit tests pass, CI checks pass, and the feed bundle test reports no errors.
- Render cost is unchanged: 135 draw calls and 132k triangles in the feed frames, the same as round 12.
- 4G first frame, interleaved runs: round 12 took 2.18 / 2.05 / 2.28 s (median 2.18), and round 13 took 2.09 / 2.19 / 2.32 s (median 2.19).
  The two are the same within noise. The bundle grew by 3.8 kB of strings and code.

## Expert sign-off

Creative, Art, UX, Input, Localization, Accessibility, Audio and QA all sign off. Every screen touched in this round
scores at least 8/10 (shop 8).
