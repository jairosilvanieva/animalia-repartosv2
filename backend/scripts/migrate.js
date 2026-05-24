import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../src/config/db.js';

const migrationsDir = path.resolve('../database/migrations');
const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();

for (const file of files) {
  const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
  const statements = sql.split(';').map((statement) => statement.trim()).filter(Boolean);

  for (const statement of statements) {
    try {
      await pool.query(statement);
      console.log(`OK ${file}`);
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log(`SKIP ${file}: columna ya existente`);
        continue;
      }
      throw error;
    }
  }
}

await pool.end();
