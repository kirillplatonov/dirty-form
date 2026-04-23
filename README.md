# dirty-form

Lightweight plugin to track form changes and prevent losing unsaved edits. No dependencies.

## Integrations

- [Trix editor](https://trix-editor.org)
- [Turbo](https://github.com/hotwired/turbo)

## Supported fields

Any `<input>`, `<select>`, or `<textarea>` with a `name` attribute is tracked, along with `<trix-editor>` elements. Radio groups are tracked by group name, and each checkbox is tracked independently.

## Install

Via `npm`:

```
npm install --save dirty-form
```

Or `yarn`:

```
yarn add dirty-form
```

Or `pnpm`:

```
pnpm add dirty-form
```

Or via CDN — the UMD bundle exposes a `DirtyForm` global:

```html
<script src="https://unpkg.com/dirty-form/dist/dirty-form.min.js"></script>
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

Calling `disconnect()` on submit prevents the unsaved-changes prompt from firing during the legitimate form submission.

### Excluding fields from tracking

Add `data-dirty-form="false"` to fields you want to exclude:

```html
<input type="text" name="search" data-dirty-form="false">
```

## Options

```js
new DirtyForm(form, {
  // Message shown in the browser's native beforeunload prompt and
  // Turbo's confirm() dialog. Default: 'You have unsaved changes!'
  message: 'You have unsaved changes. Are you sure you want to leave?',

  // Fired once, the first time the form becomes dirty
  onDirty: () => { /* ... */ },

  // Turbo only: fired after the user confirms leaving the page.
  // There is no equivalent for beforeunload — browsers don't allow
  // callbacks to run during that event.
  beforeLeave: () => { /* ... */ },

  // Skip both navigation prompts; only track dirty state
  skipLeavingTracking: true,
})
```

## API

- **`disconnect()`** — remove all event listeners and stop tracking. Typically called on form `submit` so the unsaved-changes prompt doesn't interrupt a legitimate submission.
- **`isDirty`** (property) — `true` once any tracked field has diverged from its initial value.

## License

[MIT](MIT-LICENSE)
