/**
 * ─────────────────────────────────────────────────
 *  FONTS CONFIGURATION
 *  Pour ajouter une police :
 *  1. Ajoutez-la à la liste ci-dessous avec son nom Google Fonts
 *  2. Relancez npm run dev
 *  Pour une police locale : mettez le fichier dans /public/fonts/
 *  et ajoutez un @font-face dans style.css
 * ─────────────────────────────────────────────────
 */

export const FONTS = [
  // ── Sans-serif ──────────────────────────────────
  { name: "Helvetica Neue",   google: false,  category: "sans" },
  { name: "IBM Plex Sans",    google: true,   category: "sans" },
  { name: "Space Grotesk",    google: true,   category: "sans" },
  { name: "DM Sans",          google: true,   category: "sans" },
  { name: "Outfit",           google: true,   category: "sans" },
  { name: "Syne",             google: true,   category: "sans" },

  // ── Serif ────────────────────────────────────────
  { name: "Playfair Display", google: true,   category: "serif" },
  { name: "DM Serif Display", google: true,   category: "serif" },
  { name: "Cormorant",        google: true,   category: "serif" },
  { name: "Libre Baskerville",google: true,   category: "serif" },
  { name: "Spectral",         google: true,   category: "serif" },

  // ── Mono ─────────────────────────────────────────
  { name: "IBM Plex Mono",    google: true,   category: "mono" },
  { name: "Space Mono",       google: true,   category: "mono" },
  { name: "Courier New",      google: false,  category: "mono" },

  // ── Display ──────────────────────────────────────
  { name: "Anton",            google: true,   category: "display" },
  { name: "Bebas Neue",       google: true,   category: "display" },
  { name: "Big Shoulders Display", google: true, category: "display" },
  { name: "Barlow Condensed", google: true,   category: "display" },

  // ── Ajoutez vos polices ici ──────────────────────
  // { name: "Nom De La Police", google: true, category: "sans" },
]

export const WEIGHTS = [
  { label: "Thin",       value: 100 },
  { label: "ExtraLight", value: 200 },
  { label: "Light",      value: 300 },
  { label: "Regular",    value: 400 },
  { label: "Medium",     value: 500 },
  { label: "SemiBold",   value: 600 },
  { label: "Bold",       value: 700 },
  { label: "ExtraBold",  value: 800 },
  { label: "Black",      value: 900 },
]
