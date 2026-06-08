import './style.css'
import { FONTS, WEIGHTS } from './fonts.js'

// ─── STATE ────────────────────────────────────────────────────────
const state = {
  fontFamily: 'IBM Plex Sans',
  fontSize: 150,
  fontWeight: 400,
  lineHeight: 1.4,
  color: '#1e50c8',
  loadedFonts: new Set(),
}

// ─── GOOGLE FONTS LOADER ──────────────────────────────────────────
function loadGoogleFont(name, weights = [100,200,300,400,500,600,700,800,900]) {
  if (state.loadedFonts.has(name)) return
  const font = FONTS.find(f => f.name === name)
  if (!font || !font.google) return
  const slug = name.replace(/ /g, '+')
  const wStr = weights.map(w => `0,${w};1,${w}`).join(';')
  const url = `https://fonts.googleapis.com/css2?family=${slug}:ital,wght@${wStr}&display=swap`
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
  state.loadedFonts.add(name)
}

// Pre-load initial font
loadGoogleFont('IBM Plex Sans')
loadGoogleFont('IBM Plex Mono')

// ─── DOM REFS ─────────────────────────────────────────────────────
const editor = document.getElementById('editor')
const fontSelect = document.getElementById('font-select')
const weightSelect = document.getElementById('weight-select')
const fontDropdown = document.getElementById('font-dropdown')
const weightDropdown = document.getElementById('weight-dropdown')
const sizeInput = document.getElementById('size-input')
const colorInput = document.getElementById('color-input')
const colorPreview = document.getElementById('color-preview')
const wordCount = document.getElementById('word-count')
const charCount = document.getElementById('char-count')
const statusFont = document.getElementById('status-font')

// ─── BUILD FONT SELECT ────────────────────────────────────────────
const categories = ['sans', 'serif', 'mono', 'display']
const catLabels = { sans: 'Sans-Serif', serif: 'Serif', mono: 'Monospace', display: 'Display' }

categories.forEach(cat => {
  const group = document.createElement('optgroup')
  group.label = catLabels[cat]
  FONTS.filter(f => f.category === cat).forEach(f => {
    const opt = document.createElement('option')
    opt.value = f.name
    opt.textContent = f.name
    if (f.name === state.fontFamily) opt.selected = true
    group.appendChild(opt)
  })
  fontSelect.appendChild(group)
})

// ─── BUILD WEIGHT SELECT ──────────────────────────────────────────
WEIGHTS.forEach(w => {
  const opt = document.createElement('option')
  opt.value = w.value
  opt.textContent = `${w.value} — ${w.label}`
  if (w.value === state.fontWeight) opt.selected = true
  weightSelect.appendChild(opt)
})

function setupCustomDropdown(selectEl, dropdownEl) {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'tb-dropdown-btn'
  btn.innerHTML = `
    <span class="tb-dropdown-label"></span>
    <span class="tb-dropdown-caret">▾</span>
  `

  const menu = document.createElement('div')
  menu.className = 'tb-dropdown-menu'

  const updateLabel = () => {
    const current = selectEl.options[selectEl.selectedIndex]
    btn.querySelector('.tb-dropdown-label').textContent = current ? current.textContent : ''
    menu.querySelectorAll('.tb-dropdown-option').forEach(optionBtn => {
      optionBtn.classList.toggle('active', optionBtn.dataset.value === selectEl.value)
    })
  }

  const setValue = (value) => {
    if (selectEl.value === value) return
    selectEl.value = value
    selectEl.dispatchEvent(new Event('change', { bubbles: true }))
    updateLabel()
  }

  const children = [...selectEl.children]
  children.forEach(node => {
    if (node.tagName === 'OPTGROUP') {
      const groupLabel = document.createElement('div')
      groupLabel.className = 'tb-dropdown-group'
      groupLabel.textContent = node.label
      menu.appendChild(groupLabel)

      ;[...node.children].forEach(opt => {
        const optionBtn = document.createElement('button')
        optionBtn.type = 'button'
        optionBtn.className = 'tb-dropdown-option'
        optionBtn.textContent = opt.textContent
        optionBtn.dataset.value = opt.value
        optionBtn.addEventListener('click', () => {
          setValue(opt.value)
          dropdownEl.classList.remove('open')
          editor.focus()
        })
        menu.appendChild(optionBtn)
      })
      return
    }

    if (node.tagName === 'OPTION') {
      const optionBtn = document.createElement('button')
      optionBtn.type = 'button'
      optionBtn.className = 'tb-dropdown-option'
      optionBtn.textContent = node.textContent
      optionBtn.dataset.value = node.value
      optionBtn.addEventListener('click', () => {
        setValue(node.value)
        dropdownEl.classList.remove('open')
        editor.focus()
      })
      menu.appendChild(optionBtn)
    }
  })

  btn.addEventListener('click', () => {
    const willOpen = !dropdownEl.classList.contains('open')
    document.querySelectorAll('.tb-dropdown.open').forEach(el => el.classList.remove('open'))
    dropdownEl.classList.toggle('open', willOpen)
  })

  selectEl.addEventListener('change', updateLabel)

  dropdownEl.appendChild(btn)
  dropdownEl.appendChild(menu)
  updateLabel()
}

