# dirty-form

Lightweight plugin to track form changes and prevent losing unsaved edits. No dependencies.

## Integrations

- [Trix editor](https://trix-editor.org)
- [Turbo](https://github.com/hotwired/turbo)

## Supported fields

Any `<input>`, `<select>`, or `<textarea>` with a `name` attribute is tracked, along with `<trix-editor>` elements. Radio groups are tracked by group name, and each checkbox is tracked independently.

Fields added to the form after construction are not tracked by default. Pass `watchNewFields: true` to enable a `MutationObserver` that picks up dynamically rendered fields — useful for Turbo Frames, React/Vue-rendered subtrees, or any form that grows over time.

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

This will warn users before they navigate away from a page with unsaved changes. Outside Turbo, the prompt is the browser's native `beforeunload` dialog — modern Chrome, Firefox, and Safari render a generic "Leave site?" message and ignore any custom string (an anti-phishing measure). The `message` option below only takes effect on Turbo's `confirm()` path.

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
  // Message shown in Turbo's confirm() dialog. Default: 'You have unsaved changes!'
  // Note: modern browsers ignore this on the native beforeunload prompt and
  // show their own generic wording. The option is only honored on the Turbo path.
  message: 'You have unsaved changes. Are you sure you want to leave?',

  // Fired once, the first time the form becomes dirty
  onDirty: () => { /* ... */ },

  // Turbo only: fired after the user confirms leaving the page.
  // There is no equivalent for beforeunload — browsers don't allow
  // callbacks to run during that event.
  beforeLeave: () => { /* ... */ },

  // Skip both navigation prompts; only track dirty state
  skipLeavingTracking: true,

  // Observe the form for dynamically added/removed fields and track them
  // automatically. Default: false (only fields present at construction
  // time are tracked).
  watchNewFields: true,

  // Milliseconds to debounce change detection. Default: 100.
  // Set to 0 to check on every event synchronously.
  debounce: 100,
})
```

## API

- **`disconnect()`** — remove all event listeners and stop tracking. Typically called on form `submit` so the unsaved-changes prompt doesn't interrupt a legitimate submission.
- **`isDirty`** (property) — `true` once any tracked field has diverged from its initial value.

## Development

This repo uses [pnpm](https://pnpm.io).

```
pnpm install
pnpm test          # run the Vitest + jsdom suite once
pnpm test:watch    # Vitest watch mode
pnpm build         # bundle to dist/ with Rollup
pnpm dev           # Rollup watch mode
```

## Releasing

Releases are driven by [release-it](https://github.com/release-it/release-it) (config in `.release-it.json`). It runs the test suite, bumps the version, commits, tags, pushes, publishes to npm, and creates a GitHub release.

```
pnpm release              # interactive
pnpm release --dry-run    # preview, no side effects
pnpm release minor --ci   # non-interactive minor bump
```

Prerequisites: `npm login` for the npm publish step, and a `GITHUB_TOKEN` (or `gh auth login`) for the GitHub release step.

## License

[MIT](MIT-LICENSE)
