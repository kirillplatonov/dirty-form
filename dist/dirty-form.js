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
    static get fieldSelector() {
      return DirtyForm.trackedTags.map(tag => `${tag}[name]`).join(',') + ',TRIX-EDITOR';
    }
    constructor(form, options = {}) {
      this.form = form;
      this.isDirty = false;
      this._initialValues = {};
      this._initialCheckboxState = new WeakMap();
      this._initialTrixValues = new WeakMap();
      this._dirtyFields = new Set();
      this._forcedDirty = false;
      this._snapshotted = new WeakSet();
      this._mutationObserver = null;
      this.trackedListeners = [];
      this.onDirty = options.onDirty;
      this.onClean = options.onClean;
      this.beforeLeave = options.beforeLeave;
      this.message = options.message || 'You have unsaved changes!';
      this.handleChange = debounce(this.valueChanged, options.debounce ?? 100);
      this.setupFieldsTracking();
      if (options.watchNewFields) {
        this._setupMutationObserver();
      }
      if (!options.skipLeavingTracking) {
        this.setLeavingHandler();
      }
    }

    // Terminal teardown. Intentionally does NOT clear `_dirtyFields`, reset
    // `isDirty`, or fire `onClean` — disconnect() is typically called during a
    // legitimate submit, where firing a "now clean" callback would be noise.
    // The instance reads as its last known state after teardown.
    disconnect() {
      this.handleChange.cancel();
      this._mutationObserver?.disconnect();
      this._mutationObserver = null;
      this.removeFieldsTracking();
      this.removeLeavingHandler();
    }

    // Force the form into a dirty state regardless of tracked-field values.
    // Useful when the caller owns some out-of-band state (e.g. a custom widget
    // that isn't a standard form field) and wants DirtyForm to reflect it.
    // Reverting tracked fields to their baselines will NOT clear a manual flag —
    // only markAsClean() does.
    markAsDirty() {
      this._forcedDirty = true;
      this._updateDirtyState();
    }

    // Re-baseline every tracked field against its current value, drop any manual
    // dirty flag set via markAsDirty(), and clear dirty state. This is the only
    // way to clear a manual flag. Useful after an async save, when the saved
    // values become the new "initial".
    markAsClean() {
      this._initialValues = {};
      this._initialCheckboxState = new WeakMap();
      this._initialTrixValues = new WeakMap();
      this._dirtyFields.clear();
      this._forcedDirty = false;
      this.trackedListeners.forEach(({
        field
      }) => this._snapshotField(field));
      this._updateDirtyState();
    }
    setupFieldsTracking() {
      this.fields.forEach(field => this._trackField(field));
    }

    // Snapshot initial state and attach change listeners for one field.
    // Idempotent: safe to call twice on the same field (the second call no-ops).
    _trackField(field) {
      if (this._snapshotted.has(field)) return;
      this._snapshotted.add(field);
      this._snapshotField(field);
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
    }
    _snapshotField(field) {
      if (field.tagName === 'TRIX-EDITOR') {
        // Key by element identity — <trix-editor> has no native `name` property,
        // so multiple editors on the same form would collide on `undefined`
        this._initialTrixValues.set(field, field.value ?? '');
      } else if (field.type === 'radio') {
        // For radio buttons, only store once per group
        if (!Object.prototype.hasOwnProperty.call(this._initialValues, field.name)) {
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
    _setupMutationObserver() {
      this._mutationObserver = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          mutation.addedNodes.forEach(node => {
            this._collectFields(node).forEach(field => this._trackField(field));
          });
          mutation.removedNodes.forEach(node => {
            const fields = this._collectFields(node);
            if (fields.length) this._untrackFields(fields);
          });
        }
      });
      this._mutationObserver.observe(this.form, {
        childList: true,
        subtree: true
      });
    }

    // Find trackable fields at or under `node`. Handles both cases:
    // `node` is itself a field, or `node` is a wrapper containing fields.
    _collectFields(node) {
      if (node.nodeType !== 1) return [];
      const selector = DirtyForm.fieldSelector;
      const found = [];
      if (node.matches(selector)) found.push(node);
      found.push(...node.querySelectorAll(selector));
      return found.filter(field => field.getAttribute('data-dirty-form') !== 'false');
    }
    _untrackFields(fields) {
      const removed = new Set(fields);
      this.trackedListeners = this.trackedListeners.filter(entry => {
        if (!removed.has(entry.field)) return true;
        entry.events.forEach(type => {
          entry.field.removeEventListener(type, this.handleChange);
        });
        this._dirtyFields.delete(this._fieldKey(entry.field));
        return false;
      });
      this._updateDirtyState();
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
      return this._collectFields(this.form);
    }

    // Identity under which a field is tracked in `_dirtyFields`. Radios share
    // a key per group (only one can diverge at a time); trix + checkboxes use
    // element identity because same-name collisions are possible; everything
    // else is one-per-name.
    _fieldKey(field) {
      if (field.tagName === 'TRIX-EDITOR' || field.type === 'checkbox') return field;
      if (field.type === 'radio') return `radio:${field.name}`;
      return `field:${field.name}`;
    }
    _isFieldDirty(field) {
      if (field.tagName === 'TRIX-EDITOR') {
        return this._initialTrixValues.get(field) !== (field.value ?? '');
      } else if (field.type === 'radio') {
        return this._initialValues[field.name] !== field.value;
      } else if (field.type === 'checkbox') {
        return this._initialCheckboxState.get(field) !== field.checked;
      } else if (field.type === 'file') {
        return this._initialValues[field.name] !== (field.files?.length ?? 0);
      } else if (field.type === 'select-multiple') {
        return this._initialValues[field.name] !== this.selectedOptions(field);
      } else {
        return this._initialValues[field.name] !== field.value;
      }
    }
    _updateDirtyState() {
      const nowDirty = this._dirtyFields.size > 0 || this._forcedDirty;
      if (nowDirty === this.isDirty) return;
      this.isDirty = nowDirty;
      if (nowDirty) this.onDirty?.();else this.onClean?.();
    }

    // Handlers

    valueChanged = event => {
      const field = event.target;
      const key = this._fieldKey(field);
      if (this._isFieldDirty(field)) {
        this._dirtyFields.add(key);
      } else {
        this._dirtyFields.delete(key);
      }
      this._updateDirtyState();
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