setupCustomDropdown(fontSelect, fontDropdown)
setupCustomDropdown(weightSelect, weightDropdown)

document.addEventListener('click', (event) => {
  if (event.target.closest('.tb-dropdown')) return
  document.querySelectorAll('.tb-dropdown.open').forEach(el => el.classList.remove('open'))
})

// ─── APPLY STATE TO EDITOR ────────────────────────────────────────
function applyEditorStyle() {
  editor.style.fontFamily = `"${state.fontFamily}", serif`
  editor.style.fontSize = `${state.fontSize}px`
  editor.style.fontWeight = state.fontWeight
  editor.style.lineHeight = state.lineHeight
  editor.style.color = state.color
  statusFont.textContent = `${state.fontFamily} ${state.fontWeight}`
}

applyEditorStyle()

// ─── FONT CHANGE ──────────────────────────────────────────────────
fontSelect.addEventListener('change', () => {
  state.fontFamily = fontSelect.value
  loadGoogleFont(state.fontFamily)
  applyEditorStyle()
  editor.focus()
})

// ─── WEIGHT CHANGE ────────────────────────────────────────────
weightSelect.addEventListener('change', () => {
  state.fontWeight = parseInt(weightSelect.value)
  applyEditorStyle()
  editor.focus()
})

// ─── FONT SIZE ────────────────────────────────────────────────────
sizeInput.value = state.fontSize

sizeInput.addEventListener('input', () => {
  const v = parseInt(sizeInput.value)
  if (v >= 8 && v <= 300) { state.fontSize = v; applyEditorStyle() }
})

document.getElementById('size-up').addEventListener('click', () => {
  state.fontSize = Math.min(300, state.fontSize + 1)
  sizeInput.value = state.fontSize
  applyEditorStyle()
  editor.focus()
})

document.getElementById('size-down').addEventListener('click', () => {
  state.fontSize = Math.max(8, state.fontSize - 1)
  sizeInput.value = state.fontSize
  applyEditorStyle()
  editor.focus()
})

// ─── COLOR ────────────────────────────────────────────────────────
colorInput.addEventListener('input', () => {
  state.color = colorInput.value
  colorPreview.style.background = state.color
  applyEditorStyle()
})

// ─── FORMAT COMMANDS ──────────────────────────────────────────────
document.querySelectorAll('.tb-btn[data-cmd]').forEach(btn => {
  btn.addEventListener('mousedown', e => {
    e.preventDefault()
    document.execCommand(btn.dataset.cmd, false, null)
    updateActiveStates()
    editor.focus()
  })
})

