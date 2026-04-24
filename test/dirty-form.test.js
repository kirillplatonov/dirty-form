import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DirtyForm from '../src/index.js'

const DEBOUNCE_MS = 100

const instances = []
function create(form, options) {
  const dirty = new DirtyForm(form, options)
  instances.push(dirty)
  return dirty
}

function buildForm(innerHTML) {
  document.body.innerHTML = `<form id="f">${innerHTML}</form>`
  return document.getElementById('f')
}

function fire(el, type) {
  el.dispatchEvent(new Event(type, { bubbles: true }))
}

function flushDebounce() {
  vi.advanceTimersByTime(DEBOUNCE_MS)
}

function dispatchBeforeUnload() {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

describe('DirtyForm', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    while (instances.length) instances.pop().disconnect()
    vi.useRealTimers()
    document.body.innerHTML = ''
    delete globalThis.Turbo
  })

  describe('initial state', () => {
    it('starts clean', () => {
      const form = buildForm(`<input type="text" name="title" value="hello">`)
      const dirty = create(form)
      expect(dirty.isDirty).toBe(false)
    })

    it('stores initial values for text, select, and textarea fields', () => {
      const form = buildForm(`
        <input type="text" name="title" value="hello">
        <select name="enabled"><option value="yes" selected>yes</option><option value="no">no</option></select>
        <textarea name="body">body text</textarea>
      `)
      const dirty = create(form)
      expect(dirty._initialValues).toEqual({
        title: 'hello',
        enabled: 'yes',
        body: 'body text'
      })
    })

    it('stores the checked radio value per group, or "" when none is checked', () => {
      const form = buildForm(`
        <input type="radio" name="color" value="red">
        <input type="radio" name="color" value="blue" checked>
        <input type="radio" name="size"  value="s">
        <input type="radio" name="size"  value="m">
      `)
      const dirty = create(form)
      expect(dirty._initialValues.color).toBe('blue')
      expect(dirty._initialValues.size).toBe('')
    })

    it('stores the initial checked state per checkbox element', () => {
      const form = buildForm(`
        <input type="checkbox" name="features" value="a" checked>
        <input type="checkbox" name="features" value="b">
        <input type="checkbox" name="newsletter" value="yes">
      `)
      const dirty = create(form)
      const [a, b, newsletter] = form.querySelectorAll('input')
      expect(dirty._initialCheckboxState.get(a)).toBe(true)
      expect(dirty._initialCheckboxState.get(b)).toBe(false)
      expect(dirty._initialCheckboxState.get(newsletter)).toBe(false)
    })
  })

  describe('change detection', () => {
    it('marks dirty when a text input changes', () => {
      const form = buildForm(`<input type="text" name="title" value="hello">`)
      const dirty = create(form)
      const input = form.querySelector('input')

      input.value = 'hello world'
      fire(input, 'input')
      flushDebounce()

      expect(dirty.isDirty).toBe(true)
    })

    it('does not mark dirty when value returns to initial', () => {
      const form = buildForm(`<input type="text" name="title" value="hello">`)
      const dirty = create(form)
      const input = form.querySelector('input')

      input.value = 'hello'
      fire(input, 'input')
      flushDebounce()

      expect(dirty.isDirty).toBe(false)
    })

    it('marks dirty when a select changes', () => {
      const form = buildForm(`
        <select name="enabled">
          <option value="yes" selected>yes</option>
          <option value="no">no</option>
        </select>
      `)
      const dirty = create(form)
      const select = form.querySelector('select')

      select.value = 'no'
      fire(select, 'change')
      flushDebounce()

      expect(dirty.isDirty).toBe(true)
    })

    it('marks dirty when a different radio in the group becomes checked', () => {
      const form = buildForm(`
        <input type="radio" name="color" value="red" checked>
        <input type="radio" name="color" value="blue">
      `)
      const dirty = create(form)
      const blue = form.querySelector('input[value="blue"]')

      blue.checked = true
      fire(blue, 'change')
      flushDebounce()

      expect(dirty.isDirty).toBe(true)
    })

    it('handles Rails-style bracketed radio names via CSS.escape', () => {
      const form = buildForm(`
        <input type="radio" name="user[role]" value="admin" checked>
        <input type="radio" name="user[role]" value="member">
      `)
      const dirty = create(form)
      expect(dirty._initialValues['user[role]']).toBe('admin')

      const member = form.querySelector('input[value="member"]')
      member.checked = true
      fire(member, 'change')
      flushDebounce()

      expect(dirty.isDirty).toBe(true)
    })

    it('tracks radio groups independently', () => {
      const form = buildForm(`
        <input type="radio" name="color" value="red" checked>
        <input type="radio" name="color" value="blue">
        <input type="radio" name="size"  value="s" checked>
        <input type="radio" name="size"  value="m">
      `)
      const dirty = create(form)
      const blue = form.querySelector('input[name="color"][value="blue"]')

      blue.checked = true
      fire(blue, 'change')
      flushDebounce()

      expect(dirty.isDirty).toBe(true)
      expect(dirty._initialValues.size).toBe('s')
    })

    it('marks dirty when a checkbox toggles', () => {
      const form = buildForm(`<input type="checkbox" name="agree" value="yes">`)
      const dirty = create(form)
      const cb = form.querySelector('input')

      cb.checked = true
      fire(cb, 'change')
      flushDebounce()

      expect(dirty.isDirty).toBe(true)
    })

    it('does not mark dirty when a checkbox is toggled back to its initial state', () => {
      const form = buildForm(`<input type="checkbox" name="agree" value="yes" checked>`)
      const dirty = create(form)
      const cb = form.querySelector('input')

      cb.checked = true
      fire(cb, 'change')
      flushDebounce()

      expect(dirty.isDirty).toBe(false)
    })

    it('tracks checkboxes sharing a name independently', () => {
      const form = buildForm(`
        <input type="checkbox" name="features" value="a" checked>
        <input type="checkbox" name="features" value="b">
      `)
      const dirty = create(form)
      const [a, b] = form.querySelectorAll('input')

      b.checked = true
      fire(b, 'change')
      flushDebounce()

      expect(dirty.isDirty).toBe(true)
      expect(dirty._initialCheckboxState.get(a)).toBe(true)
    })

    it('tracks same-name checkboxes without value attributes independently', () => {
      // Both checkboxes default to value="on" per the HTML spec — string-keyed
      // storage (name:value) would collide. Element identity avoids that.
      const form = buildForm(`
        <input type="checkbox" name="features">
        <input type="checkbox" name="features" checked>
      `)
      const dirty = create(form)
      const [first, second] = form.querySelectorAll('input')

      expect(dirty._initialCheckboxState.get(first)).toBe(false)
      expect(dirty._initialCheckboxState.get(second)).toBe(true)

      second.checked = false
      fire(second, 'change')
      flushDebounce()
      expect(dirty.isDirty).toBe(true)
    })

    it('marks dirty on the change event for text inputs, not just input', () => {
      const form = buildForm(`<input type="text" name="title" value="hello">`)
      const dirty = create(form)
      const input = form.querySelector('input')

      input.value = 'changed'
      fire(input, 'change')
      flushDebounce()

      expect(dirty.isDirty).toBe(true)
    })

    it('stays dirty even after reverting a field to its initial value', () => {
      const form = buildForm(`<input type="text" name="title" value="hello">`)
      const dirty = create(form)
      const input = form.querySelector('input')

      input.value = 'changed'
      fire(input, 'input')
      flushDebounce()
      expect(dirty.isDirty).toBe(true)

      input.value = 'hello'
      fire(input, 'input')
      flushDebounce()
      expect(dirty.isDirty).toBe(true)
    })

    it('debounces: isDirty is not set before the debounce window elapses', () => {
      const form = buildForm(`<input type="text" name="title" value="hello">`)
      const dirty = create(form)
      const input = form.querySelector('input')

      input.value = 'changed'
      fire(input, 'input')
      vi.advanceTimersByTime(DEBOUNCE_MS - 1)
      expect(dirty.isDirty).toBe(false)

      vi.advanceTimersByTime(1)
      expect(dirty.isDirty).toBe(true)
    })

    it('marks dirty synchronously when debounce is 0', () => {
      const form = buildForm(`<input type="text" name="title" value="hello">`)
      const dirty = create(form, { debounce: 0 })
      const input = form.querySelector('input')

      input.value = 'changed'
      fire(input, 'input')

      expect(dirty.isDirty).toBe(true)
    })

    it('respects a custom debounce window', () => {
      const form = buildForm(`<input type="text" name="title" value="hello">`)
      const dirty = create(form, { debounce: 250 })
      const input = form.querySelector('input')

      input.value = 'changed'
      fire(input, 'input')
      vi.advanceTimersByTime(249)
      expect(dirty.isDirty).toBe(false)

      vi.advanceTimersByTime(1)
      expect(dirty.isDirty).toBe(true)
    })

    it('ignores fields with data-dirty-form="false"', () => {
      const form = buildForm(`
        <input type="text" name="tracked" value="a">
        <input type="text" name="ignored" value="x" data-dirty-form="false">
      `)
      const dirty = create(form)
      expect(dirty._initialValues).not.toHaveProperty('ignored')

      const ignored = form.querySelector('input[name="ignored"]')
      ignored.value = 'changed'
      fire(ignored, 'input')
      flushDebounce()

      expect(dirty.isDirty).toBe(false)
    })

    it('ignores inputs without a name attribute', () => {
      const form = buildForm(`
        <input type="text" name="named" value="a">
        <input type="text" value="no-name">
      `)
      const dirty = create(form)
      expect(Object.keys(dirty._initialValues)).toEqual(['named'])
    })

    it('fires onDirty exactly once even after many edits', () => {
      const form = buildForm(`<input type="text" name="title" value="hello">`)
      const onDirty = vi.fn()
      create(form, { onDirty })
      const input = form.querySelector('input')

      for (const v of ['a', 'ab', 'abc']) {
        input.value = v
        fire(input, 'input')
        flushDebounce()
      }

      expect(onDirty).toHaveBeenCalledTimes(1)
    })
  })

  describe('disconnect', () => {
    it('stops tracking field changes', () => {
      const form = buildForm(`<input type="text" name="title" value="hello">`)
      const dirty = create(form)
      dirty.disconnect()

      const input = form.querySelector('input')
      input.value = 'changed'
      fire(input, 'input')
      flushDebounce()

      expect(dirty.isDirty).toBe(false)
    })

    it('removes the beforeunload handler', () => {
      const form = buildForm(`<input type="text" name="title" value="hello">`)
      const dirty = create(form)

      const input = form.querySelector('input')
      input.value = 'changed'
      fire(input, 'input')
      flushDebounce()
      expect(dirty.isDirty).toBe(true)

      dirty.disconnect()

      expect(dispatchBeforeUnload().defaultPrevented).toBe(false)
    })

    it('cancels a pending debounced change so it cannot fire after teardown', () => {
      const form = buildForm(`<input type="text" name="title" value="hello">`)
      const dirty = create(form)
      const input = form.querySelector('input')

      input.value = 'changed'
      fire(input, 'input')
      vi.advanceTimersByTime(DEBOUNCE_MS - 1)
      dirty.disconnect()
      vi.advanceTimersByTime(DEBOUNCE_MS)

      expect(dirty.isDirty).toBe(false)
    })

    it('removes listeners from fields that were detached before disconnect', () => {
      // disconnect() must not depend on the live DOM matching the fields it
      // originally attached to — otherwise a removed field's listener would
      // be left behind and could still flip isDirty after teardown.
      const form = buildForm(`
        <input type="text" name="a" value="">
        <input type="text" name="b" value="">
      `)
      const dirty = create(form)
      const a = form.querySelector('input[name="a"]')

      a.remove()
      dirty.disconnect()

      a.value = 'changed'
      fire(a, 'input')
      flushDebounce()

      expect(dirty.isDirty).toBe(false)
    })
  })

  describe('beforeunload', () => {
    it('calls preventDefault when dirty', () => {
      const form = buildForm(`<input type="text" name="title" value="hello">`)
      const dirty = create(form)

      const input = form.querySelector('input')
      input.value = 'changed'
      fire(input, 'input')
      flushDebounce()
      expect(dirty.isDirty).toBe(true)

      expect(dispatchBeforeUnload().defaultPrevented).toBe(true)
    })

    it('does not preventDefault when clean', () => {
      const form = buildForm(`<input type="text" name="title" value="hello">`)
      create(form)

      expect(dispatchBeforeUnload().defaultPrevented).toBe(false)
    })
  })

  describe('skipLeavingTracking', () => {
    it('does not attach beforeunload when true', () => {
      const form = buildForm(`<input type="text" name="title" value="hello">`)
      const dirty = create(form, { skipLeavingTracking: true })

      const input = form.querySelector('input')
      input.value = 'changed'
      fire(input, 'input')
      flushDebounce()
      expect(dirty.isDirty).toBe(true)

      expect(dispatchBeforeUnload().defaultPrevented).toBe(false)
    })
  })

  describe('Trix editor', () => {
    it('marks dirty when a trix-change event fires and .value has diverged', () => {
      const form = buildForm(`<input type="hidden" name="content"><trix-editor></trix-editor>`)
      const trix = form.querySelector('trix-editor')
      trix.value = ''
      const dirty = create(form)

      trix.value = '<div>edited</div>'
      fire(trix, 'trix-change')
      flushDebounce()

      expect(dirty.isDirty).toBe(true)
    })

    it('ignores non-trix-change events on trix-editor', () => {
      const form = buildForm(`<trix-editor></trix-editor>`)
      const trix = form.querySelector('trix-editor')
      trix.value = ''
      const dirty = create(form)

      trix.value = '<div>edited</div>'
      fire(trix, 'input')
      fire(trix, 'change')
      flushDebounce()

      expect(dirty.isDirty).toBe(false)
    })

    it('disconnect() removes the trix-change listener', () => {
      const form = buildForm(`<trix-editor></trix-editor>`)
      const trix = form.querySelector('trix-editor')
      trix.value = ''
      const dirty = create(form)
      dirty.disconnect()

      trix.value = '<div>edited</div>'
      fire(trix, 'trix-change')
      flushDebounce()

      expect(dirty.isDirty).toBe(false)
    })

    it('tracks multiple <trix-editor> elements independently', () => {
      // Trix elements have no native `name` property. With name-keyed storage
      // both editors collide on the same `undefined` key — editing the first
      // editor to match the second's initial value would silently look "clean".
      const form = buildForm(`
        <trix-editor></trix-editor>
        <trix-editor></trix-editor>
      `)
      const [first, second] = form.querySelectorAll('trix-editor')
      first.value = 'one'
      second.value = 'two'

      const dirty = create(form)
      expect(dirty._initialTrixValues.get(first)).toBe('one')
      expect(dirty._initialTrixValues.get(second)).toBe('two')

      first.value = 'two'
      fire(first, 'trix-change')
      flushDebounce()

      expect(dirty.isDirty).toBe(true)
    })
  })

  describe('multi-select', () => {
    it('marks dirty when an additional option is selected', () => {
      const form = buildForm(`
        <select name="tags" multiple>
          <option value="a" selected>a</option>
          <option value="b">b</option>
          <option value="c">c</option>
        </select>
      `)
      const dirty = create(form)
      const select = form.querySelector('select')

      select.options[1].selected = true
      fire(select, 'change')
      flushDebounce()

      expect(dirty.isDirty).toBe(true)
    })

    it('does not mark dirty when the selection is unchanged', () => {
      const form = buildForm(`
        <select name="tags" multiple>
          <option value="a" selected>a</option>
          <option value="b" selected>b</option>
          <option value="c">c</option>
        </select>
      `)
      const dirty = create(form)
      const select = form.querySelector('select')

      // Reassign the same selection
      select.options[0].selected = true
      select.options[1].selected = true
      fire(select, 'change')
      flushDebounce()

      expect(dirty.isDirty).toBe(false)
    })

    it('marks dirty when an originally-selected option is deselected', () => {
      const form = buildForm(`
        <select name="tags" multiple>
          <option value="a" selected>a</option>
          <option value="b" selected>b</option>
        </select>
      `)
      const dirty = create(form)
      const select = form.querySelector('select')

      select.options[0].selected = false
      fire(select, 'change')
      flushDebounce()

      expect(dirty.isDirty).toBe(true)
    })
  })

  describe('file inputs', () => {
    it('stores initial file count as 0 for an empty file input', () => {
      const form = buildForm(`<input type="file" name="avatar">`)
      const dirty = create(form)
      expect(dirty._initialValues.avatar).toBe(0)
    })

    it('marks dirty when a file is selected', () => {
      const form = buildForm(`<input type="file" name="avatar">`)
      const dirty = create(form)
      const input = form.querySelector('input')

      Object.defineProperty(input, 'files', {
        value: [{ name: 'avatar.png' }],
        configurable: true,
      })
      fire(input, 'change')
      flushDebounce()

      expect(dirty.isDirty).toBe(true)
    })
  })

  describe('Turbo integration', () => {
    it('calls beforeLeave when the user confirms navigation', () => {
      globalThis.Turbo = {}
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      const beforeLeave = vi.fn()

      const form = buildForm(`<input type="text" name="title" value="hello">`)
      const dirty = create(form, { beforeLeave })

      const input = form.querySelector('input')
      input.value = 'changed'
      fire(input, 'input')
      flushDebounce()
      expect(dirty.isDirty).toBe(true)

      const event = new Event('turbo:before-visit', { cancelable: true })
      document.dispatchEvent(event)

      expect(confirmSpy).toHaveBeenCalledWith('You have unsaved changes!')
      expect(beforeLeave).toHaveBeenCalledTimes(1)
      expect(event.defaultPrevented).toBe(false)

      confirmSpy.mockRestore()
    })

    it('preventDefaults turbo:before-visit when the user cancels', () => {
      globalThis.Turbo = {}
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
      const beforeLeave = vi.fn()

      const form = buildForm(`<input type="text" name="title" value="hello">`)
      create(form, { beforeLeave })

      const input = form.querySelector('input')
      input.value = 'changed'
      fire(input, 'input')
      flushDebounce()

      const event = new Event('turbo:before-visit', { cancelable: true })
      document.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
      expect(beforeLeave).not.toHaveBeenCalled()

      confirmSpy.mockRestore()
    })

    it('passes the custom message option to confirm()', () => {
      globalThis.Turbo = {}
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      const form = buildForm(`<input type="text" name="title" value="hello">`)
      create(form, { message: 'Really leave?' })

      const input = form.querySelector('input')
      input.value = 'changed'
      fire(input, 'input')
      flushDebounce()

      document.dispatchEvent(new Event('turbo:before-visit', { cancelable: true }))

      expect(confirmSpy).toHaveBeenCalledWith('Really leave?')
      confirmSpy.mockRestore()
    })

    it('does not prompt on turbo:before-visit when clean', () => {
      globalThis.Turbo = {}
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      const form = buildForm(`<input type="text" name="title" value="hello">`)
      create(form)

      const event = new Event('turbo:before-visit', { cancelable: true })
      document.dispatchEvent(event)

      expect(confirmSpy).not.toHaveBeenCalled()
      confirmSpy.mockRestore()
    })

    it('handles turbo:before-visit even when Turbo loads after construction', () => {
      // Turbo is intentionally NOT defined at construction time
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      const form = buildForm(`<input type="text" name="title" value="hello">`)
      create(form)

      const input = form.querySelector('input')
      input.value = 'changed'
      fire(input, 'input')
      flushDebounce()

      // Turbo loads lazily and then dispatches a visit event
      globalThis.Turbo = {}
      document.dispatchEvent(new Event('turbo:before-visit', { cancelable: true }))

      expect(confirmSpy).toHaveBeenCalledWith('You have unsaved changes!')
      confirmSpy.mockRestore()
    })
  })
})
