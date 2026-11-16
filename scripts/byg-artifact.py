#!/usr/bin/env python3
"""Samler Vite-buildet i én HTML-fil, der kan udgives som Artifact.
   npx vite build --base=./ --outDir <dist> && python3 scripts/byg-artifact.py <dist> <ud.html>"""
import glob, sys
dist, ud = sys.argv[1], sys.argv[2]
css = open(glob.glob(f'{dist}/assets/*.css')[0]).read()
js = open(glob.glob(f'{dist}/assets/*.js')[0]).read().replace('</script', '<\\/script')
open(ud, 'w').write(f'''<title>Journalnotat</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Public+Sans:wght@400;500;600;700;800&display=swap">
<style>{css}</style>
<div id="root"></div>
<script type="module">{js}</script>
''')
