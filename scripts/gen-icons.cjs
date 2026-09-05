// Generates PWA app icons (orange background + white egg) into /public.
// Run: node scripts/gen-icons.cjs
const fs = require('fs')
const path = require('path')
const { PNG } = require('pngjs')

const OUT = path.join(__dirname, '..', 'public')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

// simple hex -> rgb
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const TOP = hex('#fb923c') // amber-400-ish
const BOT = hex('#ea580c') // brand-600
const EGG = hex('#fffdf7')
const YOLK = hex('#fbbf24')

function draw(size, { maskable = false } = {}) {
  const png = new PNG({ width: size, height: size })
  const cx = size / 2
  const cy = size * 0.52
  // egg smaller on maskable so it stays inside the safe zone
  const rx = size * (maskable ? 0.22 : 0.27)
  const ry = size * (maskable ? 0.28 : 0.34)
  for (let y = 0; y < size; y++) {
    const tv = y / size
    const br = Math.round(TOP[0] + (BOT[0] - TOP[0]) * tv)
    const bg = Math.round(TOP[1] + (BOT[1] - TOP[1]) * tv)
    const bb = Math.round(TOP[2] + (BOT[2] - TOP[2]) * tv)
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2
      const dx = (x - cx) / rx
      const dy = (y - cy) / ry
      const d = dx * dx + dy * dy
      let r = br, g = bg, b = bb
      if (d <= 1) {
        r = EGG[0]; g = EGG[1]; b = EGG[2]
        // small yolk highlight upper-left of the egg
        const yx = (x - (cx - rx * 0.28)) / (rx * 0.42)
        const yy = (y - (cy - ry * 0.22)) / (ry * 0.42)
        if (yx * yx + yy * yy <= 1) { r = YOLK[0]; g = YOLK[1]; b = YOLK[2] }
      }
      png.data[idx] = r
      png.data[idx + 1] = g
      png.data[idx + 2] = b
      png.data[idx + 3] = 255
    }
  }
  return PNG.sync.write(png)
}

const files = [
  ['pwa-192x192.png', 192, {}],
  ['pwa-512x512.png', 512, {}],
  ['maskable-512x512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, {}],
  ['favicon-egg.png', 64, {}],
]
for (const [name, size, opts] of files) {
  fs.writeFileSync(path.join(OUT, name), draw(size, opts))
  console.log('wrote', name)
}
console.log('Done.')
