class DirtyForm {
  constructor(form) {
    this.form = form;
    this.isDirty = false;
    this.initialValues = {};

    this.setupFields();
    this.setFormHandlers();
  }

  setupFields() {
    this.form.elements.forEach((field) => {
      if (!field.name || field.type == 'submit' || field.type == 'button') {
        return;
      }

      // Save initial values
      this.initialValues[field.name] = field.value;

      // Set handlers
      field.addEventListener('change', this.checkValue);
      field.addEventListener('input', this.checkValue);
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

  checkValue = (event) => {
    let field = event.target;
    if (this.initialValues[field.name] != field.value) {
      this.isDirty = true;
    }
  }
}

module.exports = DirtyForm;
