// Generates raster brand assets from the source logo (docs/StockAlert -
// Logo.png) for the places an inline SVG can't be used: e-mail headers
// (React Email clients don't render <svg>), Apple touch icons, and the
// OpenGraph/Twitter card image. Re-run with `pnpm brand:assets` whenever
// the source logo changes — nothing here is meant to be hand-edited.
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const SOURCE = path.join(root, 'docs', 'StockAlert - Logo.png')

const LANDING_BRAND_DIR = path.join(root, 'apps/landing/public/brand')
const LANDING_APPLE_ICON = path.join(root, 'apps/landing/src/app/apple-icon.png')
const DASHBOARD_APPLE_ICON = path.join(root, 'apps/dashboard/src/app/apple-icon.png')

// Matches apps/landing/src/app/globals.css --background: 37 59% 90%.
const CREAM_BG = '#f5e8d3'
const INK = '#57432b'

async function main() {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Source logo not found at ${SOURCE}`)
  }
  fs.mkdirSync(LANDING_BRAND_DIR, { recursive: true })

  // Trim the transparent padding around the mark so every downstream
  // composite has a tight, predictable bounding box.
  const trimmedBuffer = await sharp(SOURCE).trim().png().toBuffer()
  const { width: tw, height: th } = await sharp(trimmedBuffer).metadata()
  if (!tw || !th) throw new Error('Could not read trimmed logo dimensions')

  // 1. Square lockup — the e-mail header image (React Email templates
  // can't render inline SVG, so a hosted PNG is the only option there)
  // and any other spot that wants a self-contained raster mark.
  await sharp(trimmedBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(LANDING_BRAND_DIR, 'logo-lockup.png'))

  // 2. Apple touch icons for both apps — iOS renders these on an opaque
  // homescreen tile, so flatten onto the brand's cream background rather
  // than leaving it transparent.
  for (const dest of [LANDING_APPLE_ICON, DASHBOARD_APPLE_ICON]) {
    await sharp(trimmedBuffer)
      .resize(150, 150, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({ top: 15, bottom: 15, left: 15, right: 15, background: CREAM_BG })
      .flatten({ background: CREAM_BG })
      .png()
      .toFile(dest)
  }

  // 3. OpenGraph / Twitter card image so links shared on social/Slack show
  // real branding instead of a blank card.
  const canvasWidth = 1200
  const canvasHeight = 630
  const markHeight = 300
  const markWidth = Math.round((tw / th) * markHeight)
  const mark = await sharp(trimmedBuffer)
    .resize(markWidth, markHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const taglineSvg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="80">
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="600" fill="${INK}">
        Real-time inventory alerts for e-commerce sellers
      </text>
    </svg>
  `)

  await sharp({
    create: { width: canvasWidth, height: canvasHeight, channels: 4, background: CREAM_BG },
  })
    .composite([
      { input: mark, left: Math.round((canvasWidth - markWidth) / 2), top: 130 },
      { input: taglineSvg, left: 0, top: 130 + markHeight + 30 },
    ])
    .png()
    .toFile(path.join(LANDING_BRAND_DIR, 'og.png'))

  console.log('Brand assets generated:')
  console.log(' -', path.join(LANDING_BRAND_DIR, 'logo-lockup.png'))
  console.log(' -', path.join(LANDING_BRAND_DIR, 'og.png'))
  console.log(' -', LANDING_APPLE_ICON)
  console.log(' -', DASHBOARD_APPLE_ICON)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
