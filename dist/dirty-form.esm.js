/*!
 * DirtyForm v1.0.0
 * Lightweight plugin to track form changes and prevent losing unsaved edits. No dependencies.
 * https://github.com/kirillplatonov/dirty-form
 * MIT License
 */

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
    this._snapshotted = new WeakSet();
    this._mutationObserver = null;
    this.trackedListeners = [];
    this.onDirty = options.onDirty;
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
  disconnect() {
    this.handleChange.cancel();
    this._mutationObserver?.disconnect();
    this._mutationObserver = null;
    this.removeFieldsTracking();
    this.removeLeavingHandler();
  }
  setupFieldsTracking() {
    this.fields.forEach(field => this._trackField(field));
  }

  // Snapshot initial state and attach change listeners for one field.
  // Idempotent: safe to call twice on the same field (the second call no-ops).
  _trackField(field) {
    if (this._snapshotted.has(field)) return;
    this._snapshotted.add(field);
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
      return false;
    });
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

export { DirtyForm as default };
