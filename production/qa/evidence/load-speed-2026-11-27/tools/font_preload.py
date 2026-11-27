# Adds <link rel=preload as=font> for the CDN font subsets that the game's own boot forces anyway
# (document.fonts.load test strings), so they download from the first byte instead of after the engine import.
# usage: font_preload.py <html>...   (idempotent)
import re, sys
def ranges(ur):
    out = []
    for p in ur.split(','):
        p = p.strip().upper().replace('U+', '')
        if not p: continue
        a, _, b = p.partition('-'); a = int(a.replace('?', '0'), 16); b = int(b, 16) if b else int(p.replace('?', 'F'), 16)
        out.append((a, b))
    return out
for f in sys.argv[1:]:
    s = open(f).read()
    if 'data-boot-preload' in s: print('skip', f); continue
    chars = set(''.join(m.group(2) for m in re.finditer(r'''document\.fonts\.load\(\s*(['"]).*?\1\s*,\s*['"]([^'"]*)['"]''', s)))
    urls = []
    for m in re.finditer(r'@font-face\s*\{([^}]*)\}', s):
        b = m.group(1); u = re.search(r'url\((https://d16qq0o35va7kz[^)]+\.woff2)\)', b); r = re.search(r'unicode-range:([^;]+)', b)
        if u and r and any(lo <= ord(c) <= hi for c in chars for lo, hi in ranges(r.group(1))) and u.group(1) not in urls: urls.append(u.group(1))
    if not urls: print('none', f); continue
    links = ''.join(f'<link data-boot-preload rel="preload" as="font" type="font/woff2" crossorigin href="{u}">' for u in urls)
    i = s.find('<head>') + 6 if '<head>' in s else s.find('<head') 
    i = s.find('>', s.find('<head')) + 1
    s = s[:i] + links + s[i:]; open(f, 'w').write(s); print('ok', len(urls), f)
