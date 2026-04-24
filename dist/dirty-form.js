/*!
 * DirtyForm v1.0.0
 * Lightweight plugin to track form changes and prevent losing unsaved edits. No dependencies.
 * https://github.com/kirillplatonov/dirty-form
 * MIT License
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.DirtyForm = factory());
})(this, (function () { 'use strict';

  function debounce(func, timeout = 100) {
    if (timeout <= 0) {
      const immediate = (...args) => {
        func(...args);
      };
      immediate.cancel = () => {};
      return immediate;
    }
    let timer;
    const debounced = (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        func(...args);
      }, timeout);
    };
    debounced.cancel = () => {
      clearTimeout(timer);
    };
    return debounced;
  }
  class DirtyForm {
    static trackedTags = ['INPUT', 'SELECT', 'TEXTAREA'];
    constructor(form, options = {}) {
      this.form = form;
      this.isDirty = false;
      this._initialValues = {};
      this._initialCheckboxState = new WeakMap();
      this._initialTrixValues = new WeakMap();
      this.trackedListeners = [];
      this.onDirty = options.onDirty;
      this.beforeLeave = options.beforeLeave;
      this.message = options.message || 'You have unsaved changes!';
      this.handleChange = debounce(this.valueChanged, options.debounce ?? 100);
      this.setupFieldsTracking();
      if (!options.skipLeavingTracking) {
        this.setLeavingHandler();
      }
    }
    disconnect() {
      this.handleChange.cancel();
      this.removeFieldsTracking();
      this.removeLeavingHandler();
    }
    setupFieldsTracking() {
      this.fields.forEach(field => {
        // Store initial state based on field type
        if (field.tagName === 'TRIX-EDITOR') {
          // Key by element identity — <trix-editor> has no native `name` property,
          // so multiple editors on the same form would collide on `undefined`
          this._initialTrixValues.set(field, field.value ?? '');
        } else if (field.type === 'radio') {
          // For radio buttons, only store once per group
          if (!this._initialValues.hasOwnProperty(field.name)) {
            const escapedName = CSS.escape(field.name);
            const checkedRadio = this.form.querySelector(`input[type="radio"][name="${escapedName}"]:checked`);
            this._initialValues[field.name] = checkedRadio ? checkedRadio.value : '';
          }
        } else if (field.type === 'checkbox') {
          // Key by element identity so same-name checkboxes (including
          // ones that default to value="on") never collide
          this._initialCheckboxState.set(field, field.checked);
        } else if (field.type === 'file') {
          // `field.value` is the "C:\fakepath\..." string — compare file count instead
          this._initialValues[field.name] = field.files?.length ?? 0;
        } else if (field.type === 'select-multiple') {
          this._initialValues[field.name] = this.selectedOptions(field);
        } else {
          this._initialValues[field.name] = field.value;
        }
        const events = DirtyForm.eventsFor(field);
        events.forEach(type => {
          field.addEventListener(type, this.handleChange);
        });
        // Snapshot the attached pairs so disconnect() doesn't depend on the
        // form still containing every field at teardown time
        this.trackedListeners.push({
          field,
          events
        });
      });
    }
    removeFieldsTracking() {
      this.trackedListeners.forEach(({
        field,
        events
      }) => {
        events.forEach(type => {
          field.removeEventListener(type, this.handleChange);
        });
      });
      this.trackedListeners = [];
    }
    static eventsFor(field) {
      if (field.tagName === 'TRIX-EDITOR') return ['trix-change'];
      if (field.tagName === 'SELECT') return ['change'];
      return ['change', 'input'];
    }
    selectedOptions(select) {
      return Array.from(select.selectedOptions).map(opt => opt.value).join('\x00');
    }
    setLeavingHandler() {
      window.addEventListener('beforeunload', this.beforeUnload);
      document.addEventListener('turbo:before-visit', this.onLeave);
    }
    removeLeavingHandler() {
      window.removeEventListener('beforeunload', this.beforeUnload);
      document.removeEventListener('turbo:before-visit', this.onLeave);
    }
    get fields() {
      let selector = DirtyForm.trackedTags.map(tag => `${tag}[name]`).join(',');
      selector += ',TRIX-EDITOR';
      return Array.from(this.form.querySelectorAll(selector)).filter(field => {
        return field.getAttribute("data-dirty-form") !== "false";
      });
    }
    markAsDirty() {
      if (!this.isDirty) {
        this.isDirty = true;
        this.onDirty?.();
      }
    }

    // Handlers

    valueChanged = event => {
      const field = event.target;
      if (field.tagName === 'TRIX-EDITOR') {
        if (this._initialTrixValues.get(field) !== (field.value ?? '')) {
          this.markAsDirty();
        }
      } else if (field.type === 'radio') {
        // For radio buttons, check if the checked value for this group changed
        if (this._initialValues[field.name] !== field.value) {
          this.markAsDirty();
        }
      } else if (field.type === 'checkbox') {
        if (this._initialCheckboxState.get(field) !== field.checked) {
          this.markAsDirty();
        }
      } else if (field.type === 'file') {
        if (this._initialValues[field.name] !== (field.files?.length ?? 0)) {
          this.markAsDirty();
        }
      } else if (field.type === 'select-multiple') {
        if (this._initialValues[field.name] !== this.selectedOptions(field)) {
          this.markAsDirty();
        }
      } else {
        if (this._initialValues[field.name] !== field.value) {
          this.markAsDirty();
        }
      }
    };
    beforeUnload = event => {
      if (this.isDirty) {
        event.preventDefault();
        event.returnValue = this.message;
      }
    };
    onLeave = event => {
      if (this.isDirty) {
        if (confirm(this.message)) {
          this.beforeLeave?.();
        } else {
          event.preventDefault();
        }
      }
    };
  }

  return DirtyForm;

}));
