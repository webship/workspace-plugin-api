/**
 * The api a Webship Workspace dashboard plugin registers against.
 *
 * The dashboard (core/workspace-app/plugin-loader.js) hands `register(api)` one of these. A plugin
 * reaches the dashboard only through it: a package that requires nothing from the dashboard's own
 * files can be installed from npm and removed without a trace, and its tests can hand it a fake.
 */

export type Html = string;

/** The parsed form of a POST, as querystring.parse gives it: a key seen twice is an array. */
export type Form = Record<string, string | string[] | undefined>;

export interface ActionContext {
  form: Form;
  res: import('http').ServerResponse;
  /** Answer with an HTML fragment. */
  send: (html: Html, status?: number) => void;
  /** The workspace the request named (its folder's key). */
  workspace: string;
  pathname: string;
}

/** What an `addUpload` handler is given. */
export interface UploadContext {
  req: import('http').IncomingMessage;
  res: import('http').ServerResponse;
  /** The posted bytes. */
  body: Buffer;
  searchParams: URLSearchParams;
  /** Answer with JSON. */
  json: (value: unknown, status?: number) => void;
}

export interface FragmentContext {
  req: import('http').IncomingMessage;
  res: import('http').ServerResponse;
  send: (html: Html, status?: number) => void;
  /** What followed /fragments/p/<plugin>/ in the path. */
  rest: string;
  searchParams: URLSearchParams;
}

export interface PageContext {
  req: import('http').IncomingMessage;
  res: import('http').ServerResponse;
  send: (html: Html, status?: number) => void;
  /** The match of the RegExp the page was registered with. */
  match: RegExpMatchArray;
}

export interface WorkspaceMeta {
  label?: string;
  subtitle?: string;
  dir: string;
  kind?: string;
  type?: string;
  /** The actions the workspace's type allows on its rows. */
  typeActions?: Set<string>;
  [key: string]: unknown;
}

/** What a row menu, a card chip or a row action is drawn with. */
export interface RowContext {
  /** The workspace key, e.g. "dev". */
  key: string;
  /** The project folder's name. */
  project: string;
  /** The workspace folder's absolute path. */
  dir: string;
  meta: WorkspaceMeta;
  /** The actions this row's workspace type allows. */
  allowed: Set<string>;
  /** hx-vals + target attributes naming this row's workspace and project; `extra` is spliced into the JSON. */
  vals: (extra?: string) => string;
}

export interface RowMenuSpec {
  label: string;
  /** 0 for the first row of tools, 1 for the second. */
  row?: 0 | 1;
  columns?: boolean;
  menu?: boolean;
}

/**
 * A row menu whose body loads when it opens: the page carries the button, its caption and an empty
 * dropdown shell, and the dashboard fetches `body` into the shell as the menu opens (through its own
 * /fragments/row-menu/… route, so the Buttons settings arrange the items like an inline menu's).
 * A dashboard that understands this form says so with `api.capabilities.has('row-menu-body')`.
 */
export interface RowMenuBody {
  /** The button that opens the menu. */
  html: Html;
  /** The URL of a fragment this plugin serves (under /fragments/p/<plugin>/) answering the dropdown's inner HTML. */
  body: string;
  /** The small text beside the button (`not linked`, `3 running`), or none. */
  caption?: string;
  /** Extra classes on the `.uk-inline.act-menu` wrapper, after the `act-menu-<slot>` the dashboard adds. */
  classes?: string;
}

/** What a row-menu function answers: the whole menu as HTML, a menu whose body loads when it opens, or null. */
export type RowMenuAnswer = Html | RowMenuBody | null;

export interface FolderSetupContext {
  /** The actions the workspace's type allows. */
  allowed: Set<string>;
}

