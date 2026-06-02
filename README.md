# Chris Cleary Portfolio

A modern, dependency-free portfolio site with a console-UI gaming aesthetic
(think contemporary game launchers: frosted glass, deep gradients, smooth
motion). Pure HTML, CSS, and vanilla JavaScript, with no build step or framework.

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Home: narrative hook, philosophy, featured work |
| `about.html` | About: first-person career narrative and timeline |
| `work.html` | Work: each role as problem, bet, and what shipped |
| `contact.html` | Contact: LinkedIn and location (no private contact info) |

Shared assets: `style.css` (design system) and `app.js` (scroll reveals,
animated stat tracks, active-nav highlighting).

## Running locally

Static site. Open `index.html` in a browser, or serve the folder for
correct relative paths:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

Fonts (Sora, Space Grotesk, JetBrains Mono) load from Google Fonts, so view
it while connected to see the intended typography.

## Deploying to GitHub Pages

1. Push these files to the **root** of your default branch:

   ```bash
   git init
   git add .
   git commit -m "Portfolio site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo>.git
   git push -u origin main
   ```

2. On GitHub: **Settings -> Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*,
   choose **main** / **/ (root)**, then **Save**.
4. Live in ~1 minute at `https://<your-username>.github.io/<repo>/`.

### Notes

- `.nojekyll` is included so Pages serves files as-is.
- All internal links are **relative**, so it works at a user root or a
  project subpath.
- No email or phone number appears anywhere in the site by design. Contact
  routes through LinkedIn.

## Editing

Content lives in the HTML. The whole theme is driven by CSS variables at the
top of `style.css` (`:root { ... }`). Change `--accent`, fonts, or spacing
there to re-skin the entire site at once.
