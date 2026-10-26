# Herdr Web

Web version of the brilliant [Herdr Mobile](https://github.com/benkraus/herdr-mobile) that works on iPhone, Android, and desktop browsers.
Self-host it on your own infrastructure and use it in your browser.
No Mac or Apple Developer license needed. BEWARE - 100% AI Slop.

A browser app for monitoring and operating Herdr sessions from your phone, tablet,
or desktop. It connects to [Herdr Mobile Relay](https://github.com/benkraus/herdr-plugin-mobile-relay).
Herdr owns the terminal processes, so closing the browser leaves sessions running.

Features include workspace navigation with collapse/expand all, live terminal
output, replies, special keys, image attachments, session switching, and workspace
and pane creation and closing. Workspace closing and pane termination require
confirmation. On mobile, swipe left from the right edge to open the
workspace menu, and swipe right over the menu to close it. Vertical scrolling
remains available. The app renders bounded
terminal snapshots; native terminal rendering, file/Git browsing, and worktree
management are not included.

## Browser development

Use Node.js 24 and npm:

```bash
npm --prefix web ci
npm run web:dev
```

Open <http://127.0.0.1:5173/?demo=1> for sample data. Demo actions do not change
Herdr sessions. Live development uses `HERDR_CONTROL_DEV_TARGET`, defaulting to
`http://127.0.0.1:8787`; relay access checks still apply. Configure the relay to accept your development origin.

```bash
npm run web:verify
npm run web:build
```

For browser tests, run `npx playwright install chromium` and `npm run test:e2e`
from `web/`. Production browser assets are written to `web/dist/`.

## Self-hosting

Build with `npm run web:build` and serve `web/dist/` over HTTPS using your
preferred web server. Route `/api/` requests, including WebSocket upgrades,
to your relay on the same origin. Configure authentication and the relay's
allowed hosts and origins for your own installation. Keep credentials and
private keys outside the repository.

On iPhone, open the app in Safari and choose **Share → Add to Home Screen**.
Push notifications require relay configuration and browser permission.
Cached app files do not provide offline access to Herdr sessions.

## Further documentation

- [Upstream synchronization](docs/upstream-sync.md): integrating mobile and relay updates.
- [Browser source attribution](web/UPSTREAM.md) and [browser license](web/LICENSE).
- [Root license](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md).

The repository retains the original native source for upstream integration.
This distribution starts with a clean Git history. Expo, Xcode, and Android tooling are not required for the web build.
