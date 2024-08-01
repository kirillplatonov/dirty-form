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

## Setup

```javascript
import DirtyForm from 'dirty-form'

let form = document.querySelector('#form')
new DirtyForm(form)
```

If you want to customize the message:

```javascript
new DirtyForm(form, {
  message: 'You have unsaved changes. Are you sure you want to leave?',
})
```

### Stimulus example

```html
<%= form_with url: posts_path, html: { data: { controller: 'dirty-form' } } do |form| %>
  <%= form.text_field :title %>
<% end %>
```

```js
// dirty_form_controller.js
import { Controller } from 'stimulus'
import DirtyForm from 'dirty-form'

export default class extends Controller {
  connect() {
    new DirtyForm(this.element)
  }
}
```
