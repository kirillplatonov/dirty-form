/*!
 * DirtyForm v0.4.0
 * A lightweight plugin to prevent losing data when editing forms. No dependencies.
 * https://github.com/kirillplatonov/dirty-forms
 * MIT License
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.DirtyForm = factory());
})(this, (function () { 'use strict';

  class DirtyForm {
    constructor(form, options = {}) {
      this.form = form;
      this.isDirty = false;
      this.initialValues = {};
      this.fields = [
        ...this.form.elements,
        ...this.form.querySelectorAll('trix-editor')
      ];
      this.message = options['message'] || 'You have unsaved changes!';

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
        if (field.nodeName == 'TRIX-EDITOR') {
          field.addEventListener('trix-change', this.checkValue.bind(this));
        } else {
          field.addEventListener('change', this.checkValue.bind(this));
          field.addEventListener('input', this.checkValue.bind(this));
        }
      });
    }

    setFormHandlers() {
      // Handle submit
      window.addEventListener('submit', this.handleSubmit.bind(this));
      this.form.addEventListener('submit', this.handleSubmit.bind(this));

      // Handle leaving page
      window.onbeforeunload = () => {
        if (this.isDirty) {
          return this.message;
        }
      };
      if (typeof Turbolinks !== 'undefined') {
        document.addEventListener('turbolinks:before-visit', (event) => {
          if (this.isDirty && !confirm(this.message)) {
            event.preventDefault();
          } else {
            this.isDirty = false;
          }
        });
      }
    }

    checkValue(event) {
      let field = event.target;
      if (this.initialValues[field.name] != field.value) {
        this.isDirty = true;
      }
    }

    handleSubmit() {
      this.isDirty = false;
    }
  }

  return DirtyForm;

}));
