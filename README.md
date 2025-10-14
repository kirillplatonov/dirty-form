# dirty-form

Lightweight plugin to track form changes and prevents loosing unsaved edits. No dependencies.

## Integrations

- [Trix editor](https://trix-editor.org)
- [Turbo](https://github.com/hotwired/turbo)

## Install

You can get it via `npm`:

```
npm install --save dirty-form
```

Or `yarn`:

```
yarn add dirty-form
```

## Usage

### Basic example

```js
import DirtyForm from 'dirty-form'

const form = document.querySelector('#form')
new DirtyForm(form)
```

This will warn users before they navigate away from a page with unsaved changes.

### Track dirty state to enable/disable submit button

```js
const form = document.getElementById("form")
const dirtyForm = new DirtyForm(form, {
  onDirty: () => {
    form.querySelector("input[type=submit]").removeAttribute("disabled")
  },
})

form.addEventListener("submit", () => {
  dirtyForm.disconnect()
})
```

```html
<form action="/submit" method="post" id="form">
  <input type="text" name="name">
  <input type="submit" value="Submit" disabled>
</form>
```

### Excluding fields from tracking

Add `data-dirty-form="false"` to fields you want to exclude:

```html
<input type="text" name="search" data-dirty-form="false">
```

## Options

```js
new DirtyForm(form, {
  // Custom message shown to users
  message: 'You have unsaved changes. Are you sure you want to leave?',

  // Callback fired once when form becomes dirty
  onDirty: () => { /* ... */ },

  // Callback fired before Turbo navigation (if using Turbo)
  beforeLeave: () => { /* ... */ },

  // Disable navigation prevention (only track dirty state)
  skipLeavingTracking: true,
})
```

## API

**`disconnect()`** - Remove all event listeners and stop tracking
