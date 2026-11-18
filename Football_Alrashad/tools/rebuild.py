#!/usr/bin/env python3
"""Rebuild offline export sources after source edits; assets stay in offline-assets.js."""
from pathlib import Path
import base64,json
root=Path(__file__).resolve().parent.parent
files={}
for p in sorted(root.rglob('*')):
 if p.is_file() and p.name not in ['package-files.js','offline-assets.js'] and '__pycache__' not in p.parts:
  if p.stat().st_size>=25_000_000: raise ValueError('File exceeds 25 MB: '+str(p))
  files[p.relative_to(root).as_posix()]=base64.b64encode(p.read_bytes()).decode()
(root/'package-files.js').write_text('window.FOOTBALL_FILES='+json.dumps(files,separators=(',',':'))+';',encoding='utf8')
print('Bundled',len(files),'source files without duplicate assets')
