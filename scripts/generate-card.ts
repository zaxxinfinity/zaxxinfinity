import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

interface Stats {
  repos: string
  stars: string
  followers: string
  following: string
  topLanguage: string
}

interface UserResponse {
  public_repos: number
  followers: number
  following: number
}

interface RepoResponse {
  fork: boolean
  stargazers_count: number
  language: string | null
}

interface TypingEvent {
  time: number
  command: number
  chars: number
}

const LOGIN = process.env.GITHUB_LOGIN || 'zaxxinfinity'
const TOKEN = process.env.GITHUB_TOKEN || ''
const OUT_PATH = process.env.OUT_PATH || 'assets/profile.svg'
const STATS_JSON = process.env.CARD_STATS_JSON || ''

const HANDLE = 'zynn'
const HOST = 'github'

const PROFILE_FIELDS: [string, string][] = [
  ['Role', 'Web Developer'],
  ['Focus', 'Automation, Bots, Media Editing'],
  ['Location', 'Japan'],
  ['Stack.Lang', 'TypeScript, JavaScript, HTML/CSS'],
  ['Stack.Bot', 'Node.js, Baileys, PostgreSQL'],
  ['Stack.Ops', 'Linux VPS, PM2, Vercel'],
  ['Contact.GitHub', `github.com/${LOGIN}`],
  ['Contact.Web', 'zynnshimaa.vercel.app']
]

const PROMPT_COMMANDS = ['web developer', 'automation developer', 'bot developer']

const BG_COLOR = '#0b1120'
const TITLEBAR_COLOR = '#141c30'
const ACCENT = '#5dc9f2'
const HEADER_COLOR = '#e8384f'
const LABEL_COLOR = '#ffffff'
const VALUE_COLOR = '#5dc9f2'
const MUTED = '#8a94b2'
const PALETTE = ['#0b1120', '#e8384f', '#3ddc84', '#ffd166', '#4d8cff', '#b16cff', '#39e0d0', '#e8e8e8']

const PROMPT_TYPE_SPEED = 0.08
const PROMPT_DELETE_SPEED = 0.045
const PROMPT_HOLD_TIME = 1.1
const PROMPT_GAP_TIME = 0.4

const WIDTH = 960
const HEIGHT = 462
const FONT = "'DejaVu Sans Mono','Menlo','Consolas','Courier New',monospace"
const CHAR_W = 7.8

const SCENE_X = 24
const SCENE_Y = 56
const SCENE_W = 420
const SCENE_H = 300
const GROUND = 250
const HERO_X = 90
const LOOP = 8
const SPAWN_X = 440
const TRAVEL = 500
const SPEED = TRAVEL / LOOP
const TILE = 40
const TEXT_X = 472
const VALUE_X = TEXT_X + 128
const LINE_H = 17.5

const COIN_OFFSETS = [-22, 0, 22]
const COIN_Y = GROUND - 66

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function passTime(offset: number): number {
  return (SPAWN_X + offset - HERO_X) / TRAVEL
}

function pixelRects(rows: string[], palette: Record<string, string>, px: number, ox: number, oy: number): string {
  const out: string[] = []

  rows.forEach((row, y) => {
    let x = 0

    while (x < row.length) {
      const ch = row[x]

      if (ch === '.' || !palette[ch]) {
        x++
        continue
      }

      let end = x

      while (end + 1 < row.length && row[end + 1] === ch) end++

      out.push(
        `<rect x="${ox + x * px}" y="${oy + y * px}" width="${(end - x + 1) * px}" height="${px}" fill="${palette[ch]}"/>`
      )

      x = end + 1
    }
  })

  return out.join('')
}

async function api<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    'User-Agent': 'profile-card-generator',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }

  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`

  const res = await fetch(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(15_000) })

  if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`)

  return (await res.json()) as T
}

