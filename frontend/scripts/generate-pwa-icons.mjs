import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const iconsDir = path.join(__dirname, '../public/icons')

const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0b1110"/>
  <rect x="96" y="216" width="56" height="80" rx="12" fill="#a3e635"/>
  <rect x="360" y="216" width="56" height="80" rx="12" fill="#a3e635"/>
  <rect x="152" y="244" width="208" height="24" rx="12" fill="#a3e635"/>
  <text x="256" y="420" font-family="system-ui,sans-serif" font-size="72" font-weight="700" fill="#e8f0ea" text-anchor="middle">IronLog</text>
</svg>
`

const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0b1110"/>
  <rect x="96" y="216" width="56" height="80" rx="12" fill="#a3e635"/>
  <rect x="360" y="216" width="56" height="80" rx="12" fill="#a3e635"/>
  <rect x="152" y="244" width="208" height="24" rx="12" fill="#a3e635"/>
</svg>
`

async function writePng(svg, fileName, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(iconsDir, fileName))
}

await mkdir(iconsDir, { recursive: true })
await writeFile(path.join(iconsDir, 'icon.svg'), iconSvg.trim())

await writePng(iconSvg, 'icon-192.png', 192)
await writePng(iconSvg, 'icon-512.png', 512)
await writePng(maskableSvg, 'icon-maskable-512.png', 512)
await writePng(iconSvg, 'apple-touch-icon.png', 180)

console.log('PWA icons generated in public/icons/')
