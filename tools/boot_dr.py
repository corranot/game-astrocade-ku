# Tame a Dragon: the 1.5 MB physics download no longer competes with the first frame. It starts when physics is set
# up (after the first frame; the game already flies with its fallback collision until then). Also: the Share tap no
# longer renders an unused share picture (an off-screen 3D render + pixel read that stalled the tap; the host card
# uses the game's cover), and the first-tame title card no longer covers the new-dragon card. Usage: boot_dr.py <html>...
import sys, os, re
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'boot_pp.py')).read().split('E = [')[0]
ns = {}; exec(src, ns); rx = ns['rx']
for f in sys.argv[1:]:
    s = open(f).read()
    s, n = re.subn(r'window\.__physTxt=(fetch\(.*?\}\));window\.__physTxt\.catch\(function\(\)\{\}\);',
        r'window.__physGo=function(){if(!window.__physTxt){window.__physTxt=\1;window.__physTxt.catch(function(){});}return window.__physTxt;};', s, count=1)
    assert n == 1, f
    s, n = rx('b64u8((await window.__physTxt))').subn(lambda m: 'b64u8((await window.__physGo()))', s, count=1)
    assert n == 1, f
    s, n = rx('const image = dragonShareCanvas(shareDragon);').subn(lambda m: '', s, count=1)
    assert n == 1, f
    # the one-time title card waits until the new-dragon card has faded (it used to land on top of it)
    s, n = rx("if (H.phase === 'play' && !panel && !H.cine && !H.tg) sys('titleCard', titleCard);").subn(lambda m: "if (H.phase === 'play' && !panel && !H.cine && !H.tg && !ui.newCard.getAnimations().length) sys('titleCard', titleCard);", s, count=1)
    assert n == 1, f
    open(f, 'w').write(s); print('ok', f)
