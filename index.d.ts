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
}

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
  startInScreen: (opts: { workspace: string; project: string; projectDir: string; ownerDir?: string; verb: string; cmdLine: string; label: string }) => Promise<ScreenStart>;
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
  /** A named menu on every project row, in a slot the Buttons settings arrange. */
  addRowMenu: (slot: string, spec: RowMenuSpec, fn: (ctx: RowContext) => Html | null) => void;
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
}

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
  /** webship-js feature files, installed under the dashboard's tests/features/plugins/<name>/. */
  features?: string[];
}

export type Register = (api: PluginApi) => void;
