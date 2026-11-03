// Browser-only helpers for inspiration photos: shrink a camera shot before it is
// stored, and read the dominant colours of any image into a small palette.

const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    // Remote images (Unsplash, suppliers) must allow CORS for the canvas to be readable.
    if (!src.startsWith('data:') && !src.startsWith('/')) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível abrir a imagem'))
    img.src = src
  })

/** Reads a picked or captured file and returns a WebP data URL no wider than `max` px. */
export async function fileToDataUrl(file: File, max = 1400): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await load(url)
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/webp', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
const luminance = (h: string) => {
  const n = parseInt(h.slice(1), 16)
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)
}

/**
 * Five dominant colours, dark to light. Pixels are bucketed on a coarse RGB grid,
 * then buckets too close to an already chosen colour are skipped so the swatches differ.
 */
export async function extractPalette(src: string, count = 5): Promise<string[]> {
  const img = await load(src)
  const size = 48
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, size, size)
  const { data } = ctx.getImageData(0, 0, size, size)

  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>()
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
    bucket.n++
    bucket.r += r
    bucket.g += g
    bucket.b += b
    buckets.set(key, bucket)
  }

  const ranked = [...buckets.values()].sort((a, b) => b.n - a.n).map((x) => [x.r / x.n, x.g / x.n, x.b / x.n] as const)
  const picked: Array<readonly [number, number, number]> = []
  for (const c of ranked) {
    if (picked.every((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) > 38)) picked.push(c)
    if (picked.length === count) break
  }
  return picked.map((c) => hex(...c)).sort((a, b) => luminance(a) - luminance(b))
}

export const isLight = (h: string) => luminance(h) > 150
