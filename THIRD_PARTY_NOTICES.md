# Third-party notices

## T3 Code

This application is derived from the open-source T3 Code project at commit
`4ba4871af76081f0e830a91b8f747ff2de53ba7d`.

T3 Code is Copyright (c) 2026 T3 Tools Inc. and distributed under the MIT License reproduced in
the repository root.

The Herdr-specific application screen, transport, and domain integration replace the original
T3 environment runtime, while parts of the Expo/React Native foundation and supporting packages
remain derived from T3 Code.

## Herdr browser client

The `web/` client is adapted from the MIT-licensed Herdr Mobile Relay browser
application, Copyright (c) 2026 Altan Sarisin, at commit
`0195d7d959df5d7df163cf1e25c598aaab9720ef`. Its license is reproduced in
`web/LICENSE`; source provenance and local adaptations are in `web/UPSTREAM.md`.

## Native and vendored components

- `modules/t3-composer-editor` retains its MIT license.
- `modules/t3-markdown-text` retains its MIT license and documents its Bluesky-derived renderer in
  `modules/t3-markdown-text/UPSTREAM.md`.
- `modules/t3-terminal` includes Ghostty components and license information in
  `modules/t3-terminal/THIRD_PARTY_NOTICES.md` and its vendored license directories.

Herdr is an external runtime dependency and is not vendored in this repository. Consult the Herdr
project for its licensing terms.