async function loadStats(): Promise<Stats> {
  const fallback: Stats = { repos: 'N/A', stars: 'N/A', followers: 'N/A', following: 'N/A', topLanguage: 'N/A' }

  if (STATS_JSON) {
    try {
      return { ...fallback, ...(JSON.parse(STATS_JSON) as Partial<Stats>) }
    } catch {
      return fallback
    }
  }

  try {
    const user = await api<UserResponse>(`/users/${encodeURIComponent(LOGIN)}`)
    const pages = Math.min(5, Math.max(1, Math.ceil(user.public_repos / 100)))
    const repos: RepoResponse[] = []

    for (let page = 1; page <= pages; page++) {
      const chunk = await api<RepoResponse[]>(
        `/users/${encodeURIComponent(LOGIN)}/repos?per_page=100&page=${page}&type=owner`
      )
      repos.push(...chunk)
      if (chunk.length < 100) break
    }

    const languages = new Map<string, number>()
    let stars = 0

    for (const repo of repos) {
      stars += repo.stargazers_count || 0
      if (!repo.fork && repo.language) languages.set(repo.language, (languages.get(repo.language) || 0) + 1)
    }

    const top = [...languages.entries()].sort((a, b) => b[1] - a[1])[0]

    return {
      repos: String(user.public_repos),
      stars: String(stars),
      followers: String(user.followers),
      following: String(user.following),
      topLanguage: top ? top[0] : 'N/A'
    }
  } catch (err) {
    console.error('Gagal mengambil statistik GitHub:', err instanceof Error ? err.message : err)
    return fallback
  }
}

