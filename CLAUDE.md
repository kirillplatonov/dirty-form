# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

dirty-form is a zero-dependency JavaScript library that tracks form edits and warns users before they navigate away with unsaved changes. It integrates with Trix editor and Turbo.

## Commands

- `npm run build` — clean `dist/` and build with Rollup (config is `rollup.config.mjs`)
- `npm run dev` — Rollup watch mode
- `npm run clean` — remove `dist/`
- `npm run release` — publishes to npm; `prepublishOnly` runs a build, and `prerelease` prints the diff and a `npm pack --dry-run` preview

There is no automated test suite. Smoke-test changes by opening `demo/index.html` in a browser (it links to `demo/second.html`) and verifying the warning fires on edits and the callbacks wire up correctly.

## Architecture

Single-file library: `src/index.js` exports the `DirtyForm` class. Rollup emits three bundles to `dist/`:

- `dirty-form.js` — UMD (referenced by `package.json` `main`)
- `dirty-form.min.js` — UMD, minified with terser
- `dirty-form.esm.js` — ES module (referenced by `package.json` `module`)

### Field tracking

- `fields` is a **getter** that re-queries the DOM on every access. Fields added to the form after construction are not tracked; `disconnect()` only removes listeners from fields present at call time.
- Tracks `INPUT`, `SELECT`, `TEXTAREA` (each must have a `name`) and `TRIX-EDITOR` elements.
- Per-field-type initial-value storage:
  - Radios: one entry per group name, storing the initially-checked value (or `''`).
  - Checkboxes: entry keyed as `name:value`, storing the boolean `checked` state.
  - Everything else: entry keyed by `name`, storing `field.value`.
- `data-dirty-form="false"` excludes a field from tracking.
- Change detection uses a single 100ms-debounced handler on `change` (and `input` for text-like fields, `trix-change` for Trix). The handler compares against the stored initial value and flips `isDirty` once.

### Navigation prevention

- `beforeunload` sets `event.returnValue` to the configured message — the browser shows its own native prompt. Nothing user-provided can run here.
- When `Turbo` is present globally, `turbo:before-visit` calls `confirm(message)`; `beforeLeave` **only** fires on this Turbo path, not on `beforeunload`.
- `skipLeavingTracking: true` disables both handlers and makes the instance a pure dirty-state tracker (useful when the caller wants to drive submit-button enablement without any leave prompt).

### Lifecycle

Callers typically invoke `disconnect()` on form `submit` so the unload handler does not fire during the legitimate navigation (see the pattern in `README.md` and `demo/index.html`).