/** A section of the New-folder form and what it contributes once the form is submitted. */
export interface FolderSetup {
  /** The section's HTML, or '' when this plugin has nothing for the workspace. */
  html?: (workspace: string, ctx: FolderSetupContext) => Html;
  /** Shell steps appended to the setup line, each run after the one before. */
  steps?: (workspace: string, name: string, form: Form, ctx: FolderSetupContext) => string[];
  /** Paragraphs added to the Claude Code prompt that runs in the new folder. */
  prompt?: (workspace: string, name: string, form: Form, ctx: FolderSetupContext) => string[];
  /** Why the form cannot be run as sent, or ''. */
  problem?: (workspace: string, form: Form, ctx: FolderSetupContext) => string;
}

export interface ScreenSession { session: string; state?: string; started?: string }

export interface RunResult {
  ok: boolean;
  code: number;
  stdout: string;
  stderr: string;
}

export interface ScreenStart {
  ok: boolean;
  session?: string;
  already?: boolean;
  needsRunner?: boolean;
  why?: string;
  /** Where it runs: 'host' (the dashboard's host runner), 'page' (a job toast), or what a plugin's runner says. */
  where?: string;
  /** The answer a plugin's runner wants shown; `screenStartedHtml` returns it as it is. */
  html?: Html;
  /** The job's id when the command runs in the page; `screenStartedHtml` draws its toast. */
  job?: string;
}

/** One command of a project the dashboard is about to start, as a runner is handed it. */
export interface RunnerRequest {
  /** The session name the dashboard would use: workspace--project--verb. */
  session: string;
  workspace: string;
  project: string;
  /** Where the command runs. */
  projectDir: string;
  /** The folder the work belongs to, when it is not where the command runs. */
  ownerDir?: string;
  verb: string;
  cmdLine: string;
  label: string;
}

/** What a runner answers once it has started the command its own way; null leaves it to the dashboard. */
export type RunnerAnswer = Omit<ScreenStart, 'needsRunner' | 'job'> | null;

