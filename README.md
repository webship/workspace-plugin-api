# @webship.co/workspace-plugin-api

The TypeScript types of the Webship Workspace dashboard's plugin api — what `register(api)` is
handed — and of the `workspacePlugin` manifest a plugin package declares in its `package.json`.
Types only: the dashboard defines the api in `core/workspace-app/plugin-loader.js`, and this package
says what it looks like, so a plugin written in TypeScript is checked against it.

```ts
import type { PluginApi } from '@webship.co/workspace-plugin-api';

export function register(api: PluginApi): void {
  api.addRowMenu('cloud', { label: 'CLOUD', row: 0 }, ({ key, project }) => `…`);
}
```

A row-menu function may also answer a `RowMenuBody` (`{ html, body, caption?, classes? }`): the button
and the URL of a fragment that answers the dropdown's inner HTML when the menu opens, so a page of
fifty rows carries fifty buttons and not fifty menus. A dashboard that understands that form says so
with `api.capabilities.has('row-menu-body')`.

The contract and the lifecycle (require, activate, install, configure) are documented in the
dashboard's `core/workspace-app/PLUGINS.md`.
