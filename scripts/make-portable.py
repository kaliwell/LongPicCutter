"""Build a standalone local HTML from the Vite build. Run after npm run build -- --base=./."""
from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent
dist = root / 'dist'
html = (dist / 'index.html').read_text()

def inline_script(match):
    code = (dist / match.group(1).removeprefix('./').removeprefix('/')).read_text()
    code = re.sub(r'</script', r'<\\/script', code, flags=re.I)
    return '<script type="module">' + code + '</script>'

def inline_style(match):
    css = (dist / match.group(1).removeprefix('./').removeprefix('/')).read_text()
    return '<style>' + css + '</style>'

html = re.sub(r'<script[^>]*src="([^"]+)"[^>]*></script>', inline_script, html)
html = re.sub(r'<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>', inline_style, html)
output = root / '长图切割-直接打开.html'
output.write_text(html)
print(output.name)
