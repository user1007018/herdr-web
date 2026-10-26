# Browser client provenance

The browser client is adapted from the `web/` directory of
[Herdr Mobile Relay](https://github.com/benkraus/herdr-plugin-mobile-relay)
at revision `0195d7d959df5d7df163cf1e25c598aaab9720ef`.
The MIT license is retained in [LICENSE](LICENSE).

Local adaptations use npm instead of Bun for a self-contained browser build,
remove the Bun-only TypeScript environment, and apply Herdr branding. The native app remains separate.

This client supports pane output, replies, special keys, image attachments,
spaces, agents, session switching, pane creation/termination, and push notification
setup. It uses bounded ANSI-rendered pane snapshots with live change notifications;
it is not the native Ghostty terminal and does not yet expose the native app's
file/Git browser or worktree management controls.
