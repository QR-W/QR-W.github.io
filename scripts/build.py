#!/usr/bin/env python3
"""Build a dependency-free, crawlable static library for GitHub Pages."""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://qr-w.github.io'

def esc(value):
    return html.escape(str(value), quote=True)

def write(path, text):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text)

def header(active='library'):
    return f'''<a class="skip" href="#main">跳到正文</a>
    <header class="site-header"><a class="brand" href="/" aria-label="WQR 故事集首页"><span class="brand-mark">W</span><span>WQR <span class="brand-sub">/ 故事集</span></span></a>
    <nav aria-label="主导航"><a href="/#stories" {'aria-current="page"' if active == 'library' else ''}>作品</a><a href="/#about">关于</a><a href="https://github.com/QR-W" class="github" rel="me">GitHub</a></nav></header>'''

def footer():
    return '<footer class="site-footer"><a class="footer-brand" href="/">WQR / 故事集</a><span>文字与想象，在这里相遇。</span><span>© 2026 QR-W</span></footer>'

def page(title, description, path, body, body_attrs='', extra=''):
    return f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)} · WQR 故事集</title><meta name="description" content="{esc(description)}">
<link rel="canonical" href="{BASE}{path}"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:type" content="website"><meta property="og:url" content="{BASE}{path}">
<meta name="theme-color" content="#f7f8fa"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css"><script src="/assets/site.js" defer></script>{extra}</head>
<body {body_attrs}>{body}</body></html>'''

def chapter_url(book, index):
    return f'/novels/{book["slug"]}/chapter-{index+1}/'

def book_url(book):
    return f'/novels/{book["slug"]}/'

def load_book(slug):
    source = ROOT / 'content' / slug
    book = json.loads((source/'book.json').read_text())
    text = (source/'manuscript.md').read_text()
    sections = re.split(r'^## (.+)\n',text,flags=re.M)
    book['chapters'] = [{'title':sections[i], 'text':sections[i+1]} for i in range(1,len(sections),2)]
    text_only = re.sub(r'!\[[^\]]*\]\([^\n]*\)','',text)
    book['count'] = len(re.findall(r'[\u4e00-\u9fff]|[A-Za-z0-9]+',text_only))
    book['count_label'] = f'约 {book["count"]/10000:.1f} 万字'
    return book

books = [load_book('yongshi'),load_book('unfinished-hero')]
urls = ['/']

cards = ''
for book in books:
    cards += f'''<article class="book-card {book['slug']}"><a class="cover-link" href="{book_url(book)}" aria-label="查看《{esc(book['title'])}》"><img src="{book['cover']}" alt="{esc(book['title'])}的故事场景" width="900" height="560"><span class="cover-caption">{esc(book['genre'])}</span></a>
    <div class="book-meta"><span>{esc(book['subtitle'])}</span><span>{book['count_label']}</span></div>
    <h3><a href="{book_url(book)}">{esc(book['title'])}</a></h3><p>{esc(book['description'])}</p>
    <a class="text-link" href="{book_url(book)}">走进故事 <span aria-hidden="true">＋</span></a></article>'''

home = header() + f'''<main id="main"><section class="intro shell"><div><p class="eyebrow">FICTION & IMAGINATION</p><h1>故事未完，<br><span>请翻下一页。</span></h1></div><div class="intro-note"><span class="small-star" aria-hidden="true">✦</span><p>关于时间，关于相遇，<br>关于那些仍在继续的故事。</p><span class="note-sign">QR-W 的小说收藏</span></div></section>
<section class="library shell" id="stories" aria-labelledby="stories-heading"><div class="section-heading"><h2 id="stories-heading">书架</h2><p>两部作品 · 两个世界</p></div><div class="book-grid">{cards}</div></section>
<section class="about shell" id="about"><p class="eyebrow">BETWEEN THE LINES</p><div><h2>给想象一个停留的地方。</h2><p>这里收录 QR-W 的小说与同人创作。<br>选一本书，从第一行开始，也可以回到上次停下的地方。</p></div><a class="text-link" href="#stories">回到书架 <span aria-hidden="true">＋</span></a></section></main>''' + footer()
write('index.html',page('故事未完，请翻下一页','QR-W 的小说书架：《永逝之日》与 An Unfinished Hero Story。','/',home))

def render_text(text, book):
    blocks = re.split(r'\n\s*\n',text.strip())
    output=[]; paragraph=0; scenes=[]
    for block in blocks:
        block=block.strip()
        if not block: continue
        if re.fullmatch(r'[-*_]{3,}',block):
            output.append('<hr class="scene-break" aria-label="场景分隔">')
            continue
        image = re.fullmatch(r'!\[([^\]]*)\]\(([^\n]+)\)',block)
        if image:
            alt,src=image.groups()
            width,height=book['image_sizes'][src]
            output.append(f'<figure><a href="{esc(src)}" target="_blank" rel="noopener" aria-label="查看大图：{esc(alt)}"><img src="{esc(src)}" alt="{esc(alt)}" loading="lazy" decoding="async" width="{width}" height="{height}"></a></figure>')
            continue
        paragraph+=1
        content=esc(block).replace('\n','<br>')
        content=re.sub(r'\*\*(.+?)\*\*',r'<strong>\1</strong>',content)
        output.append(f'<p id="p-{paragraph}" data-paragraph>{content}</p>')
    return '\n'.join(output)

for book in books:
    slug=book['slug']; url=book_url(book); urls.append(url)
    toc=''.join(f'<li><a href="{chapter_url(book,i)}"><span>{esc(ch["title"])}</span><span class="toc-action">阅读</span></a></li>' for i,ch in enumerate(book['chapters']))
    body=header() + f'''<main id="main" class="book-detail shell"><a class="breadcrumb" href="/#stories">书架 / {esc(book['genre'])}</a><div class="book-intro"><div class="detail-art"><img src="{book['cover']}" alt="{esc(book['title'])}的故事场景" width="800" height="1000"></div><div class="detail-copy"><p class="eyebrow">{esc(book['genre'])}</p><h1>{esc(book['title'])}</h1><p class="detail-subtitle">{esc(book['subtitle'])}</p><p class="detail-description">{esc(book['description'])}</p><div class="book-facts"><span>{book['count_label']}</span><span>{len(book['chapters'])} 个章节</span><span>更新于 {book['updated']}</span></div><div class="book-actions"><a class="button primary" href="{chapter_url(book,0)}">开始阅读</a><a class="button resume" data-resume="{slug}" href="{chapter_url(book,0)}" hidden>继续阅读</a><a class="button subtle" href="#contents">查看目录</a></div><blockquote>{esc(book['quote'])}</blockquote></div></div>
    <section id="contents" class="contents"><div class="section-heading"><h2>作品目录</h2><p>{book['count_label']}</p></div><ol class="toc-list">{toc}</ol></section></main>''' + footer()
    write(f'novels/{slug}/index.html',page(book['title'],book['description'],url,body))
    for i,ch in enumerate(book['chapters']):
        path=chapter_url(book,i); urls.append(path)
        toc_links=''.join(f'<li><a href="{chapter_url(book,j)}" {"aria-current=page" if j==i else ""}>{esc(c["title"])}</a></li>' for j,c in enumerate(book['chapters']))
        prev=f'<a class="button" href="{chapter_url(book,i-1)}">上一章</a>' if i else '<span></span>'
        nxt=f'<a class="button primary" href="{chapter_url(book,i+1)}">下一章</a>' if i+1<len(book['chapters']) else f'<a class="button primary" href="{url}">返回作品目录</a>'
        body=f'''<a class="skip" href="#main">跳到正文</a><div class="reading-progress" aria-hidden="true"><span></span></div><header class="reader-header"><a class="reader-home" href="{url}"><span aria-hidden="true">▤</span> <span>{esc(book['title'])}</span></a><a href="/">书架</a><button type="button" id="settings-toggle" aria-expanded="false" aria-controls="reading-settings">阅读设置</button></header>
        <div class="reader-layout"><aside class="reader-sidebar"><a class="eyebrow" href="{url}">作品目录</a><ol>{toc_links}</ol><p class="saved-note">阅读进度保存在此浏览器</p></aside>
        <main id="main" class="reading-main"><div class="chapter-heading"><p class="eyebrow">{esc(book['title'])}</p><h1>{esc(ch['title'])}</h1><p>QR-W <span aria-hidden="true">/</span> {book['genre']}</p></div><article class="prose" aria-label="小说正文">{render_text(ch['text'], book)}</article><div class="chapter-end"><span aria-hidden="true">✦</span><p>{'本章结束' if i+1<len(book['chapters']) else '已读至当前收录内容的末尾'}</p></div><nav class="chapter-navigation" aria-label="章节翻页">{prev}{nxt}</nav><a class="back-top" href="#main">回到章首</a></main></div>
        <dialog id="reading-settings" aria-labelledby="settings-title"><div class="dialog-heading"><h2 id="settings-title">阅读设置</h2><button type="button" id="settings-close" aria-label="关闭阅读设置">×</button></div><div class="setting-row"><span>字号</span><div><button id="font-down" aria-label="缩小字号">A−</button><output id="font-value" aria-live="polite">20</output><button id="font-up" aria-label="放大字号">A＋</button></div></div><div class="setting-row"><span>背景</span><div class="theme-options"><button data-theme="light" aria-pressed="true">日间</button><button data-theme="paper" aria-pressed="false">纸色</button><button data-theme="dark" aria-pressed="false">夜间</button></div></div><label class="setting-row" for="chapter-select">跳转章节</label><select id="chapter-select">{''.join(f'<option value="{chapter_url(book,j)}" {"selected" if i==j else ""}>{esc(c["title"])}</option>' for j,c in enumerate(book['chapters']))}</select><p class="settings-note">设置与阅读进度仅保存在当前浏览器。</p></dialog>'''
        write(f'novels/{slug}/chapter-{i+1}/index.html',page(f'{ch["title"]} · {book["title"]}',f'阅读《{book["title"]}》：{ch["title"]}',path,body,f'class="reader" data-book="{slug}" data-chapter="{i+1}"'))

write('404.html',page('这一页暂时空白','回到书架，继续阅读。','/404.html',header()+ '<main id="main" class="empty-page shell"><p class="eyebrow">PAGE NOT FOUND</p><h1>这一页，暂时空白。</h1><p>这个链接可能来自旧版网站。新的故事在书架上等你。</p><a class="button primary" href="/">回到书架</a></main>'+footer()))
write('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{BASE}{u}</loc></url>' for u in urls)+'</urlset>\n')
write('robots.txt',f'User-agent: *\nAllow: /\nSitemap: {BASE}/sitemap.xml\n')
write('.nojekyll','')
print(f'Built {len(urls)} pages plus 404. Books: '+', '.join(b['title'] for b in books))
