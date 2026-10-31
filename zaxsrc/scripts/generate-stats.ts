import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const LOGIN = process.env.GITHUB_LOGIN || 'zaxxinfinity'
const OUT_PATH = process.env.STATS_OUT_PATH || 'assets/github-stats.svg'
const TOKEN = process.env.GITHUB_TOKEN || ''

interface User { public_repos: number; followers: number; following: number }
interface Repo { fork: boolean; stargazers_count: number; language: string | null }

async function request<T>(url: string): Promise<T> {
  const baseHeaders: Record<string, string> = {
    'User-Agent': 'zaxxinfinity-profile-stats',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }
  let lastError: unknown

  // Try the Actions token first, then retry anonymously for public profile data.
  for (const authenticated of (TOKEN ? [true, false] : [false])) {
    const headers = { ...baseHeaders }
    if (authenticated) headers.Authorization = `Bearer ${TOKEN}`

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) })
        if (!response.ok) {
          const detail = await response.text()
          throw new Error(`GitHub API ${response.status}: ${detail.slice(0, 180)}`)
        }
        return await response.json() as T
      } catch (error) {
        lastError = error
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, attempt * 1000))
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('GitHub API request failed')
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function main() {
  const user = await request<User>(`https://api.github.com/users/${encodeURIComponent(LOGIN)}`)
  const repos: Repo[] = []
  const pages = Math.max(1, Math.ceil(user.public_repos / 100))
  for (let page = 1; page <= pages; page++) {
    const chunk = await request<Repo[]>(`https://api.github.com/users/${encodeURIComponent(LOGIN)}/repos?per_page=100&page=${page}&type=owner&sort=updated`)
    repos.push(...chunk)
    if (chunk.length < 100) break
  }

  const stars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0)
  const langs = new Map<string, number>()
  for (const repo of repos) {
    if (!repo.fork && repo.language) langs.set(repo.language, (langs.get(repo.language) || 0) + 1)
  }
  const top = [...langs.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Not set'
  const stats = [
    ['PUBLIC REPOSITORIES', String(user.public_repos)],
    ['TOTAL STARS', String(stars)],
    ['FOLLOWERS', String(user.followers)],
    ['FOLLOWING', String(user.following)]
  ] as const
  const cards = stats.map(([label, value], i) => {
    const x = 18 + i * 235
    const delay = i * 0.15
    return `<g><rect x="${x}" y="18" width="218" height="104" rx="10" fill="#111b2d" stroke="#263653"/><rect x="${x}" y="18" width="218" height="2" rx="1" fill="#5dc9f2" opacity=".8"/><text x="${x+16}" y="49" class="label">${label}</text><text x="${x+16}" y="91" class="value"><tspan>${escapeXml(value)}</tspan><animate attributeName="opacity" values=".35;1;.8;1" dur="3.6s" begin="${delay}s" repeatCount="indefinite"/></text></g>`
  }).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="170" viewBox="0 0 960 170" role="img" aria-labelledby="t d"><title id="t">GitHub statistics for ${escapeXml(LOGIN)}</title><desc id="d">Public repositories, stars, followers, following and most-used language.</desc><style>text{font-family:'DejaVu Sans Mono',monospace}.label{font-size:11px;letter-spacing:1px;fill:#8a94b2}.value{font-size:30px;font-weight:700;fill:#e8edf8}@keyframes sweep{from{transform:translateX(-960px)}to{transform:translateX(960px)}}.sweep{animation:sweep 7s linear infinite}</style><rect width="960" height="170" rx="14" fill="#0b1120" stroke="#263653"/>${cards}<text x="20" y="151" font-size="11" fill="#8a94b2">TOP LANGUAGE</text><text x="150" y="151" font-size="12" font-weight="700" fill="#5dc9f2">${escapeXml(top)}</text><rect x="18" y="163" width="924" height="2" fill="#17243a"/><rect x="18" y="163" width="180" height="2" fill="#5dc9f2" class="sweep"/></svg>`
  mkdirSync(dirname(OUT_PATH), { recursive: true })
  writeFileSync(OUT_PATH, svg)
  console.log(`Generated ${OUT_PATH}: ${user.public_repos} repos, ${stars} stars, ${user.followers} followers, top language ${top}`)
}

main().catch(error => { console.error(error); process.exitCode = 1 })
