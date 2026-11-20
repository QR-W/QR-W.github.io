# WQR / 故事集

QR-W 的 GitHub Pages 小说站。当前收录《永逝之日》和《An Unfinished Hero Story》。

首页与作品页采用星空、极光、拱门封面和轻微视差。首页可切换两部作品的世界与光色，右上角可关闭动效；遵循系统的减少动态效果设置，并在页面进入后台后暂停星空绘制。阅读页使用独立的舒适排版。

纯静态 HTML、CSS、JavaScript，无线上依赖、账号系统或数据收集。原技术博客已从当前版本移除，可从 Git 历史中找回。

## 预览

在仓库目录运行：

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 http://127.0.0.1:4173/ 。阅读模式、字号和续读位置由当前浏览器的 localStorage 保存；浏览器禁用存储时仍可正常阅读。目录、正文和翻页链接无需 JavaScript。

## 更新小说

`content/<作品>/manuscript.md` 是网页生成用稿件，`book.json` 保存简介、封面和插画尺寸。`scripts/build.py` 生成书架、作品页、章节页、404 与 sitemap。

从 Mac 桌面上的两部原稿重新导入（**不修改原稿**）：

```bash
python3 scripts/import_novels.py --source-root "$HOME/Desktop"
python3 scripts/build.py
python3 scripts/check.py --source-root "$HOME/Desktop"
node --check assets/site.js
node --check assets/worlds.js
```

导入工具使用 macOS 自带 `sips` 将正文引用的插画压缩成网页 JPEG，保留外部原图。只导入两个同名主稿件及其中的插画，不发布人物设定、历史版本、提示词或独立英文对白文件。日期记录本次导入日期；字数按中文字符及英文单词估算。

直接修改仓库内的网站稿件后运行：

```bash
python3 scripts/build.py
python3 scripts/check.py
```

当前渲染器覆盖这两部稿件使用的二级章节标题、自然段、加粗、分隔线和独立插画，不是通用 Markdown 引擎。添加新的 Markdown 结构时应扩展渲染和校验。

## 发布

GitHub Pages 使用仓库根目录的静态文件，`.nojekyll` 避免额外处理。先通过上述检查，确认 Pages 发布源仍是 `main` 分支根目录，再把版本合入并推送 `main`。如果账户更改了 Pages 发布源，应先同步设置。

所有内容和生成文件均保存在仓库，页面不依赖本机绝对路径。旧技术文章链接发布后进入 404 页面，可返回新书架。