function updateActiveStates() {
  const cmds = ['bold', 'italic', 'underline', 'strikeThrough']
  cmds.forEach(cmd => {
    const btn = document.querySelector(`.tb-btn[data-cmd="${cmd}"]`)
    if (btn) btn.classList.toggle('active', document.queryCommandState(cmd))
  })
  // alignment
  const aligns = ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull']
  aligns.forEach(cmd => {
    const btn = document.querySelector(`.tb-btn[data-cmd="${cmd}"]`)
    if (btn) btn.classList.toggle('active', document.queryCommandState(cmd))
  })
}

editor.addEventListener('keyup', updateActiveStates)
editor.addEventListener('mouseup', updateActiveStates)
editor.addEventListener('selectionchange', updateActiveStates)

// ─── LINE HEIGHT ──────────────────────────────────────────────────
document.querySelectorAll('.tb-lh-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tb-lh-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    state.lineHeight = parseFloat(btn.dataset.lh)
    applyEditorStyle()
    editor.focus()
  })
})

// ─── WORD / CHAR COUNT ────────────────────────────────────────────
function updateCounts() {
  const text = editor.innerText.trim()
  const words = text ? text.split(/\s+/).length : 0
  const chars = text.replace(/\s/g, '').length
  wordCount.textContent = words
  charCount.textContent = chars
}

function createOrganicGlyph(char) {
  const glyph = document.createElement('span')
  glyph.className = 'organic-glyph'
  glyph.textContent = char
  glyph.style.setProperty('--glyph-drift-x', `${Math.round((Math.random() - 0.5) * 4)}px`)
  glyph.style.setProperty('--glyph-drift-y', `${Math.round((Math.random() - 0.5) * 4)}px`)
  return glyph
}

const DLA_CACHE = new Map()
let ACTIVE_STAIN_COUNT = 0
let ACTIVE_CORRUPTIONS = 0
const MAX_ACTIVE_STAINS = 1400
const MAX_ACTIVE_CORRUPTIONS = 32
const CORRUPTION_COOLDOWN_MS = 140
const DLA_DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

function getGlyphStyleSignature(glyph) {
  const cs = window.getComputedStyle(glyph)
  return {
    fontFamily: cs.fontFamily,
    fontWeight: cs.fontWeight,
    fontStyle: cs.fontStyle,
    signature: `${glyph.textContent}|${cs.fontFamily}|${cs.fontWeight}|${cs.fontStyle}`,
  }
}

function buildGlyphMask(char, style, size = 26) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  ctx.clearRect(0, 0, size, size)
  const px = Math.floor(size * 0.86)
  ctx.fillStyle = '#000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${px}px ${style.fontFamily}`
  ctx.fillText(char, size / 2, size / 2)

  const data = ctx.getImageData(0, 0, size, size).data
  const mask = new Uint8Array(size * size)
  const boundary = []
  const opaque = []
  const threshold = 24
  const idx = (x, y) => y * size + x

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const alpha = data[(idx(x, y) * 4) + 3]
      if (alpha <= threshold) continue
      mask[idx(x, y)] = 1
      opaque.push([x, y])
    }
  }

  if (opaque.length === 0) return null

  for (let i = 0; i < opaque.length; i += 1) {
    const [x, y] = opaque[i]
    let isBoundary = false
    for (let d = 0; d < DLA_DIRS.length; d += 1) {
      const nx = x + DLA_DIRS[d][0]
      const ny = y + DLA_DIRS[d][1]
      if (nx < 0 || ny < 0 || nx >= size || ny >= size || !mask[idx(nx, ny)]) {
        isBoundary = true
        break
      }
    }
    if (isBoundary) boundary.push([x, y])
  }

  return { size, mask, boundary, opaque }
}

function nearestOpaqueToCenter(opaque, size) {
  const cx = (size - 1) / 2
  const cy = (size - 1) / 2
  let best = opaque[0]
  let bestDist = Number.POSITIVE_INFINITY
  for (let i = 0; i < opaque.length; i += 1) {
    const [x, y] = opaque[i]
    const dx = x - cx
    const dy = y - cy
    const dist = (dx * dx) + (dy * dy)
    if (dist < bestDist) {
      bestDist = dist
      best = [x, y]
    }
  }
  return best
}

