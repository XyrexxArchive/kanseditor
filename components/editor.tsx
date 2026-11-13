'use client'

import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Aperture, ArrowDownToLine, ArrowLeft, ArrowRight, Check, ChevronDown, Crop, Download,
  FlipHorizontal, FlipVertical, FolderOpen, Gauge, ImagePlus, Maximize2, Minus, Moon,
  RotateCcw, RotateCw, Save, SlidersHorizontal, Sparkles, Sun, Trash2, Undo2, Redo2,
  X, ZoomIn, ZoomOut, Eye, EyeOff, Settings2, Palette, WandSparkles, MoveHorizontal,
} from 'lucide-react'
import { Adjustments, cloneEdit, defaultEdit, EditState, presets, buildCanvas } from '@/lib/editor'

type Tab = 'adjust' | 'effects' | 'crop' | 'presets' | 'export'
type CustomPreset = { name: string; values: Adjustments }

const controls: { key: keyof Adjustments; label: string; min: number; max: number; icon: string; group: string }[] = [
  { key: 'brightness', label: 'Brightness', min: -100, max: 100, icon: '☼', group: 'Light' },
  { key: 'exposure', label: 'Exposure', min: -100, max: 100, icon: '◐', group: 'Light' },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100, icon: '◑', group: 'Light' },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100, icon: '✧', group: 'Light' },
  { key: 'shadows', label: 'Shadows', min: -100, max: 100, icon: '◒', group: 'Light' },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100, icon: '◉', group: 'Color' },
  { key: 'vibrance', label: 'Vibrance', min: -100, max: 100, icon: '✳', group: 'Color' },
  { key: 'warmth', label: 'Temperature', min: -100, max: 100, icon: '♨', group: 'Color' },
  { key: 'tint', label: 'Tint', min: -100, max: 100, icon: '◈', group: 'Color' },
  { key: 'hue', label: 'Hue', min: -180, max: 180, icon: '◌', group: 'Color' },
]
const effects: { key: keyof Adjustments; label: string; min: number; max: number; suffix?: string }[] = [
  { key: 'blur', label: 'Soft blur', min: 0, max: 12, suffix: 'px' },
  { key: 'sharpen', label: 'Sharpen', min: 0, max: 100 },
  { key: 'vignette', label: 'Vignette', min: 0, max: 100 },
  { key: 'grain', label: 'Film grain', min: 0, max: 100 },
  { key: 'fade', label: 'Fade', min: 0, max: 100 },
]
const ratios = ['free', '1:1', '4:5', '5:4', '3:4', '4:3', '16:9', '9:16']
const formatBytes = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`

export default function Editor() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [edit, setEdit] = useState<EditState>(() => cloneEdit(defaultEdit))
  const [tab, setTab] = useState<Tab>('adjust')
  const [activeGroup, setActiveGroup] = useState('Light')
  const [history, setHistory] = useState<EditState[]>([])
  const [future, setFuture] = useState<EditState[]>([])
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([])
  const [showOriginal, setShowOriginal] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [exportFormat, setExportFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg')
  const [quality, setQuality] = useState(92)
  const [exportWidth, setExportWidth] = useState(0)
  const [exportHeight, setExportHeight] = useState(0)
  const [exportScale, setExportScale] = useState('original')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [customName, setCustomName] = useState('')
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [beforeHold, setBeforeHold] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageUrlRef = useRef<string | null>(null)
  const previewFrame = useRef<number | null>(null)
  const sliderStartRef = useRef<EditState | null>(null)

  const setAdjustment = useCallback((key: keyof Adjustments, value: number) => {
    setEdit(current => ({ ...current, adjustments: { ...current.adjustments, [key]: value } }))
  }, [])

  const commitEdit = useCallback((next: EditState) => {
    setHistory(current => [...current.slice(-29), cloneEdit(edit)])
    setFuture([])
    setEdit(cloneEdit(next))
  }, [edit])

  const updateEdit = useCallback((updater: (current: EditState) => EditState) => {
    setEdit(current => updater(current))
  }, [])

  const loadFile = useCallback((file?: File) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) { setMessage('Format yang didukung: JPG, PNG, WebP, dan AVIF.'); return }
    if (file.size > 40 * 1024 * 1024) { setMessage('Ukuran maksimal foto adalah 40 MB.'); return }
    const url = URL.createObjectURL(file)
    const nextImage = new Image()
    nextImage.onload = () => {
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current)
      imageUrlRef.current = url
      setImage(nextImage)
      setFileName(file.name.replace(/\.[^.]+$/, '') || 'kanseditor-photo')
      setFileSize(file.size)
      setExportWidth(nextImage.naturalWidth)
      setExportHeight(nextImage.naturalHeight)
      setEdit(cloneEdit(defaultEdit))
      setHistory([])
      setFuture([])
      setShowOriginal(false)
      setZoom(1)
      setTab('adjust')
      setMessage('')
    }
    nextImage.onerror = () => { URL.revokeObjectURL(url); setMessage('Foto gagal dibuka. Coba format JPG, PNG, atau WebP.') }
    nextImage.src = url
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('kanseditor-presets-v1')
      if (stored) setCustomPresets(JSON.parse(stored) as CustomPreset[])
    } catch { setCustomPresets([]) }
    return () => { if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current); if (previewFrame.current) cancelAnimationFrame(previewFrame.current) }
  }, [])

  useEffect(() => {
    if (!image || !canvasRef.current) return
    if (previewFrame.current) cancelAnimationFrame(previewFrame.current)
    previewFrame.current = requestAnimationFrame(() => {
      try {
        const canvas = canvasRef.current
        if (!canvas) return
        const rendered = showOriginal || beforeHold ? buildCanvas(image, defaultEdit, 1600) : buildCanvas(image, edit, 1600)
        canvas.width = rendered.width
        canvas.height = rendered.height
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.drawImage(rendered, 0, 0)
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Gagal memproses preview.') }
    })
  }, [image, edit, showOriginal, beforeHold])

  const undo = useCallback(() => {
    if (!history.length) return
    const previous = history[history.length - 1]
    setHistory(history.slice(0, -1))
    setFuture([cloneEdit(edit), ...future].slice(0, 30))
    setEdit(cloneEdit(previous))
  }, [edit, future, history])

  const redo = useCallback(() => {
    if (!future.length) return
    const nextEdit = future[0]
    setFuture(future.slice(1))
    setHistory([...history, cloneEdit(edit)].slice(-30))
    setEdit(cloneEdit(nextEdit))
  }, [edit, future, history])

  const beginSliderEdit = () => { sliderStartRef.current = cloneEdit(edit) }
  const finishSliderEdit = () => {
    const start = sliderStartRef.current
    if (!start) return
    sliderStartRef.current = null
    setHistory(current => [...current.slice(-29), start])
    setFuture([])
  }

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undo() }
      if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))) { event.preventDefault(); redo() }
      if (event.key === 'Escape') { setShowSavePreset(false); setMessage('') }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [undo, redo])

  const handleDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); loadFile(event.dataTransfer.files[0]) }
  const applyPreset = (values: Partial<Adjustments>) => {
    const next = { ...edit, adjustments: { ...defaultEdit.adjustments, ...values } }
    commitEdit(next)
  }
  const savePreset = () => {
    const name = customName.trim()
    if (!name) return
    const next = [...customPresets.filter(item => item.name.toLowerCase() !== name.toLowerCase()), { name, values: { ...edit.adjustments } }]
    setCustomPresets(next)
    try { localStorage.setItem('kanseditor-presets-v1', JSON.stringify(next)) } catch { setMessage('Penyimpanan preset penuh di browser ini.') }
    setCustomName('')
    setShowSavePreset(false)
    setMessage('Preset berhasil disimpan di perangkat ini.')
  }
  const deletePreset = (name: string) => {
    const next = customPresets.filter(item => item.name !== name)
    setCustomPresets(next)
    try { localStorage.setItem('kanseditor-presets-v1', JSON.stringify(next)) } catch { /* storage unavailable */ }
  }

  const exportImage = async () => {
    if (!image) return
    setBusy(true)
    setMessage('Menyiapkan hasil export...')
    try {
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
      const canvas = buildCanvas(image, edit)
      let targetW = exportWidth || canvas.width
      let targetH = exportHeight || canvas.height
      if (exportScale === '1080') {
        const factor = Math.min(1920 / canvas.width, 1080 / canvas.height)
        targetW = Math.round(canvas.width * factor)
        targetH = Math.round(canvas.height * factor)
      } else if (exportScale === '2x') {
        const factor = Math.min(2, 8192 / canvas.width, 8192 / canvas.height)
        targetW = Math.round(canvas.width * factor)
        targetH = Math.round(canvas.height * factor)
      } else if (exportScale === 'original') { targetW = canvas.width; targetH = canvas.height }
      if (!Number.isFinite(targetW) || !Number.isFinite(targetH) || targetW < 1 || targetH < 1) throw new Error('Masukkan dimensi export yang valid.')
      targetW = Math.max(1, Math.min(8192, Math.round(targetW)))
      targetH = Math.max(1, Math.min(8192, Math.round(targetH)))
      const output = document.createElement('canvas')
      output.width = targetW
      output.height = targetH
      const ctx = output.getContext('2d')
      if (!ctx) throw new Error('Tidak bisa membuat file export.')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(canvas, 0, 0, targetW, targetH)
      const blob = await new Promise<Blob>((resolve, reject) => output.toBlob(result => result ? resolve(result) : reject(new Error('Browser gagal membuat file gambar.')), exportFormat, quality / 100))
      const extension = exportFormat === 'image/png' ? 'png' : exportFormat === 'image/webp' ? 'webp' : 'jpg'
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${fileName || 'kanseditor'}-edited.${extension}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1500)
      setMessage(`Export selesai · ${targetW} × ${targetH} · ${formatBytes(blob.size)}`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Export gagal. Coba kurangi resolusi.') }
    finally { setBusy(false) }
  }

  const dimensions = useMemo(() => image ? `${image.naturalWidth} × ${image.naturalHeight}` : '—' , [image])
  const nav: { id: Tab; label: string; icon: typeof SlidersHorizontal }[] = [
    { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal }, { id: 'effects', label: 'Effects', icon: Sparkles },
    { id: 'crop', label: 'Crop', icon: Crop }, { id: 'presets', label: 'Presets', icon: Palette }, { id: 'export', label: 'Export', icon: Download },
  ]

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark"><Aperture size={20}/></span><span>Kans<span>Editor</span></span><i>STUDIO</i></a>
      <div className="top-actions">
        {image && <><span className="file-meta">{fileName} <b>·</b> {dimensions}</span><button className="icon-btn" title="Undo" onClick={undo} disabled={!history.length}><Undo2 size={17}/></button><button className="icon-btn" title="Redo" onClick={redo} disabled={!future.length}><Redo2 size={17}/></button><button className="reset-btn" onClick={() => commitEdit(cloneEdit(defaultEdit))}><RotateCcw size={14}/> Reset</button><button className="top-export" onClick={() => setTab('export')}><Download size={15}/> Export</button></>}
      </div>
    </header>

    {!image ? <section className="welcome-wrap"><div className="welcome-copy"><div className="eyebrow"><span className="pulse-dot"/> YOUR CREATIVE SPACE</div><h1>Make every photo<br/><em>feel different.</em></h1><p>Powerful photo editing, made simple. Fine-tune every detail and export in stunning HD — right from your browser.</p><div className="welcome-points"><span><Check size={14}/> No upload required</span><span><Check size={14}/> HD export</span><span><Check size={14}/> Free to use</span></div></div>
      <div className={`upload-card ${dragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}>
        <div className="upload-icon"><ImagePlus size={28}/></div><h2>Drop your photo here</h2><p>or browse files from your device</p><button className="browse-btn" onClick={() => fileInputRef.current?.click()}><FolderOpen size={17}/> Choose a photo</button><span className="upload-hint">JPG, PNG, WEBP · Max 40 MB</span>
      </div>
      <div className="welcome-bottom"><span>BUILT FOR EVERYDAY CREATORS</span><span>PRIVATE BY DESIGN · YOUR PHOTOS STAY ON YOUR DEVICE</span></div>
    </section> : <section className="workspace">
      <div className="preview-column">
        <div className="preview-toolbar"><div className="preview-label"><span className="live-dot"/> LIVE PREVIEW <span className="preview-dim">{dimensions}</span></div><div className="preview-tools"><button className="small-tool" onClick={() => setZoom(v => Math.max(.5, +(v - .1).toFixed(1)))} title="Zoom out"><ZoomOut size={15}/></button><span>{Math.round(zoom * 100)}%</span><button className="small-tool" onClick={() => setZoom(v => Math.min(1.5, +(v + .1).toFixed(1)))} title="Zoom in"><ZoomIn size={15}/></button><button className="small-tool compare-btn" onMouseDown={() => setBeforeHold(true)} onMouseUp={() => setBeforeHold(false)} onMouseLeave={() => setBeforeHold(false)} onTouchStart={() => setBeforeHold(true)} onTouchEnd={() => setBeforeHold(false)} title="Hold to compare"><MoveHorizontal size={15}/><span>Compare</span></button></div></div>
        <div className="canvas-stage" onDoubleClick={() => setZoom(1)}><div className="canvas-frame" style={{ transform: `scale(${zoom})` }}>{showOriginal || beforeHold ? <span className="compare-tag">ORIGINAL</span> : null}<canvas ref={canvasRef}/></div>{!image && <span/>}</div>
        <div className="preview-footer"><span><span className="status-dot"/> Changes apply instantly</span><span>Double tap preview to fit</span></div>
      </div>

      <aside className="editor-panel">
        <div className="panel-heading"><div><span className="panel-kicker">WORKSPACE</span><h2>Edit your photo</h2></div><button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Open another photo"><ImagePlus size={17}/></button></div>
        <div className="tabbar">{nav.map(item => { const Icon = item.icon; return <button key={item.id} className={`tab-btn ${tab === item.id ? 'active' : ''}`} onClick={() => setTab(item.id)}><Icon size={16}/><span>{item.label}</span></button> })}</div>
        <div className="panel-content" key={tab}>
          {tab === 'adjust' && <>
            <div className="section-title"><div><Sun size={16}/><span>Light & Color</span></div><button className="text-action" onClick={() => commitEdit({ ...edit, adjustments: { ...edit.adjustments, ...defaultEdit.adjustments } })}>Reset all</button></div>
            <div className="group-switch"><button className={activeGroup === 'Light' ? 'selected' : ''} onClick={() => setActiveGroup('Light')}>Light</button><button className={activeGroup === 'Color' ? 'selected' : ''} onClick={() => setActiveGroup('Color')}>Color</button></div>
            <div className="slider-list">{controls.filter(control => control.group === activeGroup).map(control => <Slider key={control.key} label={control.label} value={edit.adjustments[control.key]} min={control.min} max={control.max} onStart={beginSliderEdit} onEnd={finishSliderEdit} onChange={value => setAdjustment(control.key, value)} />)}</div>
            <div className="panel-tip"><Sparkles size={14}/><span>Tip: Small adjustments often create the most natural result.</span></div>
          </>}
          {tab === 'effects' && <><div className="section-title"><div><WandSparkles size={16}/><span>Creative effects</span></div><button className="text-action" onClick={() => commitEdit({ ...edit, adjustments: { ...edit.adjustments, blur: 0, sharpen: 0, vignette: 0, grain: 0, fade: 0 } })}>Reset</button></div><div className="effect-intro">Add depth, texture, and atmosphere to your image.</div><div className="slider-list">{effects.map(effect => <Slider key={effect.key} label={effect.label} value={edit.adjustments[effect.key]} min={effect.min} max={effect.max} suffix={effect.suffix} onStart={beginSliderEdit} onEnd={finishSliderEdit} onChange={value => setAdjustment(effect.key, value)} />)}</div><div className="effect-note"><Gauge size={15}/><span>Sharpen and grain are rendered directly into your exported image.</span></div></>}
          {tab === 'crop' && <><div className="section-title"><div><Crop size={16}/><span>Transform & crop</span></div><button className="text-action" onClick={() => commitEdit({ ...edit, rotation: 0, flipX: false, flipY: false, crop: 'free', zoom: 1 })}>Reset</button></div><div className="sub-label">ASPECT RATIO</div><div className="ratio-grid">{ratios.map(ratio => <button key={ratio} className={edit.crop === ratio ? 'selected' : ''} onClick={() => commitEdit({ ...edit, crop: ratio })}><span className={`ratio-icon ratio-${ratio.replace(':', '-')}`}/>{ratio === 'free' ? 'Original' : ratio}</button>)}</div><div className="sub-label transform-label">ROTATE & FLIP</div><div className="transform-grid"><button onClick={() => commitEdit({ ...edit, rotation: (edit.rotation - 90 + 360) % 360 })}><RotateCcw size={17}/> Rotate left</button><button onClick={() => commitEdit({ ...edit, rotation: (edit.rotation + 90) % 360 })}><RotateCw size={17}/> Rotate right</button><button onClick={() => commitEdit({ ...edit, flipX: !edit.flipX })}><FlipHorizontal size={17}/> Flip horizontal</button><button onClick={() => commitEdit({ ...edit, flipY: !edit.flipY })}><FlipVertical size={17}/> Flip vertical</button></div><Slider label="Zoom crop" value={Math.round((edit.zoom - 1) * 100)} min={0} max={100} suffix="%" onStart={beginSliderEdit} onEnd={finishSliderEdit} onChange={value => updateEdit(current => ({ ...current, zoom: 1 + value / 100 }))}/><div className="panel-tip"><Crop size={14}/><span>Crop is centered. Choose a ratio then zoom to frame your subject.</span></div></>}
          {tab === 'presets' && <><div className="section-title"><div><Sparkles size={16}/><span>Curated presets</span></div><button className="text-action" onClick={() => setShowSavePreset(true)}><Save size={13}/> Save current</button></div><div className="preset-grid">{presets.map(preset => <button className="preset-card" key={preset.name} onClick={() => applyPreset(preset.values)}><span className={`preset-swatch swatch-${preset.name.toLowerCase().replaceAll(' ', '-')}`}><Aperture size={20}/></span><b>{preset.name}</b><small>{preset.description}</small></button>)}</div>{customPresets.length > 0 && <><div className="sub-label custom-heading">MY PRESETS</div><div className="custom-preset-list">{customPresets.map(preset => <div className="custom-preset" key={preset.name}><button onClick={() => applyPreset(preset.values)}><span className="custom-preset-icon"><Palette size={15}/></span><span><b>{preset.name}</b><small>Custom look</small></span></button><button className="delete-preset" title={`Delete ${preset.name}`} onClick={() => deletePreset(preset.name)}><Trash2 size={14}/></button></div>)}</div></>}</>}
          {tab === 'export' && <><div className="section-title"><div><Download size={16}/><span>Export image</span></div><span className="ready-pill"><Check size={11}/> READY</span></div><div className="export-preview"><div className="export-thumb">{image && <img src={image.src} alt="Source preview" />}</div><div><b>{fileName}-edited</b><span>{dimensions} · {formatBytes(fileSize)}</span><small>All edits will be applied</small></div></div><div className="sub-label">OUTPUT SIZE</div><div className="select-stack"><button className={exportScale === 'original' ? 'selected' : ''} onClick={() => setExportScale('original')}><span><b>Original size</b><small>Keep source dimensions</small></span><span>{dimensions}</span></button><button className={exportScale === '1080' ? 'selected' : ''} onClick={() => setExportScale('1080')}><span><b>HD · 1080p</b><small>Fit within Full HD</small></span><span>1920 × 1080</span></button><button className={exportScale === '2x' ? 'selected' : ''} onClick={() => setExportScale('2x')}><span><b>2× Upscale</b><small>Double dimensions · max 8192px</small></span><span>2×</span></button><button className={exportScale === 'custom' ? 'selected' : ''} onClick={() => { setExportScale('custom'); setExportWidth(image?.naturalWidth ?? 1080); setExportHeight(image?.naturalHeight ?? 1080) }}><span><b>Custom size</b><small>Set exact dimensions</small></span><span>↗</span></button></div>{exportScale === 'custom' && <div className="dimension-fields"><label>Width<input type="number" min="1" max="8192" value={exportWidth} onChange={e => setExportWidth(Number(e.target.value))}/></label><label>Height<input type="number" min="1" max="8192" value={exportHeight} onChange={e => setExportHeight(Number(e.target.value))}/></label></div>}<div className="sub-label format-label">FILE FORMAT</div><div className="format-options">{([{value:'image/jpeg',label:'JPG'},{value:'image/png',label:'PNG'},{value:'image/webp',label:'WEBP'}] as const).map(format => <button key={format.value} className={exportFormat === format.value ? 'selected' : ''} onClick={() => setExportFormat(format.value)}>{format.label}</button>)}</div>{exportFormat !== 'image/png' && <Slider label="Quality" value={quality} min={50} max={100} suffix="%" onChange={setQuality}/>}<div className="export-note"><Check size={14}/> Your photo is processed locally. No upload, no watermark.</div><button className="download-btn" disabled={busy} onClick={exportImage}>{busy ? <span className="spinner"/> : <Download size={17}/>} {busy ? 'Processing...' : 'Download image'}</button></>}
        </div>
        <div className="panel-bottom"><span><span className="secure-dot"/> PRIVATE EDITING</span><span>Ctrl + Z to undo</span></div>
      </aside>
    </section>}

    {message && <div className="toast" role="status"><span>{message}</span><button onClick={() => setMessage('')}><X size={14}/></button></div>}
    {showSavePreset && <div className="modal-backdrop" onClick={() => setShowSavePreset(false)}><div className="save-modal" onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="panel-kicker">YOUR LOOK</span><h3>Save as preset</h3></div><button className="icon-btn" onClick={() => setShowSavePreset(false)}><X size={17}/></button></div><p>Save your current adjustments and reuse them on any photo.</p><label className="modal-label">PRESET NAME<input autoFocus maxLength={24} placeholder="e.g. My golden tone" value={customName} onChange={e => setCustomName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') savePreset() }}/></label><button className="download-btn" disabled={!customName.trim()} onClick={savePreset}><Save size={16}/> Save preset</button></div></div>}
    <input ref={fileInputRef} className="hidden-input" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event: ChangeEvent<HTMLInputElement>) => { loadFile(event.target.files?.[0]); event.target.value = '' }}/>
    <footer className="site-footer"><span>© 2026 KANSEDITOR</span><span>CRAFTED FOR YOUR CREATIVITY</span></footer>
  </main>
}

function Slider({ label, value, min, max, suffix = '', onChange, onStart, onEnd }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (value: number) => void; onStart?: () => void; onEnd?: () => void }) {
  const percentage = ((value - min) / (max - min)) * 100
  return <div className="slider-control"><div className="slider-head"><label>{label}</label><div><output>{value > 0 ? '+' : ''}{value}{suffix}</output><button onClick={() => { onStart?.(); onChange(0); onEnd?.() }} title={`Reset ${label}`} disabled={value === 0}><RotateCcw size={12}/></button></div></div><div className="range-wrap"><input type="range" min={min} max={max} step="1" value={value} style={{ background: `linear-gradient(to right, #b7a4ff 0%, #b7a4ff ${percentage}%, #292b35 ${percentage}%, #292b35 100%)` }} onPointerDown={onStart} onPointerUp={onEnd} onPointerCancel={onEnd} onKeyDown={onStart} onKeyUp={onEnd} onBlur={onEnd} onChange={event => onChange(Number(event.target.value))}/></div></div>
}
