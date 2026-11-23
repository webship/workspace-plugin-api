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

A command the dashboard starts runs in a screen session and nowhere else on a dashboard that says
`api.capabilities.has('screens-only')`: a plugin's runner, the host runner, then screen where the dashboard
runs. There is no run in the page and no terminal at the bottom of it. `startInScreen` answers
`{ ok: false, noScreen: true, cmdLine, dir }` when no session can be started, and `screenStartedHtml` draws
the notice for every case. `api.lib.startJob` stays for a view that follows a process in a window of the
plugin's own; it is not how a command is run.

A plugin can load its own browser scripts (the manifest's `js`, or `api.addScript(file)`), take a binary
upload (`api.addUpload(name, handler, { maxBytes })`, handed an `UploadContext`) and add a paragraph to
one turn of the assistant (`api.addAssistantTurn(fn)`). They are optional members too, behind
`capabilities.has('scripts')`, `has('uploads')` and `has('assistant-turn')`. `api.lib.localSite(urlOrHost)`
and `api.lib.readerAllowed(url)` answer which project of the workspace a host belongs to and whether the
reading window may open a URL.

The contract and the lifecycle (require, activate, install, configure) are documented in the
dashboard's `core/workspace-app/PLUGINS.md`.

The manifest's `family` (`platforms`, `folders`, `ai`, `hosting`, `forges`, `containers`, `features`) and
`summary` (one line) say where Settings lists a plugin and what it shows under its name, on a dashboard
with `capabilities.has('settings-family')`. Both are optional.

## Development

The package is TypeScript throughout. `src/index.ts` is the runtime module (an empty object): `npm run build`
compiles it to `index.js`, the `main` of the published package, and `prepare` runs that build before the
package is packed, so `index.js` is built and never committed. Node.js does not run TypeScript from inside
`node_modules`, which is why the published file is the compiled one. The tests are TypeScript too
(`tests/package.test.mts`) and Node.js runs them as they are, on Node.js 24 or later.

```bash
npm ci          # installs, then builds index.js
npm run lint    # tsc, strict, erasable syntax only: index.d.ts, src/ and tests/
npm test        # the lint, the build, then node --test tests/*.test.mts
```
