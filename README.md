# dirty-form

> A lightweight plugin to prevent losing data when editing forms. No dependencies.

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

## Track unsaved form changes

```js
import DirtyForm from 'dirty-form'

let form = document.querySelector('#form')
new DirtyForm(form)
```

If you want to customize the message:

```js
new DirtyForm(form, {
  message: 'You have unsaved changes. Are you sure you want to leave?',
})
```

## Track dirty form state to enable/disable submit

```js
import DirtyForm from 'dirty-form'

const form = document.getElementById("form");
const dirtyForm = new DirtyForm(form, {
  onDirty: () => {
    form.querySelector("input[type=submit]").removeAttribute("disabled");
  },
});

form.addEventListener("submit", () => {
  dirtyForm.disconnect();
});
```

```html
<form action="second.html" method="post" id="form">
  <input type="text" name="name">
  <input type="submit" value="Submit" disabled>
</form>
```
