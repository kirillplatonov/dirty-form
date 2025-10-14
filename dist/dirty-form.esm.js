/*!
 * DirtyForm v0.4.0
 * Lightweight plugin to track form changes and prevents loosing unsaved edits. No dependencies.
 * https://github.com/kirillplatonov/dirty-forms
 * MIT License
 */

function _classCallCheck(a, n) {
  if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
}
function _defineProperties(e, r) {
  for (var t = 0; t < r.length; t++) {
    var o = r[t];
    o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey(o.key), o);
  }
}
function _createClass(e, r, t) {
  return r && _defineProperties(e.prototype, r), Object.defineProperty(e, "prototype", {
    writable: false
  }), e;
}
function _defineProperty(e, r, t) {
  return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
    value: t,
    enumerable: true,
    configurable: true,
    writable: true
  }) : e[r] = t, e;
}
function _toPrimitive(t, r) {
  if ("object" != typeof t || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r);
    if ("object" != typeof i) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function _toPropertyKey(t) {
  var i = _toPrimitive(t, "string");
  return "symbol" == typeof i ? i : i + "";
}

function debounce(func) {
  var _this = this;
  var timeout = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 100;
  var timer;
  return function () {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    clearTimeout(timer);
    timer = setTimeout(function () {
      func.apply(_this, args);
    }, timeout);
  };
}
var DirtyForm = /*#__PURE__*/function () {
  function DirtyForm(form) {
    var _this2 = this;
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    _classCallCheck(this, DirtyForm);
    // Handlers
    _defineProperty(this, "valueChanged", function (event) {
      var field = event.target;
      if (_this2.initialValues[field.name] != field.value) {
        _this2.markAsDirty();
      }
    });
    _defineProperty(this, "beforeUnload", function (event) {
      if (_this2.isDirty) {
        event.preventDefault();
        event.returnValue = _this2.message;
      }
    });
    _defineProperty(this, "onLeave", function (event) {
      if (_this2.isDirty) {
        if (confirm(_this2.message)) {
          if (_this2.beforeLeave) _this2.beforeLeave();
        } else {
          event.preventDefault();
        }
      } else {
        _this2.isDirty = false;
      }
    });
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
  return _createClass(DirtyForm, [{
    key: "disconnect",
    value: function disconnect() {
      this.removeFieldsTracking();
      this.removeLeavingHandler();
    }
  }, {
    key: "setupFieldsTracking",
    value: function setupFieldsTracking() {
      var _this3 = this;
      this.fields.forEach(function (field) {
        _this3.initialValues[field.name] = field.value;
        switch (field.tagName) {
          case 'TRIX-EDITOR':
            field.addEventListener('trix-change', _this3.debouncedValueChanged);
            break;
          case 'SELECT':
            field.addEventListener('change', _this3.debouncedValueChanged);
            break;
          default:
            field.addEventListener('change', _this3.debouncedValueChanged);
            field.addEventListener('input', _this3.debouncedValueChanged);
            break;
        }
      });
    }
  }, {
    key: "removeFieldsTracking",
    value: function removeFieldsTracking() {
      var _this4 = this;
      this.fields.forEach(function (field) {
        switch (field.tagName) {
          case 'TRIX-EDITOR':
            field.removeEventListener('trix-change', _this4.debouncedValueChanged);
            break;
          case 'SELECT':
            field.removeEventListener('change', _this4.debouncedValueChanged);
            break;
          default:
            field.removeEventListener('change', _this4.debouncedValueChanged);
            field.removeEventListener('input', _this4.debouncedValueChanged);
            break;
        }
      });
    }
  }, {
    key: "setLeavingHandler",
    value: function setLeavingHandler() {
      window.addEventListener('beforeunload', this.beforeUnload);
      if (typeof Turbo !== 'undefined') {
        document.addEventListener('turbo:before-visit', this.onLeave);
      }
    }
  }, {
    key: "removeLeavingHandler",
    value: function removeLeavingHandler() {
      window.removeEventListener('beforeunload', this.beforeUnload);
      if (typeof Turbo !== 'undefined') {
        document.removeEventListener('turbo:before-visit', this.onLeave);
      }
    }
  }, {
    key: "fields",
    get: function get() {
      var selector = this.constructor.trackedTags.map(function (tag) {
        return "".concat(tag, "[name]");
      }).join(',');
      selector += ',TRIX-EDITOR';
      return Array.from(this.form.querySelectorAll(selector)).filter(function (field) {
        return field.getAttribute("data-dirty-form") != "false";
      });
    }
  }, {
    key: "markAsDirty",
    value: function markAsDirty() {
      if (!this.isDirty) {
        this.isDirty = true;
        if (this.onDirty) this.onDirty();
      }
    }
  }]);
}();
_defineProperty(DirtyForm, "trackedTags", ['INPUT', 'SELECT', 'TEXTAREA']);

export { DirtyForm as default };