/** The shared helpers the dashboard lends every plugin. */
export interface PluginLib {
  esc: (s: unknown) => string;
  humanSize: (bytes: number) => string;
  humanTime: (d: Date) => string;
  /** The last lines of a CLI's output that explain a failure. */
  cliError: (text: string, max?: number) => string;
  /** The workspace root, e.g. /home/you/workspace. */
  ROOT: string;
  CONFIG_DIR: string;
  loadSettings: () => Record<string, any>;
  loadWorkspaces: () => Record<string, WorkspaceMeta>;
  workspaceDir: (key: string) => string;
  isValidWorkspace: (key: string) => boolean;
  /** Run a command and collect its output. */
  run: (cmd: string, args: string[], cwd: string, opts?: { timeoutMs?: number; env?: NodeJS.ProcessEnv }) => Promise<RunResult>;
  /** Start a command as a live job toast; `jobFragment(id).html` is what to answer with. */
  startJob: (title: Html, cmd: string, args: string[], cwd: string, opts?: Record<string, unknown>) => string;
  jobFragment: (id: string) => { html: Html };
  runningJobKey: (key: string) => string | null | undefined;
  listProjects: (dir: string) => string[];
  /** Run a workspace command in a screen session on the project, answering the request for you. */
  screenAction: (send: ActionContext['send'], opts: { workspace: string; project: string; projectDir: string; ownerDir?: string; verb: string; cmdLine: string; label: string }) => Promise<void> | void;
  /** Start a command: a plugin's runner first, the host runner next, the page last. `page: false` is for a caller that follows the session itself: it is told the runner is missing instead of being run in the page. */
  startInScreen: (opts: { workspace: string; project: string; projectDir: string; ownerDir?: string; verb: string; cmdLine: string; label: string; page?: boolean }) => Promise<ScreenStart>;
  screenStartedHtml: (started: ScreenStart, what: string, project: string) => Html;
  /** A project or script name the dashboard accepts. */
  NAME_RE: RegExp;
  wsUrl: (key: string) => string;
  /** An icon by name, e.g. iconHtml('tabler:cloud-upload', 0.7). */
  iconHtml: (name: string, ratio?: number) => Html;
  /** A block of commands to copy, with a title and an explanation. */
  commandBlock: (title: string, commands: string[], note?: Html) => Html;
  TYPES: Record<string, { label: string; description: string; actions: string[] }>;
  /** A tab modal: `{ id, title, subtitle, back: { label, url }, active, groups: [{ id, label, tabs: [{ id, label, icon, url, hint }] }] }`. */
  tabModalHtml: (opts: Record<string, unknown>) => Html;
  /** The dashboard's hostname, for links a plugin posts elsewhere. */
  hubDomain: () => string;
  /** What git says about a folder: a repository (any shape), its own .git, the worktree role and what a remove destroys, the branch. */
  projectHasGit: (dir: string) => boolean;
  hasOwnGit: (dir: string) => boolean;
  gitWorktreeInfo: (dir: string) => { role: 'none' | 'plain' | 'primary' | 'linked'; branch: string; others: string[]; primary: string; unpushed: number; dirty: number; unborn?: boolean };
  gitBranchOf: (dir: string) => string;
  /** The tail a short command's session ends with: it stays open to be read, then closes by itself; and the mark it prints. */
  lingerTail: (label: string) => string;
  LINGER_MARK: string;
  /** A path with ~ for the home folder. */
  tildePath: (p: string) => string;
  /** The list helpers a plugin's own list page draws with: readPageState(req), paginate(list, state), SORTS, defaultSort(), listControlsHtml(url, target, state, noun), listPagerHtml(url, target, page, state, noun). */
  lists: { readPageState: (req: unknown, list?: unknown) => PageState; paginate: (list: unknown[], state: PageState) => { slice: any[]; page: number; pages: number; total: number }; SORTS: Record<string, { cmp: (a: any, b: any) => number }>; defaultSort: () => string; listControlsHtml: (url: string, target: string, state: PageState, noun: string, extra?: Html, hidden?: Html, opts?: Record<string, unknown>) => Html; listPagerHtml: (url: string, target: string, page: unknown, state: PageState, noun: string) => Html };
  /** The project of this workspace a URL or host name belongs to, or null. Absent on an older dashboard. */
  localSite?: (urlOrHost: string) => { workspace: string; project: string; dir: string; host: string } | null;
  /** '' when the reading window may open a URL, else the reason it may not. Absent on an older dashboard. */
  readerAllowed?: (url: string) => string;
  /** The stylesheet version a standalone page links (`/style.css?v=…`). */
  cssVersionNow: () => string;
  /** The first `cmd-*.sh` in a folder matching one of the patterns, or null. */
  findScript: (dir: string, patterns: RegExp[]) => string | null;
  /** The host runner: 'stop' a screen session (`{ session }`) before starting it afresh, and the rest of its verbs. */
  hostRunnerRequest: (action: string, payload: Record<string, unknown>, opts?: { timeoutMs?: number }) => Promise<any>;
  /** The screen sessions on this machine. */
  listScreens: () => Promise<ScreenSession[]>;
  /** Which of those have an agent inside. */
  agentSessions: (sessions: ScreenSession[]) => Set<string>;
  screenLogFor: (session: string) => string | null;
  /** The Claude Code transcripts a folder holds, newest first. */
  claudeSessionsFor: (dir: string, opts?: { limit?: number }) => { id: string; at: number }[];
  /** The last `screen -ls`, for a renderer that cannot wait: refreshed in the background, at most every 10s. */
  screensCached: () => ScreenSession[];
  auth: { sessionOf: (req: import('http').IncomingMessage) => unknown; googleButton: (...a: unknown[]) => Html; BUTTON_CSS: string };
  workspaceType: (key: string) => string | null;
  typeAllows: (key: string, action: string) => boolean;
}

export interface PluginSettings {
  /** The file's name under core/config/. */
  file: string;
  read: () => Record<string, any>;
  /** Change one key (dotted) in place; comments in the file survive. */
  set: (dotted: string, value: unknown) => void;
  setList: (dotted: string, items: string[]) => void;
}

