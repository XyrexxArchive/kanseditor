export type Adjustments = {
  brightness: number; contrast: number; saturation: number; vibrance: number; exposure: number;
  warmth: number; tint: number; highlights: number; shadows: number; hue: number;
  blur: number; vignette: number; grain: number; sharpen: number; fade: number;
}

export type EditState = {
  adjustments: Adjustments
  rotation: number
  flipX: boolean
  flipY: boolean
  crop: string
  zoom: number
}

export const defaultAdjustments: Adjustments = {
  brightness: 0, contrast: 0, saturation: 0, vibrance: 0, exposure: 0,
  warmth: 0, tint: 0, highlights: 0, shadows: 0, hue: 0,
  blur: 0, vignette: 0, grain: 0, sharpen: 0, fade: 0,
}

export const defaultEdit: EditState = {
  adjustments: defaultAdjustments, rotation: 0, flipX: false, flipY: false, crop: 'free', zoom: 1,
}

export const presets: { name: string; description: string; values: Partial<Adjustments> }[] = [
  { name: 'Original', description: 'Natural colors', values: {} },
  { name: 'Clean', description: 'Bright & crisp', values: { brightness: 5, contrast: 10, saturation: 8, shadows: 8 } },
  { name: 'Vivid', description: 'Punchy colors', values: { contrast: 18, saturation: 28, vibrance: 25, sharpen: 15 } },
  { name: 'Warm', description: 'Golden warmth', values: { warmth: 28, tint: 5, brightness: 4, saturation: 12 } },
  { name: 'Cool', description: 'Cool blue tone', values: { warmth: -24, tint: -4, contrast: 10, saturation: -5 } },
  { name: 'Film', description: 'Soft analog look', values: { contrast: -8, saturation: -12, fade: 22, grain: 14, warmth: 10, highlights: -18 } },
  { name: 'Moody', description: 'Deep shadows', values: { brightness: -5, contrast: 24, saturation: -18, shadows: -22, vignette: 32 } },
  { name: 'Portrait', description: 'Soft skin tones', values: { brightness: 6, contrast: -5, saturation: 8, warmth: 8, highlights: -15, shadows: 12 } },
  { name: 'B&W', description: 'Monochrome', values: { saturation: -100, contrast: 22, highlights: -8, shadows: 10 } },
  { name: 'Cinematic', description: 'Movie atmosphere', values: { contrast: 25, saturation: -20, warmth: -10, shadows: -25, highlights: -20, vignette: 25 } },
  { name: 'Golden Hour', description: 'Sunlit glow', values: { warmth: 40, brightness: 8, saturation: 18, highlights: 18, fade: 8 } },
  { name: 'Matte', description: 'Muted & lifted', values: { contrast: -18, saturation: -15, fade: 32, shadows: 20 } },
]

export function cloneEdit(edit: EditState): EditState {
  return { ...edit, adjustments: { ...edit.adjustments } }
}

