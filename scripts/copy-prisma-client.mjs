import { copyFile, mkdir, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const generatedClient = path.join(process.cwd(), 'src', 'generated', 'client');
const distributionClient = path.join(process.cwd(), 'dist', 'generated', 'client');

async function syncDirectory(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source)) {
    const sourcePath = path.join(source, entry);
    const destinationPath = path.join(destination, entry);
    if ((await stat(sourcePath)).isDirectory()) {
      await syncDirectory(sourcePath, destinationPath);
      continue;
    }

    let existing;
    try {
      existing = await readFile(destinationPath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (existing && existing.equals(await readFile(sourcePath))) continue;
    await copyFile(sourcePath, destinationPath);
  }
}

await syncDirectory(generatedClient, distributionClient);
