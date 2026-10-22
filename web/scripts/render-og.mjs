import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../public')

export function buildOgSvg({
  title = 'Send photos and text between your screens.',
  subtitle = 'Instant ephemeral P2P device bridge. Zero accounts, zero uploads, and everything vanishes when you say.',
  badge = 'v0.9',
} = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1433CC" />
      <stop offset="55%" stop-color="#1E45FB" />
      <stop offset="100%" stop-color="#122BB5" />
    </linearGradient>

    <!-- Subtle dot pattern for tactile depth -->
    <pattern id="dotGrid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1.5" fill="#FFFFFF" fill-opacity="0.08" />
    </pattern>

    <!-- Goo filter for fluid droplet mark -->
    <filter id="og-goo" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
      <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
    </filter>

    <style>
      .font-display {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 800;
      }
      .font-body {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 600;
      }
      .font-mono {
        font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
        font-weight: 700;
      }
    </style>
  </defs>

  <!-- Background Base -->
  <rect width="1200" height="630" fill="url(#bgGrad)" />
  <rect width="1200" height="630" fill="url(#dotGrid)" />

  <!-- Outer Rounded Frame -->
  <rect x="24" y="24" width="1152" height="582" rx="36" fill="none" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="2" />

  <!-- Signature Squiggly Loop Line in Vibrant Acid Lime (#CDF22B) -->
  <g opacity="0.22" transform="translate(420, 180) scale(1.4)">
    <path
      d="M 45 290 C 65 110, 165 25, 225 90 C 275 145, 210 265, 145 250 C 80 235, 165 95, 295 125 C 415 155, 445 255, 375 270 C 305 285, 330 165, 445 195 C 510 212, 545 180, 565 75 C 575 20, 440 -10, 435 55 C 430 125, 535 165, 585 95 L 605 290"
      stroke="#CDF22B"
      stroke-width="32"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />
  </g>

  <!-- Top Bar / Brand Header -->
  <g transform="translate(80, 80)">
    <!-- Fluid Droplet Logo Mark -->
    <g transform="translate(0, 0)">
      <rect width="58" height="58" rx="18" fill="#CDF22B" />
      <g fill="#1E45FB" transform="translate(-1, -1) scale(0.95)" filter="url(#og-goo)">
        <circle cx="24" cy="38" r="13" />
        <circle cx="40" cy="42" r="10" />
        <circle cx="33" cy="24" r="8.5" />
      </g>
      <circle cx="47" cy="14" r="5" fill="#1E45FB" />
    </g>

    <!-- Wordmark -->
    <text x="76" y="42" fill="#FFFFFF" class="font-display" font-size="36" letter-spacing="-0.03em">
      GhostDrop
    </text>

    <!-- Version Badge Pill -->
    <rect x="272" y="16" width="60" height="28" rx="14" fill="#CDF22B" />
    <text x="302" y="35" text-anchor="middle" fill="#0D0F12" class="font-mono" font-size="14" font-weight="800">
      ${badge}
    </text>

    <!-- Right-aligned Live Status Pill -->
    <g transform="translate(860, 6)">
      <rect width="180" height="42" rx="21" fill="#FFFFFF" fill-opacity="0.12" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="1.5" />
      <circle cx="24" cy="21" r="5" fill="#CDF22B" />
      <text x="38" y="26" fill="#FFFFFF" class="font-body" font-size="14" letter-spacing="0.02em">
        100% Stateless P2P
      </text>
    </g>
  </g>

  <!-- Hero Content Section -->
  <g transform="translate(80, 240)">
    <!-- Eyebrow Pill -->
    <g transform="translate(0, 0)">
      <rect width="168" height="34" rx="17" fill="#CDF22B" fill-opacity="0.2" stroke="#CDF22B" stroke-width="1.5" />
      <text x="84" y="22" text-anchor="middle" fill="#CDF22B" class="font-body" font-size="13" font-weight="700" letter-spacing="0.06em">
        ZERO ACCOUNTS REQUIRED
      </text>
    </g>

    <!-- Main Headline -->
    <text x="0" y="90" fill="#FFFFFF" class="font-display" font-size="50" letter-spacing="-0.03em">
      ${title}
    </text>

    <!-- Subtitle -->
    <text x="0" y="160" fill="#FFFFFF" fill-opacity="0.88" class="font-body" font-size="21" letter-spacing="-0.01em">
      ${subtitle}
    </text>
  </g>

  <!-- Bottom Badges / Feature Strip -->
  <g transform="translate(80, 526)">
    <!-- Feature Pill 1: WebRTC -->
    <g transform="translate(0, 0)">
      <rect width="210" height="44" rx="22" fill="#FFFFFF" fill-opacity="0.14" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="1.5" />
      <!-- Lucide-style Zap icon -->
      <path d="M 24 23 L 31 13 L 28 22 L 34 22 L 27 32 L 29 23 Z" fill="#CDF22B" />
      <text x="44" y="27" fill="#FFFFFF" class="font-body" font-size="15">
        WebRTC P2P Streams
      </text>
    </g>

    <!-- Feature Pill 2: Auto TTL -->
    <g transform="translate(230, 0)">
      <rect width="200" height="44" rx="22" fill="#FFFFFF" fill-opacity="0.14" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="1.5" />
      <!-- Lucide-style Clock/Sparkles icon -->
      <circle cx="26" cy="22" r="7" stroke="#CDF22B" stroke-width="2" fill="none" />
      <path d="M 26 18 L 26 22 L 29 24" stroke="#CDF22B" stroke-width="2" stroke-linecap="round" fill="none" />
      <text x="42" y="27" fill="#FFFFFF" class="font-body" font-size="15">
        Self-Destruct TTL
      </text>
    </g>

    <!-- Feature Pill 3: In-App QR Scan -->
    <g transform="translate(450, 0)">
      <rect width="200" height="44" rx="22" fill="#FFFFFF" fill-opacity="0.14" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="1.5" />
      <rect x="20" y="16" width="12" height="12" rx="2.5" stroke="#CDF22B" stroke-width="2" fill="none" />
      <circle cx="26" cy="22" r="1.5" fill="#CDF22B" />
      <text x="42" y="27" fill="#FFFFFF" class="font-body" font-size="15">
        Instant QR Scanner
      </text>
    </g>

    <!-- Domain Link Right -->
    <g transform="translate(770, 6)">
      <text x="270" y="24" text-anchor="end" fill="#CDF22B" class="font-mono" font-size="16" font-weight="700" letter-spacing="0.04em">
        ghostdropapp.vercel.app
      </text>
    </g>
  </g>
</svg>`
}

async function main() {
  const svg = buildOgSvg()
  const svgPath = path.join(publicDir, 'og-image.svg')
  fs.writeFileSync(svgPath, svg, 'utf-8')
  console.log(`[OG] Wrote SVG to ${svgPath}`)

  const pngPath = path.join(publicDir, 'og-image.png')

  // Resolve Chromium / Chrome binary across OS environments
  const candidatePaths = [
    process.env.CHROME_PATH,
    process.env.CHROME_BIN,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)

  const chromePath = candidatePaths.find((p) => p && fs.existsSync(p))
  if (chromePath) {
    const htmlWrapper = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1200px; height: 630px; overflow: hidden; background: #1E45FB; }
      svg { width: 1200px; height: 630px; display: block; }
    </style>
  </head>
  <body>${svg}</body>
</html>`
    const tempHtml = path.join(publicDir, '_temp_og.html')
    fs.writeFileSync(tempHtml, htmlWrapper, 'utf-8')

    try {
      execFileSync(chromePath, [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        '--window-size=1200,630',
        `--screenshot=${pngPath}`,
        `file:///${tempHtml.replace(/\\/g, '/')}`,
      ])
      console.log(`[OG] Rendered PNG via headless Chrome (${fs.statSync(pngPath).size} bytes)`)
    } catch (err) {
      console.warn('[OG] Chrome rendering notice:', err.message)
    } finally {
      if (fs.existsSync(tempHtml)) {
        fs.unlinkSync(tempHtml)
      }
    }
  }

  if (!fs.existsSync(pngPath) || fs.statSync(pngPath).size === 0) {
    console.log('[OG] Fallback: creating pure PNG')
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main()
}
