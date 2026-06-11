# Samuel Kirschner — Engineering Portfolio

A static portfolio website. No build step, no dependencies — just HTML, CSS, and a little vanilla JS.
All asset paths are **relative**, so the site works from any folder, subdirectory URL
(e.g. `sites.mit.edu/samkirschner`), or `file://` open.

## Structure

```
website/
├── index.html                    # Landing page (hero, projects, publications, contact)
├── projects/                     # One detail page per project, displayed newest first
│   ├── metamaterial-heart-pump.html        MIT 2.131 · 2026
│   ├── compartment-pressure-monitor.html   MIT 2.750 · 2026
│   ├── rc-car-dfm.html                     MIT 2.810 · 2025
│   ├── fish-exoskeleton.html               GT capstone · 2025
│   ├── exoskins.html                       GT · 2024–25
│   ├── elephant-skin-mechanics.html        GT · 2023
│   └── metal-additive-manufacturing.html   2021
└── assets/
    ├── css/style.css             # Design system — dark, Marcellus display type
    ├── fonts/Marcellus-Regular.ttf  # Self-hosted display font (@font-face)
    ├── js/main.js                # Scroll reveal + progress bar + lightbox
    ├── img/                      # Optimized project images
    └── Samuel_Kirschner_Resume.pdf
```

## Viewing locally

Any static server works. From this `website/` folder:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Deploying to sites.mit.edu (CampusPress / WordPress)

Target URL: `https://sites.mit.edu/samkirschner`. CampusPress is WordPress-based, so raw HTML
files can't be uploaded directly — the cleanest port:

1. **Media first.** Upload everything in `assets/img/` (plus the résumé PDF) through
   *Media Library → Add New*. WordPress gives each file a URL like
   `https://sites.mit.edu/samkirschner/files/2026/06/heart-hero.png`.
2. **CSS once.** Paste the contents of `assets/css/style.css` into
   *Appearance → Customize → Additional CSS*. Upload `Marcellus-Regular.ttf` to the Media Library
   and update the `@font-face` `src:` URL at the top of the CSS to that file's URL
   (or swap to the Google Fonts copy: `https://fonts.googleapis.com/css2?family=Marcellus`).
3. **Pages.** Create one WordPress page per HTML file. In the block editor, add a single
   **Custom HTML** block and paste everything between `<body>` and `</body>` (drop the
   `<script>` tag; see step 5). Set the page slug to match the file name
   (`metamaterial-heart-pump`, etc.) and make `index` the site's static front page
   (*Settings → Reading*).
4. **Fix links.** In the pasted HTML, replace relative links:
   `../assets/img/…` → the Media Library URLs, `projects/foo.html` → `/samkirschner/foo/`,
   `../index.html#projects` → `/samkirschner/#projects`. A find-and-replace in a text editor
   before pasting makes this a 2-minute job per page.
5. **JS.** CampusPress strips `<script>` in some plans. The site degrades gracefully without
   `main.js` (reveal animations and lightbox are progressive enhancements). If scripts are
   allowed (Custom HTML block usually permits them), paste the contents of `assets/js/main.js`
   inside a `<script>…</script>` at the bottom of the same Custom HTML block.
6. **Theme.** Pick the most minimal theme available and hide its header/footer if possible —
   the pages carry their own nav and footer.

### Alternative hosts (zero modification)

- **GitHub Pages** — push the contents of `website/` to a repo and enable Pages. Works
  unchanged thanks to relative paths.
- **Netlify / Vercel / Cloudflare Pages** — drag-and-drop the `website/` folder. No build step.

## Adding a project

1. Drop optimized images into `assets/img/` (≤ ~1600px wide; JPG for photos, PNG for diagrams).
2. Copy an existing file in `projects/` as a template and edit the content.
3. Add a new `<a class="card">` block to the projects grid in `index.html` in date position
   (newest first), and splice it into the prev/next links of its neighbors.

## Editing content

All copy lives directly in the HTML. The visual language (colors, fonts, spacing) is centralized
in `assets/css/style.css` under the `:root` CSS variables — change `--accent`, `--bg`, `--ink`,
etc. in one place to retheme the whole site. Display typography is Marcellus (self-hosted,
single 400 weight); body is Inter; annotations are IBM Plex Mono.
