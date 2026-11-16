// A plugin written against these types the way the published plugins use them; `npm run lint` compiles it with
// strict checks. A change to index.d.ts that breaks what a plugin may write breaks this file first.
import path from 'path';
import type {
  ActionContext, FolderSetup, FolderSetupContext, Form, FragmentContext, Html, PageContext, PluginApi, PluginLib,
  Register, RowContext, RowMenuAnswer, RunnerAnswer, RunnerRequest, WorkspacePluginManifest,
} from '../index';

// The manifest a platform plugin declares in its package.json, every part of it typed.
export const manifest: WorkspacePluginManifest = {
  name: 'example',
  label: 'Example',
  family: 'platforms',
  summary: 'A builder and a tool for the example platform',
  settingsFile: 'plugin.example.settings.yml',
  settingsTemplate: 'config/plugin.example.settings.yml',
  needs: [['dev', 'test', 'sandboxes', 'demos'], 'ai-agents', 'ai-skills', 'ai-commands', 'ai-prompts'],
  suggests: { plugins: ['git'], commands: ['curl', ['wget', 'curl'], { command: 'twg', where: 'container', hint: 'see its README' }] },
  commands: { types: ['sites'], workspaces: ['dev', 'test'], files: ['commands/cmd-example-project.sh'] },
  scripts: { functions: ['scripts/functions/fun-example.sh'], args: ['scripts/args/arg-example.sh'], machine: ['testing/site.feature'] },
  ai: { agents: ['ai/agents/example-tester.md'], skills: ['ai/skills/example-scenarios'], commands: ['ai/commands/example-test.md'], prompts: ['ai/prompts/example-build.md'] },
  features: ['features/example.feature'],
};

function rowMenu(lib: PluginLib, ctx: RowContext): RowMenuAnswer {
  if (!ctx.allowed.has('example')) return null;
  return {
    html: `<button ${ctx.vals('"verb":"status"')}>${lib.esc(ctx.project)} in ${lib.esc(ctx.meta.label || ctx.key)}</button>`,
    body: `/fragments/p/example/menu/${encodeURIComponent(ctx.key)}/${encodeURIComponent(ctx.project)}`,
    caption: 'not linked',
  };
}

function field(form: Form, key: string): string {
  const v = form[key];
  return Array.isArray(v) ? v[0] || '' : v || '';
}

const setup: FolderSetup = {
  html: (workspace: string, ctx: FolderSetupContext): Html => (ctx.allowed.has('example') ? `<p>Example in ${workspace}</p>` : ''),
  steps: (_workspace, name, form) => (field(form, 'example') ? [`bash cmd-example-project.sh ${name}`] : []),
  problem: (_workspace, form) => (field(form, 'example') === 'bad' ? 'Not an example.' : ''),
};

export const register: Register = (api: PluginApi): void => {
  const { lib } = api;
  api.addRowMenu('example', { label: 'EXAMPLE', row: 0 }, (ctx: RowContext) => rowMenu(lib, ctx));
  api.addAction('status', async ({ form, send, workspace }: ActionContext) => {
    const project = field(form, 'project');
    if (!lib.NAME_RE.test(project) || !lib.isValidWorkspace(workspace)) return send('<p>Not a project.</p>', 400);
    const r = await lib.run('git', ['status', '--short'], path.join(lib.workspaceDir(workspace), project), { timeoutMs: 10000 });
    return send(`<pre>${lib.esc(r.ok ? r.stdout : lib.cliError(r.stderr))}</pre>`);
  });
  api.addFragment(({ rest, send }: FragmentContext) => send(`<p>${lib.esc(rest)}</p>`));
  api.addPage(/^\/example\/([a-z]+)$/, ({ match, send }: PageContext) => send(`<h1>${lib.esc(match[1])}</h1>`));
  api.addFolderSetup(setup);
  // Optional members: present on a dashboard that has them, and said by its capabilities.
  if (api.addRunner && api.capabilities?.has('runner')) {
    api.addRunner((req: RunnerRequest): RunnerAnswer => (req.verb === 'example' ? { ok: true, session: req.session, where: 'example' } : null));
  }
  api.addAssistantContext(() => lib.commandBlock('Build one', [`bash ${path.basename(manifest.commands?.files[0] || '')} mysite`]));
};
