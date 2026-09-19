import { afterEach, expect, test, vi } from 'vitest'
import { Pool } from 'pg'
import { connectDatabase } from '../src/db/connection'

afterEach(() => vi.unstubAllEnvs())

test('uses the DSQL connection variables provided by Terraform', async () => {
  vi.stubEnv('DSQL_HOST', '')
  vi.stubEnv('DSQL_USER', '')
  vi.stubEnv('DSQL_REGION', 'ap-northeast-1')
  vi.stubEnv('PGHOST', 'test-cluster.dsql.ap-northeast-1.on.aws')
  vi.stubEnv('PGUSER', 'admin')
  const connection = await connectDatabase()
  try {
    expect(connection.db.$client).toBeInstanceOf(Pool)
    const pool = connection.db.$client as Pool
    expect(pool.options.host).toBe('test-cluster.dsql.ap-northeast-1.on.aws')
    expect(pool.options.user).toBe('admin')
    expect(pool.options.password).toBeTypeOf('function')
    expect(pool.options.ssl).toEqual({ rejectUnauthorized: true })
  } finally {
    await connection.close()
  }
})