function simulateDLA(maskData, particleCount = 18, maxSteps = 170) {
  const { size, mask, boundary, opaque } = maskData
  const idx = (x, y) => y * size + x
  const occupied = new Set()
  const points = []

  const seed = nearestOpaqueToCenter(opaque, size)
  occupied.add(idx(seed[0], seed[1]))
  points.push(seed)

  const isMasked = (x, y) => x >= 0 && y >= 0 && x < size && y < size && mask[idx(x, y)] === 1
  const hasOccupiedNeighbor = (x, y) => {
    for (let d = 0; d < DLA_DIRS.length; d += 1) {
      const nx = x + DLA_DIRS[d][0]
      const ny = y + DLA_DIRS[d][1]
      if (occupied.has(idx(nx, ny))) return true
    }
    return false
  }

  while (points.length < particleCount) {
    const start = boundary[Math.floor(Math.random() * boundary.length)]
    let x = start[0]
    let y = start[1]
    let stuck = false

    for (let step = 0; step < maxSteps; step += 1) {
      if (isMasked(x, y) && hasOccupiedNeighbor(x, y)) {
        const key = idx(x, y)
        if (!occupied.has(key)) {
          occupied.add(key)
          points.push([x, y])
        }
        stuck = true
        break
      }

      const dir = DLA_DIRS[Math.floor(Math.random() * DLA_DIRS.length)]
      const nx = x + dir[0]
      const ny = y + dir[1]
      if (isMasked(nx, ny)) {
        x = nx
        y = ny
      }
    }

    if (!stuck) {
      const fallback = opaque[Math.floor(Math.random() * opaque.length)]
      const key = idx(fallback[0], fallback[1])
      if (!occupied.has(key)) {
        occupied.add(key)
        points.push([fallback[0], fallback[1]])
      }
    }
  }

  return points.map(([x, y]) => ({
    x: x / (size - 1),
    y: y / (size - 1),
  }))
}

function getDLAPointsForGlyph(glyph) {
  const char = glyph.textContent || ''
  if (!char.trim()) return []

  const style = getGlyphStyleSignature(glyph)
  const cacheKey = style.signature
  if (DLA_CACHE.has(cacheKey)) return DLA_CACHE.get(cacheKey)

  const mask = buildGlyphMask(char, style)
  if (!mask) return []

  const points = simulateDLA(mask, 20 + Math.floor(Math.random() * 8), 180)
  DLA_CACHE.set(cacheKey, points)
  return points
}

function spawnStain(glyph, point, order) {
  if (ACTIVE_STAIN_COUNT >= MAX_ACTIVE_STAINS) return
  const stain = document.createElement('span')
  stain.className = 'glyph-stain'
  ACTIVE_STAIN_COUNT += 1

  const size = 0.16 + Math.random() * 0.36
  const delay = Math.round(order * 6 + Math.random() * 18)
  const duration = 500 + Math.round(Math.random() * 520)
  const tone = Math.random() * 0.25
  const rotate = Math.round((Math.random() - 0.5) * 140)
  const skew = Math.round((Math.random() - 0.5) * 18)

  stain.style.setProperty('--stain-size', `${size}`)
  stain.style.setProperty('--stain-x', `${point.x}`)
  stain.style.setProperty('--stain-y', `${point.y}`)
  stain.style.setProperty('--stain-delay', `${delay}ms`)
  stain.style.setProperty('--stain-duration', `${duration}ms`)
  stain.style.setProperty('--stain-tone', `${tone}`)
  stain.style.setProperty('--stain-rotate', `${rotate}deg`)
  stain.style.setProperty('--stain-skew', `${skew}deg`)
  glyph.appendChild(stain)

  stain.addEventListener('animationend', () => {
    ACTIVE_STAIN_COUNT = Math.max(0, ACTIVE_STAIN_COUNT - 1)
    stain.remove()
  }, { once: true })
}

