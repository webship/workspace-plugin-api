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

The manifest type also knows `needs` and `suggests` (`PluginNeeds`): the other plugins a plugin
cannot work without, or that a part of it is for — a name, or a list of names when any one will do —
and, as an object, the commands it needs on the machine beside them (`CommandNeed`: a name, with
where it runs and how to install it).

A plugin can be the runner of the commands the dashboard starts: `api.addRunner(fn)` is handed a
`RunnerRequest` and answers a `RunnerAnswer`, or null to leave the run to the dashboard. `api.addScreensPanel(fn)`
draws a panel at the top of the Screens page. Both are optional members: a dashboard that has them says so
with `api.capabilities.has('runner')` and `has('screens-panel')`.

A plugin can load its own browser scripts (the manifest's `js`, or `api.addScript(file)`), take a binary
upload (`api.addUpload(name, handler, { maxBytes })`, handed an `UploadContext`) and add a paragraph to
one turn of the assistant (`api.addAssistantTurn(fn)`). They are optional members too, behind
`capabilities.has('scripts')`, `has('uploads')` and `has('assistant-turn')`. `api.lib.localSite(urlOrHost)`
and `api.lib.readerAllowed(url)` answer which project of the workspace a host belongs to and whether the
reading window may open a URL.

The contract and the lifecycle (require, activate, install, configure) are documented in the
dashboard's `core/workspace-app/PLUGINS.md`.
