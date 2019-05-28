class DirtyForm {
  constructor(form) {
    this.form = form;
    this.isDirty = false;
    this.initialValues = {};
    this.fields = [
      ...this.form.elements,
      ...this.form.querySelectorAll('trix-editor')
    ]

    this.setupFields();
    this.setFormHandlers();
  }

  setupFields() {
    this.fields.forEach(field => {
      if (!field.name || field.type == 'submit' || field.type == 'button' || field.type == 'hidden') {
        return;
      }

      // Save initial values
      this.initialValues[field.name] = field.value;

      // Set handlers
      field.addEventListener('change', this.checkValue.bind(this));
      field.addEventListener('input', this.checkValue.bind(this));
      if (field.nodeName == 'TRIX-EDITOR') {
        field.addEventListener('trix-change', this.checkValue.bind(this));
      }
    })
  }

  setFormHandlers() {
    window.addEventListener('submit', () => {
      this.isDirty = false;
    });
    window.onbeforeunload = () => {
      if (this.isDirty) {
        return 'You have unsaved changes!';
      }
    };
  }

  checkValue(event) {
    let field = event.target;
    if (this.initialValues[field.name] != field.value) {
      this.isDirty = true;
    }
  }
}

module.exports = DirtyForm;
