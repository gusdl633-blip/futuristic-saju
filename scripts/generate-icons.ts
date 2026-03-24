import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const SOURCE = join(ROOT, 'icon-1024.png')

const icons = [
  { size: 512, output: 'src/assets/icon-512.png', trim: false },
  { size: 256, output: 'src/assets/icon-256.png', trim: false },
  { size: 180, output: 'public/apple-touch-icon.png', trim: true },
  { size: 32, output: 'public/favicon-32.png', trim: true },
  { size: 16, output: 'public/favicon-16.png', trim: true },
]

await mkdir(join(ROOT, 'src/assets'), { recursive: true })
await mkdir(join(ROOT, 'public'), { recursive: true })

const original = await sharp(SOURCE).toBuffer()
const trimmed = await sharp(SOURCE).trim().toBuffer()

for (const { size, output, trim } of icons) {
  const dest = join(ROOT, output)
  await sharp(trim ? trimmed : original)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(dest)
  console.log(`${output} (${size}x${size}${trim ? ', trimmed' : ''})`)
}

console.log('Done.')
