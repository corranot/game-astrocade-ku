# Snowy Snapshot, round 20: nothing passes through anything (28 Nov)

Base: r19 draft 01M8G418N2QJNYFKK2AF20VAK5. **New draft 01M8GCF8RMRX1ZSRT4ZAZEARPT** (sync token
9c26f60f8a0002609e28ccabe01ebd8f). All 12 files were pulled back and matched byte for byte. Not published.

## Audit (what clipped in r19)

| Where | r19 | Fix |
|---|---|---|
| Pip vs world | Only the valley edge and closed gates stopped Pip: trees, rocks, shrubs, logs, lamps, the cabin, boards, crystals, the snowman, the sled, mounds and perches had no collider | Each is a solid (circle, or a turned box for the cabin, logs, sled, boards and the dam) in `W.solids`. `L.slide` pushes the walker out along the contact normal, so Pip slides around it. Radii are in `world.solid` in the config. A pine's collider is its skirt (0.85 of the lowest tier), so Pip never stands under the branches |
| Animals vs world | Same: they wandered through props | Animals use the same solids (birds on their stumps, shy ones in their mounds and the whale in its hole are exempt). A blocked walk picks another spot |
| Animals vs animals | Nothing kept them apart | `L.separate` pushes overlapping animals apart each frame; a posing animal stays put |
| Camera vs geometry | Only hills, rocks, lamps and gates were solid for the camera | The cabin, the snowman, crystals and the waterfall join them. Pines keep their whole-tree fade |
| Camera strap | Two fixed sticks from the camera top went up into the chin and face, worst in the camera raise and peek | The strap is re-laid every frame: from the camera's top corners, down under the big chin, to the shoulder tops |
| Arms and sleeves vs parka | At rest, the inner half of each sleeve and mitten sank into the puffy parka | A puffy-parka stance: the arms are held 0.45 rad further out, as a child in a snowsuit stands |
| Camera raise | The mittens went into the cheeks and the camera into the face | The camera rides further forward (`z + 0.16`, `y + 0.2`); the arms reach forward with the elbows out (`T.rUz 0.35`, `T.rFx -1.0`) |
| Warm idle | The forearms went into the tummy and the mittens into the camera | The elbows go out and the mitts rub lower, in front of the parka (`T.w*`) |
| Peek idle | The camera went into the face as the head nodded | The camera lifts further forward and the nod is smaller (0.25) |

## The automated check (`prototypes/photo-safari/noclip.js`)

1. **Pip sweep.** Pip walks at every solid from 8 sides at top speed, using the game's own movement step. Only approaches that start on the valley floor are run.
2. **Animals.** All the animals live for 45 s of game time while Pip moves around the valley. The check records the deepest overlap with a solid and with each other.
3. **Self-intersection per animation.** The poses are rest, walk, camera raise (0.25, 0.5, 0.54), warm (5 phases), stamp (4), peek (3), wave and walk+wave, each over 40 frames. Each frame checks:
   - mitten surface points against the head ellipsoid (hair and hat margin), the parka (un-posed into the torso bone's rest space), and the camera box;
   - forearm sleeves against the parka;
   - the camera box and the strap against the head and the parka.

   Limits: 0 mm for the head and camera-in-body; up to 12 mm of mitten touch and 30 mm of sleeve compression against the puffy parka; up to 25 mm of mitten grip on the camera. `SELF=1` runs this part alone in about 6 s.

| Check | r19 | r20 |
|---|---|---|
| Pip vs 377 solids (284 reachable) | No colliders (Pip walked straight through) | Deepest 14 mm (where 3 solids meet), 127,766 steps |
| Animals vs solids / each other (45 s, all areas) | No colliders | 0 mm / 0 mm |
| Self-intersection fails | 40 (r19 build, strap not measured) | 0 |

## Checks

| Check | Result |
|---|---|
| Unit tests | 32/32 (3 new: slide around a trunk and a turned box, slide along a face, animals step apart) |
| Full playtest | all passed. The first run caught the camera pulling in at the west meadow corner (a pine-cone camera test), which was removed; pines keep their fade |
| Feed bundle test (upload set) | errors: [] |
| Comfort 360, controls 360 | 0 errors |
| no-clip sweep (above) | Pip 14 mm max, animals 0, self 0 fails |
| 4G first frame, 3 runs interleaved (machine busy with the sweep) | r19 2.93 / 2.71 / 2.64 s, r20 2.73 / 2.94 / 2.86 s: same within noise, 2 kB more |

## Evidence

Here and in the shared project files under `snowy/no-clip/` (full-size `contact-sheet.jpg` there):
- `no-clip-sheet.jpg`: r19 on top, r20 below. Lamp post, cabin and berry bush walked into from the north, then the camera raise, raise side, peek and warm mitts.
- `nc-before-*`, `nc-after-*`: the walk-ins.
- `pip-*`: every pose close-up.
- `pt-15-corner-meadow-west.jpg`: Pip stops beside the rock at the meadow corner.
- `cf-*`, `ctl-*`: the comfort and controls tours.
