#!/usr/bin/env python3
"""Verify manuscript fidelity and the complete generated site's local links."""
import argparse
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.refs=[]; self.ids=set(); self.prose=False; self.in_p=False; self.paragraphs=[]
        self.feed(text)
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, f'Duplicate id: {attrs["id"]}'
            self.ids.add(attrs['id'])
        if tag in ['a','img','script','link']:
            ref=attrs.get('src') or attrs.get('href')
            if ref: self.refs.append(ref)
        if tag=='img':
            assert attrs.get('alt'), 'Missing image alt text'
            assert int(attrs.get('width',0))>0 and int(attrs.get('height',0))>0, 'Missing image dimensions'
        if tag=='article' and attrs.get('class')=='prose': self.prose=True
        if self.prose and tag=='p': self.in_p=True; self.paragraphs.append('')
        if self.in_p and tag=='br': self.paragraphs[-1]+='\n'
    def handle_endtag(self,tag):
        if tag=='p': self.in_p=False
        if tag=='article': self.prose=False
    def handle_data(self,text):
        if self.in_p: self.paragraphs[-1]+=text

parser=argparse.ArgumentParser()
parser.add_argument('--source-root',type=Path)
args=parser.parse_args()
pages={p:Page(p.read_text()) for p in ROOT.rglob('*.html') if '.git' not in p.parts}
for path,page in pages.items():
    assert '/Users/' not in path.read_text(), f'Local path leaked into {path}'
    for ref in page.refs:
        url=urlsplit(ref)
        if url.scheme or url.netloc: continue
        if not url.path: target=path
        elif url.path.startswith('/'): target=ROOT/unquote(url.path.lstrip('/'))
        else: target=path.parent/unquote(url.path)
        if target.is_dir(): target=target/'index.html'
        assert target.is_file(), f'Broken link: {path.relative_to(ROOT)} -> {ref}'
        if url.fragment and target in pages:
            assert unquote(url.fragment) in pages[target].ids, f'Broken anchor: {ref}'

paragraph_count=0
for meta in sorted((ROOT/'content').glob('*/book.json')):
    book=json.loads(meta.read_text())
    manuscript=(meta.parent/'manuscript.md').read_text()
    if args.source_root:
        original=(args.source_root/book['title']/(book['title']+'.md')).read_text()
        assert hashlib.sha256(original.encode()).hexdigest()==book['source_sha256'], 'Source changed since import'
        without_images=lambda t:re.sub(r'!\[[^\]]*\]\([^\n]+?\)','',t)
        assert without_images(original)==without_images(manuscript), 'Manuscript content changed during import'
    sections=re.split(r'^## (.+)\n',manuscript,flags=re.M)
    for i in range(1,len(sections),2):
        expected=[]
        for block in re.split(r'\n\s*\n',sections[i+1].strip()):
            block=block.strip()
            if not block or re.fullmatch(r'[-*_]{3,}',block) or re.fullmatch(r'!\[[^\]]*\]\([^\n]+\)',block):continue
            expected.append(re.sub(r'\*\*(.+?)\*\*',r'\1',block))
        page=pages[ROOT/'novels'/book['slug']/f'chapter-{(i+1)//2}'/'index.html']
        assert expected==page.paragraphs, f'Text mismatch: {book["title"]} {sections[i]}'
        paragraph_count+=len(expected)
print(f'PASS: {len(pages)} HTML pages, all local links and anchors, image dimensions, {paragraph_count} verbatim paragraphs, no local filesystem paths.')
