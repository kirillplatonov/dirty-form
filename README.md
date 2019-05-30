# dirty-form

> A lightweight plugin to prevent losing data when editing forms. No dependencies.

It supports [Trix editor](https://trix-editor.org) and [Turbolinks 5](https://github.com/turbolinks/turbolinks).

## Install

You can get it via `npm`:

```
npm install dirty-form --save
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