export function buildCanvas(source: HTMLImageElement, edit: EditState, maxDimension = 0): HTMLCanvasElement {
  const sourceW = source.naturalWidth || source.width
  const sourceH = source.naturalHeight || source.height
  const rotation = ((edit.rotation % 360) + 360) % 360
  const sideways = rotation === 90 || rotation === 270
  const scale = maxDimension > 0 ? Math.min(1, maxDimension / Math.max(sourceW, sourceH)) : 1
  const scaledW = Math.max(1, Math.round(sourceW * scale))
  const scaledH = Math.max(1, Math.round(sourceH * scale))
  const orientedW = sideways ? scaledH : scaledW
  const orientedH = sideways ? scaledW : scaledH

  const oriented = document.createElement('canvas')
  oriented.width = orientedW
  oriented.height = orientedH
  const octx = oriented.getContext('2d')
  if (!octx) throw new Error('Browser tidak mendukung Canvas 2D.')
  octx.translate(orientedW / 2, orientedH / 2)
  octx.rotate(rotation * Math.PI / 180)
  octx.scale(edit.flipX ? -1 : 1, edit.flipY ? -1 : 1)
  octx.drawImage(source, -scaledW / 2, -scaledH / 2, scaledW, scaledH)

  const ratios: Record<string, number> = { '1:1': 1, '4:5': 4 / 5, '5:4': 5 / 4, '3:4': 3 / 4, '4:3': 4 / 3, '16:9': 16 / 9, '9:16': 9 / 16 }
  const ratio = ratios[edit.crop]
  let cropW = orientedW
  let cropH = orientedH
  if (ratio) {
    if (orientedW / orientedH > ratio) cropW = Math.round(orientedH * ratio)
    else cropH = Math.round(orientedW / ratio)
  }
  const zoom = Math.max(1, edit.zoom)
  cropW = Math.max(1, Math.round(cropW / zoom))
  cropH = Math.max(1, Math.round(cropH / zoom))
  const sx = Math.max(0, Math.round((orientedW - cropW) / 2))
  const sy = Math.max(0, Math.round((orientedH - cropH) / 2))

  const canvas = document.createElement('canvas')
  canvas.width = cropW
  canvas.height = cropH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas tidak tersedia.')
  const a = edit.adjustments
  const brightness = Math.max(0, 100 + a.brightness + a.exposure * 1.5)
  const contrast = Math.max(0, 100 + a.contrast)
  const saturation = Math.max(0, 100 + a.saturation)
  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${a.hue}deg) blur(${a.blur * scale}px) sepia(${Math.max(0, a.warmth) * 0.55}%)`
  ctx.drawImage(oriented, sx, sy, cropW, cropH, 0, 0, cropW, cropH)
  ctx.filter = 'none'

  if (a.vibrance || a.warmth < 0 || a.tint || a.highlights || a.shadows || a.fade || a.grain || a.vignette || a.sharpen) {
    const image = ctx.getImageData(0, 0, cropW, cropH)
    const data = image.data
    const w = cropW
    const h = cropH
    const centerX = w / 2
    const centerY = h / 2
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY) || 1
    const vibrance = a.vibrance / 100
    const warmth = a.warmth / 100
    const tint = a.tint / 100
    const fade = a.fade / 100
    const vignette = a.vignette / 100
    const grain = a.grain / 100
    const sharpen = a.sharpen / 100
    const previous = sharpen > 0.01 ? new Uint8ClampedArray(data) : null
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        let r = data[i], g = data[i + 1], b = data[i + 2]
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
        const shadowFactor = Math.pow(1 - lum / 255, 2)
        const highlightFactor = Math.pow(lum / 255, 2)
        const shadow = a.shadows * shadowFactor * 0.8
        const highlight = a.highlights * highlightFactor * 0.8
        r += shadow + highlight + warmth * 48 + tint * 22
        g += shadow + highlight - tint * 18
        b += shadow + highlight - warmth * 48 + tint * 22
        const max = Math.max(r, g, b), min = Math.min(r, g, b)
        const sat = max === 0 ? 0 : (max - min) / max
        const boost = 1 + vibrance * (1 - sat) * 1.7
        const avg = (r + g + b) / 3
        r = avg + (r - avg) * boost
        g = avg + (g - avg) * boost
        b = avg + (b - avg) * boost
        if (fade > 0) { r = r * (1 - fade * 0.22) + 255 * fade * 0.12; g = g * (1 - fade * 0.22) + 240 * fade * 0.12; b = b * (1 - fade * 0.22) + 220 * fade * 0.12 }
        if (vignette > 0) {
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2) / maxDist
          const factor = 1 - Math.max(0, distance - 0.25) * vignette * 0.95
          r *= factor; g *= factor; b *= factor
        }
        if (grain > 0) {
          const noise = (Math.random() - 0.5) * grain * 52
          r += noise; g += noise; b += noise
        }
        if (previous && sharpen > 0) {
          const left = (y * w + Math.max(0, x - 1)) * 4
          const right = (y * w + Math.min(w - 1, x + 1)) * 4
          const top = (Math.max(0, y - 1) * w + x) * 4
          const bottom = (Math.min(h - 1, y + 1) * w + x) * 4
          r += (previous[i] * 4 - previous[left] - previous[right] - previous[top] - previous[bottom]) * sharpen * 0.7
          g += (previous[i + 1] * 4 - previous[left + 1] - previous[right + 1] - previous[top + 1] - previous[bottom + 1]) * sharpen * 0.7
          b += (previous[i + 2] * 4 - previous[left + 2] - previous[right + 2] - previous[top + 2] - previous[bottom + 2]) * sharpen * 0.7
        }
        data[i] = r; data[i + 1] = g; data[i + 2] = b
      }
    }
    ctx.putImageData(image, 0, 0)
  }
  return canvas
}
