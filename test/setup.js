if (typeof globalThis.CSS === 'undefined' || typeof globalThis.CSS.escape !== 'function') {
  globalThis.CSS = globalThis.CSS || {}
  globalThis.CSS.escape = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`)
}
