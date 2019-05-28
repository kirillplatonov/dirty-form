class DirtyForm {
  form          = null
  isDirty       = false
  initialValues = {}

  constructor(form) {
    this.form = form
    this.setupFields()
    this.setFormHandlers()
  }

  setupFields() {
    this.form.elements.forEach((field) => {
      if (!field.name || field.type == 'submit' || field.type == 'button') {
        return
      }

      // Save initial values
      this.initialValues[field.name] = field.value

      // Set handlers
      field.addEventListener('change', this.checkValue)
      field.addEventListener('input', this.checkValue)
    })
  }

  setFormHandlers() {
    window.addEventListener('submit', this.handleSubmit.bind(this))
    window.onbeforeunload = this.handleUnload.bind(this)
  }

  checkValue = (event) => {
    let field = event.target
    if (this.initialValues[field.name] != field.value) {
      this.isDirty = true
    }
  }

  handleSubmit = () => {
    this.isDirty = false
  }

  handleUnload = () => {
    if (this.isDirty) {
      return 'You have unsaved changes!'
    }
  }
}

module.exports = DirtyForms
