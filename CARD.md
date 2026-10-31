# Zaxxinfinity GitHub Profile

A compact terminal-style GitHub profile with a pixel-art runner card, a restrained developer dashboard, and GitHub statistics generated from the GitHub API.

## Setup

1. Keep this project in the public repository named `zaxxinfinity`.
2. Keep the folder structure unchanged when uploading.
3. In repository Settings → Actions → General → Workflow permissions, enable **Read and write permissions**.
4. The workflow uses the built-in `GITHUB_TOKEN` and refreshes the profile card and statistics daily. It can also be run manually from the Actions tab.

## Generate locally

```bash
npm install
GITHUB_LOGIN=zaxxinfinity GITHUB_TOKEN=your_token npm run generate
GITHUB_LOGIN=zaxxinfinity GITHUB_TOKEN=your_token npm run generate:stats
```

A token is recommended for higher GitHub API rate limits. Never commit a personal access token to this repository.

## Files

- `assets/profile.svg` — original pixel-art terminal/game profile card.
- `assets/dashboard.svg` — simple terminal-style developer dashboard.
- `assets/github-stats.svg` — generated GitHub statistics.
- `scripts/generate-card.ts` — generates the profile card.
- `scripts/generate-stats.ts` — fetches public GitHub account and repository statistics.
- `.github/workflows/generate-card.yml` — scheduled and manual update workflow.

## Personal details

Update `PROFILE_FIELDS` in `scripts/generate-card.ts` if your profile information changes. The portfolio address is `https://zynnshima.web.id`.
