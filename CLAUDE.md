# Portfolio website: notes for Claude

Sam's personal portfolio and hiring page, live at https://ksam37.github.io
(repo `KSam37/KSam37.github.io`, branch `main`). Sam writes the content; Claude
builds, polishes, and publishes it. `README.md` is Sam's writing guide, so keep it
in sync with any change to the content format.

## Layout

- `site.yaml`: all home page content (hero, experience, education, skills, publications).
- `projects/<slug>/article.md` + images beside it. Folders starting with `_` are ignored
  (`_template/`, and `_unused/` inside a project).
- `files/`: copied verbatim to `/files/` (résumé PDF, headshot source).
- `engine/`: Node build. `build.mjs` (Markdown + images → `_site/`), `templates.mjs`
  (HTML), `assets/style.css`, `assets/main.js` (hero lattice, lightbox, filters, TOC),
  `dev.mjs` (live-reload server on :4000). Dependencies are marked, yaml, sharp.
- `_site/` is build output and gitignored. GitHub Actions (`.github/workflows/deploy.yml`)
  builds and deploys on every push to `main`. Pages source must be set to "GitHub Actions".

## Publishing ("publish", "push the site", "update the website")

1. `git status` / `git diff` to see what Sam changed.
2. Run `node engine/build.mjs` from the repo root and resolve every warning it prints
   (missing images, unused images, missing cover/summary). Ask Sam before deleting or
   moving any of his images; moving to `_unused/` is the safe default.
3. Preview the changed pages in the browser (`.claude/launch.json` → "portfolio").
   Check the desktop and mobile widths and the light and dark themes. Look at the images:
   captions must match what the image actually shows.
4. Proofread lightly: fix typos and broken Markdown, and flag factual doubts to Sam.
   Don't rewrite his voice unless he asks. Never invent results, numbers or affiliations.
5. Commit with a descriptive message and push to `main` once Sam confirms. Pushing
   publishes publicly.

## Conventions

- Image references are bare filenames relative to the article. Size modifiers go in
  the Markdown title slot: `"wide"`, `"full"`, `"small"`, `"nocaption"`, `"plate"`/`"noplate"`.
  Consecutive image lines in one paragraph form a justified row.
- Cover display mode is automatic: PNG gives a plate, a ≥1800px landscape photo bleeds,
  anything else is framed on a blurred backdrop. `cover_style` overrides it.
- Old URLs `projects/<slug>.html` redirect to `projects/<slug>/` automatically.
- Template or engine changes need the dev server restarted (modules are cached);
  content and CSS/JS changes hot-reload.
