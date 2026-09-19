import { mkdir } from 'node:fs/promises'
import { DsqlSigner } from '@aws-sdk/dsql-signer'
import { drizzle as postgresDrizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

// Imported only by server functions and the database setup script.
export async function connectDatabase() {
  const dsqlHost =
    process.env.DSQL_HOST || (process.env.DSQL_REGION ? process.env.PGHOST : undefined)
  if (dsqlHost) {
    const user = process.env.DSQL_USER || process.env.PGUSER || 'admin'
    const signer = new DsqlSigner({
      hostname: dsqlHost,
      region: process.env.DSQL_REGION || process.env.AWS_REGION || 'ap-northeast-1',
    })
    const pool = new Pool({
      host: dsqlHost,
      user,
      database: 'postgres',
      password: () =>
        user === 'admin' ? signer.getDbConnectAdminAuthToken() : signer.getDbConnectAuthToken(),
      ssl: { rejectUnauthorized: true },
      max: 2,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      maxLifetimeSeconds: 300,
    })
    pool.on('error', (error) => console.error('Database pool error', error))
    return { db: postgresDrizzle(pool), close: () => pool.end() }
  }
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 })
    pool.on('error', (error) => console.error('Database pool error', error))
    return { db: postgresDrizzle(pool), close: () => pool.end() }
  }
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    throw new Error('LambdaではDSQL_HOSTまたはDATABASE_URLが必要です')
  }
  const [{ PGlite }, { drizzle }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
  ])
  const dataDir = process.env.PGLITE_DATA_DIR || './.data/todos'
  await mkdir(dataDir, { recursive: true })
  const client = new PGlite(dataDir)
  return { db: drizzle(client), close: () => client.close() }
}

let connection: ReturnType<typeof connectDatabase> | undefined
export function getDatabase() {
  connection ??= connectDatabase().catch((error) => {
    connection = undefined
    throw error
  })
  return connection
}
