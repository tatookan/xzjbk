import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { zipSync } from 'fflate';

const skillName = 'xinzhi-script-uploader';
const sourceRoot = join(process.cwd(), 'packages', skillName);
const outputRoot = join(process.cwd(), 'public', 'agent');
const entries = {};

async function collect(directory) {
  const children = await readdir(directory, { withFileTypes: true });
  for (const child of children) {
    if (
      child.name === '.DS_Store' ||
      child.name.startsWith('._') ||
      child.name === '__pycache__' ||
      child.name === '.pytest_cache' ||
      child.name === 'tests' ||
      child.name.endsWith('.pyc')
    ) {
      continue;
    }
    const path = join(directory, child.name);
    if (child.isDirectory()) {
      await collect(path);
      continue;
    }
    entries[`${skillName}/${relative(sourceRoot, path)}`] = new Uint8Array(await readFile(path));
  }
}

await collect(sourceRoot);
await mkdir(outputRoot, { recursive: true });
await writeFile(join(outputRoot, `${skillName}.zip`), zipSync(entries, { level: 9 }));
console.log(`Packaged ${Object.keys(entries).length} Agent Skill files.`);
