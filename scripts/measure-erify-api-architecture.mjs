import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repositoryRoot = process.cwd();
const sourceRoot = path.join(repositoryRoot, 'apps/erify_api/src');

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

function toRepositoryPath(filePath) {
  return path.relative(repositoryRoot, filePath).split(path.sep).join('/');
}

function countLines(source) {
  const newlineCount = source.match(/\n/g)?.length ?? 0;
  return newlineCount + (source.length > 0 && !source.endsWith('\n') ? 1 : 0);
}

function resolveLocalImport(sourceFile, specifier) {
  let candidate;
  if (specifier.startsWith('@/')) {
    candidate = path.join(sourceRoot, specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    candidate = path.resolve(path.dirname(sourceFile), specifier);
  } else {
    return null;
  }

  const candidates = [candidate, `${candidate}.ts`, path.join(candidate, 'index.ts')];
  return candidates.find((value) => moduleFileSet.has(path.normalize(value))) ?? null;
}

function findCycles(graph) {
  const cycles = new Set();
  const visited = new Set();
  const active = new Set();
  const stack = [];

  function visit(node) {
    if (active.has(node)) {
      const cycleStart = stack.indexOf(node);
      const cycle = [...stack.slice(cycleStart), node].map(toRepositoryPath);
      const rotations = cycle.slice(0, -1).map((_, index) => {
        const body = cycle.slice(0, -1);
        const rotated = [...body.slice(index), ...body.slice(0, index)];
        return [...rotated, rotated[0]].join(' -> ');
      });
      cycles.add(rotations.sort()[0]);
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    active.add(node);
    stack.push(node);
    for (const dependency of graph.get(node) ?? []) visit(dependency);
    stack.pop();
    active.delete(node);
  }

  for (const node of graph.keys()) visit(node);
  return [...cycles].sort();
}

function reachableFrom(graph, entrypoint) {
  const reachable = new Set();
  const pending = [entrypoint];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || reachable.has(current)) continue;
    reachable.add(current);
    pending.push(...(graph.get(current) ?? []));
  }
  return reachable;
}

const typescriptFiles = walk(sourceRoot).filter((filePath) => filePath.endsWith('.ts'));
const moduleFiles = typescriptFiles.filter((filePath) => filePath.endsWith('.module.ts'));
const moduleFileSet = new Set(moduleFiles.map((filePath) => path.normalize(filePath)));
const moduleSources = new Map(moduleFiles.map((filePath) => [filePath, readFileSync(filePath, 'utf8')]));
const graph = new Map(moduleFiles.map((filePath) => [filePath, new Set()]));
const importPattern = /from\s+['"]([^'"]+)['"]/g;

for (const [sourceFile, source] of moduleSources) {
  for (const match of source.matchAll(importPattern)) {
    const dependency = resolveLocalImport(sourceFile, match[1]);
    if (dependency) graph.get(sourceFile).add(dependency);
  }
}

const edges = [...graph.entries()].flatMap(([source, dependencies]) =>
  [...dependencies].map((dependency) => [source, dependency]),
);
const moduleLineCounts = moduleFiles.map((filePath) => countLines(moduleSources.get(filePath)));
const sortedModuleLineCounts = [...moduleLineCounts].sort((left, right) => left - right);
const medianModuleLines = sortedModuleLineCounts[Math.floor(sortedModuleLineCounts.length / 2)] ?? 0;
const exportedRepositories = new Set();
for (const source of moduleSources.values()) {
  for (const exportsMatch of source.matchAll(/exports\s*:\s*\[([\s\S]*?)\]/g)) {
    for (const repositoryMatch of exportsMatch[1].matchAll(/\b([A-Z][A-Za-z0-9]*Repository)\b/g)) {
      exportedRepositories.add(repositoryMatch[1]);
    }
  }
}
const utilityModule = path.join(sourceRoot, 'utility/utility.module.ts');
const mcpAppModule = path.join(sourceRoot, 'mcp/mcp-app.module.ts');
const cycles = findCycles(graph);

const result = {
  snapshot_commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  method: {
    files: 'apps/erify_api/src/**/*.ts',
    lines: 'physical lines including blanks and comments',
    module_edges:
      'unique directed static imports from one *.module.ts file to another local *.module.ts file',
    cycles: 'depth-first search over the static local module graph',
    mcp_closure: 'McpAppModule plus every module reachable through static local module imports',
  },
  signals: {
    typescript_files: typescriptFiles.length,
    nest_modules: moduleFiles.length,
    static_local_module_edges: edges.length,
    static_module_cycles: cycles.length,
    module_cycles: cycles,
    module_lines_total: moduleLineCounts.reduce((total, count) => total + count, 0),
    module_lines_median: medianModuleLines,
    modules_at_or_below_20_lines: moduleLineCounts.filter((count) => count <= 20).length,
    model_modules: moduleFiles.filter((filePath) => filePath.includes(`${path.sep}models${path.sep}`)).length,
    production_services: typescriptFiles.filter(
      (filePath) => filePath.endsWith('.service.ts') && !filePath.endsWith('.service.spec.ts'),
    ).length,
    repositories: typescriptFiles.filter(
      (filePath) => filePath.endsWith('.repository.ts') && !filePath.endsWith('.repository.spec.ts'),
    ).length,
    exported_repositories: [...exportedRepositories].sort(),
    controllers: typescriptFiles.filter(
      (filePath) => filePath.endsWith('.controller.ts') && !filePath.endsWith('.controller.spec.ts'),
    ).length,
    specs: typescriptFiles.filter((filePath) => filePath.endsWith('.spec.ts')).length,
    e2e_specs: typescriptFiles.filter((filePath) => filePath.endsWith('.e2e-spec.ts')).length,
    utility_module_importers: [...graph.values()].filter((dependencies) => dependencies.has(utilityModule))
      .length,
    mcp_reachable_modules: reachableFrom(graph, mcpAppModule).size,
  },
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