export interface PluginApi {
  /** The plugin's settings key, and its route namespace. */
  name: string;
  /** Its `plugins.<name>` block from settings.yml, verbatim. */
  config: Record<string, any>;
  lib: PluginLib;
  settings: PluginSettings;
  /**
   * What this dashboard can do that an older one could not; a package that serves several dashboards
   * checks it before using a newer form of an answer. Absent on a dashboard older than 1.0.0-rc2.
   * Names so far: `row-menu-body` (a row-menu function may answer a `RowMenuBody`), `runner` (`addRunner`),
   * `screens-panel` (`addScreensPanel`), `scripts` (`addScript` and the manifest's `js`), `uploads` (`addUpload`),
   * `assistant-turn` (`addAssistantTurn`).
   */
  capabilities?: ReadonlySet<string>;
  /** Whether `config.workspaces` includes that workspace (an empty list means all). */
  appliesTo: (workspaceKey: string) => boolean;
  /** POST handler at /actions/p/<plugin>/<action>. */
  addAction: (action: string, handler: (ctx: ActionContext) => unknown) => void;
  /** GET handler for /fragments/p/<plugin>/<rest>. */
  addFragment: (handler: (ctx: FragmentContext) => unknown) => void;
  /** A rail group on a page, or null. */
  addPageActions: (fn: (ctx: { view: string; key: string; meta: WorkspaceMeta }) => { label: string; items: Html[] } | null) => void;
  /** HTML appended to a project row's actions, or null. */
  addProjectActions: (fn: (ctx: { key: string; project: string; dir: string; meta: WorkspaceMeta }) => Html | null) => void;
  /**
   * A named menu on every project row, in a slot the Buttons settings arrange. The function answers the
   * menu's HTML, null for a row it has nothing for, or a `RowMenuBody`: the button and the URL of the
   * body, fetched when the menu opens (needs `capabilities.has('row-menu-body')`).
   */
  addRowMenu: (slot: string, spec: RowMenuSpec, fn: (ctx: RowContext) => RowMenuAnswer) => void;
  /** A whole page: GET requests whose path matches `re`. */
  addPage: (re: RegExp, handler: (ctx: PageContext) => unknown) => void;
  /** A chip in the project card's meta line, or null. */
  addProjectChip: (fn: (ctx: Omit<RowContext, 'allowed' | 'vals'>) => Html | null) => void;
  addFolderSetup: (setup: FolderSetup) => void;
  /** A stylesheet of the plugin's own, appended after the dashboard's components. */
  addCss: (absoluteFile: string) => void;
  /** An action name workspace types may allow, on the types named. */
  addTypeAction: (action: string, types: string[]) => void;
  /** Labels for the plugin's settings keys. */
  addLabels: (map: Record<string, { label?: string; info?: string; options?: Record<string, string> }>) => void;
  /** A badge in the project card's corner, sent with every screens poll (so it clears itself); `sessions` is the project's live screens. */
  addProjectBadge: (fn: (ctx: { key: string; project: string; dir: string; sessions: ScreenSession[] }) => Html | null) => void;
  /** Live options for a field of a settings file; null means a plain input. */
  addSettingsOptions: (file: string, dotted: string, fn: (ctx: { file: string; dotted: string }) => Promise<[string, string][] | null>) => void;
  /** Called after a screen session started for a work item; returns HTML to show, or ''. */
  addScreenStartHook: (fn: (ctx: { session: string; workKey: string; workspace: string; project: string; dir: string; form: Form }) => Promise<Html | ''> | Html | '') => void;
  /** Where a work-item key found in a project's name links to, or null. */
  addWorkKeyLink: (fn: (key: string) => string | null) => void;
  /** The prompt a screen started for a work item begins with, or null for the dashboard's own. */
  addWorkPrompt: (fn: (ctx: { key: string; workspace: string; project: string }) => string | null) => void;
  /** Where a session's log lives when the dashboard does not know: a file in one of `dirs`, or ''. */
  addSessionLog: (fn: (session: string, dirs: string[]) => string) => void;
  /** A paragraph of the assistant's system context, or ''. */
  addAssistantContext: (fn: () => string) => void;
  /** Who answers for a git forge host ('github.com'): the environment a child process needs to authenticate there, and who that is. */
  addForge: (host: string, spec: ForgeSpec) => void;
  /** The "Open with" menu for a folder (the Web IDE here, an editor on the browser's machine): drawn on project rows (the `ide` slot is the plugin's), the files pages and the images gallery. The first plugin that answers wins. */
  addOpenWith: (fn: (abs: string, opts: { label?: string; caption?: string; git?: { role: string; branch: string; others: string[]; primary: string; unpushed: number; dirty: number } | null }) => Html | null) => void;
  /** A link that opens a folder elsewhere (the Web IDE on it), offered inside other menus (COMPOSER). */
  addFolderLink: (fn: (abs: string) => { href: string; label: string; icon?: string; title?: string } | null) => void;
  /**
   * The runner of the commands the dashboard starts (a build, a row menu's verb, a tool). The function
   * starts the command its own way and answers with the result, or null to leave it to the dashboard
   * (its host runner, else the page). Absent on a dashboard without `capabilities.has('runner')`.
   */
  addRunner?: (fn: (req: RunnerRequest) => Promise<RunnerAnswer> | RunnerAnswer) => void;
  /** A panel at the top of the Screens page: its HTML, or '' for none. Absent on a dashboard without `capabilities.has('screens-panel')`. */
  addScreensPanel?: (fn: () => Html) => void;
  /**
   * A browser script of the plugin's own (what the manifest's `js` does): served at
   * `/plugin-js/<plugin>/<file name>` and loaded with `defer` after the dashboard's own, in the order
   * declared. Absent on a dashboard without `capabilities.has('scripts')`.
   */
  addScript?: (absoluteFile: string) => void;
  /**
   * POST handler at `/actions/p/<plugin>/<name>` for a binary body (an utterance, a picture). Refused
   * from another site and over `maxBytes` (2 MB unless said). Absent on a dashboard without
   * `capabilities.has('uploads')`.
   */
  addUpload?: (name: string, handler: (ctx: UploadContext) => unknown, opts?: { maxBytes?: number }) => void;
  /**
   * A paragraph of the assistant's context for one turn only: the function is given what the page
   * posted and answers a paragraph or ''. Absent on a dashboard without `capabilities.has('assistant-turn')`.
   */
  addAssistantTurn?: (fn: (ctx: { body: Record<string, any>; message: string }) => Promise<string> | string) => void;
  /** A plugin that owns a workspace folder's page (the graphs workspace): its list section, the count on the home card, and whether the files-page actions and the New-folder form stay away from it. */
  addWorkspaceView: (key: string, view: { listHtml?: (state: PageState) => Html; count?: () => number; noFilesActions?: boolean; noNewForm?: boolean }) => void;
}

