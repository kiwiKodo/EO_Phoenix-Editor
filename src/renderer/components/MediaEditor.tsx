import React from 'react'
import ConfirmModal from './ConfirmModal'
import { showNotification } from './Notification'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import TextField from '@mui/material/TextField'
import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import ButtonGroup from '@mui/material/ButtonGroup'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'

// Import border images so Vite includes them in the production build.
import frameSingle from '../assets/borders/frame_single.png'
import frameDouble from '../assets/borders/frame_double.png'
import frameTriple from '../assets/borders/frame_triple.png'

declare global { interface Window { eo: any } }

export default function MediaEditor() {
  const [files, setFiles] = React.useState<(string|null)[]>([])
  const [text, setText] = React.useState('')
  const [activeImage, setActiveImage] = React.useState<number>(0) // index of the image slot being edited
  const [orientation, setOrientation] = React.useState<'portrait'|'landscape'>('portrait')
  // separate persistent zoom for portrait and landscape
  const [scalePortrait, setScalePortrait] = React.useState<number>(() => {
    try {
      const raw = localStorage.getItem('eo-settings')
      if (raw) {
        const parsed = JSON.parse(raw)
        const media = parsed?.media || {}
        if (typeof media.scalePortrait === 'number') return media.scalePortrait
        if (typeof media.scale === 'number') return media.scale
      }
    } catch (e) {}
    return 0.375
  })
  const [scaleLandscape, setScaleLandscape] = React.useState<number>(() => {
    try {
      const raw = localStorage.getItem('eo-settings')
      if (raw) {
        const parsed = JSON.parse(raw)
        const media = parsed?.media || {}
        if (typeof media.scaleLandscape === 'number') return media.scaleLandscape
        if (typeof media.scale === 'number') return media.scale
      }
    } catch (e) {}
    return 0.375
  })
  const currentScale = orientation === 'portrait' ? scalePortrait : scaleLandscape

  // Per-slot image position and scale (index-based). Default initialized on load.
  const [imagePosList, setImagePosList] = React.useState<{ x: number, y: number }[]>([])
  const [imageScaleUserList, setImageScaleUserList] = React.useState<(number|null)[]>([])
  // per-slot text strings (one per image slot)
  const [imageTextList, setImageTextList] = React.useState<string[]>([])
  // caption rendering settings (kept in local state; updated when settings change)
  const [captionSettings, setCaptionSettings] = React.useState(() => ({
    fontSize: 24,
    width: 300,
    padding: 12,
    shrinkToFit: true,
    style: 'boxed'
  }))

  // Hard-coded caption offsets for multi-slot frames. These are intentionally
  // stored in code (not user-editable) so you can tweak them here and rebuild.
   const CAPTION_OFFSETS = {
     horizontal: { double: 31, triple: 40 },
     // vertical offsets for landscape (single value per frame type)
     verticalLandscape: { single: -4, double: -4, triple: -4 },
     // portrait vertical offsets: per-slot arrays
     // single: number, double: [offset0, offset1], triple: [off0, off1, off2]
     verticalPortrait: { single: -5, double: [49, -12], triple: [70, 30, -12] }
   }
   // - horizontal offsets are applied only in landscape mode (portrait captions remain horizontally centered)
   // - verticalPortrait supplies per-slot Y nudges when orientation is portrait
  // Caption box hard-coded height (px). User setting removed — edit this value in code to adjust.
  const CAPTION_BOX_HEIGHT = 60
  // interaction is always with the image
  const [logs, setLogs] = React.useState<string[]>([])

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const imgRef = React.useRef<HTMLImageElement | null>(null)
  const imgSrcRef = React.useRef<string | null>(null)
  const imageElementsRef = React.useRef<Record<number, HTMLImageElement | null>>({})
  const scheduledRef = React.useRef(false)
  const imageCacheRef = React.useRef<Map<string, HTMLImageElement>>(new Map())
  const scaledWrapRef = React.useRef<HTMLDivElement | null>(null)
  const lastPointerRef = React.useRef<{x:number,y:number} | null>(null)
  // keep a ref for activeImage so global event handlers (attached once) can
  // read the latest active slot without re-registering listeners.
  const activeImageRef = React.useRef<number>(0)
  

  const borders = [
    { id: 'single', label: 'Single', src: frameSingle },
    { id: 'double', label: 'Double', src: frameDouble },
    { id: 'triple', label: 'Triple', src: frameTriple },
  ]
  // selectedBorder stores the id ('single'|'double'|'triple') or null for none
  const [selectedBorder, setSelectedBorder] = React.useState<string | null>(borders[0].id)
  const selectedBorderRef = React.useRef<string | null>(selectedBorder)
  const orientationRef = React.useRef<'portrait'|'landscape'>(orientation)
  // confirm modal state for delete action (slot index to delete)
  const [confirmDeleteSlot, setConfirmDeleteSlot] = React.useState<number | null>(null)

  // On mount, restore media state from localStorage if present
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('eo-settings')
      if (!raw) return
      const parsed = JSON.parse(raw)
      const media = parsed?.media
      if (!media) return
      if (media.files && Array.isArray(media.files)) setFiles(media.files)
      else if (media.file && typeof media.file === 'string') setFiles([media.file])
      if (Array.isArray(media.imagePosList)) setImagePosList(media.imagePosList)
      if (Array.isArray(media.imageScaleUserList)) setImageScaleUserList(media.imageScaleUserList)
      if (media.orientation) setOrientation(media.orientation)
      if (media.selectedBorder) {
        const sb = media.selectedBorder
        // support old stored values (src path) or new ids
        const byId = borders.find(b => b.id === sb)
        if (byId) setSelectedBorder(byId.id)
        else {
          const bySrc = borders.find(b => b.src === sb)
          if (bySrc) setSelectedBorder(bySrc.id)
        }
      }
      if (typeof media.text === 'string') setText(media.text)
      if (Array.isArray(media.imageTextList)) setImageTextList(media.imageTextList)
      // load caption settings if present
      try {
        const caps = parsed.captions || (media && media.captionSettings) || null
        if (caps) setCaptionSettings(prev => ({ ...prev, ...(caps || {}) }))
      } catch (e) { /* ignore */ }
    } catch (e) {
      // ignore parse errors
    }
    // run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addLog = (level: string, ...args: any[]) => {
    const entry = `${new Date().toLocaleTimeString()} [${level.toUpperCase()}] ${args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`
    setLogs(l => [...l.slice(-199), entry])
  }

  const clamp = (v: number, lo = 0.1, hi = 3.0) => Math.min(hi, Math.max(lo, v))

  // compute base fit scale for a given slot (ignores any user override)
  const computeSlotBaseFit = (slot: number) => {
    try {
      const canvas = canvasRef.current
      const img = imageElementsRef.current[slot]
      if (!canvas || !img) return 1
      const slotCount = (selectedBorder === 'double') ? 2 : (selectedBorder === 'triple' ? 3 : 1)
      const region = orientation === 'portrait'
        ? { x: 0, y: slot * (canvas.height/slotCount), width: canvas.width, height: canvas.height/slotCount }
        : { x: slot * (canvas.width/slotCount), y: 0, width: canvas.width/slotCount, height: canvas.height }
      const hRatio = region.width / img.width
      const vRatio = region.height / img.height
      return Math.min(hRatio, vRatio)
    } catch (e) { return 1 }
  }

  // load first file into a single persistent Image element
  React.useEffect(() => {
    let cancelled = false
    async function loadEntry(idx: number, entry: any) {
      if (!entry) {
        imageElementsRef.current[idx] = null
        scheduleDraw()
        return
      }

      // unwrap shapes
      let e = entry
      if (Array.isArray(e) && e.length) e = e[0]
      if (e && typeof e === 'object' && (e.filePath || e.path)) e = (e as any).filePath || (e as any).path
      try {
        let src: string | null = null
        if (typeof e === 'string') {
          try {
            // @ts-ignore
            const r = await window.eo?.readFileDataUrl(e)
            if (r && r.ok && r.data) src = r.data
            else src = e
          } catch (err) { src = e }
        } else if (e instanceof Blob) {
          src = URL.createObjectURL(e)
        }

        if (!src) {
          imageElementsRef.current[idx] = null
          addLog('warn', 'No usable src for entry', entry)
          return
        }

        const prev = imageElementsRef.current[idx]
        if (prev && (prev.src === src)) return

        const img = new Image()
        img.onload = () => { if (cancelled) return; imageElementsRef.current[idx] = img; scheduleDraw() }
        img.onerror = (e) => { addLog('error', 'image load error', String(e)); imageElementsRef.current[idx] = null }
        img.src = src
      } catch (err) {
        addLog('error', 'load failed', String(err))
        imageElementsRef.current[idx] = null
      }
    }

    // load up to 3 entries according to files array
    for (let i = 0; i < 3; i++) {
      const entry = files && files.length > i ? files[i] : null
      loadEntry(i, entry)
    }

    return () => { cancelled = true }
  }, [files])

  // preload border images into cache so drawing is immediate
  React.useEffect(() => {
    borders.forEach(b => {
      const src = b.src
      if (imageCacheRef.current.has(src)) return
      const img = new Image()
      img.onload = () => { imageCacheRef.current.set(src, img); scheduleDraw() }
      img.onerror = () => { /* ignore */ }
      img.src = src
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // when selected border changes, redraw immediately
  React.useEffect(() => { scheduleDraw() }, [selectedBorder])

  // persist both orientation scales to localStorage
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('eo-settings')
      const parsed = raw ? JSON.parse(raw) : {}
      parsed.media = parsed.media || {}
      parsed.media.scalePortrait = scalePortrait
      parsed.media.scaleLandscape = scaleLandscape
      // legacy key removed: keep only separate portrait/landscape scales
      localStorage.setItem('eo-settings', JSON.stringify(parsed))
    } catch (e) {}
  }, [scalePortrait, scaleLandscape])

  const scheduleDraw = () => {
    if (scheduledRef.current) return
    scheduledRef.current = true
    requestAnimationFrame(() => { scheduledRef.current = false; draw() })
  }

  // apply CSS transform for zoom when currentScale changes
  React.useEffect(() => {
    const el = scaledWrapRef.current
    if (!el) return
    // Keep transform origin at top-left so client coordinate -> canvas coordinate
    // calculations remain stable while scaling. This avoids dragging jitter
    // when the scaled element's origin would otherwise be centered.
    el.style.transformOrigin = '0 0'
    el.style.transform = `scale(${currentScale})`
    // default cursor to indicate draggable surface
    try { el.style.cursor = 'grab' } catch (e) {}
  }, [currentScale])

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0,0,canvas.width,canvas.height)
    ctx.fillStyle = '#222'
    ctx.fillRect(0,0,canvas.width,canvas.height)

    // Draw each slot's image constrained to its region
    const slotCount = (selectedBorder === 'double') ? 2 : (selectedBorder === 'triple' ? 3 : 1)
    for (let slot = 0; slot < slotCount; slot++) {
      const img = imageElementsRef.current[slot]
      if (!img) continue
      // compute region for this slot
      const region = (() => {
        if (orientation === 'portrait') {
          const h = canvas.height / slotCount
          return { x: 0, y: slot * h, width: canvas.width, height: h }
        } else {
          const w = canvas.width / slotCount
          return { x: slot * w, y: 0, width: w, height: canvas.height }
        }
      })()

      const hRatio = region.width / img.width
      const vRatio = region.height / img.height
      const baseFit = Math.min(hRatio, vRatio)
      const userScale = (imageScaleUserList[slot] ?? null) ?? baseFit
      const iw = img.width * userScale
      const ih = img.height * userScale

      // default pos: center of region
      const pos = imagePosList[slot] ?? { x: region.x + region.width/2, y: region.y + region.height/2 }
      // clip to region so it never visually spills into neighbor
      ctx.save()
      ctx.beginPath()
      ctx.rect(region.x, region.y, region.width, region.height)
      ctx.clip()
      const ix = pos.x - iw/2
      const iy = pos.y - ih/2
      ctx.drawImage(img, ix, iy, iw, ih)
      ctx.restore()
    }

    // text overlay
    ctx.fillStyle = 'white'
    ctx.font = '36px sans-serif'
    ctx.fillText(text || '', 100, 100)

    // border overlay (draw last so frame is top layer)
    if (selectedBorder) {
      try {
        const bInfo = borders.find(x => x.id === selectedBorder)
        const src = bInfo?.src
        const b = src ? imageCacheRef.current.get(src) : null
        if (b) {
          if (orientation === 'portrait') {
            ctx.save()
            ctx.translate(canvas.width / 2, canvas.height / 2)
            ctx.rotate(Math.PI / 2)
            ctx.drawImage(b, -canvas.height / 2, -canvas.width / 2, canvas.height, canvas.width)
            ctx.restore()
          } else {
            ctx.drawImage(b, 0, 0, canvas.width, canvas.height)
          }
        }
      } catch (e) {
        // ignore border draw errors
      }
    }

    // draw per-slot text boxes on top of everything (only if non-empty)
    try {
      const slotCount = (selectedBorder === 'double') ? 2 : (selectedBorder === 'triple' ? 3 : 1)
      for (let slot = 0; slot < slotCount; slot++) {
        const traw = imageTextList[slot]
        if (!traw) continue
        const t = String(traw || '')
        // compute region for this slot
        const region = (() => {
          if (orientation === 'portrait') {
            const h = canvas.height / slotCount
            return { x: 0, y: slot * h, width: canvas.width, height: h }
          } else {
            const w = canvas.width / slotCount
            return { x: slot * w, y: 0, width: w, height: canvas.height }
          }
        })()

        // caption settings (new shape: width/height/padding/shrinkToFit)
        const cs = captionSettings || { fontSize: 20, width: 400, height: 80, padding: 12, shrinkToFit: true }
        const padding = Math.max(0, Math.floor(cs.padding || 0))

  // compute box dimensions constrained by slot region
  const maxAllowedWidth = Math.max(40, region.width - 20)
  const boxWidth = Math.max(40, Math.min(maxAllowedWidth, cs.width || maxAllowedWidth))
  // height is hard-coded; ensure it doesn't exceed the available region height
  const boxHeight = Math.max(8, Math.min(region.height - 20, CAPTION_BOX_HEIGHT))
        const wrapMaxWidth = Math.max(8, boxWidth - padding * 2)

        // helper to wrap text according to current ctx.font and max width
        const wrapText = (text: string, maxWidth: number) => {
          const lines: string[] = []
          const paragraphs = text.split('\n')
          for (const para of paragraphs) {
            const words = para.split(/\s+/).filter(Boolean)
            if (words.length === 0) { lines.push(''); continue }
            let line = words[0]
            for (let wi = 1; wi < words.length; wi++) {
              const w = words[wi]
              const test = line + ' ' + w
              const m = ctx.measureText(test).width
              if (m <= maxWidth) {
                line = test
              } else {
                lines.push(line)
                line = w
              }
            }
            lines.push(line)
          }
          return lines
        }

        // attempt to fit text; allow shrinking if enabled
        let fontSize = Math.max(8, Math.floor(cs.fontSize || 20))
        let lines = [] as string[]
        let lineHeight = Math.max(12, Math.round(fontSize * 1.2))
        let maxLines = Math.max(1, Math.floor((boxHeight - padding * 2) / lineHeight))

        if (cs.shrinkToFit) {
          // decrement font until it fits or reaches minimum
          while (true) {
            ctx.font = `${fontSize}px sans-serif`
            lines = wrapText(t, wrapMaxWidth)
            lineHeight = Math.max(12, Math.round(fontSize * 1.2))
            maxLines = Math.max(1, Math.floor((boxHeight - padding * 2) / lineHeight))
            if (lines.length <= maxLines || fontSize <= 8) break
            fontSize = Math.max(8, fontSize - 1)
          }
        } else {
          ctx.font = `${fontSize}px sans-serif`
          lines = wrapText(t, wrapMaxWidth)
          lineHeight = Math.max(12, Math.round(fontSize * 1.2))
          maxLines = Math.max(1, Math.floor((boxHeight - padding * 2) / lineHeight))
        }

        // truncate with ellipsis if still overflowing
        if (lines.length > maxLines) {
          lines = lines.slice(0, maxLines)
          let last = lines[lines.length - 1]
          let ellipsed = last
          while (ctx.measureText(ellipsed + '…').width > (boxWidth - padding * 2) && ellipsed.length > 0) {
            ellipsed = ellipsed.slice(0, -1)
          }
          lines[lines.length - 1] = ellipsed + '…'
        }

        // compute box position (bottom-centered within slot)
        // apply horizontal offset for multi-slot frames so left/right captions are nudged toward center
        // horizontal offsets are applied only when in landscape; portrait captions remain centered
        let slotOffsetX = 0
        try {
          if (orientation === 'landscape') {
            if (selectedBorder === 'double') {
              const off = CAPTION_OFFSETS.horizontal.double
              // two slots: slot 0 uses `off`, slot 1 uses `-off` to mirror
              slotOffsetX = slot === 0 ? off : (slot === 1 ? -off : 0)
            } else if (selectedBorder === 'triple') {
              const off = CAPTION_OFFSETS.horizontal.triple
              // triple: left (0) -> right (off), middle (1) -> 0, right (2) -> left (-off)
              slotOffsetX = slot === 0 ? off : (slot === 2 ? -off : 0)
            }
          } else {
            slotOffsetX = 0
          }
        } catch (e) { slotOffsetX = 0 }

        const bx = region.x + (region.width - boxWidth) / 2 + slotOffsetX
        // apply a vertical (height) offset per frame type; useful to nudge caption up/down
        const heightOffset = (() => {
          try {
            if (!selectedBorder) return 0
            if (orientation === 'portrait') {
              const vp = (CAPTION_OFFSETS as any).verticalPortrait || {}
              if (selectedBorder === 'single') return vp.single || 0
              if (selectedBorder === 'double') return (vp.double && vp.double[slot]) || 0
              if (selectedBorder === 'triple') return (vp.triple && vp.triple[slot]) || 0
              return 0
            } else {
              const vl = (CAPTION_OFFSETS as any).verticalLandscape || {}
              return vl[selectedBorder as keyof typeof vl] || 0
            }
          } catch (e) { return 0 }
        })()
        const by = region.y + region.height - boxHeight - 20 + heightOffset

        const styleType = (cs as any).style || 'boxed'
        if (styleType === 'boxed') {
          // background
          ctx.fillStyle = 'white'
          ctx.fillRect(bx, by, boxWidth, boxHeight)
          // border
          ctx.strokeStyle = '#444'
          ctx.lineWidth = 2
          ctx.strokeRect(bx + 0.5, by + 0.5, boxWidth - 1, boxHeight - 1)

          // draw lines centered vertically and horizontally within the caption box
          ctx.fillStyle = '#111'
          ctx.textBaseline = 'middle'
          ctx.textAlign = 'center'
          ctx.font = `${fontSize}px sans-serif`
          const totalTextHeight = lines.length * lineHeight
          const innerHeight = boxHeight - padding * 2
          const offsetY = Math.max(0, (innerHeight - totalTextHeight) / 2)
          const startY = by + padding + offsetY + lineHeight / 2
          for (let li = 0; li < lines.length; li++) {
            const L = lines[li]
            const y = startY + li * lineHeight
            ctx.fillText(L, bx + boxWidth / 2, y)
          }
        } else {
          // overlay: no background or border, draw text directly on image
          // use the same plain text style as boxed (black text) — no shadow
          ctx.save()
          ctx.fillStyle = '#111'
          ctx.textBaseline = 'middle'
          ctx.textAlign = 'center'
          ctx.font = `${fontSize}px sans-serif`
          const totalTextHeight = lines.length * lineHeight
          const innerHeight = boxHeight - padding * 2
          const offsetY = Math.max(0, (innerHeight - totalTextHeight) / 2)
          const startY = by + padding + offsetY + lineHeight / 2
          for (let li = 0; li < lines.length; li++) {
            const L = lines[li]
            const y = startY + li * lineHeight
            ctx.fillText(L, bx + boxWidth / 2, y)
          }
          ctx.restore()
        }
      }
    } catch (e) { /* ignore drawing errors */ }
  }

  // schedule draw when relevant state changes
  React.useEffect(() => { scheduleDraw() }, [text, imagePosList, imageScaleUserList, currentScale, orientation, selectedBorder])

  // Persist media state (debounced) so navigating away and back restores the editor
  React.useEffect(() => {
    const to = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem('eo-settings')
        const parsed = raw ? JSON.parse(raw) : {}
        parsed.media = parsed.media || {}
        // store first file path only (if string)
        parsed.media.files = files && files.length ? files : []
        parsed.media.imagePosList = imagePosList
        parsed.media.imageScaleUserList = imageScaleUserList
        parsed.media.imageTextList = imageTextList
        parsed.media.orientation = orientation
  parsed.media.selectedBorder = selectedBorder
        parsed.media.text = text
        localStorage.setItem('eo-settings', JSON.stringify(parsed))
      } catch (e) {
        // ignore storage errors
      }
    }, 500)
    return () => clearTimeout(to)
  }, [files, imagePosList, imageScaleUserList, imageTextList, orientation, selectedBorder, text])

  // Immediate persist helper used for actions that should save synchronously
  const persistMediaNow = () => {
    try {
      const raw = localStorage.getItem('eo-settings')
      const parsed = raw ? JSON.parse(raw) : {}
      parsed.media = parsed.media || {}
      parsed.media.files = files && files.length ? files : []
      parsed.media.imagePosList = imagePosList
      parsed.media.imageScaleUserList = imageScaleUserList
      parsed.media.imageTextList = imageTextList
      parsed.media.orientation = orientation
      parsed.media.selectedBorder = selectedBorder
      parsed.media.text = text
      localStorage.setItem('eo-settings', JSON.stringify(parsed))
    } catch (e) { /* ignore */ }
  }

  const onPickFiles = async () => {
    try {
      // Try to open the picker in the last-used pick folder
      let lastPickFolder: string | undefined
      try {
        const raw = localStorage.getItem('eo-settings')
        const parsed = raw ? JSON.parse(raw) : {}
        lastPickFolder = parsed?.media?.pickFolder
      } catch (e) { /* ignore */ }

      const res = await window.eo?.selectFiles({ defaultPath: lastPickFolder })
      addLog('debug', 'selectFiles ->', res)
      if (res && res.length) {
        // set the picked file into the active image slot
        setFiles(prev => {
          const copy = prev ? [...prev] : []
          copy[activeImage] = res[0]
          return copy
        })
        // ensure position/scale entries exist for the active slot
        try {
          const canvas = canvasRef.current
          const cw = canvas ? canvas.width : (orientation === 'landscape' ? 1600 : 900)
          const ch = canvas ? canvas.height : (orientation === 'landscape' ? 900 : 1600)
          const slotCount = (selectedBorder === 'double') ? 2 : (selectedBorder === 'triple' ? 3 : 1)
          const region = orientation === 'portrait'
            ? { x: 0, y: activeImage * (ch/slotCount), width: cw, height: ch/slotCount }
            : { x: activeImage * (cw/slotCount), y: 0, width: cw/slotCount, height: ch }

          setImagePosList(prev => {
            const copy = prev ? [...prev] : []
            copy[activeImage] = { x: region.x + region.width/2, y: region.y + region.height/2 }
            return copy
          })
          setImageScaleUserList(prev => {
            const copy = prev ? [...prev] : []
            copy[activeImage] = null
            return copy
          })
        } catch (e) { /* ignore */ }
        try {
          const first = res[0]
          if (typeof first === 'string') {
            const idx = Math.max(first.lastIndexOf('\\'), first.lastIndexOf('/'))
            if (idx > 0) {
              const folder = first.substring(0, idx)
              const raw = localStorage.getItem('eo-settings')
              const parsed = raw ? JSON.parse(raw) : {}
              parsed.media = parsed.media || {}
              parsed.media.pickFolder = folder
              localStorage.setItem('eo-settings', JSON.stringify(parsed))
            }
          }
        } catch (e) { /* ignore */ }
      }
    } catch (e) { addLog('error', 'selectFiles failed', String(e)) }
  }

  const onSaveMedia = async () => {
    try {
      // Determine a default filename (local timestamp without ms): YYYY-MM-DDTHH-mm-ss
      const pad = (n: number) => String(n).padStart(2, '0')
      const d = new Date()
      const ts = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
      let defaultName = `${ts}.png`

      // Prefer exporting the canvas (this ensures overlays/frames are included).
      // Call draw() to ensure the canvas is up-to-date, then export.
      const canvas = canvasRef.current
      if (canvas) {
        try {
          // ensure latest state rendered to canvas
          draw()
        } catch (e) {
          // non-fatal
        }
        // Choose whether we need to rotate exported image to portrait when saving.
        // Read persisted system setting rotateDirection (default clockwise).
        let dataUrl: string
        try {
          const raw = localStorage.getItem('eo-settings')
          const parsed = raw ? JSON.parse(raw) : {}
          const rotateDir = parsed?.system?.rotateDirection || 'clockwise'
          if (orientation === 'landscape') {
            // create a temporary canvas with swapped dimensions and rotate the image
            const srcCanvas = canvas
            const rotated = document.createElement('canvas')
            rotated.width = srcCanvas.height
            rotated.height = srcCanvas.width
            const rctx = rotated.getContext('2d') as CanvasRenderingContext2D
            if (rotateDir === 'clockwise') {
              // rotate 90deg clockwise: translate to top-right, rotate, draw
              rctx.translate(rotated.width, 0)
              rctx.rotate(Math.PI / 2)
            } else {
              // rotate 90deg anticlockwise: translate to bottom-left, rotate -90deg
              rctx.translate(0, rotated.height)
              rctx.rotate(-Math.PI / 2)
            }
            rctx.drawImage(srcCanvas, 0, 0)
            dataUrl = rotated.toDataURL('image/png')
          } else {
            dataUrl = canvas.toDataURL('image/png')
          }
        } catch (e) {
          // fallback: no rotation
          dataUrl = canvas.toDataURL('image/png')
        }
        // Suggest last used save folder (if any)
        let lastSaveFolder: string | undefined
        try {
          const raw = localStorage.getItem('eo-settings')
          const parsed = raw ? JSON.parse(raw) : {}
          lastSaveFolder = parsed?.media?.saveFolder
        } catch (e) { /* ignore */ }

        const r = await window.eo?.saveImageAs({ type: 'dataUrl', dataUrl, defaultName, suggestedPath: lastSaveFolder })
        if (r && r.ok) {
          addLog('info', 'Saved image to', r.dest)
          try { showNotification('Saved media to ' + r.dest, 3500, 'success') } catch (e) { /* ignore */ }
          // persist save folder
          try {
            const dest: string = r.dest
            const idx = Math.max(dest.lastIndexOf('\\'), dest.lastIndexOf('/'))
            if (idx > 0) {
              const folder = dest.substring(0, idx)
              const raw = localStorage.getItem('eo-settings')
              const parsed = raw ? JSON.parse(raw) : {}
              parsed.media = parsed.media || {}
              parsed.media.saveFolder = folder
              localStorage.setItem('eo-settings', JSON.stringify(parsed))
            }
          } catch (e) { /* ignore */ }
        } else {
          addLog('error', 'Save failed', r && r.error)
          try { showNotification('Save failed: ' + (r && r.error), 4000, 'error') } catch (e) { /* ignore */ }
        }
        return
      }

      // Fallback: if no canvas, fall back to copying the original file (no overlays)
      const entry = files && files.length ? files[0] : null
      if (entry && typeof entry === 'string' && !/^data:/.test(entry) && !entry.startsWith('blob:')) {
        const m = /\.(png|jpe?g|gif|webp|svg)$/i.exec(entry)
        if (m) defaultName = `${ts}${m[0].toLowerCase()}`
        // Suggest last used save folder
        let lastSaveFolder: string | undefined
        try {
          const raw = localStorage.getItem('eo-settings')
          const parsed = raw ? JSON.parse(raw) : {}
          lastSaveFolder = parsed?.media?.saveFolder
        } catch (e) { /* ignore */ }

        const r = await window.eo?.saveImageAs({ type: 'path', path: entry, defaultName, suggestedPath: lastSaveFolder })
        if (r && r.ok) {
          addLog('info', 'Saved image to', r.dest)
          try { showNotification('Saved media to ' + r.dest, 3500, 'success') } catch (e) { /* ignore */ }
          // persist save folder
          try {
            const dest: string = r.dest
            const idx = Math.max(dest.lastIndexOf('\\'), dest.lastIndexOf('/'))
            if (idx > 0) {
              const folder = dest.substring(0, idx)
              const raw = localStorage.getItem('eo-settings')
              const parsed = raw ? JSON.parse(raw) : {}
              parsed.media = parsed.media || {}
              parsed.media.saveFolder = folder
              localStorage.setItem('eo-settings', JSON.stringify(parsed))
            }
          } catch (e) { /* ignore */ }
        } else {
          addLog('error', 'Save failed', r && r.error)
          try { showNotification('Save failed: ' + (r && r.error), 4000, 'error') } catch (e) { /* ignore */ }
        }
        return
      }

      try { showNotification('No image available to save', 3000, 'error') } catch (e) { /* ignore */ }
    } catch (err) {
      addLog('error', 'Export threw', String(err))
      try { showNotification('Save failed: ' + String(err), 4000, 'error') } catch (e) { /* ignore */ }
    }
  }

  // basic dragging (supports dragging outside the scaledWrap by listening on window)
  const dragging = React.useRef(false)
  const dragMode = React.useRef<'image'|'text'|null>(null)
  const dragLast = React.useRef({ x: 0, y: 0 })

  // global handlers so dragging continues even when the pointer leaves the canvas area
  React.useEffect(() => {
    const onGlobalMove = (e: MouseEvent) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
      if (!dragging.current || dragMode.current !== 'image') return
      const wrap = scaledWrapRef.current
      const canvas = canvasRef.current
      if (!wrap || !canvas) return
      const rect = wrap.getBoundingClientRect()
      const clientX = e.clientX - rect.left
      const clientY = e.clientY - rect.top
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      // compute canvas-space coordinates and ensure pointer remains inside active slot
      const canvasX = clientX * scaleX
      const canvasY = clientY * scaleY
      const idx = activeImageRef.current
      const sb = selectedBorderRef.current
      const slotCount = (sb === 'double') ? 2 : (sb === 'triple' ? 3 : 1)
      const orient = orientationRef.current
      const region = orient === 'portrait'
        ? { x: 0, y: idx * (canvas.height/slotCount), width: canvas.width, height: canvas.height/slotCount }
        : { x: idx * (canvas.width/slotCount), y: 0, width: canvas.width/slotCount, height: canvas.height }
      if (canvasX < region.x || canvasX > region.x + region.width || canvasY < region.y || canvasY > region.y + region.height) {
        // pointer left the active slot: cancel dragging
        dragging.current = false
        dragMode.current = null
        return
      }

      const dxClient = clientX - dragLast.current.x
      const dyClient = clientY - dragLast.current.y
      dragLast.current = { x: clientX, y: clientY }
      const dx = dxClient * scaleX
      const dy = dyClient * scaleY
      setImagePosList(prev => {
        const copy = prev ? [...prev] : []
        const prevPos = copy[idx] || { x: canvas.width/2, y: canvas.height/2 }
        let nx = prevPos.x + dx
        let ny = prevPos.y + dy
        // clamp to slot region so center stays inside its region
        nx = Math.max(region.x, Math.min(region.x + region.width, nx))
        ny = Math.max(region.y, Math.min(region.y + region.height, ny))
        copy[idx] = { x: nx, y: ny }
        return copy
      })
    }

    const onGlobalUp = (e: MouseEvent) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
      dragging.current = false
      dragMode.current = null
    }

    window.addEventListener('mousemove', onGlobalMove)
    window.addEventListener('mouseup', onGlobalUp)
    // listen for settings changes (dispatched by SettingsEditor auto-save)
    const onSettingsChanged = (ev: any) => {
      try {
        const raw = localStorage.getItem('eo-settings')
        const parsed = raw ? JSON.parse(raw) : {}
        const caps = parsed.captions || (parsed.media && parsed.media.captionSettings) || null
        if (caps) setCaptionSettings(prev => ({ ...prev, ...(caps || {}) }))
      } catch (e) { /* ignore */ }
      scheduleDraw()
    }
    window.addEventListener('eo:settings-changed', onSettingsChanged as EventListener)
    return () => {
      window.removeEventListener('mousemove', onGlobalMove)
      window.removeEventListener('mouseup', onGlobalUp)
      window.removeEventListener('eo:settings-changed', onSettingsChanged as EventListener)
    }
  }, [])

  // sync activeImageRef whenever activeImage state changes
  React.useEffect(() => { activeImageRef.current = activeImage }, [activeImage])
  React.useEffect(() => { selectedBorderRef.current = selectedBorder }, [selectedBorder])
  React.useEffect(() => { orientationRef.current = orientation }, [orientation])

  // orientation change does not need to set state here because currentScale is derived

  const onMouseDown = (e: React.MouseEvent) => {
    const wrap = scaledWrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    // compute click position in canvas space so we can select the clicked slot
    const rect = wrap.getBoundingClientRect()
    const clientX = e.clientX - rect.left
    const clientY = e.clientY - rect.top
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const canvasX = clientX * scaleX
    const canvasY = clientY * scaleY
    const slotCount = (selectedBorder === 'double') ? 2 : (selectedBorder === 'triple' ? 3 : 1)
    const clickedSlot = orientation === 'portrait'
      ? Math.min(slotCount - 1, Math.max(0, Math.floor(canvasY / (canvas.height / slotCount))))
      : Math.min(slotCount - 1, Math.max(0, Math.floor(canvasX / (canvas.width / slotCount))))

    // set active image to the clicked slot immediately (also update ref used by global handlers)
    setActiveImage(clickedSlot)
    activeImageRef.current = clickedSlot

    // begin dragging for the selected slot
    dragging.current = true
    dragMode.current = 'image'
    // show grabbing cursor for feedback
    try { wrap.style.cursor = 'grabbing' } catch (e) {}
    dragLast.current = { x: clientX, y: clientY }
    lastPointerRef.current = { x: e.clientX, y: e.clientY }
  }

  const onMouseUp = (e?: React.MouseEvent) => {
    dragging.current = false
    dragMode.current = null
    const wrap = scaledWrapRef.current
    if (wrap) try { wrap.style.cursor = 'grab' } catch (e) {}
  }

  const onMouseMove = (e: React.MouseEvent) => {
    lastPointerRef.current = { x: e.clientX, y: e.clientY }
    if (!dragging.current) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const canvas = canvasRef.current
    if (!canvas) return
    const clientX = e.clientX - rect.left
    const clientY = e.clientY - rect.top
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if (dragMode.current === 'text') { /* simple: ignore for now */ return }
    if (dragMode.current === 'image') {
      // compute canvas-space coordinates and cancel if pointer leaves active slot
      const canvasX = clientX * scaleX
      const canvasY = clientY * scaleY
      const idx = activeImageRef.current
      const slotCount = (selectedBorder === 'double') ? 2 : (selectedBorder === 'triple' ? 3 : 1)
      const region = orientation === 'portrait'
        ? { x: 0, y: idx * (canvas.height/slotCount), width: canvas.width, height: canvas.height/slotCount }
        : { x: idx * (canvas.width/slotCount), y: 0, width: canvas.width/slotCount, height: canvas.height }
      if (canvasX < region.x || canvasX > region.x + region.width || canvasY < region.y || canvasY > region.y + region.height) {
        dragging.current = false
        dragMode.current = null
        return
      }

      const dxClient = clientX - dragLast.current.x
      const dyClient = clientY - dragLast.current.y
      dragLast.current = { x: clientX, y: clientY }
      const dx = dxClient * scaleX
      const dy = dyClient * scaleY
      setImagePosList(prev => {
        const copy = prev ? [...prev] : []
        const prevPos = copy[idx] || { x: canvas.width/2, y: canvas.height/2 }
        let nx = prevPos.x + dx
        let ny = prevPos.y + dy
        // clamp to slot region
        nx = Math.max(region.x, Math.min(region.x + region.width, nx))
        ny = Math.max(region.y, Math.min(region.y + region.height, ny))
        copy[idx] = { x: nx, y: ny }
        return copy
      })
    }
  }

  return (
    <div className="editor">
      <aside className="sidebar">
        <div className="controls">
          <div>
            <label className="sectionHeader">Orientation</label>
            <div className="orientationRow">
              <div className="orientationToggle">
                <button className={`toggleBtn ${orientation === 'portrait' ? 'active' : ''}`} onClick={() => setOrientation('portrait')}>Portrait</button>
                <button className={`toggleBtn ${orientation === 'landscape' ? 'active' : ''}`} onClick={() => setOrientation('landscape')}>Landscape</button>
              </div>

              <div className="zoomBtns" aria-label="zoom controls">
                <button aria-label="Decrease zoom" title="Decrease zoom" onClick={() => {
                  if (orientation === 'portrait') setScalePortrait(s => Math.max(0.1, +(s - 0.1).toFixed(3)))
                  else setScaleLandscape(s => Math.max(0.1, +(s - 0.1).toFixed(3)))
                }}>-</button>
                <button aria-label="Increase zoom" title="Increase zoom" onClick={() => {
                  if (orientation === 'portrait') setScalePortrait(s => Math.min(1.0, +(s + 0.1).toFixed(3)))
                  else setScaleLandscape(s => Math.min(1.5, +(s + 0.1).toFixed(3)))
                }}>+</button>
              </div>
            </div>
          </div>

          <div>
            <label className="sectionHeader">Frames</label>
            <div className="framesRow">
              {borders.map(b => (
                <button key={b.id} onClick={() => setSelectedBorder(b.id)} title={b.label} className={`frameBtn ${selectedBorder === b.id ? 'frameSelected' : ''}`}>
                  {b.label}
                </button>
              ))}
              <button onClick={() => setSelectedBorder(null)} title="No frame" className={`frameBtn ${selectedBorder === null ? 'frameSelected' : ''}`}>None</button>
            </div>
          </div>

          {/* Per-image controls: Pick/Scale/Text/Update/Delete for each slot */}
          {(() => {
            const slotCount = (selectedBorder === 'double' ? 2 : (selectedBorder === 'triple' ? 3 : 1))
            return Array.from({ length: slotCount }).map((_, slot) => (
              <div key={slot} className="imageSlotBlock">
                <h4>Image {slot + 1}</h4>
                <div className="slotControls">
                  <button onClick={async () => {
                    try {
                      // Try to open the picker in the last-used pick folder
                      let lastPickFolder: string | undefined
                      try {
                        const raw = localStorage.getItem('eo-settings')
                        const parsed = raw ? JSON.parse(raw) : {}
                        lastPickFolder = parsed?.media?.pickFolder
                      } catch (e) { /* ignore */ }

                      const res = await window.eo?.selectFiles({ defaultPath: lastPickFolder })
                      addLog('debug', 'selectFiles ->', res)
                      if (res && res.length) {
                        setFiles(prev => {
                          const copy = prev ? [...prev] : []
                          copy[slot] = res[0]
                          return copy
                        })
                        // ensure position/scale entries exist for the slot
                        try {
                          const canvas = canvasRef.current
                          const cw = canvas ? canvas.width : (orientation === 'landscape' ? 1600 : 900)
                          const ch = canvas ? canvas.height : (orientation === 'landscape' ? 900 : 1600)
                          const region = orientation === 'portrait'
                            ? { x: 0, y: slot * (ch / slotCount), width: cw, height: ch / slotCount }
                            : { x: slot * (cw / slotCount), y: 0, width: cw / slotCount, height: ch }

                          setImagePosList(prev => {
                            const copy = prev ? [...prev] : []
                            copy[slot] = { x: region.x + region.width / 2, y: region.y + region.height / 2 }
                            return copy
                          })
                          setImageScaleUserList(prev => {
                            const copy = prev ? [...prev] : []
                            copy[slot] = null
                            return copy
                          })
                        } catch (e) { /* ignore */ }
                        try {
                          const first = res[0]
                          if (typeof first === 'string') {
                            const idx = Math.max(first.lastIndexOf('\\'), first.lastIndexOf('/'))
                            if (idx > 0) {
                              const folder = first.substring(0, idx)
                              const raw = localStorage.getItem('eo-settings')
                              const parsed = raw ? JSON.parse(raw) : {}
                              parsed.media = parsed.media || {}
                              parsed.media.pickFolder = folder
                              localStorage.setItem('eo-settings', JSON.stringify(parsed))
                            }
                          }
                        } catch (e) { /* ignore */ }
                      }
                    } catch (e) { addLog('error', 'selectFiles failed', String(e)) }
                  }}>Pick Image</button>

                  <div className="scaleControls">
                    <button aria-label="Decrease scale by 10 percent" onClick={() => {
                      setImageScaleUserList(prev => {
                        const copy = prev ? [...prev] : []
                        let cur = copy[slot]
                        if (cur == null) cur = computeSlotBaseFit(slot)
                        copy[slot] = clamp(cur * 0.9)
                        return copy
                      })
                    }}>-10%</button>
                    <button aria-label="Decrease scale by 1 percent" onClick={() => {
                      setImageScaleUserList(prev => {
                        const copy = prev ? [...prev] : []
                        let cur = copy[slot]
                        if (cur == null) cur = computeSlotBaseFit(slot)
                        copy[slot] = clamp(cur * 0.99)
                        return copy
                      })
                    }}>-1%</button>
                    <button aria-label="Increase scale by 1 percent" onClick={() => {
                      setImageScaleUserList(prev => {
                        const copy = prev ? [...prev] : []
                        let cur = copy[slot]
                        if (cur == null) cur = computeSlotBaseFit(slot)
                        copy[slot] = clamp(cur * 1.01)
                        return copy
                      })
                    }}>+1%</button>
                    <button aria-label="Increase scale by 10 percent" onClick={() => {
                      setImageScaleUserList(prev => {
                        const copy = prev ? [...prev] : []
                        let cur = copy[slot]
                        if (cur == null) cur = computeSlotBaseFit(slot)
                        copy[slot] = clamp(cur * 1.1)
                        return copy
                      })
                    }}>+10%</button>
                  </div>

                  <div className="textControls">
                    <label>Caption</label>
                    <textarea placeholder={`Text for image ${slot + 1}`} value={imageTextList[slot] || ''} onChange={e => {
                      const v = e.target.value
                      setImageTextList(prev => {
                        const copy = prev ? [...prev] : []
                        copy[slot] = v
                        return copy
                      })
                    }} />
                    <div className="actions">
                      <button onClick={() => { scheduleDraw(); try { persistMediaNow() } catch (e) {} }}>Update Text</button>
                      <button onClick={() => setConfirmDeleteSlot(slot)}>Delete Image</button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          })()}

          <div className="controlBlock">
            <button className="primary" onClick={onSaveMedia} disabled={!files || files.length === 0}>Save media</button>
          </div>

          <div className="logsSection">
            <label>Logs</label>
            <div className="logsBox">
              {logs.length === 0 ? <div className="logsEmpty">No logs yet</div> : logs.map((l,i) => <div key={i} className="logsItem">{l}</div>)}
            </div>
            <div className="logActions">
              <button onClick={() => setLogs([])}>Clear</button>
              <button onClick={() => navigator.clipboard?.writeText(logs.join('\n'))}>Copy</button>
            </div>
          </div>
        </div>
      </aside>

  <div className="canvasAndTrash">
        <div className="canvasContainer">
          <div onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseMove={onMouseMove} className="scaledWrap" ref={scaledWrapRef}>
            <canvas className={`canvasDisplay ${orientation === 'landscape' ? 'landscape' : 'portrait'}`} ref={canvasRef} width={orientation==='landscape'?1600:900} height={orientation==='landscape'?900:1600} />
          </div>
        </div>

        {/* drag-to-delete removed; per-slot delete button is provided in the slot controls */}
      </div>
        {/* In-app confirm modal to avoid native blocking confirm() */}
        <ConfirmModal
          open={confirmDeleteSlot !== null}
          title="Delete image?"
          message={confirmDeleteSlot !== null ? `Are you sure you want to remove the image in slot ${confirmDeleteSlot + 1}? This cannot be undone.` : ''}
          confirmText="Delete"
          danger={true}
          onConfirm={async () => {
            try {
              const slot = confirmDeleteSlot as number
              setFiles(prev => {
                const copy = prev ? [...prev] : []
                copy[slot] = null
                return copy
              })
              try { if (imageElementsRef && imageElementsRef.current) imageElementsRef.current[slot] = null } catch (e) {}
              setImagePosList(prev => {
                const copy = prev ? [...prev] : []
                copy[slot] = { x: 0, y: 0 }
                return copy
              })
              setImageScaleUserList(prev => {
                const copy = prev ? [...prev] : []
                copy[slot] = null
                return copy
              })
              setImageTextList(prev => {
                const copy = prev ? [...prev] : []
                copy[slot] = ''
                return copy
              })
              addLog('info', 'Deleted image in slot', String(slot))
            } catch (e) {
              addLog('error', 'Delete failed', String(e))
            } finally {
              setConfirmDeleteSlot(null)
              dragging.current = false
              dragMode.current = null
              lastPointerRef.current = null
              try { (document.activeElement as HTMLElement | null)?.blur() } catch (e) {}
              scheduleDraw()
            }
          }}
          onCancel={() => {
            setConfirmDeleteSlot(null)
            dragging.current = false
            dragMode.current = null
            lastPointerRef.current = null
            try { (document.activeElement as HTMLElement | null)?.blur() } catch (e) {}
          }}
        />

      </div>
    )
  }

  // helper to clear any loaded image element for a slot
 

// Render a lightweight confirm modal in the document body to confirm slot deletion.
// Keep this outside the component's main return to avoid JSX duplication; we will use
// a portal-like approach by conditionally rendering at the end of the file via React.createElement

// Confirm modal styles are in styles.css; we render a simple in-app modal when
// `confirmDeleteSlot` is set so we avoid the native blocking confirm() which
// can cause focus/pointer issues in Electron/Chromium.