function seeded(seed: number): () => number {
  let state = seed

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function mountainLayer(color: string, heights: [number, number][], seconds: number, id: string): string {
  const tile = (offset: number): string => {
    const points = heights.map(([x, h]) => `${x + offset},${GROUND - h}`).join(' L')
    return `<path d="M${offset},${GROUND} L${points} L${offset + SCENE_W},${GROUND} Z" fill="${color}"/>`
  }

  return `<g class="${id}" style="animation-duration:${seconds}s">${tile(0)}${tile(SCENE_W)}</g>`
}

function cloud(x: number, y: number, delay: number, seconds: number): string {
  const art = pixelRects(['..WWWW....', '.WWWWWWW..', 'WWWWWWWWWW'], { W: '#2b3a6b' }, 4, 0, 0)

  return `<g class="cloud" style="animation-duration:${seconds}s;animation-delay:${delay}s"><g transform="translate(${x},${y})">${art}</g></g>`
}

function heroSprite(): string {
  const palette: Record<string, string> = {
    H: '#b16cff',
    S: '#f2c9a0',
    K: '#0b1120',
    B: '#5dc9f2',
    P: '#4d8cff',
    O: '#e8384f'
  }

  const body = [
    '...HHHH...',
    '..HHHHHH..',
    '..HSSSSH..',
    '..SKSSKS..',
    '...SSSS...',
    '..BBBBBB..',
    '.SBBBBBBS.',
    '..BBBBBB..',
    '..PPPPPP..'
  ]

  const legsA = ['..PP..PP..', '..PP..PP..', '.OOO..OOO.']
  const legsB = ['...PPPP...', '...PPPP...', '...OOOO...']

  return [
    '<g class="hero-jump">',
    `<g transform="translate(${HERO_X - 15},${GROUND - 36})">`,
    pixelRects(body, palette, 3, 0, 0),
    `<g class="legs-a">${pixelRects(legsA, palette, 3, 0, 27)}</g>`,
    `<g class="legs-b">${pixelRects(legsB, palette, 3, 0, 27)}</g>`,
    '</g></g>'
  ].join('')
}

function slimeSprite(): string {
  const palette: Record<string, string> = { g: '#3ddc84', K: '#0b1120', d: '#1f9d57' }
  const rows = ['..gggg..', '.gggggg.', 'gKggggKg', 'gggggggg', 'gggggggg', 'dddddddd']

  return `<g transform="translate(${SPAWN_X - 12},${GROUND - 18})"><g class="slime">${pixelRects(rows, palette, 3, 0, 0)}</g></g>`
}

function spikeSprite(): string {
  const spikes = [-15, -5, 5]
    .map(
      (x) =>
        `<polygon points="${SPAWN_X + x},${GROUND} ${SPAWN_X + x + 5},${GROUND - 22} ${SPAWN_X + x + 10},${GROUND}" fill="#e8384f"/>`
    )
    .join('')

  return `<g>${spikes}<rect x="${SPAWN_X - 15}" y="${GROUND - 3}" width="30" height="3" fill="#a3263a"/></g>`
}

function coinGroup(offset: number, index: number, delay: number): string {
  const x = SPAWN_X + offset
  const y = COIN_Y - (index === 1 ? 8 : 0)

  return `<g class="pick pk${index}" style="animation-delay:${delay}s"><g transform="translate(${x},${y})"><g class="spin"><circle r="6" fill="#ffd166" stroke="#f4a300" stroke-width="1.5"/><rect x="-1" y="-3.5" width="2" height="7" fill="#f4a300"/></g></g></g>`
}

function obstacleGroup(kind: 'slime' | 'spike', delay: number): string {
  const art = kind === 'slime' ? slimeSprite() : spikeSprite()
  const coins = COIN_OFFSETS.map((offset, index) => coinGroup(offset, index, delay)).join('')

  return `<g class="mv" style="animation-delay:${delay}s">${art}</g><g class="mv" style="animation-delay:${delay}s">${coins}</g>`
}

function counterParts(): { css: string; texts: string; count: number } {
  const passes = COIN_OFFSETS.map(passTime).sort((a, b) => a - b)
  const all = [...passes.map((t) => t - 0.5), ...passes].sort((a, b) => a - b)
  const bounds = [0, ...all, 1]
  const css: string[] = []
  const texts: string[] = []

  for (let i = 0; i <= all.length; i++) {
    const start = bounds[i]
    const end = bounds[i + 1]
    const label = String(i).padStart(2, '0')

    if (i === 0) {
      css.push(`@keyframes cn${i}{0%{opacity:1}${pct(end)}{opacity:0}100%{opacity:0}}`)
    } else {
      css.push(`@keyframes cn${i}{0%{opacity:0}${pct(start)}{opacity:1}${pct(end)}{opacity:0}100%{opacity:0}}`)
    }

    css.push(`.cn${i}{animation-name:cn${i}}`)
    texts.push(`<text class="cn" x="46" y="31" font-size="15" font-weight="bold" fill="#ffd166">x ${label}</text>`.replace('class="cn"', `class="cn cn${i}"`))
  }

  return { css: css.join(''), texts: texts.join(''), count: all.length + 1 }
}

function pickCss(): string {
  return COIN_OFFSETS.map((offset, index) => {
    const t = passTime(offset)

    return `@keyframes pk${index}{0%{opacity:1;transform:scale(1)}${pct(t - 0.01)}{opacity:1;transform:scale(1)}${pct(t + 0.02)}{opacity:0;transform:scale(1.9)}100%{opacity:0;transform:scale(1)}}.pk${index}{animation:pk${index} ${LOOP}s linear infinite}`
  }).join('')
}

function gameScene(counterTexts: string): string {
  const rand = seeded(7)
  const stars: string[] = []

  for (let i = 0; i < 28; i++) {
    const x = Math.floor(rand() * (SCENE_W - 8)) + 4
    const y = Math.floor(rand() * 130) + 14
    const size = rand() > 0.8 ? 3 : 2

    stars.push(
      `<rect class="tw" x="${x}" y="${y}" width="${size}" height="${size}" fill="#e8e8e8" style="animation-delay:${(rand() * 3).toFixed(2)}s"/>`
    )
  }

  const farPeaks: [number, number][] = [[0, 0], [50, 60], [95, 30], [150, 92], [210, 40], [260, 76], [330, 34], [380, 64], [420, 0]]
  const nearPeaks: [number, number][] = [[0, 0], [40, 28], [100, 56], [160, 22], [230, 50], [290, 26], [350, 58], [420, 0]]

  const tiles: string[] = []

  for (let i = 0; i < Math.ceil(SCENE_W / TILE) + 2; i++) {
    tiles.push(`<rect x="${i * TILE + 8}" y="${GROUND + 14}" width="16" height="4" fill="#1d2b57"/>`)
    tiles.push(`<rect x="${i * TILE + 26}" y="${GROUND + 30}" width="10" height="4" fill="#1d2b57"/>`)
    tiles.push(`<rect x="${i * TILE}" y="${GROUND + 5}" width="3" height="4" fill="#2f9e5f"/>`)
  }

  const heart = ['.RR.RR.', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...']

  const hearts = [0, 1, 2]
    .map((i) => `<g transform="translate(${SCENE_W - 34 - i * 26},14)">${pixelRects(heart, { R: '#e8384f' }, 3, 0, 0)}</g>`)
    .join('')

  return [
    `<g transform="translate(${SCENE_X},${SCENE_Y})" clip-path="url(#sceneClip)">`,
    `<rect width="${SCENE_W}" height="${SCENE_H}" fill="url(#sky)"/>`,
    stars.join(''),
    '<circle cx="352" cy="62" r="15" fill="#e8e8e8"/><circle cx="347" cy="58" r="3" fill="#c7cbd8"/><circle cx="357" cy="68" r="2" fill="#c7cbd8"/>',
    cloud(60, 72, 0, 70),
    cloud(260, 104, -35, 90),
    mountainLayer('#1d2b57', farPeaks, 48, 'ml-far'),
    mountainLayer('#142046', nearPeaks, 24, 'ml-near'),
    `<rect y="${GROUND}" width="${SCENE_W}" height="${SCENE_H - GROUND}" fill="#0f162b"/>`,
    `<g class="ground">${tiles.join('')}</g>`,
    `<rect y="${GROUND}" width="${SCENE_W}" height="3" fill="#3ddc84"/>`,
    obstacleGroup('slime', 0),
    obstacleGroup('spike', -LOOP / 2),
    `<ellipse class="shadow" cx="${HERO_X}" cy="${GROUND + 3}" rx="14" ry="3" fill="#000" opacity=".35"/>`,
    heroSprite(),
    '<g transform="translate(16,16)"><circle cx="8" cy="8" r="7" fill="#ffd166" stroke="#f4a300" stroke-width="1.5"/><rect x="7" y="4" width="2" height="8" fill="#f4a300"/></g>',
    counterTexts,
    hearts,
    `<text x="${SCENE_W / 2}" y="30" text-anchor="middle" font-size="11" fill="${MUTED}" letter-spacing="2">STAGE 1-1</text>`,
    `<rect width="${SCENE_W}" height="${SCENE_H}" fill="url(#scan)"/>`,
    '</g>',
    `<rect x="${SCENE_X}" y="${SCENE_Y}" width="${SCENE_W}" height="${SCENE_H}" rx="6" fill="none" stroke="${ACCENT}" stroke-width="2"/>`
  ].join('')
}

function infoPanel(stats: Stats): string {
  const lines: string[] = []
  let y = SCENE_Y + 20

  const next = (): number => {
    const current = y
    y += LINE_H
    return current
  }

  lines.push(`<text x="${TEXT_X}" y="${next()}" font-size="14" font-weight="bold" fill="${HEADER_COLOR}">${HANDLE}@${HOST}</text>`)
  lines.push(`<text x="${TEXT_X}" y="${next()}" font-size="13" fill="${ACCENT}">${'-'.repeat(HANDLE.length + HOST.length + 1)}</text>`)

  const row = (label: string, value: string): void => {
    const line = next()

    lines.push(`<text x="${TEXT_X}" y="${line}" font-size="13" font-weight="bold" fill="${LABEL_COLOR}">${esc(label)}:</text>`)
    lines.push(`<text x="${VALUE_X}" y="${line}" font-size="13" fill="${VALUE_COLOR}">${esc(value)}</text>`)
  }

  for (const [label, value] of PROFILE_FIELDS) row(label, value)

  next()

  row('Repos', stats.repos)
  row('Stars', stats.stars)
  row('Followers', stats.followers)
  row('Following', stats.following)
  row('Top.Lang', stats.topLanguage)

  return lines.join('')
}

function buildTyping(): { events: TypingEvent[]; total: number } {
  const events: TypingEvent[] = [{ time: 0, command: 0, chars: 0 }]
  let t = 0

  PROMPT_COMMANDS.forEach((command, index) => {
    for (let c = 1; c <= command.length; c++) {
      t += PROMPT_TYPE_SPEED
      events.push({ time: t, command: index, chars: c })
    }

    t += PROMPT_HOLD_TIME

    for (let c = command.length - 1; c >= 0; c--) {
      t += PROMPT_DELETE_SPEED
      events.push({ time: t, command: index, chars: c })
    }

    t += PROMPT_GAP_TIME
  })

  return { events, total: t }
}

function promptLine(): string {
  const y = SCENE_Y + SCENE_H + 50
  const prefixLength = `${HANDLE}@${HOST}:~$ `.length
  const startX = SCENE_X + prefixLength * CHAR_W
  const { events, total } = buildTyping()
  const keyTimes = events.map((e) => (e.time / total).toFixed(5)).join(';')
  const dur = `${total.toFixed(2)}s`
  const defs: string[] = []
  const texts: string[] = []

  PROMPT_COMMANDS.forEach((command, index) => {
    const widths = events.map((e) => (e.command === index ? (e.chars * CHAR_W).toFixed(2) : '0')).join(';')

    defs.push(
      `<clipPath id="type${index}"><rect x="${startX.toFixed(2)}" y="${y - 14}" width="0" height="20"><animate attributeName="width" values="${widths}" keyTimes="${keyTimes}" calcMode="discrete" dur="${dur}" repeatCount="indefinite"/></rect></clipPath>`
    )

    texts.push(
      `<text x="${startX.toFixed(2)}" y="${y}" font-size="13" fill="#ffffff" textLength="${(command.length * CHAR_W).toFixed(2)}" lengthAdjust="spacing" clip-path="url(#type${index})">${esc(command)}</text>`
    )
  })

  const cursorX = events.map((e) => (startX + e.chars * CHAR_W).toFixed(2)).join(';')

  const cursor = `<rect x="${startX.toFixed(2)}" y="${y - 12}" width="7" height="15" fill="${ACCENT}"><animate attributeName="x" values="${cursorX}" keyTimes="${keyTimes}" calcMode="discrete" dur="${dur}" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" keyTimes="0;0.5" calcMode="discrete" dur="1s" repeatCount="indefinite"/></rect>`

  return [
    `<defs>${defs.join('')}</defs>`,
    `<text x="${SCENE_X}" y="${y}" font-size="13" font-weight="bold" fill="${HEADER_COLOR}">${HANDLE}@${HOST}</text>`,
    `<text x="${(SCENE_X + (HANDLE.length + HOST.length + 1) * CHAR_W).toFixed(2)}" y="${y}" font-size="13" fill="${MUTED}">:~$</text>`,
    texts.join(''),
    cursor
  ].join('')
}

function swatches(): string {
  const y = SCENE_Y + SCENE_H + 70

  return PALETTE.map(
    (color, i) =>
      `<rect x="${SCENE_X + i * 40}" y="${y}" width="34" height="14" rx="2" fill="${color}" stroke="#2a3558" stroke-width="1"/>`
  ).join('')
}

function buildCss(counterCss: string, counterCount: number): string {
  const jump = [
    '@keyframes jump{',
    '0%{transform:translateY(0)}',
    '10%{transform:translateY(0);animation-timing-function:cubic-bezier(.2,.7,.4,1)}',
    '20%{transform:translateY(-50px);animation-timing-function:cubic-bezier(.6,0,.8,.3)}',
    '30%{transform:translateY(0)}',
    '60%{transform:translateY(0);animation-timing-function:cubic-bezier(.2,.7,.4,1)}',
    '70%{transform:translateY(-50px);animation-timing-function:cubic-bezier(.6,0,.8,.3)}',
    '80%{transform:translateY(0)}',
    '100%{transform:translateY(0)}}'
  ].join('')

  const shadow = [
    '@keyframes shadow{',
    '0%,10%{transform:scaleX(1);opacity:.35}',
    '20%{transform:scaleX(.6);opacity:.18}',
    '30%,60%{transform:scaleX(1);opacity:.35}',
    '70%{transform:scaleX(.6);opacity:.18}',
    '80%,100%{transform:scaleX(1);opacity:.35}}'
  ].join('')

  return [
    `text{font-family:${FONT}}`,
    `.mv{animation:move ${LOOP}s linear infinite}`,
    `@keyframes move{from{transform:translateX(0)}to{transform:translateX(-${TRAVEL}px)}}`,
    jump,
    `.hero-jump{animation:jump ${LOOP}s linear infinite}`,
    shadow,
    `.shadow{transform-box:fill-box;transform-origin:center;animation:shadow ${LOOP}s linear infinite}`,
    '@keyframes legsA{0%,49%{opacity:1}50%,100%{opacity:0}}',
    '@keyframes legsB{0%,49%{opacity:0}50%,100%{opacity:1}}',
    '.legs-a{animation:legsA .4s steps(1) infinite}',
    '.legs-b{animation:legsB .4s steps(1) infinite}',
    `@keyframes groundMove{from{transform:translateX(0)}to{transform:translateX(-${TILE}px)}}`,
    `.ground{animation:groundMove ${(TILE / SPEED).toFixed(3)}s linear infinite}`,
    `@keyframes mlMove{from{transform:translateX(0)}to{transform:translateX(-${SCENE_W}px)}}`,
    '.ml-far,.ml-near{animation-name:mlMove;animation-timing-function:linear;animation-iteration-count:infinite}',
    `@keyframes cloudMove{from{transform:translateX(0)}to{transform:translateX(-${SCENE_W + 120}px)}}`,
    '.cloud{animation-name:cloudMove;animation-timing-function:linear;animation-iteration-count:infinite}',
    '@keyframes twinkle{0%,100%{opacity:.25}50%{opacity:1}}',
    '.tw{animation:twinkle 2.4s ease-in-out infinite}',
    '@keyframes spin{0%{transform:scaleX(1)}50%{transform:scaleX(.25)}100%{transform:scaleX(1)}}',
    '.spin{transform-box:fill-box;transform-origin:center;animation:spin .8s ease-in-out infinite}',
    '.pick{transform-box:fill-box;transform-origin:center}',
    '@keyframes squish{from{transform:scaleY(1)}to{transform:scaleY(.82)}}',
    '.slime{transform-box:fill-box;transform-origin:center bottom;animation:squish .5s ease-in-out infinite alternate}',
    pickCss(),
    `.cn{opacity:0;animation-duration:${LOOP}s;animation-iteration-count:infinite;animation-timing-function:step-end}`,
    counterCss,
    `@media (prefers-reduced-motion: reduce){*{animation:none!important}.cn0{opacity:1}}`
  ].join('') + (counterCount > 0 ? '' : '')
}

function buildSvg(stats: Stats): string {
  const counter = counterParts()
  const css = buildCss(counter.css, counter.count)

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-labelledby="t d" shape-rendering="crispEdges">`,
    `<title id="t">${esc(LOGIN)} profile card</title>`,
    '<desc id="d">Terminal styled profile card with an animated 2D runner game scene</desc>',
    `<style>${css}</style>`,
    '<defs>',
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1120"/><stop offset="1" stop-color="#1b2a52"/></linearGradient>',
    '<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity=".16"/></pattern>',
    `<clipPath id="sceneClip"><rect width="${SCENE_W}" height="${SCENE_H}" rx="6"/></clipPath>`,
    `<clipPath id="windowClip"><rect width="${WIDTH}" height="${HEIGHT}" rx="12"/></clipPath>`,
    '</defs>',
    '<g clip-path="url(#windowClip)">',
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="${BG_COLOR}"/>`,
    `<rect width="${WIDTH}" height="36" fill="${TITLEBAR_COLOR}"/>`,
    '<circle cx="22" cy="18" r="6" fill="#ff5f56"/><circle cx="42" cy="18" r="6" fill="#ffbd2e"/><circle cx="62" cy="18" r="6" fill="#27c93f"/>',
    `<text x="${WIDTH / 2}" y="22" text-anchor="middle" font-size="12" fill="${MUTED}">${HANDLE}@${HOST}: ~</text>`,
    '</g>',
    gameScene(counter.texts),
    `<text x="${SCENE_X}" y="${SCENE_Y + SCENE_H + 20}" font-size="11" fill="${MUTED}">[ RUN.EXE ] dodge bugs, collect coins</text>`,
    infoPanel(stats),
    promptLine(),
    swatches(),
    '</svg>'
  ].join('')
}

async function main(): Promise<void> {
  const stats = await loadStats()
  const svg = buildSvg(stats)

  mkdirSync(dirname(OUT_PATH), { recursive: true })
  writeFileSync(OUT_PATH, svg)

  console.log(`Kartu tersimpan di ${OUT_PATH} (${(svg.length / 1024).toFixed(1)} KB)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
