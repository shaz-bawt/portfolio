# Chris Cleary — Portfolio

A small, dependency-free portfolio site with an RPG "quest log" theme. Pure
HTML, CSS, and vanilla JavaScript — no build step, no framework, no bundler.

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Home — intro, character/stat card, featured roles |
| `about.html` | About — bio, skills "inventory", career timeline |
| `work.html` | Work — full role history as case studies |
| `contact.html` | Contact — LinkedIn + location |

Shared assets: `style.css` (design system) and `app.js` (starfield, scroll
reveals, animated stat bars).

## Running locally

It's static, so just open `index.html` in a browser. For a closer match to
production (correct relative paths), serve the folder:

```bash
# Python 3
python3 -m http.server 8000
# then visit http://localhost:8000
```

The display fonts load from Google Fonts over the network, so view it online
(or while connected) to see the intended typography.

## Deploying to GitHub Pages

1. Create a repository and push these files to the **root** of the default
   branch (the site expects `index.html` at the repo root).

   ```bash
   git init
   git add .
   git commit -m "Initial portfolio site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo>.git
   git push -u origin main
   ```

2. In the repo on GitHub: **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*,
   choose branch **main** and folder **/ (root)**, then **Save**.
4. Wait ~1 minute. Your site will be live at
   `https://<your-username>.github.io/<repo>/`.

### Notes

- `.nojekyll` is included so GitHub Pages serves the files as-is rather than
  running them through Jekyll.
- All links between pages are **relative** (e.g. `work.html`), so the site
  works whether it's served from a user/org root or a project subpath.
- To use a custom domain, add a `CNAME` file containing your domain and
  configure DNS per GitHub's custom-domain docs.

## Editing

Content lives directly in the HTML. Colors, fonts, and spacing are CSS
variables at the top of `style.css` (`:root { ... }`) — change them there to
re-theme the whole site at once.