function makeGrowthWave(points, jitter = 0.12) {
  const wave = []
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i]
    const jx = (Math.random() * 2 - 1) * jitter
    const jy = (Math.random() * 2 - 1) * jitter
    const nx = Math.max(-0.15, Math.min(1.15, p.x + jx))
    const ny = Math.max(-0.15, Math.min(1.15, p.y + jy))
    wave.push({ x: nx, y: ny })
  }
  return wave
}

function decomposeGlyph(glyph) {
  if (!glyph || glyph.classList.contains('is-decomposing') || glyph.classList.contains('is-decomposed')) return
  if (ACTIVE_STAIN_COUNT >= MAX_ACTIVE_STAINS - 120) return
  glyph.classList.add('is-decomposing')

  const points = getDLAPointsForGlyph(glyph)
  const stains = points.length > 0 ? points : [{ x: 0.5, y: 0.5 }]
  stains.forEach((p, i) => spawnStain(glyph, p, i))

  // Growth continues after hover with 2 extra waves.
  window.setTimeout(() => {
    const wave2 = makeGrowthWave(stains, 0.16)
    wave2.forEach((p, i) => spawnStain(glyph, p, i + stains.length))
  }, 180)

  window.setTimeout(() => {
    glyph.classList.add('is-decomposed')
  }, 520)

  window.setTimeout(() => {
    glyph.classList.remove('is-decomposing')
  }, 860)
}

function insertAnimatedText(text) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return false

  const range = selection.getRangeAt(0)
  range.deleteContents()

  const fragment = document.createDocumentFragment()
  const chars = [...text]
  chars.forEach(char => fragment.appendChild(createOrganicGlyph(char)))

  const lastNode = fragment.lastChild
  range.insertNode(fragment)

  if (lastNode) {
    range.setStartAfter(lastNode)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  return true
}

editor.addEventListener('beforeinput', e => {
  if (e.isComposing) return
  if (e.inputType !== 'insertText') return
  if (!e.data) return

  e.preventDefault()
  const inserted = insertAnimatedText(e.data)
  if (!inserted) return

  updateCounts()
  updateActiveStates()
})

// (retiré) survol des lettres -> plus de bulles / decomposition

function isCorruptableElement(el) {
  if (!el || el === document.body || el === document.documentElement) return false
  if (el.id === 'app') return false
  if (el.classList.contains('glyph-stain')) return false
  const tag = el.tagName
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK') return false
  return true
}

function corruptElement(el) {
  if (!isCorruptableElement(el)) return
  if (el.classList.contains('corrupting')) return
  if (ACTIVE_CORRUPTIONS >= MAX_ACTIVE_CORRUPTIONS) return

  const now = Date.now()
  const lastCorruption = Number(el.dataset.lastCorruptionTs || 0)
  if (now - lastCorruption < CORRUPTION_COOLDOWN_MS) return
  el.dataset.lastCorruptionTs = `${now}`

  const rect = el.getBoundingClientRect()
  const safeWidth = Math.max(1, rect.width)
  const safeHeight = Math.max(1, rect.height)
  const aspectRatio = Math.max(safeWidth, safeHeight) / Math.min(safeWidth, safeHeight)
  const elongatedFactor = aspectRatio > 3.2 ? 0.33 : 1

  const rot = ((Math.random() * 2 - 1) * 2.2) * elongatedFactor
  const sx = 1 + (((Math.random() * 2 - 1) * 0.025) * elongatedFactor)
  const sy = 1 + (((Math.random() * 2 - 1) * 0.025) * elongatedFactor)
  const skewX = ((Math.random() * 2 - 1) * 1.8) * elongatedFactor
  const skewY = ((Math.random() * 2 - 1) * 1.8) * elongatedFactor
  const duration = Math.round(840 + (Math.random() * 280))

  el.style.setProperty('--corrupt-rot', `${rot.toFixed(2)}deg`)
  el.style.setProperty('--corrupt-scale-x', `${sx.toFixed(3)}`)
  el.style.setProperty('--corrupt-scale-y', `${sy.toFixed(3)}`)
  el.style.setProperty('--corrupt-skew-x', `${skewX.toFixed(2)}deg`)
  el.style.setProperty('--corrupt-skew-y', `${skewY.toFixed(2)}deg`)
  el.style.setProperty('--corrupt-duration', `${duration}ms`)

  ACTIVE_CORRUPTIONS += 1
  el.classList.add('corrupting')
  window.setTimeout(() => {
    el.classList.remove('corrupting')
    ACTIVE_CORRUPTIONS = Math.max(0, ACTIVE_CORRUPTIONS - 1)
  }, duration)
}

