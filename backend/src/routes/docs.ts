import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import fs from 'fs';
import path from 'path';

const router = Router();
const swaggerFile = path.resolve(process.cwd(), 'docs', 'openapi.yaml');

if (fs.existsSync(swaggerFile)) {
  const file = fs.readFileSync(swaggerFile, 'utf8');
  const doc = YAML.parse(file);
  router.use('/docs', swaggerUi.serve, swaggerUi.setup(doc));
}

export const docsRouter = router;