/** The paging and sorting state of a list page, as `lib.lists.readPageState(req)` reads it. */
export interface PageState { q: string; sort: string; page: number; size: number; filter?: string; [k: string]: unknown }

/** What a forge plugin registers for a host. */
export interface ForgeSpec {
  /** The forge's label: 'GitHub'. */
  label: string;
  /** The environment a child process (git, gh, glab, curl) needs to authenticate at the host, or null when there is no credential. */
  env: () => NodeJS.ProcessEnv | null;
  /** Who the credential belongs to: { username, email, how } for the settings page; never the token. */
  auth: () => { username?: string; email?: string; how: string };
}

/** The `workspacePlugin` block of a plugin package's package.json. */
export interface WorkspacePluginManifest {
  /** Lowercase letters, digits and hyphens: the settings key and the route namespace. */
  name: string;
  label?: string;
  /** core/config/<file>, the plugin's own settings. */
  settingsFile?: string;
  /** A template of it, in the package. */
  settingsTemplate?: string;
  /** The settings.yml block the file replaces: its values carry over on the first install. */
  legacySettingsKey?: string;
  /** The plugin IS a workspace folder: its key (the folder under the workspace root and the `workspace.<key>.settings.yml` it is described by), the settings template placed once and kept, the `cmd-*.sh` commands placed into the folder (`__WORKSPACE__` filled), and docs (AGENTS.md, README.md) written once. --activate puts the key on settings.yml's workspaces list. */
  workspace?: { key: string; settingsTemplate?: string; files?: string[]; docs?: string[] };
  /** A YAML file of labels for the settings keys, in the package. */
  labels?: string;
  /** Actions workspace types may allow: { upsun: ["sites"] }. */
  typeActions?: Record<string, string[]>;
  /** Per-workspace commands, installed into every named workspace (else every one of the types). __WORKSPACE__ is filled in. */
  commands?: { types?: string[]; workspaces?: string[]; files: string[] };
  scripts?: {
    /** Sourced by bootstrap once installed. */
    functions?: string[];
    /** Sourced by commands as ${WORKSPACE_SCRIPTS}/plugins/<name>/args/<file>. */
    args?: string[];
    machine?: string[];
    /** Run with --check after an install, and in full from install.sh. */
    hostInstall?: string;
  };
  ddev?: {
    /** Compose overrides, installed as core/workspace-app/.ddev/docker-compose.plugin-<name>-<file>. */
    compose?: string[];
    /** Host paths the compose files bind-mount; host-mounts.sh creates them as the user. */
    hostMounts?: string[];
  };
  /** Theme files, installed into core/config/. */
  themes?: string[];
  /** Stylesheets appended after the dashboard's components. */
  css?: string[];
  /** Browser scripts loaded on every page after the dashboard's own (needs a dashboard with the `scripts` capability). */
  js?: string[];
  /** webship-js feature files, installed under the dashboard's tests/features/plugins/<name>/. */
  features?: string[];
  /**
   * AI items the plugin ships, placed in the workspace folder of their kind when the workspace has it:
   * agents (one .md each) in ai-agents/, skills (one folder each, with its SKILL.md) in ai-skills/,
   * commands in ai-commands/, prompts in ai-prompts/. The dashboard lists them there like any other item.
   * A file a person edited, or already had under that name, is kept by --install and by --uninstall.
   */
  ai?: { agents?: string[]; skills?: string[]; commands?: string[]; prompts?: string[] };
  /**
   * What this plugin cannot do its job without. A list is the plugins, by manifest name: a name, or a
   * list of names when any one of them will do (the first is the one added when none is here) —
   * `[["dev", "test", "sandboxes", "demos"], "ai-agents"]`. An object holds the plugins and the commands
   * it needs on the machine: `{ plugins: [...], commands: ["upsun", "container:twg", ["curl", "wget"]] }`.
   * A plugin need is about the workspace, not about node_modules: it is met when that plugin is
   * activated and installed; --activate and --install stop until it is, and add it with --with-needs;
   * --deactivate and --uninstall of a needed plugin refuse. A command is reported by
   * `webship-workspace doctor` and `plugins.sh --check` as found or missing, and is never installed.
   */
  needs?: PluginNeeds;
  /** What a part of this plugin is for, in the same shape: said by --require, --list and the check; never added, never a reason to stop. */
  suggests?: PluginNeeds;
}

/** One plugin need: a plugin's manifest name, or the names any one of which meets it. */
export type PluginNeed = string | string[];

/**
 * One command need: a command's name (optionally `host:`, `container:` or `project:` first, to say which
 * machine), the names any one of which will do, or the long form with where it runs and how to install it.
 */
export type CommandNeed = string | string[] | {
  /** The command's name. */
  command?: string;
  /** Or: the names any one of which will do. */
  anyOf?: string[];
  /** `host` (the default: where the cmd-*.sh run), `container` (the dashboard's) or `project` (the project's own container: listed, not checked). */
  where?: 'host' | 'container' | 'project';
  /** How to install it: a sentence or a link. Without one, the package of that name on the common systems is said. */
  hint?: string;
  /** The file that calls it. */
  for?: string;
};

/** A manifest's `needs` or `suggests`: the plugins alone, or the plugins and the commands. */
export type PluginNeeds = PluginNeed[] | { plugins?: PluginNeed[]; commands?: CommandNeed[] };

export type Register = (api: PluginApi) => void;
