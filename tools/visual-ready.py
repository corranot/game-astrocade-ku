"""Visually-ready time from a folder of timed screenshots (tools/live-load.js FRAMES=dir).
Ready = the first frame from which every later frame stays close to the last one (mean abs grey diff on a
48x104 thumbnail under a threshold), so a loader, a blank canvas or a half-built scene does not count.
An animated title screen moves a little; the threshold allows that. Prints ms, or 'n/a' when it never settles.
Usage: python3 tools/visual-ready.py <dir> [threshold=14]"""
import sys, os
from PIL import Image, ImageChops, ImageStat
d = sys.argv[1]; th = float(sys.argv[2]) if len(sys.argv) > 2 else 14
fs = sorted(f for f in os.listdir(d) if f.endswith('.jpg'))
def g(f): return Image.open(os.path.join(d, f)).convert('L').resize((48, 104))
last = g(fs[-1]); diffs = [ImageStat.Stat(ImageChops.difference(g(f), last)).mean[0] for f in fs]
ready = None
for i in range(len(fs)):
    if all(x < th for x in diffs[i:]): ready = int(fs[i][:-4]); break
print(ready if ready is not None else 'n/a')
