#!/usr/bin/env python3
"""Shrink QA evidence screenshots before they are committed.

Every committed version of a screenshot stays in git history forever: 2,694 versions of ~800 evidence files
had grown the history to 423 MB by 2026-11-22, and every cloud session clones all of it. Retained evidence only
has to show the screen, so new or changed files are capped at MAX_W pixels wide (JPEG/WebP quality 80; PNG
stays lossless). Files already committed and unchanged are never touched (rewriting them adds history).

Usage: python3 tools/evidence-shrink.py            new/changed files under production/qa/evidence
       python3 tools/evidence-shrink.py FILE...    just these files
Prints one observation line; files that were staged are staged again. Never fails a commit: without Pillow it
says so and exits 0.
"""
import io
import os
import subprocess
import sys

ROOT = "production/qa/evidence/"
MAX_W = 480
EXT = (".jpg", ".jpeg", ".png", ".webp")


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True).stdout


def candidates():
    """New, modified or untracked evidence files, with whether each is staged."""
    out = []
    for line in git("status", "--porcelain", "--untracked-files=all", "--", ROOT).splitlines():
        st, path = line[:2], line[3:].split(" -> ")[-1].strip('"')
        if "D" in st or not path.lower().endswith(EXT):
            continue
        out.append((path, st[0] not in " ?"))
    return out


def shrink(path, Image):
    """Returns (before, after) bytes; after == before when nothing was gained."""
    before = os.path.getsize(path)
    im = Image.open(path)
    im.load()
    fmt = im.format
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    if fmt == "PNG":
        im.save(buf, "PNG", optimize=True)
    elif fmt == "WEBP":
        im.save(buf, "WEBP", quality=80, method=6)
    else:
        im.convert("RGB").save(buf, "JPEG", quality=80, optimize=True, progressive=True)
    if buf.tell() >= before:
        return before, before
    with open(path, "wb") as f:
        f.write(buf.getvalue())
    return before, buf.tell()


def main(argv):
    try:
        from PIL import Image
    except ImportError:
        print("evidence-shrink: Pillow not installed, screenshots left as they are (pip install pillow)")
        return 0
    files = [(p, False) for p in argv] if argv else candidates()
    n, b0, b1, restage = 0, 0, 0, []
    for path, staged in files:
        try:
            before, after = shrink(path, Image)
        except Exception as e:  # an unreadable file is reported, never fatal
            print(f"evidence-shrink: could not read {path} ({e})")
            continue
        b0 += before
        b1 += after
        if after < before:
            n += 1
            if staged:
                restage.append(path)
    if restage:
        subprocess.run(["git", "add", "--", *restage])
    if files:
        print(f"evidence-shrink: {len(files)} file(s), {n} shrunk, {b0 // 1024} KB -> {b1 // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
