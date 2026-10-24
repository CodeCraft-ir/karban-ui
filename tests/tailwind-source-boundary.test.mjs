import assert from 'node:assert/strict';
import {cp, mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';

const webRoot = fileURLToPath(new URL('../', import.meta.url));
const sourceCss = path.join(webRoot, 'src/app/globals.css');

async function fixture(t, copySource = false) {
  // Never create compiler inputs or output under the running app's watch tree.
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'karban-tailwind-source-')));
  t.after(() => rm(root, {recursive: true, force: true}));
  await mkdir(path.join(root, '.git'));
  await symlink(path.join(webRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  if (copySource) await cp(path.join(webRoot, 'src'), path.join(root, 'src'), {recursive: true});
  else await mkdir(path.join(root, 'src/app'), {recursive: true});
  const from = path.join(root, 'src/app/globals.css');
  const css = await readFile(sourceCss, 'utf8');
  await writeFile(from, css);
  return {root, from, css};
}

async function compile({root, from, css}) {
  // The installed production PostCSS plugin, not a mocked scanner or text check.
  return postcss([tailwindcss({base: root, optimize: false})]).process(css, {from});
}

function watchesFile(message, file) {
  // Next's PostCSS loader converts dir-dependency to addContextDependency(dir),
  // dropping its glob. A negative scanner glob alone cannot protect this path.
  if (message.type === 'dependency') return path.resolve(message.file) === file;
  if (message.type !== 'dir-dependency') return false;
  const relative = path.relative(message.dir, file);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

test('Tailwind compiles src utilities without scanning external browser artifacts', async t => {
  const input = await fixture(t);
  await mkdir(path.join(input.root, 'src/components'));
  await writeFile(path.join(input.root, 'src/components/card.tsx'), '<div className="z-[731] hover:z-[732]" />');
  await mkdir(path.join(input.root, '.playwright-mcp'));
  await writeFile(path.join(input.root, '.playwright-mcp/page.yml'), 'class: z-[9876]');
  const result = await compile(input);
  assert.ok(result.css.includes('z-index: 731'), 'src component utility must be generated');
  assert.ok(result.css.includes('z-index: 732'), 'src variant utility must be generated');
  assert.ok(!result.css.includes('z-index: 9876'), 'browser artifact class must not be scanned');
});

test('Tailwind dependency directories cannot watch browser console logs', async t => {
  const input = await fixture(t);
  const log = path.join(input.root, '.playwright-mcp/console.log');
  await mkdir(path.dirname(log));
  await writeFile(log, '[Fast Refresh] rebuilding');
  await writeFile(path.join(input.root, '.playwright-mcp/page.yml'), 'browser snapshot');
  await writeFile(path.join(input.root, 'src/app/page.tsx'), '<main className="flex" />');
  const result = await compile(input);
  const unsafe = result.messages.filter(message => watchesFile(message, log));
  assert.deepEqual(unsafe, [], 'PostCSS must not register log files or ancestor context directories');
  assert.ok(result.messages.some(message => watchesFile(message, path.join(input.root, 'src/app/page.tsx'))), 'actual application sources remain watched');
});

test('the real application source retains its generated utilities and custom styles', async t => {
  const input = await fixture(t, true);
  const result = await compile(input);
  // This fixture contains the entire real src tree but no browser artifacts.
  // Unbounded discovery is a safe reference here: all actual generated CSS,
  // not just the representative selectors below, must remain byte-identical.
  const reference = postcss.parse(input.css);
  reference.walkAtRules('import', rule => { rule.params = '"tailwindcss"'; });
  const baseline = await compile({...input, from: path.join(input.root, 'src/app/reference.css'), css: reference.toString()});
  assert.equal(result.css, baseline.css, 'source scoping must preserve all CSS generated from the real src tree');
  const selectors = new Set();
  result.root.walkRules(rule => selectors.add(rule.selector));
  for (const selector of [
    '.flex', '.bg-primary', '.text-primary-fg', '.md\\:pb-8',
    '.hover\\:bg-primary\\/20:hover', '.focus-visible\\:ring-primary:focus-visible',
    '.pb-\\[env\\(safe-area-inset-bottom\\)\\]', '.h-\\(--bottom-nav-h\\)',
    '.\\[\\&\\.is-shrunk\\]\\:shadow-\\[0_10px_40px_-12px_var\\(--shade\\)\\].is-shrunk',
    '.owner-link', '.owner-link:focus-visible',
  ]) assert.ok(selectors.has(selector), `missing actual application selector ${selector}`);
  assert.ok(result.css.includes('--font-yekan-face'), 'custom font token survives compilation');
  assert.ok(result.css.includes('@keyframes'), 'custom animation definitions survive compilation');
});
