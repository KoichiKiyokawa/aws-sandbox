import { readFile } from 'node:fs/promises'
import { sql } from 'drizzle-orm'
import { connectDatabase } from '../src/db/connection'

// Initial schema only. One DDL statement per call, no transaction wrapper, for DSQL.
const connection = await connectDatabase()
try {
  const migration = await readFile(new URL('../drizzle/0000_todos.sql', import.meta.url), 'utf8')
  await connection.db.execute(
    sql.raw(migration.replace('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ')),
  )
  console.log('TODO database is ready.')
} finally {
  await connection.close()
}
