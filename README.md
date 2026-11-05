# Portfolio Website: how to write for it

This folder is the source for **https://ksam37.github.io**. You write articles in
plain text and drop images beside them; the build turns that into the site.

```
Portfolio Website/
├── site.yaml              ← home page: name, one-line summary, links, publications
├── files/                 ← résumé PDF and headshot (linked from the site as-is)
├── projects/
│   ├── exoskins/          ← one folder per project; the folder name is the web address
│   │   ├── article.md     ← the article
│   │   ├── rig-red-exoskin.jpg
│   │   ├── …              ← images used in the article
│   │   └── _unused/       ← anything you want to keep but not publish
│   └── _template/         ← copy this to start a new project
├── Preview.cmd            ← double-click to preview locally
└── engine/                ← the code that builds the site (you shouldn't need to touch it)
```

## Preview while you write

Double-click **Preview.cmd**. A browser opens at http://localhost:4000 and refreshes
every time you save an article, image, or `site.yaml`. The console window lists
problems, such as a missing image or an image in the folder that the article never uses.

Requires Node.js (already installed). The first run takes a minute to install.

## Writing an article

Each `article.md` has two parts: a **front matter** block between `---` lines, then the
article in Markdown.

```markdown
---
title: ExoSkins, Programmable Knitted Orthoses
summary: One or two sentences for the home page card and the top of the article.
date: 2025-01                # sorts the home page, newest first
org: Georgia Tech
period: 2024 — 2025
role: Undergraduate researcher, co-first author   # role/team/tools: notes only, not shown
team: PoWeR Lab & Geometry of Materials Lab
tools: [Custom torque rig, MATLAB]
tags: [Wearables, Mechanics]  # shown on the home page card
cover: rig-red-exoskin.jpg     # card image + big image at the top
metrics:
  - value: "8"
    label: Garments characterized
links:
  - label: Paper (arXiv)
    url: https://arxiv.org/abs/2509.22971
---

## The idea

Text here. **Bold**, *italic*, [links](https://example.com), lists with "- ".
```

- Each `## Heading` becomes a numbered section and an entry in the side menu.
- Use `###` for sub-headings inside a section.
- A line starting with `>` becomes a highlighted callout. Save it for one key sentence.
- `<!-- notes like this -->` are notes to yourself. They never appear on the site.
- Add `draft: true` to the front matter to keep an article off the live site; it still
  shows in Preview.

### Optional front matter

| Field | What it does |
|---|---|
| `cover_position: 50% 30%` | Which part of the cover stays in frame when it's cropped (x% y%) |
| `cover_caption: …` | Caption under the big top image |
| `cover_style: bleed` | Force the top image to `bleed` (full width), `framed` (whole photo on a blurred backdrop), `plate` (on a white sheet) or `bare` (straight on the dark page). Normally chosen automatically. |
| `lede: …` | A longer intro for the article page, if it should differ from `summary` |
| `order: 1` | Pin a project to the top of the home page (higher numbers first) |
| `hide_cover: true` | Don't repeat the cover at the top of the article |

## Images

Put images in the project's folder and reference them by filename. The text in the
brackets is the caption.

```markdown
![Torque-angle curves for every garment.](torque-angle-results.png)
```

**Side by side:** put images on back-to-back lines with no blank line between them.
They're scaled to the same height automatically. Two or three per row works best.

```markdown
![Knitted sleeves.](exoskin-pair.jpg)
![A commercial brace.](commercial-brace.png)
```

**Sizes:** add a word in quotes after the filename.

| | |
|---|---|
| *(nothing)* | Text-column width |
| `"wide"` | Wider than the text. Good for diagrams, plots, and panoramic photos |
| `"full"` | Edge to edge across the whole screen |
| `"small"` | Narrow and centered. Good for small or low-resolution images |
| `"nocaption"` | Hide the caption (it's still used as alt text) |

```markdown
![System diagram.](system-diagram.png "wide")
```

**Tips**

- Name files for what they show (`rig-red-exoskin.jpg`, not `IMG_4021.jpg`).
- Export photos as JPG, diagrams and plots as PNG. The site is dark, so dark or
  transparent backgrounds blend best. A PNG with a white background gets a light "plate"
  behind it automatically; a transparent or dark PNG sits straight on the page.
- Plots and diagrams are fine on white. A product photo on a plain white backdrop can be
  cut out so it floats on the dark page: `node engine/darken.mjs cutout path/to/photo.png`
  (the original is kept in `_unused/originals/`).
- Don't resize anything. The build makes web-sized copies automatically. Bigger
  originals look sharper, and a cover should ideally be landscape and 2000 px or wider.
- iPhone HEIC photos aren't supported. Export as JPG.
- Short videos (`.mp4`) work like images and autoplay silently on loop. GIFs work too.
- Every image in the folder should appear in the article. Park extras in `_unused/`.

## The home page

Everything except the project cards comes from `site.yaml`: your name, the one-line
summary under it, the affiliations row (MIT · Georgia Tech · NASA; add `logo:` with a
white SVG/PNG in `files/logos/` to swap a name for its logo), contact links, and publications. Experience and skills live in the
résumé PDF (`files/Samuel_Kirschner_Resume.pdf`); replace that file to update it. Keep the two-space
indentation, and put text containing a colon in quotes.

## Publishing

When you're happy with the preview, ask Claude to publish (the steps are in
`CLAUDE.md`). Claude reviews and builds the site, then pushes to GitHub.
GitHub rebuilds and deploys it in about a minute.