// (retiré) survol du body -> plus de corruption ni de deplacement des zones

editor.addEventListener('input', updateCounts)
updateCounts()

// ─── CLEAR ────────────────────────────────────────────────────────
document.getElementById('btn-clear').addEventListener('click', () => {
  if (confirm('Effacer tout le texte ?')) {
    editor.innerHTML = ''
    updateCounts()
    editor.focus()
  }
})

// ─── COPY TEXT ────────────────────────────────────────────────────
document.getElementById('btn-copy').addEventListener('click', () => {
  const text = editor.innerText
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('btn-copy')
    btn.textContent = 'Copié ✓'
    setTimeout(() => btn.textContent = 'Copier', 1500)
  })
})

// ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (!e.ctrlKey && !e.metaKey) return
  if (e.key === '+' || e.key === '=') { e.preventDefault(); state.fontSize = Math.min(300, state.fontSize + 1); sizeInput.value = state.fontSize; applyEditorStyle() }
  if (e.key === '-') { e.preventDefault(); state.fontSize = Math.max(8, state.fontSize - 1); sizeInput.value = state.fontSize; applyEditorStyle() }
})

// ─── MEMBRANE VIVANTE (turbulence SVG animée) ─────────────────────
// Le contour du texte ondule en permanence, façon bactérie sous microscope.
// Le filtre est posé sur #editor, donc son coût ne dépend pas du nombre de
// lettres : écris autant que tu veux, l'effet reste.
const turb = document.getElementById('turb')
const disp = document.getElementById('disp')

const membrane = {
  freq: 0.026,        // densité des ondulations
  amp: 2,             // amplitude max du déplacement, en px
  speed: 0.08,        // vitesse de mouvement (constante)
  pauseOnType: false, // calme le contour pendant la frappe -> caret net
}

let curScale = membrane.amp
let targetScale = membrane.amp
let typeTimer = null
let t = 0
let last = performance.now()
let running = true
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function membraneFrame(now) {
  if (!running) return
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  t += dt * membrane.speed

  // Onde triangulaire : pente constante -> le contour ondule a vitesse
  // reguliere (pas d'accel/ralenti comme avec un sinus).
  const tri = (x) => { const f = x - Math.floor(x / 2) * 2; return f < 1 ? 2 * f - 1 : 3 - 2 * f }
  const k = 0.5  // profondeur de l'ondulation
  const fx = membrane.freq * (1 + k * tri(t))
  const fy = membrane.freq * (1 + k * tri(t + 0.7))
  turb.setAttribute('baseFrequency', `${fx.toFixed(5)} ${fy.toFixed(5)}`)

  curScale += (targetScale - curScale) * 0.18
  disp.setAttribute('scale', curScale.toFixed(2))

  requestAnimationFrame(membraneFrame)
}
if (!reduceMotion) requestAnimationFrame(membraneFrame)

// Pendant la frappe on ramène l'amplitude a 0, puis on relance a l'arret.
editor.addEventListener('keydown', () => {
  if (!membrane.pauseOnType) return
  targetScale = 0
  clearTimeout(typeTimer)
  typeTimer = setTimeout(() => { targetScale = membrane.amp }, 350)
})

// Coupe l'animation quand l'onglet n'est pas visible (economie CPU).
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    running = false
  } else if (!reduceMotion) {
    running = true
    last = performance.now()
    requestAnimationFrame(membraneFrame)
  }
})

