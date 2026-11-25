# Shinobi Legacy client-side source copy

For Fo: this archive contains the following files, with byte sizes and SHA-256 checksums:

| File | What it is | Bytes | SHA-256 |
|---|---|---:|---|
| `index.html` | Loading/maintenance shell that bootstraps the game | 10,657 | `002187c871e3582fda38df98ec35757b89fb34c153b9168c73afecdf790c6758` |
| `game.js` | Minified bundled client (version string `2026-11-09-v1.103b`) | 1,450,386 | `b5fe44c9ee1528605afa26f739676764049e9bb7cdf54f0d571b8b1bf2920813` |
| `styles.css` | Client styles | 136,543 | `0ed0ad711232f881d24e082dde2a9c6fbd05f924c1757f6a2295f9e41108e657` |
| `api-status.json` | Snapshot of the same-origin `/api/status` response | 216 | `57c4c1fd0c9f2001e02e23187526e34f04aa81f910c0e6dd8858e831b9b25881` |

`game.js` is a minified bundle, not the original authoring source. It is the actual client game logic (including the Beast/Rebirth/WebGL game), not just a loader.

The client calls remote backends and resources; this archive is not self-contained:
- Game API base: `https://shinobi-server.sites.tab.bot` (the test build selects `https://shinobi-testserver.sites.tab.bot`)
- Same-origin `/api/*` routes
- Models and intro assets: `https://shinobi-assets.sites.tab.bot/models/` and `https://shinobi-assets.sites.tab.bot/intro/`
- Audio: `https://shinobi-audio.sites.tab.bot/`

Server-side saves, assets, and audio are **not included** and would need a rebuild; this zip is a code copy, not a runnable standalone game.

Suggested next step: commit this archive's contents to `Trae5/shinobi-legacy` on branch `main` under a subfolder such as `game/`, so it does not disturb the existing landing site (`index.html` at the repository root).

Fetched read-only from the live Tab-hosted build; no owner/admin routes were used.
