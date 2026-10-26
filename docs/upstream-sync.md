# Developing Herdr Web and integrating upstream changes

This project retains the Herdr Mobile source in a fresh Git history. Its browser client is imported
from the separate Herdr Mobile Relay repository; provenance and the import revision
are recorded in [web/UPSTREAM.md](../web/UPSTREAM.md).

## Remotes

After cloning `https://github.com/user1007018/herdr-web.git`, add the two upstreams once:

```bash
git remote add upstream-mobile https://github.com/benkraus/herdr-mobile.git
git remote add upstream-relay https://github.com/benkraus/herdr-plugin-mobile-relay.git
git fetch upstream-mobile
git fetch upstream-relay
```

`origin` is the GitHub project. Fetching an upstream only downloads its history;
it does not change your working files or push anything to GitHub.

## Mobile upstream changes

Start with a clean checkout and create a review branch:

```bash
git switch main
git pull --ff-only origin main
git fetch upstream-mobile
git switch -c sync/mobile-update
git log --oneline upstream-mobile/main
# Review and port selected changes; the histories are independent.
git diff HEAD upstream-mobile/main -- src/ packages/
```

Apply selected changes while preserving the web scripts and
project-specific documentation. Updating native/shared source
files does not automatically implement equivalent browser UI features. Review
transport changes in `src/lib/transport.ts`, types in `src/lib/types.ts`, and
interaction behavior in `src/features/herdr` against the browser's `web/src` code.
Port relevant browser changes explicitly and verify them against the relay.

Run the checks below and push the review branch to GitHub:

```bash
npm --prefix web ci
npm run web:verify
npm run web:build
git push -u origin sync/mobile-update
```

Open a GitHub pull request targeting `main`. Use a new branch name for each later
update. Browser checks are described in the [README](../README.md).

## Relay browser upstream changes

The two upstream repositories have different histories. Review the relay's `web/`
changes separately instead of merging its whole repository into this project:

```bash
git fetch upstream-relay
git switch -c sync/relay-web-update
git diff 0195d7d959df5d7df163cf1e25c598aaab9720ef upstream-relay/main -- web/
```

The SHA above is the initial imported revision. For subsequent updates, use the
revision currently recorded in `web/UPSTREAM.md`. Port the selected changes while
preserving npm scripts, Herdr branding, local fixes, and browser integration.
Update the recorded revision when the import is verified, then submit a GitHub
pull request after the same checks.

The independently installed relay service has its own update lifecycle. Updating
the browser source does not update that service. Test browser/API compatibility
before deploying a browser update to your installation.