// ─── FORME METABALL QUI SUIT LA SOURIS ────────────────────────────
// Tete + traine qui s'etire. Quand une partie de la forme approche
// d'un objet/lettre, des brins AGRIPPENT un point fixe de cet objet et
// s'etirent depuis ce point ; ils se detachent lentement, fins, peu ronds.
const blobLayer = document.getElementById('blob-layer')
const gooMat = document.getElementById('goo-mat')
const gooDisp = document.getElementById('goo-disp')
const gooTurb = document.getElementById('goo-turb')

const blob = {
  size: 26,        // rayon des blobs, en px
  ease: 0.14,      // souplesse de la traine
  wobble: 11,      // ondulation des bords (organique, moins rond)
  capture: 85,     // distance a laquelle un brin agrippe
  release: 340,    // distance avant rupture (grand = tient longtemps)
  decay: 0.025,    // lenteur du detachement (petit = tres lent)
  taperMin: 0.22,  // finesse du milieu du filament (petit = fin)
  perTarget: 3,    // brins max par objet
  spacing: 20,     // espacement des points du fil
  color: '#3f86ff',
}

// Objets de l'interface + lettres
const STICK_SELECTOR = '.toolbar-brand, .tb-select-wrap, .tb-size-wrap, .tb-btn,' +
  ' .tb-lh, .tb-color-wrap, .tb-action-btn, .status-item, .organic-glyph'
const MAX_STRANDS = 6
const MAX_BRIDGE = 14

