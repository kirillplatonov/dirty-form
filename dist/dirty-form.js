/*!
 * DirtyForm v0.4.0
 * Lightweight plugin to track form changes and prevent navigation with unsaved edits. No dependencies.
 * https://github.com/kirillplatonov/dirty-forms
 * MIT License
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.DirtyForm = factory());
})(this, (function () { 'use strict';

  function debounce(func, timeout = 100) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    }
  }

  class DirtyForm {
    static trackedTags = ['INPUT', 'SELECT', 'TEXTAREA']

    constructor(form, options = {}) {
      this.form = form;
      this.isDirty = false;
      this.initialValues = {};
      this.onDirty = options['onDirty'];
      this.beforeLeave = options['beforeLeave'];
      this.message = options['message'] || 'You have unsaved changes!';
      this.debouncedValueChanged = debounce(this.valueChanged);

      this.setupFieldsTracking();
      if (!options['skipLeavingTracking']) {
        this.setLeavingHandler();
      }
    }

    disconnect() {
      this.removeFieldsTracking();
      this.removeLeavingHandler();
    }

    setupFieldsTracking() {
      this.fields.forEach(field => {
        this.initialValues[field.name] = field.value;

        switch (field.tagName) {
          case 'TRIX-EDITOR':
            field.addEventListener('trix-change', this.debouncedValueChanged);
            break
          case 'SELECT':
            field.addEventListener('change', this.debouncedValueChanged);
            break
          default:
            field.addEventListener('change', this.debouncedValueChanged);
            field.addEventListener('input', this.debouncedValueChanged);
            break
        }
      });
    }

    removeFieldsTracking() {
      this.fields.forEach(field => {
        switch (field.tagName) {
          case 'TRIX-EDITOR':
            field.removeEventListener('trix-change', this.debouncedValueChanged);
            break
          case 'SELECT':
            field.removeEventListener('change', this.debouncedValueChanged);
            break
          default:
            field.removeEventListener('change', this.debouncedValueChanged);
            field.removeEventListener('input', this.debouncedValueChanged);
            break
        }
      });
    }

    setLeavingHandler() {
      window.addEventListener('beforeunload', this.beforeUnload);
      if (typeof Turbo !== 'undefined') {
        document.addEventListener('turbo:before-visit', this.onLeave);
      }
    }

    removeLeavingHandler() {
      window.removeEventListener('beforeunload', this.beforeUnload);
      if (typeof Turbo !== 'undefined') {
        document.removeEventListener('turbo:before-visit', this.onLeave);
      }
    }

    get fields() {
      let selector = this.constructor.trackedTags.map(tag => `${tag}[name]`).join(',');
      selector += ',TRIX-EDITOR';
      return Array.from(this.form.querySelectorAll(selector)).filter(field => {
        return field.getAttribute("data-dirty-form") != "false"
      })
    }

    markAsDirty() {
      if (!this.isDirty) {
        this.isDirty = true;
        if (this.onDirty) this.onDirty();
      }
    }

    // Handlers

    valueChanged = (event) => {
      const field = event.target;
      if (this.initialValues[field.name] != field.value) {
        this.markAsDirty();
      }
    }

    beforeUnload = (event) => {
      if (this.isDirty) {
        event.preventDefault();
        event.returnValue = this.message;
      }
    }

    onLeave = (event) => {
      if (this.isDirty) {
        if (confirm(this.message)) {
          if (this.beforeLeave) this.beforeLeave();
        } else {
          event.preventDefault();
        }
      } else {
        this.isDirty = false;
      }
    }
  }

  return DirtyForm;

}));
