# Profile Card

Animated terminal-style profile card with a 2D runner game scene. The card is one self-contained SVG
(`assets/profile.svg`) made with CSS and SMIL animation only, no JavaScript.

## Setup

1. Create a repository named exactly like your username (`zaxxinfinity/zaxxinfinity`).
2. Upload everything in this folder, keeping the structure.
3. Open `.github/workflows/generate-card.yml` and make sure `GITHUB_LOGIN` is your username.
4. In the repository settings, open Actions, General, Workflow permissions and select
   "Read and write permissions".
5. Push to `main`. The workflow regenerates `assets/profile.svg` and commits it back.
   It also runs every day at 00:00 UTC and can be started manually from the Actions tab.

The card embeds in README.md through `raw.githubusercontent.com`, not a `github.com/.../blob/...` link.

## Run locally

```bash
npm install
GITHUB_LOGIN=zaxxinfinity GITHUB_TOKEN=your_token npm run generate
```

Without `GITHUB_TOKEN` the GitHub API allows only 60 requests per hour, and stats fall back to `N/A`
when a request fails. `CARD_STATS_JSON` can supply stats manually:

```bash
CARD_STATS_JSON='{"repos":"2","stars":"0","followers":"0","following":"0","topLanguage":"HTML"}' npm run generate
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `GITHUB_LOGIN` | No | GitHub username used for stats (default `zaxxinfinity`) |
| `GITHUB_TOKEN` | Recommended | Raises the API rate limit |
| `OUT_PATH` | No | Output SVG path (default `assets/profile.svg`) |
| `CARD_STATS_JSON` | No | Skip the API and use these stats |

## Customize

Everything is a plain constant at the top of `scripts/generate-card.ts`.

| What to change | Constant |
|---|---|
| Info rows (label and value) | `PROFILE_FIELDS` |
| Commands typed in the prompt | `PROMPT_COMMANDS` |
| Typing and deleting speed | `PROMPT_TYPE_SPEED`, `PROMPT_DELETE_SPEED` |
| Window, header, text and swatch colors | `BG_COLOR`, `HEADER_COLOR`, `ACCENT`, `VALUE_COLOR`, `PALETTE` |
| Game loop length in seconds | `LOOP` |

The game scene is a looping runner: the hero jumps over a slime and spikes, collects coins, and the
coin counter in the top left follows the pickups. Jump timing is calculated from `LOOP`, `SPAWN_X`,
`TRAVEL` and `HERO_X`, so change them together if you edit the scene.

## Structure

```
.
├── README.md
├── CARD.md
├── package.json
├── tsconfig.json
├── assets/
│   └── profile.svg
├── scripts/
│   └── generate-card.ts
└── .github/
    └── workflows/
        └── generate-card.yml
```