if (blobLayer && !reduceMotion) {
  const makeBlob = (scale) => {
    const b = document.createElement('div')
    b.className = 'blob-dot'
    b.style.background = blob.color
    b._scale = scale
    blobLayer.appendChild(b)
    return b
  }
  const place = (el, x, y, r) => {
    r = Math.max(0, r)
    el.style.width = el.style.height = `${r * 2}px`
    el.style.transform = `translate(${x - r}px, ${y - r}px)`
  }

  // Tete + traine
  const N = 8
  const chain = []
  for (let i = 0; i < N; i += 1) chain.push({ x: innerWidth / 2, y: innerHeight / 2, el: makeBlob(1 - (i / N) * 0.7) })

  // Pool de points pour les filaments
  const pool = []
  for (let i = 0; i < MAX_STRANDS * (MAX_BRIDGE + 1); i += 1) pool.push(makeBlob(1))

  // Brins : chacun agrippe un point fixe (ax,ay) d'une cible
  const strands = []
  for (let i = 0; i < MAX_STRANDS; i += 1) strands.push({ active: false, ti: -1, ax: 0, ay: 0, src: 0, life: 0 })

  // Cibles collables (rects en cache)
  let targets = []
  const buildTargets = () => {
    targets = [...document.querySelectorAll(STICK_SELECTOR)].map(el => ({ ref: el, rect: el.getBoundingClientRect() }))
  }
  const refreshRects = () => targets.forEach(t => { t.rect = t.ref.getBoundingClientRect() })
  buildTargets()
  addEventListener('resize', buildTargets)
  addEventListener('scroll', refreshRects, true)
  setInterval(refreshRects, 500)
  let rebuildTimer = null
  editor.addEventListener('input', () => { clearTimeout(rebuildTimer); rebuildTimer = setTimeout(buildTargets, 150) })

  let tx = innerWidth / 2, ty = innerHeight / 2, moving = 0
  let bt = 0, blast = performance.now()
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; moving = 1 })

  const tri = x => { const f = x - Math.floor(x / 2) * 2; return f < 1 ? 2 * f - 1 : 3 - 2 * f }

  // Point d'accroche : point le plus proche du bord, decale le long du bord
  const grabPoint = (r, hx, hy, idx, total) => {
    let nx = Math.max(r.left, Math.min(hx, r.right))
    let ny = Math.max(r.top, Math.min(hy, r.bottom))
    const off = (idx - (total - 1) / 2) * Math.max(8, Math.min(Math.min(r.width, r.height), 24))
    if (nx === r.left || nx === r.right) ny = Math.max(r.top, Math.min(ny + off, r.bottom))
    else nx = Math.max(r.left, Math.min(nx + off, r.right))
    return { x: nx, y: ny }
  }

  function blobFrame(now) {
    const dt = Math.min(0.05, (now - blast) / 1000)
    blast = now
    bt += dt

    // Jamais fige : leger vagabondage au repos
    moving *= 0.92
    const idle = 1 - moving
    const gx = tx + idle * Math.sin(bt * 0.8) * 30
    const gy = ty + idle * Math.cos(bt * 0.6) * 24

    chain[0].x += (gx - chain[0].x) * blob.ease
    chain[0].y += (gy - chain[0].y) * blob.ease
    for (let i = 1; i < N; i += 1) {
      chain[i].x += (chain[i - 1].x - chain[i].x) * blob.ease
      chain[i].y += (chain[i - 1].y - chain[i].y) * blob.ease
    }
    for (let j = 0; j < N; j += 1) place(chain[j].el, chain[j].x, chain[j].y, blob.size * chain[j].el._scale)

    const hx = chain[0].x, hy = chain[0].y

    // Agripper : nouveaux brins sur les cibles proches de la tete
    for (let i = 0; i < targets.length; i += 1) {
      const r = targets[i].rect
      if (!r.width) continue
      const nx = Math.max(r.left, Math.min(hx, r.right))
      const ny = Math.max(r.top, Math.min(hy, r.bottom))
      if (Math.hypot(hx - nx, hy - ny) >= blob.capture) continue
      let count = 0
      for (const s of strands) if (s.active && s.ti === i) count += 1
      if (count >= blob.perTarget) continue
      const slot = strands.find(s => !s.active)
      if (!slot) break
      const g = grabPoint(r, hx, hy, count, blob.perTarget)
      slot.active = true; slot.ti = i; slot.ax = g.x; slot.ay = g.y
      slot.src = [0, 3, 6, 1, 5, 2][count % 6]; slot.life = 0.01
    }

    // Rendu des brins (point d'accroche FIXE -> partie de la forme)
    let p = 0
    for (const s of strands) {
      if (!s.active) continue
      const src = chain[Math.min(s.src, N - 1)]
      const d = Math.hypot(src.x - s.ax, src.y - s.ay)
      const targetGone = s.ti >= targets.length || !targets[s.ti] || !targets[s.ti].rect.width
      const want = (!targetGone && d < blob.release) ? 1 : 0
      s.life += (want - s.life) * blob.decay
      if (s.life < 0.012 && want === 0) { s.active = false; s.ti = -1; continue }
      const life = s.life
      const stretch = Math.max(0, 1 - d / blob.release)
      place(pool[p++], s.ax, s.ay, blob.size * (0.42 + 0.32 * stretch) * life)
      const count = Math.max(1, Math.min(MAX_BRIDGE, Math.ceil(d / blob.spacing)))
      for (let k = 1; k < count && p < pool.length; k += 1) {
        const u = k / count
        const taper = blob.taperMin + (1 - blob.taperMin) * Math.abs(2 * u - 1)
        const px = s.ax + (src.x - s.ax) * u
        const py = s.ay + (src.y - s.ay) * u
        place(pool[p++], px, py, blob.size * taper * (0.32 + 0.68 * stretch) * life)
      }
    }
    for (; p < pool.length; p += 1) place(pool[p], -999, -999, 0)

    // Ondulation organique
    gooDisp.setAttribute('scale', blob.wobble)
    const f = 0.02, kk = 0.5
    gooTurb.setAttribute('baseFrequency',
      `${(f * (1 + kk * tri(bt * 0.4))).toFixed(5)} ${(f * (1 + kk * tri(bt * 0.4 + 0.7))).toFixed(5)}`)

    requestAnimationFrame(blobFrame)
  }
  requestAnimationFrame(blobFrame)
}
