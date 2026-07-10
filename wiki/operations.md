# Operations

One-time repository settings a maintainer with admin access must apply, and
a short guide to how deployments work day to day. The workflows themselves
live in `.github/workflows/` and need no configuration beyond this page —
the stack is key-free, so there are no secrets to set.

## One-time repository settings

Work through this checklist once, top to bottom:

1. **Actions** — Settings → Actions → General: allow GitHub Actions to run
   (read and write is not needed; each workflow declares its own
   permissions).
2. **Pages source** — Settings → Pages: set Source to **Deploy from a
   branch**, branch **gh-pages**, folder **/ (root)**. Both the main deploy
   and PR previews publish to this branch; do not switch to the "GitHub
   Actions" source.
3. **Custom domain** — Settings → Pages: set the custom domain to
   **munro.welbournesecurity.com** and tick **Enforce HTTPS** once the
   certificate is issued. Every build also ships a `CNAME` file (from
   `public/CNAME`) so the binding survives each deploy.
4. **Main ruleset** — Settings → Rules → Rulesets: create a ruleset for
   `main` that requires a pull request before merging and requires these
   status checks to pass: **checks**, **build**, **e2e** (from `ci.yml`)
   and **docs**. The real `docs` build (`docs.yml`) only runs when docs
   inputs change; on every other PR a same-named no-op job
   (`docs-skip.yml`) reports instead, so the required check never blocks a
   non-docs PR waiting for a status that will never arrive.
5. **Dependabot** — Settings → Advanced Security: enable Dependabot alerts
   (version updates are already configured in `.github/dependabot.yml`).

## How deployments work

- **Main deploy** (`deploy.yml`) — every push to `main` builds the app and
  publishes `dist/` to the root of the `gh-pages` branch, which GitHub
  Pages serves at <https://munro.welbournesecurity.com>. It excludes the
  `pr-preview/` directory from cleanup so open previews survive.
- **PR previews** (`pr-preview.yml`) — each pull request is built with a
  per-PR base path and deployed to `pr-preview/pr-<number>/` on `gh-pages`.
  A sticky comment on the PR links to the preview; closing the PR removes
  it. Fork PRs get no preview — that is a security feature, not a bug.
- **Manual re-runs** — `deploy.yml` has a `workflow_dispatch` trigger, so
  the site can be redeployed from the Actions tab without a new commit.
  Any failed run (deploy, preview, CI) can also be re-run from its run
  page.

## If the custom domain is ever dropped

The site would fall back to `https://welbournesecurity.github.io/Munro/`,
which is served from a `/Munro/` subpath rather than the domain root. To
revert:

1. Set `base: '/Munro/'` in `vite.config.ts`.
2. Change the `baseURL` and `webServer.url` in `playwright.config.ts` to
   `http://127.0.0.1:4173/Munro/`.
3. Delete `public/CNAME`.
4. Change the PR-preview build base in `pr-preview.yml` to
   `/Munro/pr-preview/pr-<number>/`.
5. Remove the custom domain from the Pages settings.
