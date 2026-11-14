# Portfolio website: notes for Claude

Sam's personal portfolio and hiring page, live at https://samkir.com
(repo `KSam37/KSam37.github.io`, branch `main`; custom domain set in the repo Pages settings, DNS at Cloudflare with proxy off; ksam37.github.io redirects there). Sam writes the content; Claude
builds, polishes, and publishes it. `README.md` is Sam's writing guide, so keep it
in sync with any change to the content format.

## Layout

- `home/*.md`: all home page wording, so Sam can edit it without help. `intro.md` (front matter: `eyebrow`,
  `credentials` as `long | short`, `description`; body: hero summary), `projects.md` (projects intro),
  `experience.md` and `publications.md` (`## [Name](url)` entries with `Label: value` lines), `contact.md`.
  Parsed by `loadHome()` in `build.mjs`, which maps them onto the same `site` fields the templates use; a
  missing file falls back to `site.yaml`. Keep the format notes at the top of each file current.
  Experience is on the home page because Sam re-added it; the résumé PDF doesn't cover everything.
- `site.yaml`: settings only (name, role, email, url, headshot, links, affiliations, `wip_notice`).
- `projects/<slug>/article.md` + images beside it. Folders starting with `_` are ignored
  (`_template/`, and `_unused/` inside a project).
- `files/`: copied verbatim to `/files/` (résumé PDF, headshot source).
- `engine/`: Node build. `build.mjs` (Markdown + images → `_site/`), `templates.mjs`
  (HTML), `assets/style.css`, `assets/main.js` (hero stress field, lightbox, TOC),
  `dev.mjs` (live-reload server on :4000). Dependencies are marked, yaml, sharp.
- `_site/` is build output and gitignored. GitHub Actions (`.github/workflows/deploy.yml`)
  builds and deploys on every push to `main`. Pages source must be set to "GitHub Actions".

## Publishing ("publish", "push the site", "update the website")

1. `git status` / `git diff` to see what Sam changed.
2. Run `node engine/build.mjs` from the repo root and resolve every warning it prints
   (missing images, unused images, missing cover/summary). Ask Sam before deleting or
   moving any of his images; moving to `_unused/` is the safe default.
3. Preview the changed pages in the browser (`.claude/launch.json` → "portfolio").
   Check the desktop and mobile widths (the site is dark-only). Look at the images:
   captions must match what the image actually shows.
4. Proofread lightly: fix typos and broken Markdown, and flag factual doubts to Sam.
   Don't rewrite his voice unless he asks. Never invent results, numbers or affiliations.
5. Commit with a descriptive message and push to `main` once Sam confirms. Pushing
   publishes publicly.

## Conventions

- Image references are bare filenames relative to the article. Size modifiers go in
  the Markdown title slot: `"wide"`, `"full"`, `"small"`, `"nocaption"`, `"plate"`/`"noplate"`.
  Consecutive image lines in one paragraph form a justified row.
- Cover display mode is automatic: white-background PNG gives a plate, transparent/dark
  PNG is `bare`, a ≥1800px landscape photo bleeds, anything else is framed on a blurred
  backdrop. `cover_style` overrides it. Figures never display wider than their source.
- Dark backgrounds where it's natural: product photos shot on plain white can be cut out
  with `node engine/darken.mjs cutout <file>` (check the result visually; originals go to
  `_unused/originals/`). Plots, diagrams and labeled assemblies keep their original white
  backgrounds on a plate. Sam rejected inverting them; don't use `invert` unless asked.
- Diagrams drawn for the site: keep the SVG source in the project's `_src/` folder and render it with
  `node engine/svg2png.mjs <in.svg> <out.png>` (the build only reads raster images). Fonts available to the
  renderer: Marcellus, Segoe UI, Consolas.
  Add `--light` to render the light version and save it as `name.print.png` beside `name.png`; the PDF
  export uses it in place of the dark one. Block titles in diagrams are Title Case (Sam's preference).
- PDF of a project page: `powershell -File engine/pdf.ps1 <slug> "Name.pdf"` prints it with the light
  `@media print` layout in `style.css` and saves it in the project folder.
- Old URLs `projects/<slug>.html` redirect to `projects/<slug>/` automatically.
- Template or engine changes need the dev server restarted (modules are cached);
  content and CSS/JS changes hot-reload.

## Design direction (from Sam)

Dark theme only, smooth and restrained. Sam asked for a more ambitious home page (November 2026), then
pulled back everything that read as a gimmick. The theme is a compliant structure under load: `main.js`
draws a triangular lattice of point masses behind the hero and the contact section. It is damped enough
not to ring, pressed by one slowly drifting load and one that tracks the cursor, and members warm toward
the accent only near a load. Touch devices get a single settled frame.

Home page: an "Engineering Portfolio" label (`eyebrow` in `home/intro.md`) above the name on one line,
the three titles stacked under it, the summary, the portrait, and the affiliation logos. Then Projects
(a short `projects_intro`, bordered panels, the first one wide), Experience (a rail that fills on scroll,
dates under the location on the right), Publications and Contact.

Sam rejected, so do not bring back: a moving band of tags (buzzwords), a live readout of lattice numbers
(meaningless data), random pulses or fast motion in the background, a glow that follows the cursor, any
image or card that moves on hover, a Capabilities/skills section (belongs on a résumé), corner marks or a
caption around the portrait, buttons in the hero that repeat the nav (Projects, Résumé), headline metric
numbers on project panels or at the top of articles (`metrics:` in front matter is no longer shown), read
time and figure counts, "in progress" labels or badges on project panels, a scroll progress bar on the
home page, tag filters, and status lines.

Project pages: modest title, short lede, one subtle meta line (org · period · links); no spec table, no
next-project card. Section headings are plain and descriptive ("Validation", "Next steps"), never
self-narrating ("Where it stands", "Why it matters").
Type: Marcellus (single weight) for the name and headings/titles, Geist for body and small text, Geist
Mono for labels. `--ink-3` is tuned to pass contrast for small labels.
Reveal animations use the `translate` property. The intro is triggered by a timer, not an animation
frame, so it still runs when the tab loads in the background.

`projects/ai-in-the-loop/` was published on 13 November 2026. Its PDF is not committed; regenerate it with
`engine/pdf.ps1` after Sam edits the article (the name can't contain a colon, so use " - " in place of ": ").
