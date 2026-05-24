import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const transformedCsvPath = path.join(projectRoot, 'data', 'vendas_transformadas.csv');
const { Client } = pg;

const dbConfig = {
  host: process.env.DEST_POSTGRES_HOST || 'localhost',
  port: Number(process.env.DEST_POSTGRES_PORT || 5433),
  user: process.env.DEST_POSTGRES_USER || 'etl_user',
  password: process.env.DEST_POSTGRES_PASSWORD || 'etl_pass',
  database: process.env.DEST_POSTGRES_DB || 'etl_destino',
  connectionTimeoutMillis: 2500,
};

function parseCsvLine(line, separator = ';') {
  const values = [];
  let current = '';
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === separator && !quoted) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function readCsvResults() {
  if (!fs.existsSync(transformedCsvPath)) {
    return {
      source: 'csv',
      updatedAt: null,
      records: [],
      message: 'Arquivo data/vendas_transformadas.csv ainda nao existe.',
    };
  }

  const file = fs.readFileSync(transformedCsvPath, 'utf8').trim();
  const stats = fs.statSync(transformedCsvPath);

  if (!file) {
    return {
      source: 'csv',
      updatedAt: stats.mtime.toISOString(),
      records: [],
      message: 'Arquivo de resultados esta vazio.',
    };
  }

  const [headerLine, ...lines] = file.split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  const parsedRecords = lines.filter(Boolean).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = values[index] ?? '';
      return row;
    }, {});
  });
  const recordsById = new Map();

  for (const record of parsedRecords) {
    recordsById.set(record.id || JSON.stringify(record), record);
  }

  return {
    source: 'csv',
    updatedAt: stats.mtime.toISOString(),
    records: [...recordsById.values()],
    message: 'Resultados carregados do CSV local.',
  };
}

async function readDatabaseResults() {
  const client = new Client(dbConfig);

  await client.connect();

  try {
    const { rows } = await client.query(`
      SELECT
        id,
        produto,
        categoria,
        quantidade,
        valor_total_bruto,
        valor_total_com_imposto,
        data_venda,
        status,
        processado_em
      FROM vendas_transformadas
      ORDER BY id ASC;
    `);
    const updatedAtResult = await client.query(`
      SELECT MAX(processado_em) AS updated_at
      FROM vendas_transformadas;
    `);

    return {
      source: 'database',
      updatedAt: updatedAtResult.rows[0]?.updated_at?.toISOString?.() || null,
      records: rows.map((row) => ({
        ...row,
        data_venda: row.data_venda?.toISOString?.().slice(0, 10) || row.data_venda,
        processado_em: row.processado_em?.toISOString?.() || row.processado_em,
      })),
      message: 'Resultados carregados do PostgreSQL destino.',
    };
  } finally {
    await client.end();
  }
}

async function readResults() {
  try {
    return await readDatabaseResults();
  } catch (error) {
    const csvPayload = readCsvResults();

    return {
      ...csvPayload,
      message: `Banco indisponivel (${error.message}). Exibindo fallback do CSV local.`,
    };
  }
}

function resultsApiPlugin() {
  return {
    name: 'results-api',
    configureServer(server) {
      server.middlewares.use('/api/results', async (_req, res) => {
        try {
          const payload = await readResults();
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(payload));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: error.message, records: [] }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), resultsApiPlugin()],
});
