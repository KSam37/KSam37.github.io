"""Generate WordPress-ready (CampusPress) export of the portfolio site.

Produces wordpress-export/ containing, per page, the inner-<body> HTML with all
relative links rewritten for https://sites.mit.edu/samkirschner, plus the CSS
for the Additional CSS panel. Paste each page file into a single Custom HTML
block in the WordPress block editor.

If the Media Library URL pattern differs from MEDIA_BASE (upload month, or a
different files path), change MEDIA_BASE below and re-run:

    python tools/build_wordpress_export.py
"""
import io
import os
import re
import glob

SITE_BASE = "/samkirschner"                      # WordPress site path
MEDIA_BASE = "/samkirschner/files/2026/06"       # Media Library upload path (year/month!)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "wordpress-export")
os.makedirs(OUT, exist_ok=True)

js = io.open(os.path.join(ROOT, "assets/js/main.js"), encoding="utf-8").read()

def rewrite(html, depth):
    """Rewrite relative URLs for WordPress. depth=0 for index, 1 for projects/*."""
    up = "../" if depth else ""
    # media: images + resume pdf + any asset file
    html = re.sub(r'(?:\.\./)?assets/img/([A-Za-z0-9_.-]+)', MEDIA_BASE + r'/\1', html)
    html = html.replace(up + "assets/Samuel_Kirschner_Resume.pdf",
                        MEDIA_BASE + "/Samuel_Kirschner_Resume.pdf")
    # internal pages
    html = re.sub(r'href="(?:\.\./)?index\.html(#[a-z]+)?"',
                  lambda m: f'href="{SITE_BASE}/{m.group(1) or ""}"', html)
    html = re.sub(r'href="(?:projects/)?([a-z0-9-]+)\.html"',
                  lambda m: f'href="{SITE_BASE}/{m.group(1)}/"', html)
    return html

pages = ["index.html"] + sorted(glob.glob(os.path.join(ROOT, "projects", "*.html")))
for path in pages:
    name = os.path.basename(path)
    depth = 0 if name == "index.html" else 1
    s = io.open(path, encoding="utf-8").read()
    body = re.search(r"<body>\n?(.*?)\n?</body>", s, re.S).group(1)
    # drop the external script tag; JS is inlined below instead
    body = re.sub(r'\s*<script src="[^"]*main\.js"></script>', "", body)
    body = rewrite(body, depth)
    title = re.search(r"<title>(.*?)</title>", s).group(1)
    out_name = ("home" if name == "index.html" else name.replace(".html", "")) + ".html"
    content = (f"<!-- Page: {title}\n     Slug: "
               + ("(front page)" if name == "index.html" else name.replace(".html", ""))
               + " -->\n" + body
               + "\n<script>\n" + js + "\n</script>\n")
    io.open(os.path.join(OUT, out_name), "w", encoding="utf-8", newline="\n").write(content)
    print("wrote", out_name)

# Additional CSS: font URL points at Media Library copy of Marcellus
css = io.open(os.path.join(ROOT, "assets/css/style.css"), encoding="utf-8").read()
css = css.replace("url('../fonts/Marcellus-Regular.ttf')",
                  f"url('{MEDIA_BASE}/Marcellus-Regular.ttf')")
io.open(os.path.join(OUT, "additional-css.css"), "w", encoding="utf-8", newline="\n").write(css)
print("wrote additional-css.css")
