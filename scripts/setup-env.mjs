import { copyFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const locations = [
  ['gateway'],
  ['services', 'auth-service'],
  ['services', 'user-service'],
  ['services', 'job-service'],
  ['services', 'application-service'],
];

for (const parts of locations) {
  const folder = path.join(root, ...parts);
  const envFile = path.join(folder, '.env');
  try {
    await access(envFile);
  } catch {
    await copyFile(path.join(folder, '.env.example'), envFile);
    console.log(`Created ${path.relative(root, envFile)} from its example`);
  }
  if (parts[0] === 'services') {
    await mkdir(path.join(folder, 'prisma', 'data'), { recursive: true });
    if (parts[1] === 'application-service') {
      await mkdir(path.join(folder, 'uploads'), { recursive: true });
    }
  }
}
