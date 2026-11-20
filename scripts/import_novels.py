#!/usr/bin/env python3
"""Import approved manuscripts; never modify the author's originals."""
import argparse
from datetime import date
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOKS = [
    dict(slug='yongshi', title='永逝之日', source='永逝之日', genre='原创 · 奇幻',
         subtitle='第一部',
         description='在一颗没有昨天、也没有明天的星球上，时间因一滴泪而开始流动。塞尔薇娅的故事，自此展开。',
         quote='时间从这座高塔之外，继续向前。'),
    dict(slug='unfinished-hero', title='An Unfinished Hero Story', source='An Unfinished Hero Story',
         genre='同人 · Supernatural', subtitle='Continuation / Eternal Camelot',
         description='图书馆里，一本坠落的书显现出一座地下堡垒。薇尔走进了 Sam、Dean 与 Castiel 尚未结束的故事。',
         quote='图书馆里从来没有风。'),
]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-root', type=Path, required=True)
    args = parser.parse_args()
    for original in BOOKS:
        book = dict(original)
        source = args.source_root / book.pop('source')
        manuscript = source / (book['title'] + '.md')
        text = manuscript.read_text()
        directory = ROOT / 'content' / book['slug']
        existing = json.loads((directory/'book.json').read_text())
        # A book cover is an editorial asset, independent of chapter illustrations.
        book['cover'] = existing['cover']
        book['cover_width'] = existing['cover_width']
        book['cover_height'] = existing['cover_height']
        if not (ROOT / book['cover'].lstrip('/')).is_file():
            raise FileNotFoundError(book['cover'])
        asset_dir = ROOT / 'assets' / book['slug']
        asset_dir.mkdir(parents=True, exist_ok=True)
        images = []
        sizes = {}
        def replace_image(match):
            alt, raw = match.groups()
            image = Path(raw.strip('<>'))
            if not image.is_absolute():
                image = source / image
            if not image.is_file():
                raise FileNotFoundError(image)
            name = f'illustration-{len(images)+1:02}.jpg'
            dest = asset_dir / name
            subprocess.run(['sips','-s','format','jpeg','-s','formatOptions','86','-Z','1800',str(image),'--out',str(dest)], check=True, stdout=subprocess.DEVNULL)
            url = f'/assets/{book["slug"]}/{name}'
            # Generator filenames aren't useful alternative text for readers.
            if alt.startswith('openart'):
                alt = f'{book["title"]} · 正文插画 {len(images)+1}'
            dimensions = subprocess.check_output(['sips','-g','pixelWidth','-g','pixelHeight',str(dest)], text=True)
            sizes[url] = [int(re.search(r'pixelWidth: (\d+)',dimensions)[1]),int(re.search(r'pixelHeight: (\d+)',dimensions)[1])]
            images.append(url)
            return f'![{alt}]({url})'
        published = re.sub(r'!\[([^\]]*)\]\(([^\n]+?)\)',replace_image,text)
        directory = ROOT / 'content' / book['slug']
        directory.mkdir(parents=True, exist_ok=True)
        if book['cover'] in images:
            raise ValueError('Use a dedicated book cover, not a chapter illustration')
        (directory/'manuscript.md').write_text(published)
        book['illustrations'] = images
        book['image_sizes'] = sizes
        book['source_sha256'] = hashlib.sha256(text.encode()).hexdigest()
        book['updated'] = date.today().isoformat()
        (directory/'book.json').write_text(json.dumps(book,ensure_ascii=False,indent=2)+'\n')
        print(f'Imported {book["title"]}: {len(images)} illustrations')

if __name__ == '__main__':
    main()
