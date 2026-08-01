import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fms-tests-'));
process.env.SQLITE_PATH = path.join(dir, 'main.db');
process.env.UPLOAD_DIR = path.join(dir, 'uploads');
process.env.MIGRATIONS_DIR = path.resolve('drizzle');
