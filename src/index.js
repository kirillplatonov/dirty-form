function debounce(func, timeout = 100) {
  if (timeout <= 0) {
    const immediate = (...args) => { func(...args) }
    immediate.cancel = () => {}
    return immediate
  }
  let timer
  const debounced = (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => { func(...args) }, timeout)
  }
  debounced.cancel = () => { clearTimeout(timer) }
  return debounced
}

class DirtyForm {
  static trackedTags = ['INPUT', 'SELECT', 'TEXTAREA']

  constructor(form, options = {}) {
    this.form = form
    this.isDirty = false
    this.initialValues = {}
    this.initialCheckboxState = new WeakMap()
    this.onDirty = options.onDirty
    this.beforeLeave = options.beforeLeave
    this.message = options.message || 'You have unsaved changes!'
    this.handleChange = debounce(this.valueChanged, options.debounce ?? 100)

    this.setupFieldsTracking()
    if (!options.skipLeavingTracking) {
      this.setLeavingHandler()
    }
  }

  disconnect() {
    this.handleChange.cancel()
    this.removeFieldsTracking()
    this.removeLeavingHandler()
  }

  setupFieldsTracking() {
    this.fields.forEach(field => {
      // Store initial state based on field type
      if (field.type === 'radio') {
        // For radio buttons, only store once per group
        if (!this.initialValues.hasOwnProperty(field.name)) {
          const escapedName = CSS.escape(field.name)
          const checkedRadio = this.form.querySelector(`input[type="radio"][name="${escapedName}"]:checked`)
          this.initialValues[field.name] = checkedRadio ? checkedRadio.value : ''
        }
      } else if (field.type === 'checkbox') {
        // Key by element identity so same-name checkboxes (including
        // ones that default to value="on") never collide
        this.initialCheckboxState.set(field, field.checked)
      } else if (field.type === 'file') {
        // `field.value` is the "C:\fakepath\..." string — compare file count instead
        this.initialValues[field.name] = field.files?.length ?? 0
      } else {
        this.initialValues[field.name] = field.value
      }

      this.eventsFor(field).forEach(type => {
        field.addEventListener(type, this.handleChange)
      })
    })
  }

  removeFieldsTracking() {
    this.fields.forEach(field => {
      this.eventsFor(field).forEach(type => {
        field.removeEventListener(type, this.handleChange)
      })
    })
  }

  eventsFor(field) {
    if (field.tagName === 'TRIX-EDITOR') return ['trix-change']
    if (field.tagName === 'SELECT') return ['change']
    return ['change', 'input']
  }

  setLeavingHandler() {
    window.addEventListener('beforeunload', this.beforeUnload)
    document.addEventListener('turbo:before-visit', this.onLeave)
  }

  removeLeavingHandler() {
    window.removeEventListener('beforeunload', this.beforeUnload)
    document.removeEventListener('turbo:before-visit', this.onLeave)
  }

  get fields() {
    let selector = DirtyForm.trackedTags.map(tag => `${tag}[name]`).join(',')
    selector += ',TRIX-EDITOR'
    return Array.from(this.form.querySelectorAll(selector)).filter(field => {
      return field.getAttribute("data-dirty-form") !== "false"
    })
  }

  markAsDirty() {
    if (!this.isDirty) {
      this.isDirty = true
      this.onDirty?.()
    }
  }

  // Handlers

  valueChanged = (event) => {
    const field = event.target

    if (field.type === 'radio') {
      // For radio buttons, check if the checked value for this group changed
      if (this.initialValues[field.name] !== field.value) {
        this.markAsDirty()
      }
    } else if (field.type === 'checkbox') {
      if (this.initialCheckboxState.get(field) !== field.checked) {
        this.markAsDirty()
      }
    } else if (field.type === 'file') {
      if (this.initialValues[field.name] !== (field.files?.length ?? 0)) {
        this.markAsDirty()
      }
    } else {
      if (this.initialValues[field.name] !== field.value) {
        this.markAsDirty()
      }
    }
  }

  beforeUnload = (event) => {
    if (this.isDirty) {
      event.preventDefault()
      event.returnValue = this.message
    }
  }

  onLeave = (event) => {
    if (this.isDirty) {
      if (confirm(this.message)) {
        this.beforeLeave?.()
      } else {
        event.preventDefault()
      }
    }
  }
}

export default DirtyForm
